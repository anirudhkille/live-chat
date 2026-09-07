"use client";

import { create } from "zustand";

export type CallType = "voice" | "video";
export type CallRole = "caller" | "callee" | null;
export type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";

type CallEndReason = "ended" | "rejected" | "cancelled" | "timedOut" | "error";

type CallState = {
  status: CallStatus;
  role: CallRole;
  callId: string | null;
  type: CallType | null;
  conversationId: string | null;
  peerId: string | null;
  peerName: string | null;
  startedAt: number | null;
  endReason: CallEndReason | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localMuted: boolean;
  cameraOff: boolean;
  isConnecting: boolean;

  startOutgoing: (args: {
    callId: string;
    type: CallType;
    conversationId: string;
    peerId: string;
    peerName: string | null;
  }) => void;

  receiveIncoming: (args: {
    callId: string;
    type: CallType;
    conversationId: string;
    callerId: string;
    callerName: string | null;
  }) => void;

  markConnecting: () => void;

  toActive: (local: MediaStream, remote?: MediaStream | null) => void;

  setLocalStream: (stream: MediaStream) => void;
  setRemoteStream: (stream: MediaStream) => void;
  toggleLocalMuted: () => void;
  toggleCamera: () => void;

  endCall: (reason: CallEndReason) => void;
  reset: () => void;
};

const settleStreams = (
  localStream: MediaStream | null,
  remoteStream: MediaStream | null
) => {
  localStream?.getTracks().forEach((track) => track.stop());
  localStream?.getVideoTracks().forEach((track) => track.stop());
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
  }
};

export const useCallStore = create<CallState>((set, get) => ({
  status: "idle",
  role: null,
  callId: null,
  type: null,
  conversationId: null,
  peerId: null,
  peerName: null,
  startedAt: null,
  endReason: null,
  localStream: null,
  remoteStream: null,
  localMuted: false,
  cameraOff: false,
  isConnecting: false,

  startOutgoing: ({ callId, type, conversationId, peerId, peerName }) =>
    set({
      status: "outgoing",
      role: "caller",
      callId,
      type,
      conversationId,
      peerId,
      peerName,
      startedAt: null,
      endReason: null,
      localMuted: false,
      cameraOff: false,
      isConnecting: false,
    }),

  receiveIncoming: ({ callId, type, conversationId, callerId, callerName }) =>
    set({
      status: "incoming",
      role: "callee",
      callId,
      type,
      conversationId,
      peerId: callerId,
      peerName: callerName,
      startedAt: null,
      endReason: null,
      localMuted: false,
      cameraOff: false,
      isConnecting: false,
    }),

  markConnecting: () => set({ isConnecting: true }),
  toActive: (local, remote) =>
    set({
      status: "active",
      startedAt: get().startedAt ?? Date.now(),
      localStream: local,
      remoteStream: remote ?? get().remoteStream,
      isConnecting: false,
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  toggleLocalMuted: () => {
    const { localStream, localMuted } = get();
    const next = !localMuted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    set({ localMuted: next });
  },

  toggleCamera: () => {
    const { localStream, cameraOff, type } = get();
    if (type !== "video") return;
    const next = !cameraOff;
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    set({ cameraOff: next });
  },

  endCall: (reason) =>
    set((state) => ({
      status: "ended",
      endReason: reason,
      isConnecting: false,
      startedAt: state.startedAt ?? Date.now(),
    })),

  reset: () => {
    settleStreams(get().localStream, get().remoteStream);
    set({
      status: "idle",
      role: null,
      callId: null,
      type: null,
      conversationId: null,
      peerId: null,
      peerName: null,
      startedAt: null,
      endReason: null,
      localStream: null,
      remoteStream: null,
      localMuted: false,
      cameraOff: false,
      isConnecting: false,
    });
  },
}));
