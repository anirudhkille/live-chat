import type { MediaStream } from "react-native-webrtc";

export type CallType = "voice" | "video";
export type CallRole = "caller" | "callee" | null;
export type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";
export type CallLogFilter = "all" | "missed";

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

export type ParticipantSeed = {
  userId: string;
  name: string | null;
  muted?: boolean;
  cameraOff?: boolean;
};

/** Participant shape emitted by the server's call module. */
export type ServerParticipant = {
  userId: string;
  name: string | null;
  state: "ringing" | "joined" | "declined" | "left" | "missed";
  muted?: boolean;
  cameraOff?: boolean;
};

export type AutoAction = {
  callId: string;
  action: "accept" | "decline";
};

export type StartCallArgs = {
  type: CallType;
  conversationId: string;
  peerId: string | null;
  peerName: string | null;
  isGroup?: boolean;
  conversationName?: string | null;
};

export type CallInitiatedPayload = {
  callId: string;
  participants: ServerParticipant[];
};

export type CallRingingPayload = {
  callId: string;
  type: CallType;
  conversationId: string;
  conversationName?: string | null;
  callerId: string;
  callerName: string | null;
  isGroup?: boolean;
  participants?: ServerParticipant[];
};

export type CallParticipantsPayload = {
  callId: string;
  participants: ServerParticipant[];
  answeredAt?: string | null;
};

export type CallParticipantJoinedPayload = {
  callId: string;
  participant: { userId: string; name: string | null };
  participants: ServerParticipant[];
};

export type CallParticipantLeftPayload = {
  callId: string;
  userId: string;
  participants: ServerParticipant[];
};

export type CallMediaStatePayload = {
  callId: string;
  userId: string;
  muted: boolean;
  cameraOff: boolean;
};

export type CallPeerOfferPayload = {
  callId: string;
  fromUserId: string;
  sdp: { type: string | null; sdp: string };
};

export type CallPeerAnswerPayload = CallPeerOfferPayload;

export type CallIceCandidatePayload = {
  callId: string;
  fromUserId: string;
  candidate: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  };
};

export type CallEndedPayload = {
  callId: string;
  reason?: string;
};

export type CallRejectedPayload = {
  callId: string;
  userId?: string;
};

export type CallCancelledPayload = {
  callId: string;
};

export type CallUnavailablePayload = {
  callId?: string;
  reason?: string;
};

export type CallPendingPayload = {
  callId: string;
  type: CallType;
  conversationId: string;
  targetUserId?: string;
  callerName: string | null;
};

export type CallPendingIncomingPayload = {
  callId: string;
  type: CallType;
  conversationId: string;
  conversationName?: string | null;
  callerId: string;
  callerName: string | null;
};

export type CallPendingExpiredPayload = {
  callId: string;
};
