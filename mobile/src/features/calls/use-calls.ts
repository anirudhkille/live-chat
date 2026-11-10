import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { randomUUID } from "expo-crypto";
import { setAudioModeAsync } from "expo-audio";
import {
  mediaDevices,
  MediaStream,
  type MediaStreamTrack,
  permissions,
  RTCPeerConnection,
} from "react-native-webrtc";

import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";

import { useCallStore } from "./call-store";
import type {
  CallCancelledPayload,
  CallEndReason,
  CallEndedPayload,
  CallIceCandidatePayload,
  CallInitiatedPayload,
  CallMediaStatePayload,
  CallParticipantJoinedPayload,
  CallParticipantLeftPayload,
  CallParticipantsPayload,
  CallPeerAnswerPayload,
  CallPeerOfferPayload,
  CallPendingExpiredPayload,
  CallPendingIncomingPayload,
  CallPendingPayload,
  CallRejectedPayload,
  CallRingingPayload,
  CallType,
  CallUnavailablePayload,
  ServerParticipant,
  StartCallArgs,
} from "./types";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type PendingCandidate = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

const mapServerReason = (reason: string | undefined): CallEndReason => {
  switch (reason) {
    case "cancelled":
      return "cancelled";
    case "declined":
      return "rejected";
    case "timedOut":
      return "timedOut";
    default:
      return "ended";
  }
};

const mapUnavailableReason = (reason: string | undefined): CallEndReason => {
  switch (reason) {
    case "busy":
      return "busy";
    case "offline":
      return "offline";
    case "tooMany":
      return "tooMany";
    default:
      return "unavailable";
  }
};

const requestMediaPermissions = async (type: CallType) => {
  try {
    const microphone = await permissions.request({ name: "microphone" });
    if (microphone === false) return false;

    if (type === "video") {
      const camera = await permissions.request({ name: "camera" });
      if (camera === false) return false;
    }

    return true;
  } catch {
    // Fall through and let getUserMedia surface the platform error.
    return true;
  }
};

const applyCallAudioMode = async (earpiece: boolean) => {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: earpiece,
      interruptionMode: "doNotMix",
    });
  } catch {
    // Audio routing is best-effort; the call still works without it.
  }
};

const restoreAudioMode = async () => {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: "mixWithOthers",
    });
  } catch {
    // Ignore devices that do not expose an audio session.
  }
};

export function useCalls() {
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, PendingCandidate[]>>(
    new Map(),
  );
  const callIdRef = useRef<string | null>(null);
  const makeOfferRef = useRef<
    (peerId: string, iceRestart?: boolean) => Promise<void>
  >(async () => {});

  const token = useAuthStore((state) => state.token);
  const hasToken = Boolean(token);

  const ensureLocalStream = useCallback((type: CallType) => {
    if (localStreamRef.current) return Promise.resolve(localStreamRef.current);
    if (mediaPromiseRef.current) return mediaPromiseRef.current;

    const promise = (async () => {
      const granted = await requestMediaPermissions(type);
      if (!granted) {
        throw new Error("media-permission-denied");
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video:
          type === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: "user",
              }
            : false,
      });

      localStreamRef.current = stream;
      mediaPromiseRef.current = null;
      useCallStore.getState().setLocalStream(stream);
      await applyCallAudioMode(!useCallStore.getState().speakerOn);
      return stream;
    })();

    mediaPromiseRef.current = promise;

    return promise.catch((error) => {
      mediaPromiseRef.current = null;
      throw error;
    });
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {
        // Native peer connections can already be gone after an app reload.
      }
      pcsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  const resetConnection = useCallback(() => {
    for (const peerId of pcsRef.current.keys()) {
      removePeer(peerId);
    }
    pcsRef.current.clear();
    pendingCandidatesRef.current.clear();
    mediaPromiseRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Track may already be stopped.
        }
      });
      localStreamRef.current = null;
    }
    callIdRef.current = null;
    void restoreAudioMode();
  }, [removePeer]);

  const createPeer = useCallback((peerId: string) => {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcsRef.current.set(peerId, pc);

    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    pc.onicecandidate = (event) => {
      const candidate = (
        event as unknown as { candidate?: PendingCandidate | null }
      ).candidate;
      if (!candidate?.candidate) return;
      socket.emit("call:ice-candidate", {
        callId: callIdRef.current,
        toUserId: peerId,
        candidate,
      });
    };

    pc.ontrack = (event) => {
      const trackEvent = event as unknown as {
        streams?: MediaStream[];
        track?: MediaStreamTrack | null;
      };
      const remote =
        trackEvent.streams?.[0] ??
        (trackEvent.track ? new MediaStream([trackEvent.track]) : null);
      if (remote) {
        useCallStore.getState().setRemoteStream(peerId, remote);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== "failed") return;
      try {
        pc.restartIce();
      } catch {
        return;
      }
      void makeOfferRef.current(peerId, true);
    };

    return pc;
  }, []);

  const flushCandidates = useCallback(async (peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc || !pc.remoteDescription) return;
    const queued = pendingCandidatesRef.current.get(peerId);
    if (!queued || queued.length === 0) return;
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        continue;
      }
    }
  }, []);

  const makeOffer = useCallback(
    async (peerId: string, iceRestart = false) => {
      const callId = callIdRef.current;
      if (!callId) return;

      try {
        const pc = createPeer(peerId);
        if (!iceRestart && pc.signalingState !== "stable") return;

        const offer = await pc.createOffer(
          iceRestart ? { iceRestart: true } : undefined,
        );
        if (!iceRestart && pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        socket.emit("call:peer-offer", {
          callId,
          toUserId: peerId,
          sdp: offer,
        });
      } catch {
        return;
      }
    },
    [createPeer],
  );

  useEffect(() => {
    makeOfferRef.current = makeOffer;
  }, [makeOffer]);

  const endCallFlow = useCallback(
    (reason: CallEndReason) => {
      resetConnection();
      useCallStore.getState().endCall(reason);
    },
    [resetConnection],
  );

  const failMedia = useCallback(
    (kind: "permission" | "error" = "error") => {
      const state = useCallStore.getState();
      if (state.status === "idle" || state.status === "ended") return;

      if (state.callId) {
        socket.emit("call:hangup", { callId: state.callId });
      }
      endCallFlow("error");

      Alert.alert(
        kind === "permission" ? "Permission needed" : "Call unavailable",
        kind === "permission"
          ? "Allow microphone and camera access to make calls. You can enable this in your device settings."
          : "Could not start audio or video on this device. Please try again.",
      );
    },
    [endCallFlow],
  );

  const syncPeers = useCallback(
    async (participants: ServerParticipant[]) => {
      const state = useCallStore.getState();
      const me = useAuthStore.getState().user?.id;
      if (!me) return;
      if (state.status !== "active" && state.status !== "outgoing") return;

      const remote = participants.filter(
        (participant) =>
          participant.userId !== me && participant.state === "joined",
      );
      if (remote.length === 0) return;

      state.setParticipants(
        remote.map((participant) => ({
          userId: participant.userId,
          name: participant.name,
          muted: participant.muted,
          cameraOff: participant.cameraOff,
        })),
      );

      if (!localStreamRef.current) {
        try {
          await ensureLocalStream(state.type ?? "voice");
        } catch (error) {
          failMedia(
            error instanceof Error &&
              error.message === "media-permission-denied"
              ? "permission"
              : "error",
          );
          return;
        }
      }

      const stream = localStreamRef.current;
      if (!stream) return;
      if (useCallStore.getState().status !== "active") {
        useCallStore.getState().toActive(stream);
      }

      for (const participant of remote) {
        if (pcsRef.current.has(participant.userId)) continue;
        if (me < participant.userId) {
          void makeOffer(participant.userId);
        }
      }
    },
    [ensureLocalStream, failMedia, makeOffer],
  );

  const startCall = useCallback((args: StartCallArgs) => {
    if (useCallStore.getState().status !== "idle") return;
    const caller = useAuthStore.getState().user;
    if (!caller) return;

    const newCallId = randomUUID();
    callIdRef.current = newCallId;
    useCallStore.getState().startOutgoing({
      callId: newCallId,
      type: args.type,
      conversationId: args.conversationId,
      peerId: args.peerId,
      peerName: args.peerName,
      isGroup: args.isGroup ?? false,
      conversationName: args.conversationName ?? null,
    });

    socket.emit("call:initiate", {
      callId: newCallId,
      conversationId: args.conversationId,
      targetUserId: args.peerId ?? undefined,
      type: args.type,
      callerName: caller.name ?? caller.email,
    });
  }, []);

  const acceptCall = useCallback(async () => {
    const state = useCallStore.getState();
    if (state.status !== "incoming" || !state.callId || !state.type) return;
    callIdRef.current = state.callId;

    try {
      const stream = await ensureLocalStream(state.type);
      const latest = useCallStore.getState();
      if (latest.callId !== state.callId || latest.status !== "incoming") {
        stream.getTracks().forEach((track) => track.stop());
        if (localStreamRef.current === stream) {
          localStreamRef.current = null;
          latest.setLocalStream(null);
        }
        return;
      }
      useCallStore.getState().toActive(stream);
    } catch (error) {
      failMedia(
        error instanceof Error && error.message === "media-permission-denied"
          ? "permission"
          : "error",
      );
      return;
    }

    socket.emit(state.pending ? "call:accept-pending" : "call:accept", {
      callId: state.callId,
    });
  }, [ensureLocalStream, failMedia]);

  const rejectCall = useCallback(() => {
    const state = useCallStore.getState();
    if (!state.callId) return;
    socket.emit(state.pending ? "call:reject-pending" : "call:reject", {
      callId: state.callId,
    });
    endCallFlow("rejected");
  }, [endCallFlow]);

  const cancelOutgoing = useCallback(() => {
    const state = useCallStore.getState();
    if (!state.callId) return;
    socket.emit("call:cancel", { callId: state.callId });
    endCallFlow("cancelled");
  }, [endCallFlow]);

  const hangup = useCallback(() => {
    const state = useCallStore.getState();
    if (state.callId) {
      socket.emit("call:hangup", { callId: state.callId });
    }
    endCallFlow("ended");
  }, [endCallFlow]);

  const toggleMute = useCallback(() => {
    useCallStore.getState().toggleLocalMuted();
    const state = useCallStore.getState();
    if (!state.callId) return;
    socket.emit("call:media-state", {
      callId: state.callId,
      muted: state.localMuted,
      cameraOff: state.cameraOff,
    });
  }, []);

  const toggleCamera = useCallback(() => {
    useCallStore.getState().toggleCamera();
    const state = useCallStore.getState();
    if (!state.callId) return;
    socket.emit("call:media-state", {
      callId: state.callId,
      muted: state.localMuted,
      cameraOff: state.cameraOff,
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    const speakerOn = useCallStore.getState().toggleSpeaker();
    void applyCallAudioMode(!speakerOn);
  }, []);

  useEffect(() => {
    if (token) return;
    socket.disconnect();
    resetConnection();
    useCallStore.getState().reset();
  }, [resetConnection, token]);

  useEffect(() => {
    if (!hasToken) return;

    const currentCallId = () => callIdRef.current;

    const handleConnect = () => {
      socket.emit("call:sync");
    };

    if (socket.connected) socket.emit("call:sync");
    socket.on("connect", handleConnect);
    socket.connect();

    const handleInitiated = (payload: CallInitiatedPayload) => {
      if (currentCallId() !== payload.callId) return;
      useCallStore.getState().markConnecting();
    };

    const handleRinging = (payload: CallRingingPayload) => {
      const state = useCallStore.getState();
      if (state.status !== "idle" && state.status !== "ended") return;
      if (state.status === "ended") state.reset();
      callIdRef.current = payload.callId;
      useCallStore.getState().receiveIncoming({
        callId: payload.callId,
        type: payload.type,
        conversationId: payload.conversationId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        isGroup: payload.isGroup,
        conversationName: payload.conversationName,
      });
    };

    const applyParticipants = (
      callId: string,
      participants: ServerParticipant[],
    ) => {
      if (currentCallId() !== callId) return;
      void syncPeers(participants);
    };

    const handleParticipants = (payload: CallParticipantsPayload) => {
      applyParticipants(payload.callId, payload.participants);
    };

    const handleParticipantJoined = (payload: CallParticipantJoinedPayload) => {
      applyParticipants(payload.callId, payload.participants);
    };

    const handleParticipantLeft = (payload: CallParticipantLeftPayload) => {
      if (currentCallId() !== payload.callId) return;
      removePeer(payload.userId);
      useCallStore.getState().removeParticipant(payload.userId);
      void syncPeers(payload.participants ?? []);
    };

    const handleMediaState = (payload: CallMediaStatePayload) => {
      if (currentCallId() !== payload.callId) return;
      useCallStore.getState().setParticipantMedia(payload.userId, {
        muted: payload.muted,
        cameraOff: payload.cameraOff,
      });
    };

    const handlePeerOffer = async (payload: CallPeerOfferPayload) => {
      if (currentCallId() !== payload.callId || !payload.fromUserId) return;

      if (!localStreamRef.current) {
        try {
          await ensureLocalStream(useCallStore.getState().type ?? "voice");
        } catch (error) {
          failMedia(
            error instanceof Error &&
              error.message === "media-permission-denied"
              ? "permission"
              : "error",
          );
          return;
        }
      }

      try {
        const pc = createPeer(payload.fromUserId);
        if (pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({
            type: "rollback",
            sdp: "",
          });
        }
        await pc.setRemoteDescription(payload.sdp);
        await flushCandidates(payload.fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:peer-answer", {
          callId: payload.callId,
          toUserId: payload.fromUserId,
          sdp: answer,
        });
      } catch {
        return;
      }
    };

    const handlePeerAnswer = async (payload: CallPeerAnswerPayload) => {
      if (currentCallId() !== payload.callId) return;
      const pc = pcsRef.current.get(payload.fromUserId);
      if (!pc || pc.signalingState !== "have-local-offer") return;
      try {
        await pc.setRemoteDescription(payload.sdp);
        await flushCandidates(payload.fromUserId);
      } catch {
        return;
      }
    };

    const handleIceCandidate = async (payload: CallIceCandidatePayload) => {
      if (currentCallId() !== payload.callId || !payload.candidate) return;
      const pc = pcsRef.current.get(payload.fromUserId);
      if (!pc || !pc.remoteDescription) {
        const queue = pendingCandidatesRef.current.get(payload.fromUserId);
        if (queue) queue.push(payload.candidate);
        else
          pendingCandidatesRef.current.set(payload.fromUserId, [
            payload.candidate,
          ]);
        return;
      }
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        return;
      }
    };

    const handleEnded = (payload: CallEndedPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      if (state.status === "idle" || state.status === "ended") return;
      endCallFlow(mapServerReason(payload?.reason));
    };

    const handleRejected = (payload: CallRejectedPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      if (payload?.userId) {
        removePeer(payload.userId);
        useCallStore.getState().removeParticipant(payload.userId);
        return;
      }
      endCallFlow("rejected");
    };

    const handleCancelled = (payload: CallCancelledPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("cancelled");
    };

    const handleTimedOut = (payload: CallCancelledPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("timedOut");
    };

    const handleUnavailable = (payload: CallUnavailablePayload) => {
      const state = useCallStore.getState();
      if (state.status !== "outgoing") return;
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow(mapUnavailableReason(payload?.reason));
    };

    const handlePending = (payload: CallPendingPayload) => {
      const state = useCallStore.getState();
      if (state.status !== "outgoing" || state.role !== "caller") return;
      if (payload?.callId && state.callId !== payload.callId) return;
      state.markPending();
    };

    const handlePendingIncoming = (payload: CallPendingIncomingPayload) => {
      const state = useCallStore.getState();
      if (state.status !== "idle" && state.status !== "ended") return;
      if (state.status === "ended") state.reset();
      callIdRef.current = payload.callId;
      useCallStore.getState().receiveIncoming({
        callId: payload.callId,
        type: payload.type,
        conversationId: payload.conversationId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        conversationName: payload.conversationName,
        pending: true,
      });
    };

    const handlePendingTimedOut = (payload: CallPendingExpiredPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("pendingTimedOut");
    };

    const handlePendingExpired = (payload: CallPendingExpiredPayload) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("timedOut");
    };

    socket.on("call:initiated", handleInitiated);
    socket.on("call:ringing", handleRinging);
    socket.on("call:participants", handleParticipants);
    socket.on("call:participant-joined", handleParticipantJoined);
    socket.on("call:participant-left", handleParticipantLeft);
    socket.on("call:media-state", handleMediaState);
    socket.on("call:peer-offer", handlePeerOffer);
    socket.on("call:peer-answer", handlePeerAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleRejected);
    socket.on("call:cancelled", handleCancelled);
    socket.on("call:timed-out", handleTimedOut);
    socket.on("call:unavailable", handleUnavailable);
    socket.on("call:pending", handlePending);
    socket.on("call:pending-incoming", handlePendingIncoming);
    socket.on("call:pending-timed-out", handlePendingTimedOut);
    socket.on("call:pending-expired", handlePendingExpired);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("call:initiated", handleInitiated);
      socket.off("call:ringing", handleRinging);
      socket.off("call:participants", handleParticipants);
      socket.off("call:participant-joined", handleParticipantJoined);
      socket.off("call:participant-left", handleParticipantLeft);
      socket.off("call:media-state", handleMediaState);
      socket.off("call:peer-offer", handlePeerOffer);
      socket.off("call:peer-answer", handlePeerAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleRejected);
      socket.off("call:cancelled", handleCancelled);
      socket.off("call:timed-out", handleTimedOut);
      socket.off("call:unavailable", handleUnavailable);
      socket.off("call:pending", handlePending);
      socket.off("call:pending-incoming", handlePendingIncoming);
      socket.off("call:pending-timed-out", handlePendingTimedOut);
      socket.off("call:pending-expired", handlePendingExpired);
    };
  }, [
    createPeer,
    endCallFlow,
    ensureLocalStream,
    failMedia,
    flushCandidates,
    hasToken,
    removePeer,
    syncPeers,
  ]);

  useEffect(() => {
    return () => {
      resetConnection();
    };
  }, [resetConnection]);

  useEffect(() => {
    const unsubscribe = useCallStore.subscribe((state) => {
      const action = state.autoAction;
      if (!action) return;
      if (state.status !== "incoming" || state.callId !== action.callId) {
        return;
      }
      useCallStore.getState().clearAutoAction();
      if (action.action === "accept") void acceptCall();
      else rejectCall();
    });
    return unsubscribe;
  }, [acceptCall, rejectCall]);

  return {
    startCall,
    acceptCall,
    rejectCall,
    cancelOutgoing,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  };
}
