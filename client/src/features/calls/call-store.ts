"use client";

import { create } from "zustand";

export type CallType = "voice" | "video";
export type CallRole = "caller" | "callee" | null;
export type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";

export type CallEndReason =
  | "ended"
  | "rejected"
  | "cancelled"
  | "timedOut"
  | "pendingTimedOut"
  | "busy"
  | "offline"
  | "tooMany"
  | "unavailable"
  | "error";

export type RemoteParticipant = {
  userId: string;
  name: string | null;
  stream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
};

type ParticipantSeed = {
  userId: string;
  name: string | null;
  muted?: boolean;
  cameraOff?: boolean;
};

type AutoAction = {
  callId: string;
  action: "accept" | "decline";
};

type CallState = {
  status: CallStatus;
  role: CallRole;
  callId: string | null;
  type: CallType | null;
  conversationId: string | null;
  peerId: string | null;
  peerName: string | null;
  isGroup: boolean;
  conversationName: string | null;
  startedAt: number | null;
  endReason: CallEndReason | null;
  localStream: MediaStream | null;
  localMuted: boolean;
  cameraOff: boolean;
  remoteParticipants: Record<string, RemoteParticipant>;
  isConnecting: boolean;
  pending: boolean;
  autoAction: AutoAction | null;

  startOutgoing: (args: {
    callId: string;
    type: CallType;
    conversationId: string;
    peerId: string | null;
    peerName: string | null;
    isGroup?: boolean;
    conversationName?: string | null;
  }) => void;

  receiveIncoming: (args: {
    callId: string;
    type: CallType;
    conversationId: string;
    callerId: string;
    callerName: string | null;
    isGroup?: boolean;
    conversationName?: string | null;
    pending?: boolean;
  }) => void;

  markConnecting: () => void;
  markPending: () => void;

  toActive: (local: MediaStream) => void;

  setLocalStream: (stream: MediaStream) => void;
  setParticipants: (participants: ParticipantSeed[]) => void;
  upsertParticipant: (participant: ParticipantSeed) => void;
  removeParticipant: (userId: string) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  setParticipantMedia: (
    userId: string,
    media: { muted: boolean; cameraOff: boolean }
  ) => void;
  setLocalMedia: (media: { muted: boolean; cameraOff: boolean }) => void;
  toggleLocalMuted: () => void;
  toggleCamera: () => void;

  setAutoAction: (action: AutoAction) => void;
  clearAutoAction: () => void;

  endCall: (reason: CallEndReason) => void;
  reset: () => void;
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const idleState = () => ({
  status: "idle" as CallStatus,
  role: null as CallRole,
  callId: null as string | null,
  type: null as CallType | null,
  conversationId: null as string | null,
  peerId: null as string | null,
  peerName: null as string | null,
  isGroup: false,
  conversationName: null as string | null,
  startedAt: null as number | null,
  endReason: null as CallEndReason | null,
  localStream: null as MediaStream | null,
  localMuted: false,
  cameraOff: false,
  remoteParticipants: {} as Record<string, RemoteParticipant>,
  isConnecting: false,
  pending: false,
  autoAction: null as AutoAction | null,
});

export const useCallStore = create<CallState>((set, get) => ({
  ...idleState(),

  startOutgoing: ({
    callId,
    type,
    conversationId,
    peerId,
    peerName,
    isGroup,
    conversationName,
  }) =>
    set({
      ...idleState(),
      status: "outgoing",
      role: "caller",
      callId,
      type,
      conversationId,
      peerId,
      peerName,
      isGroup: isGroup ?? false,
      conversationName: conversationName ?? null,
      isConnecting: true,
    }),

  receiveIncoming: ({
    callId,
    type,
    conversationId,
    callerId,
    callerName,
    isGroup,
    conversationName,
    pending,
  }) =>
    set({
      ...idleState(),
      status: "incoming",
      role: "callee",
      callId,
      type,
      conversationId,
      peerId: callerId,
      peerName: callerName,
      isGroup: isGroup ?? false,
      conversationName: conversationName ?? null,
      pending: pending ?? false,
      isConnecting: true,
    }),

  markConnecting: () => set({ isConnecting: true }),
  markPending: () => set({ pending: true }),

  toActive: (local) =>
    set({
      status: "active",
      startedAt: get().startedAt ?? Date.now(),
      localStream: local,
      isConnecting: false,
      pending: false,
    }),

  setLocalStream: (stream) => set({ localStream: stream }),

  setParticipants: (participants) =>
    set((state) => {
      const next: Record<string, RemoteParticipant> = {};
      for (const participant of participants) {
        const existing = state.remoteParticipants[participant.userId];
        next[participant.userId] = {
          userId: participant.userId,
          name: participant.name ?? existing?.name ?? null,
          stream: existing?.stream ?? null,
          muted: participant.muted ?? existing?.muted ?? false,
          cameraOff: participant.cameraOff ?? existing?.cameraOff ?? false,
        };
      }
      for (const [userId, participant] of Object.entries(
        state.remoteParticipants
      )) {
        if (!next[userId]) stopStream(participant.stream);
      }
      return { remoteParticipants: next };
    }),

  upsertParticipant: ({ userId, name }) =>
    set((state) => {
      const existing = state.remoteParticipants[userId];
      return {
        remoteParticipants: {
          ...state.remoteParticipants,
          [userId]: {
            userId,
            name: name ?? existing?.name ?? null,
            stream: existing?.stream ?? null,
            muted: existing?.muted ?? false,
            cameraOff: existing?.cameraOff ?? false,
          },
        },
      };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const existing = state.remoteParticipants[userId];
      if (!existing) return state;
      stopStream(existing.stream);
      const next = { ...state.remoteParticipants };
      delete next[userId];
      return { remoteParticipants: next };
    }),

  setRemoteStream: (userId, stream) =>
    set((state) => {
      const existing = state.remoteParticipants[userId];
      if (!existing) {
        return {
          remoteParticipants: {
            ...state.remoteParticipants,
            [userId]: {
              userId,
              name: null,
              stream,
              muted: false,
              cameraOff: false,
            },
          },
        };
      }
      return {
        remoteParticipants: {
          ...state.remoteParticipants,
          [userId]: { ...existing, stream },
        },
      };
    }),

  setParticipantMedia: (userId, media) =>
    set((state) => {
      const existing = state.remoteParticipants[userId];
      if (!existing) return state;
      return {
        remoteParticipants: {
          ...state.remoteParticipants,
          [userId]: { ...existing, ...media },
        },
      };
    }),

  setLocalMedia: (media) => set(media),

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

  setAutoAction: (action) => set({ autoAction: action }),
  clearAutoAction: () => set({ autoAction: null }),

  endCall: (reason) =>
    set((state) => ({
      status: "ended",
      endReason: reason,
      isConnecting: false,
      startedAt: state.startedAt ?? Date.now(),
    })),

  reset: () => {
    const state = get();
    stopStream(state.localStream);
    Object.values(state.remoteParticipants).forEach((participant) =>
      stopStream(participant.stream)
    );
    set({ ...idleState() });
  },
}));
