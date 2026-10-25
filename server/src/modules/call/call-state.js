export const MAX_CALL_PARTICIPANTS = 6;
export const RING_TIMEOUT_MS = 30 * 1000;

export const PARTICIPANT_STATE = {
  ringing: "ringing",
  joined: "joined",
  declined: "declined",
  left: "left",
  missed: "missed",
};

export const createCall = ({
  callId,
  type,
  conversationId,
  conversationName,
  callerId,
  callerName,
  isGroup,
}) => ({
  callId,
  type,
  conversationId,
  conversationName: conversationName ?? null,
  callerId,
  callerName: callerName ?? null,
  isGroup: Boolean(isGroup),
  status: "ringing",
  startedAt: new Date(),
  answeredAt: null,
  participants: new Map(),
  timeout: null,
});

export const addParticipant = (
  call,
  { userId, name, state, socketId = null },
) => {
  const existing = call.participants.get(userId);
  if (existing) {
    if (socketId) existing.socketId = socketId;
    if (name && !existing.name) existing.name = name;
    return existing;
  }

  const participant = {
    userId,
    name: name ?? null,
    state,
    socketId,
    joinedAt: state === PARTICIPANT_STATE.joined ? new Date() : null,
    muted: false,
    cameraOff: false,
  };
  call.participants.set(userId, participant);
  return participant;
};

export const getParticipant = (call, userId) =>
  call.participants.get(userId) ?? null;

export const isJoined = (call, userId) =>
  getParticipant(call, userId)?.state === PARTICIPANT_STATE.joined;

export const countJoined = (call) => {
  let count = 0;
  for (const participant of call.participants.values()) {
    if (participant.state === PARTICIPANT_STATE.joined) count += 1;
  }
  return count;
};

export const countRinging = (call) => {
  let count = 0;
  for (const participant of call.participants.values()) {
    if (participant.state === PARTICIPANT_STATE.ringing) count += 1;
  }
  return count;
};

export const joinedParticipants = (call) =>
  [...call.participants.values()].filter(
    (participant) => participant.state === PARTICIPANT_STATE.joined,
  );

export const markJoined = (call, userId, socketId) => {
  const participant = getParticipant(call, userId);
  if (!participant) return null;

  participant.state = PARTICIPANT_STATE.joined;
  participant.socketId = socketId;
  if (!participant.joinedAt) participant.joinedAt = new Date();

  if (countJoined(call) >= 2) {
    call.status = "active";
    if (!call.answeredAt) call.answeredAt = new Date();
  }

  return participant;
};

export const markDeclined = (call, userId) => {
  const participant = getParticipant(call, userId);
  if (!participant || participant.state !== PARTICIPANT_STATE.ringing) {
    return null;
  }
  participant.state = PARTICIPANT_STATE.declined;
  return participant;
};

export const markLeft = (call, userId) => {
  const participant = getParticipant(call, userId);
  if (!participant) return null;
  participant.state = PARTICIPANT_STATE.left;
  return participant;
};

export const markMissed = (call, userId) => {
  const participant = getParticipant(call, userId);
  if (!participant || participant.state !== PARTICIPANT_STATE.ringing) {
    return null;
  }
  participant.state = PARTICIPANT_STATE.missed;
  return participant;
};

export const setParticipantMedia = (call, userId, { muted, cameraOff }) => {
  const participant = getParticipant(call, userId);
  if (!participant) return null;
  participant.muted = Boolean(muted);
  participant.cameraOff = Boolean(cameraOff);
  return participant;
};

export const shouldEndCall = (call) =>
  countJoined(call) < 2 && countRinging(call) === 0;

export const publicParticipants = (call) =>
  [...call.participants.values()].map((participant) => ({
    userId: participant.userId,
    name: participant.name,
    state: participant.state,
    muted: participant.muted,
    cameraOff: participant.cameraOff,
  }));
