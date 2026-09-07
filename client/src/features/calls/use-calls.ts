"use client";

import { useCallback, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useCallStore, type CallType } from "./call-store";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

type StartCallArgs = {
  type: CallType;
  conversationId: string;
  peerId: string;
  peerName: string | null;
};

export function useCalls() {
  const status = useCallStore((s) => s.status);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);

  const resetConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    callIdRef.current = null;
  }, []);

  const applyLocalTracks = useCallback(
    (pc: RTCPeerConnection, type: CallType, stream: MediaStream) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      if (type === "voice") {
        stream.getVideoTracks().forEach((track) => track.stop());
      }
      useCallStore.getState().setLocalStream(stream);
    },
    []
  );

  const setupPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:ice-candidate", {
          callId: callIdRef.current,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      useCallStore.getState().setRemoteStream(stream);
    };
    pc.onconnectionstatechange = () => {
      const connState = pc.connectionState;
      if (connState === "failed" || connState === "closed") {
        useCallStore.getState().endCall("error");
      }
    };
    return pc;
  }, []);

  const startCall = useCallback(
    (args: StartCallArgs) => {
      if (status !== "idle") return;
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
      });
      useCallStore.getState().markConnecting();
      socket.emit("call:initiate", {
        callId: newCallId,
        conversationId: args.conversationId,
        targetUserId: args.peerId,
        type: args.type,
        callerName: caller.name,
      });
    },
    [status]
  );

  const acceptCall = useCallback(async () => {
    const state = useCallStore.getState();
    if (state.status !== "incoming" || !state.callId || !state.type) return;
    callIdRef.current = state.callId;
    socket.emit("call:accept", { callId: state.callId });

    const type = state.type;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;
      const pc = pcRef.current ?? setupPeerConnection();
      applyLocalTracks(pc, type, stream);
    } catch {
      useCallStore.getState().endCall("error");
      return;
    }
  }, [applyLocalTracks, setupPeerConnection]);

  const setupIncomingOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      const pc = pcRef.current ?? setupPeerConnection();
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:peer-answer", {
        callId: callIdRef.current,
        sdp: answer,
      });
    },
    [setupPeerConnection]
  );

  const endCallFlow = useCallback(
    (reason: "ended" | "rejected" | "cancelled" | "timedOut" | "error") => {
      resetConnection();
      useCallStore.getState().endCall(reason);
    },
    [resetConnection]
  );

  const rejectCall = useCallback(() => {
    const state = useCallStore.getState();
    if (!state.callId) return;
    socket.emit("call:reject", { callId: state.callId });
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
    socket.emit("call:hangup", { callId: state.callId });
    endCallFlow("ended");
  }, [endCallFlow]);

  useEffect(() => {
    const handleRinging = (payload: {
      callId: string;
      type: CallType;
      conversationId: string;
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
      });
    };

    const handleAccepted = () => {
      const state = useCallStore.getState();
      if (state.role !== "caller") return;
      callIdRef.current = state.callId;
      state.markConnecting();
      (async () => {
        const type = state.type ?? "voice";
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
          });
          localStreamRef.current = stream;
          const pc = setupPeerConnection();
          applyLocalTracks(pc, type, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("call:peer-offer", {
            callId: callIdRef.current,
            sdp: offer,
          });
        } catch {
          endCallFlow("error");
        }
      })();
    };

    const handlePeerOffer = async (payload: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      await setupIncomingOffer(payload.sdp);
    };

    const handlePeerAnswer = async (payload: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(payload.sdp);
    };

    const handleIceCandidate = async (payload: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        // Ignore ICE candidate failures; connection may still establish.
      }
    };

    const handleEnded = () => {
      endCallFlow("ended");
    };
    const handleRejected = () => {
      endCallFlow("rejected");
    };
    const handleCancelled = () => {
      endCallFlow("cancelled");
    };
    const handleTimedOut = () => {
      endCallFlow("timedOut");
    };
    const handleUnavailable = () => {
      endCallFlow("error");
    };

    socket.on("call:ringing", handleRinging);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:peer-offer", handlePeerOffer);
    socket.on("call:peer-answer", handlePeerAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleRejected);
    socket.on("call:cancelled", handleCancelled);
    socket.on("call:timed-out", handleTimedOut);
    socket.on("call:unavailable", handleUnavailable);

    return () => {
      socket.off("call:ringing", handleRinging);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:peer-offer", handlePeerOffer);
      socket.off("call:peer-answer", handlePeerAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleRejected);
      socket.off("call:cancelled", handleCancelled);
      socket.off("call:timed-out", handleTimedOut);
      socket.off("call:unavailable", handleUnavailable);
    };
  }, [applyLocalTracks, endCallFlow, setupIncomingOffer, setupPeerConnection]);

  return {
    startCall,
    acceptCall,
    rejectCall,
    cancelOutgoing,
    hangup,
  };
}
