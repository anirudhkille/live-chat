"use client";

import { useCallback, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useCallStore, type CallEndReason, type CallType } from "./call-store";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

if (process.env.NEXT_PUBLIC_TURN_URL) {
  ICE_SERVERS.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  });
}

type StartCallArgs = {
  type: CallType;
  conversationId: string;
  peerId: string | null;
  peerName: string | null;
  isGroup?: boolean;
  conversationName?: string | null;
};

type ServerParticipant = {
  userId: string;
  name: string | null;
  state: string;
  muted?: boolean;
  cameraOff?: boolean;
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

export function useCalls() {
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const callIdRef = useRef<string | null>(null);
  const makeOfferRef = useRef<
    (peerId: string, iceRestart?: boolean) => Promise<void>
  >(async () => {});

  const ensureLocalStream = useCallback((type: CallType) => {
    if (localStreamRef.current) return Promise.resolve(localStreamRef.current);
    if (mediaPromiseRef.current) return mediaPromiseRef.current;

    const promise = navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      })
      .then((stream) => {
        localStreamRef.current = stream;
        mediaPromiseRef.current = null;
        useCallStore.getState().setLocalStream(stream);
        return stream;
      })
      .catch((error) => {
        mediaPromiseRef.current = null;
        throw error;
      });

    mediaPromiseRef.current = promise;
    return promise;
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  const resetConnection = useCallback(() => {
    for (const peerId of [...pcsRef.current.keys()]) {
      removePeer(peerId);
    }
    pcsRef.current.clear();
    pendingCandidatesRef.current.clear();
    mediaPromiseRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    callIdRef.current = null;
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
      if (!event.candidate) return;
      socket.emit("call:ice-candidate", {
        callId: callIdRef.current,
        toUserId: peerId,
        candidate: event.candidate,
      });
    };

    pc.ontrack = (event) => {
      const remote = event.streams[0] ?? new MediaStream([event.track]);
      useCallStore.getState().setRemoteStream(peerId, remote);
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
      const pc = createPeer(peerId);
      if (!iceRestart && pc.signalingState !== "stable") return;

      try {
        const offer = await pc.createOffer(
          iceRestart ? { iceRestart: true } : undefined
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
    [createPeer]
  );

  useEffect(() => {
    makeOfferRef.current = makeOffer;
  }, [makeOffer]);

  const endCallFlow = useCallback(
    (reason: CallEndReason) => {
      resetConnection();
      useCallStore.getState().endCall(reason);
    },
    [resetConnection]
  );

  const failMedia = useCallback(() => {
    const state = useCallStore.getState();
    if (state.callId) {
      socket.emit("call:hangup", { callId: state.callId });
    }
    endCallFlow("error");
  }, [endCallFlow]);

  const syncPeers = useCallback(
    async (participants: ServerParticipant[]) => {
      const state = useCallStore.getState();
      const me = useAuthStore.getState().user?.id;
      if (!me) return;
      if (state.status !== "active" && state.status !== "outgoing") return;

      const remote = participants.filter(
        (participant) =>
          participant.userId !== me && participant.state === "joined"
      );
      if (remote.length === 0) return;

      state.setParticipants(
        remote.map((participant) => ({
          userId: participant.userId,
          name: participant.name,
          muted: participant.muted,
          cameraOff: participant.cameraOff,
        }))
      );

      if (!localStreamRef.current) {
        try {
          await ensureLocalStream(state.type ?? "voice");
        } catch {
          failMedia();
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
    [ensureLocalStream, failMedia, makeOffer]
  );

  const startCall = useCallback((args: StartCallArgs) => {
    if (useCallStore.getState().status !== "idle") return;
    const caller = useAuthStore.getState().user;
    if (!caller) return;

    const newCallId = crypto.randomUUID();
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
      callerName: caller.name,
    });
  }, []);

  const acceptCall = useCallback(async () => {
    const state = useCallStore.getState();
    if (state.status !== "incoming" || !state.callId || !state.type) return;
    callIdRef.current = state.callId;

    try {
      const stream = await ensureLocalStream(state.type);
      useCallStore.getState().toActive(stream);
    } catch {
      failMedia();
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

  useEffect(() => {
    const currentCallId = () => callIdRef.current;

    const handleInitiated = (payload: {
      callId: string;
      participants: ServerParticipant[];
    }) => {
      if (currentCallId() !== payload.callId) return;
      useCallStore.getState().markConnecting();
    };

    const handleRinging = (payload: {
      callId: string;
      type: CallType;
      conversationId: string;
      callerId: string;
      callerName: string | null;
      isGroup?: boolean;
      conversationName?: string | null;
    }) => {
      if (useCallStore.getState().status !== "idle") return;
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
      participants: ServerParticipant[]
    ) => {
      if (currentCallId() !== callId) return;
      void syncPeers(participants);
    };

    const handleParticipants = (payload: {
      callId: string;
      participants: ServerParticipant[];
    }) => {
      applyParticipants(payload.callId, payload.participants);
    };

    const handleParticipantJoined = (payload: {
      callId: string;
      participants: ServerParticipant[];
    }) => {
      applyParticipants(payload.callId, payload.participants);
    };

    const handleParticipantLeft = (payload: {
      callId: string;
      userId: string;
      participants: ServerParticipant[];
    }) => {
      if (currentCallId() !== payload.callId) return;
      removePeer(payload.userId);
      useCallStore.getState().removeParticipant(payload.userId);
      void syncPeers(payload.participants ?? []);
    };

    const handleMediaState = (payload: {
      callId: string;
      userId: string;
      muted: boolean;
      cameraOff: boolean;
    }) => {
      if (currentCallId() !== payload.callId) return;
      useCallStore.getState().setParticipantMedia(payload.userId, {
        muted: payload.muted,
        cameraOff: payload.cameraOff,
      });
    };

    const handlePeerOffer = async (payload: {
      callId: string;
      fromUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (currentCallId() !== payload.callId || !payload.fromUserId) return;

      if (!localStreamRef.current) {
        try {
          await ensureLocalStream(useCallStore.getState().type ?? "voice");
        } catch {
          failMedia();
          return;
        }
      }

      const pc = createPeer(payload.fromUserId);
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" });
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

    const handlePeerAnswer = async (payload: {
      callId: string;
      fromUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
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

    const handleIceCandidate = async (payload: {
      callId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
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

    const handleEnded = (payload: { callId: string; reason?: string }) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      if (state.status === "idle" || state.status === "ended") return;
      endCallFlow(mapServerReason(payload?.reason));
    };

    const handleRejected = (payload: { callId: string; userId?: string }) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      if (payload?.userId) {
        removePeer(payload.userId);
        useCallStore.getState().removeParticipant(payload.userId);
        return;
      }
      endCallFlow("rejected");
    };

    const handleCancelled = (payload: { callId: string }) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("cancelled");
    };

    const handleTimedOut = (payload: { callId: string }) => {
      const state = useCallStore.getState();
      if (payload?.callId && state.callId !== payload.callId) return;
      endCallFlow("timedOut");
    };

    const handleUnavailable = (payload: { reason?: string }) => {
      if (useCallStore.getState().status !== "outgoing") return;
      endCallFlow(mapUnavailableReason(payload?.reason));
    };

    const handlePending = () => {
      const state = useCallStore.getState();
      if (state.status !== "outgoing" || state.role !== "caller") return;
      state.markPending();
    };

    const handlePendingIncoming = (payload: {
      callId: string;
      type: CallType;
      conversationId: string;
      conversationName?: string | null;
      callerId: string;
      callerName: string | null;
    }) => {
      if (useCallStore.getState().status !== "idle") return;
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

    const handlePendingTimedOut = () => {
      endCallFlow("pendingTimedOut");
    };

    const handlePendingExpired = () => {
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
      if (
        state.status !== "incoming" ||
        state.callId !== action.callId ||
        !state.pending
      ) {
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
  };
}
