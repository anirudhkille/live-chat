import { randomUUID } from "crypto";
import { logger } from "../../config/logger.js";
import {
  setPendingCall,
  getPendingCall,
  deletePendingCall,
  getPendingCallsForUser,
  PENDING_CALL_TTL_MS,
} from "../../config/call-registry.js";
import * as pushService from "../push/push.service.js";
import * as callRepository from "./call.repository.js";
import { writeCallLog, writeCallLogsForCall } from "./call.service.js";
import {
  MAX_CALL_PARTICIPANTS,
  RING_TIMEOUT_MS,
  PARTICIPANT_STATE,
  createCall,
  addParticipant,
  getParticipant,
  isJoined,
  countJoined,
  countRinging,
  joinedParticipants,
  markJoined,
  markDeclined,
  markLeft,
  markMissed,
  setParticipantMedia,
  shouldEndCall,
  publicParticipants,
} from "./call-state.js";

const CALL_TYPES = new Set(["voice", "video"]);

const calls = new Map();
const pendingTimers = new Map();

let emitToUserRef = null;
const getCall = (callId) => (callId ? calls.get(callId) : undefined);

const findCallForUser = (userId) => {
  for (const call of calls.values()) {
    const participant = getParticipant(call, userId);
    if (
      participant &&
      (participant.state === PARTICIPANT_STATE.joined ||
        participant.state === PARTICIPANT_STATE.ringing)
    ) {
      return call;
    }
  }
  return null;
};

const clearPendingTimer = (callId) => {
  const timer = pendingTimers.get(callId);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(callId);
};

export const registerCallHandlers = ({ io, socket, getOnline, emitToUser }) => {
  emitToUserRef = emitToUser;
  const send = (socketId, event, payload) =>
    io.to(socketId).emit(event, payload);

  const isUserOnline = (userId) => {
    const sockets = getOnline(userId);
    return Boolean(sockets && sockets.size > 0);
  };

  const endCall = (call, reason) => {
    if (call.timeout) clearTimeout(call.timeout);
    call.timeout = null;
    calls.delete(call.callId);
    for (const participant of call.participants.values()) {
      emitToUserRef(participant.userId, "call:ended", {
        callId: call.callId,
        reason,
      });
    }
    void writeCallLogsForCall(call);
    logger.info(
      { callId: call.callId, reason, joined: countJoined(call) },
      "Call ended",
    );
  };

  const armRingTimeout = (call) => {
    if (call.timeout) clearTimeout(call.timeout);
    call.timeout = setTimeout(() => {
      const record = getCall(call.callId);
      if (!record) return;
      record.timeout = null;
      if (countJoined(record) < 2) {
        endCall(record, "timedOut");
      }
    }, RING_TIMEOUT_MS);
  };

  const joinedListExcept = (call, userId) =>
    joinedParticipants(call).filter(
      (participant) => participant.userId !== userId,
    );

  socket.on("call:initiate", async (payload) => {
    const { conversationId, targetUserId, type, callerName, callId } =
      payload ?? {};
    if (!CALL_TYPES.has(type) || !conversationId) return;
    if (targetUserId && targetUserId === socket.userId) return;

    const resolvedCallId =
      typeof callId === "string" && callId.length > 0 ? callId : randomUUID();

    if (findCallForUser(socket.userId) || getCall(resolvedCallId)) {
      send(socket.id, "call:unavailable", {
        callId: resolvedCallId,
        conversationId,
        targetUserId: targetUserId ?? null,
        type,
        reason: "busy",
      });
      return;
    }

    let conversation;
    try {
      conversation =
        await callRepository.findConversationForCall(conversationId);
    } catch (error) {
      logger.error(
        { err: error.message, conversationId },
        "Failed to load conversation for call",
      );
      return;
    }
    if (!conversation) {
      send(socket.id, "call:unavailable", {
        callId: resolvedCallId,
        conversationId,
        targetUserId: targetUserId ?? null,
        type,
        reason: "unavailable",
      });
      return;
    }

    const me = conversation.participants.find(
      (participant) => participant.userId === socket.userId,
    );
    if (!me) return;

    const others = conversation.participants.filter(
      (participant) => participant.userId !== socket.userId,
    );
    if (
      targetUserId &&
      !others.some((participant) => participant.userId === targetUserId)
    ) {
      return;
    }

    const targets = targetUserId
      ? others.filter((participant) => participant.userId === targetUserId)
      : others;

    if (targets.length === 0) {
      send(socket.id, "call:unavailable", {
        callId: resolvedCallId,
        conversationId,
        targetUserId: targetUserId ?? null,
        type,
        reason: "unavailable",
      });
      return;
    }

    if (targets.length + 1 > MAX_CALL_PARTICIPANTS) {
      send(socket.id, "call:unavailable", {
        callId: resolvedCallId,
        conversationId,
        targetUserId: targetUserId ?? null,
        type,
        reason: "tooMany",
      });
      return;
    }

    const isGroup = targetUserId
      ? false
      : Boolean(conversation.isGroup || targets.length > 1);
    const resolvedCallerName = me.user?.name ?? callerName ?? null;

    const busyTargets = targets.filter(
      (participant) => findCallForUser(participant.userId) !== null,
    );
    const reachableTargets = targets.filter(
      (participant) => findCallForUser(participant.userId) === null,
    );
    const onlineTargets = reachableTargets.filter((participant) =>
      isUserOnline(participant.userId),
    );
    const offlineTargets = reachableTargets.filter(
      (participant) => !isUserOnline(participant.userId),
    );

    if (
      !isGroup &&
      onlineTargets.length === 0 &&
      offlineTargets.length === 1 &&
      busyTargets.length === 0
    ) {
      const target = offlineTargets[0];
      let canPush = false;
      try {
        canPush = Boolean(target.user?.pushNotifications);
      } catch (error) {
        logger.error(
          { err: error.message, targetUserId: target.userId },
          "Failed to load call target",
        );
      }

      if (!canPush) {
        send(socket.id, "call:unavailable", {
          callId: resolvedCallId,
          conversationId,
          targetUserId: target.userId,
          type,
          reason: "offline",
        });
        return;
      }

      const pending = {
        callId: resolvedCallId,
        type,
        conversationId,
        conversationName: conversation.name ?? null,
        callerId: socket.userId,
        callerSocketId: socket.id,
        callerName: resolvedCallerName,
        calleeId: target.userId,
        status: "pending",
        startedAt: new Date(),
      };

      try {
        await setPendingCall(pending);
      } catch (error) {
        logger.error(
          { err: error.message, callId: resolvedCallId },
          "Failed to store pending call",
        );
        send(socket.id, "call:unavailable", {
          callId: resolvedCallId,
          conversationId,
          targetUserId: target.userId,
          type,
          reason: "unavailable",
        });
        return;
      }

      clearPendingTimer(resolvedCallId);
      pendingTimers.set(
        resolvedCallId,
        setTimeout(async () => {
          pendingTimers.delete(resolvedCallId);
          try {
            const record = await getPendingCall(resolvedCallId);
            if (!record || record.status !== "pending") return;
            if (emitToUserRef) {
              emitToUserRef(record.callerId, "call:pending-timed-out", {
                callId: resolvedCallId,
              });
              emitToUserRef(record.calleeId, "call:cancelled", {
                callId: resolvedCallId,
              });
            }
            await deletePendingCall(resolvedCallId, record.calleeId);
            writeCallLog(record, "missed");
          } catch (error) {
            logger.error(
              { err: error.message, callId: resolvedCallId },
              "Pending call timeout failed",
            );
          }
        }, PENDING_CALL_TTL_MS),
      );

      send(socket.id, "call:pending", {
        callId: resolvedCallId,
        type,
        conversationId,
        targetUserId: target.userId,
        callerName: resolvedCallerName,
      });

      await pushService.sendCallNotification({
        userId: target.userId,
        callerName: resolvedCallerName,
        conversationId,
        callType: type,
        callId: resolvedCallId,
      });

      logger.info(
        {
          callId: resolvedCallId,
          callerId: socket.userId,
          calleeId: target.userId,
        },
        "Pending call created",
      );
      return;
    }

    if (onlineTargets.length === 0) {
      const emptyCall = createCall({
        callId: resolvedCallId,
        type,
        conversationId,
        conversationName: conversation.name ?? null,
        callerId: socket.userId,
        callerName: resolvedCallerName,
        isGroup,
      });
      for (const participant of targets) {
        addParticipant(emptyCall, {
          userId: participant.userId,
          name: participant.user?.name ?? null,
          state: PARTICIPANT_STATE.missed,
        });
      }
      void writeCallLogsForCall(emptyCall);
      send(socket.id, "call:unavailable", {
        callId: resolvedCallId,
        conversationId,
        targetUserId: targetUserId ?? null,
        type,
        reason: "offline",
      });
      return;
    }

    const call = createCall({
      callId: resolvedCallId,
      type,
      conversationId,
      conversationName: conversation.name ?? null,
      callerId: socket.userId,
      callerName: resolvedCallerName,
      isGroup,
    });

    addParticipant(call, {
      userId: socket.userId,
      name: resolvedCallerName,
      state: PARTICIPANT_STATE.joined,
      socketId: socket.id,
    });

    for (const participant of onlineTargets) {
      addParticipant(call, {
        userId: participant.userId,
        name: participant.user?.name ?? null,
        state: PARTICIPANT_STATE.ringing,
      });
    }
    for (const participant of [...offlineTargets, ...busyTargets]) {
      addParticipant(call, {
        userId: participant.userId,
        name: participant.user?.name ?? null,
        state: PARTICIPANT_STATE.missed,
      });
    }

    calls.set(call.callId, call);
    armRingTimeout(call);

    const participants = publicParticipants(call);
    const ringPayload = {
      callId: call.callId,
      type: call.type,
      conversationId: call.conversationId,
      conversationName: call.conversationName,
      callerId: call.callerId,
      callerName: call.callerName,
      isGroup: call.isGroup,
      participants,
    };

    socket.emit("call:initiated", ringPayload);
    for (const participant of onlineTargets) {
      emitToUserRef(participant.userId, "call:ringing", ringPayload);
    }

    logger.info(
      {
        callId: call.callId,
        callerId: call.callerId,
        isGroup: call.isGroup,
        targets: targets.length,
      },
      "Call initiated",
    );
  });

  socket.on("call:accept", (payload) => {
    const call = getCall(payload?.callId);
    if (!call) return;
    const participant = getParticipant(call, socket.userId);
    if (!participant || participant.state !== PARTICIPANT_STATE.ringing) return;

    markJoined(call, socket.userId, socket.id);
    if (countJoined(call) >= 2 && call.timeout) {
      clearTimeout(call.timeout);
      call.timeout = null;
    }

    const participants = publicParticipants(call);
    send(socket.id, "call:participants", {
      callId: call.callId,
      participants,
      answeredAt: call.answeredAt,
    });

    for (const other of joinedListExcept(call, socket.userId)) {
      emitToUserRef(other.userId, "call:participant-joined", {
        callId: call.callId,
        participant: { userId: participant.userId, name: participant.name },
        participants,
      });
    }

    logger.info(
      { callId: call.callId, userId: socket.userId },
      "Call participant joined",
    );
  });

  socket.on("call:accept-pending", async (payload) => {
    const { callId } = payload ?? {};
    if (!callId) return;

    let record;
    try {
      record = await getPendingCall(callId);
    } catch (error) {
      logger.error(
        { err: error.message, callId },
        "Failed to load pending call",
      );
      send(socket.id, "call:pending-expired", { callId });
      return;
    }

    if (
      !record ||
      record.status !== "pending" ||
      record.calleeId !== socket.userId
    ) {
      send(socket.id, "call:pending-expired", { callId });
      return;
    }

    clearPendingTimer(callId);
    await deletePendingCall(callId, record.calleeId).catch((error) =>
      logger.error(
        { err: error.message, callId },
        "Failed to clear pending call",
      ),
    );

    const call = createCall({
      callId,
      type: record.type,
      conversationId: record.conversationId,
      conversationName: record.conversationName ?? null,
      callerId: record.callerId,
      callerName: record.callerName ?? null,
      isGroup: false,
    });
    call.startedAt = record.startedAt ?? new Date();
    addParticipant(call, {
      userId: record.callerId,
      name: record.callerName ?? null,
      state: PARTICIPANT_STATE.joined,
      socketId: record.callerSocketId,
    });
    addParticipant(call, {
      userId: socket.userId,
      name: null,
      state: PARTICIPANT_STATE.ringing,
    });
    markJoined(call, socket.userId, socket.id);
    calls.set(callId, call);

    const participants = publicParticipants(call);
    send(socket.id, "call:participants", {
      callId,
      participants,
      answeredAt: call.answeredAt,
    });
    emitToUserRef(record.callerId, "call:participant-joined", {
      callId,
      participant: { userId: socket.userId, name: null },
      participants,
    });

    logger.info({ callId }, "Pending call accepted");
  });

  socket.on("call:reject-pending", async (payload) => {
    const { callId } = payload ?? {};
    if (!callId) return;

    let record;
    try {
      record = await getPendingCall(callId);
    } catch {
      record = null;
    }
    if (!record || record.calleeId !== socket.userId) return;

    clearPendingTimer(callId);
    await deletePendingCall(callId, record.calleeId).catch(() => {});
    if (emitToUserRef) {
      emitToUserRef(record.callerId, "call:rejected", { callId });
    }
    writeCallLog(record, "declined");
    logger.info({ callId }, "Pending call rejected");
  });

  socket.on("call:reject", (payload) => {
    const call = getCall(payload?.callId);
    if (!call) return;
    const participant = markDeclined(call, socket.userId);
    if (!participant) return;

    for (const other of joinedListExcept(call, socket.userId)) {
      emitToUserRef(other.userId, "call:rejected", {
        callId: call.callId,
        userId: socket.userId,
      });
    }
    if (shouldEndCall(call)) endCall(call, "declined");
  });

  socket.on("call:cancel", async (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (call) {
      if (call.callerId !== socket.userId) return;
      endCall(call, "cancelled");
      return;
    }

    let record;
    try {
      record = await getPendingCall(callId);
    } catch {
      record = null;
    }
    if (!record || record.callerId !== socket.userId) return;

    clearPendingTimer(callId);
    await deletePendingCall(callId, record.calleeId).catch(() => {});
    if (emitToUserRef) {
      emitToUserRef(record.calleeId, "call:cancelled", { callId });
    }
    writeCallLog(record, "missed");
  });

  socket.on("call:hangup", async (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (call) {
      const participant = getParticipant(call, socket.userId);
      if (!participant) return;

      if (participant.state === PARTICIPANT_STATE.ringing) {
        markMissed(call, socket.userId);
        for (const other of joinedListExcept(call, socket.userId)) {
          emitToUserRef(other.userId, "call:rejected", {
            callId: call.callId,
            userId: socket.userId,
          });
        }
        if (shouldEndCall(call)) endCall(call, "declined");
        return;
      }

      markLeft(call, socket.userId);

      if (call.callerId === socket.userId && call.status === "ringing") {
        endCall(call, "cancelled");
        return;
      }

      const participants = publicParticipants(call);
      for (const other of joinedListExcept(call, socket.userId)) {
        emitToUserRef(other.userId, "call:participant-left", {
          callId: call.callId,
          userId: socket.userId,
          participants,
        });
      }

      if (shouldEndCall(call)) {
        endCall(call, "ended");
      } else if (countJoined(call) < 2 && countRinging(call) > 0) {
        armRingTimeout(call);
      }
      return;
    }

    let record;
    try {
      record = await getPendingCall(callId);
    } catch {
      record = null;
    }
    if (!record) return;

    const isParticipant =
      record.callerId === socket.userId || record.calleeId === socket.userId;
    if (!isParticipant) return;

    clearPendingTimer(callId);
    await deletePendingCall(callId, record.calleeId).catch(() => {});
    if (emitToUserRef) {
      emitToUserRef(record.callerId, "call:cancelled", { callId });
      emitToUserRef(record.calleeId, "call:cancelled", { callId });
    }
    writeCallLog(record, "missed");
  });

  const relay = (event, field) => {
    socket.on(event, (payload) => {
      const { callId, toUserId } = payload ?? {};
      const call = getCall(callId);
      if (!call || !toUserId || payload?.[field] == null) return;
      if (!isJoined(call, socket.userId)) return;

      const target = getParticipant(call, toUserId);
      if (!target || target.state !== PARTICIPANT_STATE.joined) return;
      if (!target.socketId) return;

      send(target.socketId, event, {
        callId,
        fromUserId: socket.userId,
        [field]: payload[field],
      });
    });
  };

  relay("call:peer-offer", "sdp");
  relay("call:peer-answer", "sdp");
  relay("call:ice-candidate", "candidate");

  socket.on("call:media-state", (payload) => {
    const { callId, muted, cameraOff } = payload ?? {};
    const call = getCall(callId);
    if (!call || !isJoined(call, socket.userId)) return;

    setParticipantMedia(call, socket.userId, { muted, cameraOff });

    for (const other of joinedListExcept(call, socket.userId)) {
      emitToUserRef(other.userId, "call:media-state", {
        callId,
        userId: socket.userId,
        muted: Boolean(muted),
        cameraOff: Boolean(cameraOff),
      });
    }
  });

  (async () => {
    try {
      const pending = await getPendingCallsForUser(socket.userId);
      for (const record of pending) {
        socket.emit("call:pending-incoming", {
          callId: record.callId,
          type: record.type,
          conversationId: record.conversationId,
          conversationName: record.conversationName ?? null,
          callerId: record.callerId,
          callerName: record.callerName,
        });
      }
    } catch (error) {
      logger.error(
        { err: error.message, userId: socket.userId },
        "Failed to deliver pending calls",
      );
    }
  })();
};

export const handleCallDisconnect = async (userId) => {
  for (const [callId, call] of calls) {
    const participant = getParticipant(call, userId);
    if (!participant) continue;
    if (
      participant.state !== PARTICIPANT_STATE.joined &&
      participant.state !== PARTICIPANT_STATE.ringing
    ) {
      continue;
    }

    if (participant.state === PARTICIPANT_STATE.ringing) {
      markMissed(call, userId);
      for (const other of joinedParticipants(call)) {
        if (other.userId === userId || !emitToUserRef) continue;
        emitToUserRef(other.userId, "call:rejected", {
          callId,
          userId,
        });
      }
    } else {
      markLeft(call, userId);
      const participants = publicParticipants(call);
      for (const other of joinedParticipants(call)) {
        if (other.userId === userId) continue;
        if (emitToUserRef) {
          emitToUserRef(other.userId, "call:participant-left", {
            callId,
            userId,
            participants,
          });
        }
      }
    }

    if (userId === call.callerId || shouldEndCall(call)) {
      if (call.timeout) clearTimeout(call.timeout);
      call.timeout = null;
      calls.delete(callId);
      if (emitToUserRef) {
        for (const other of call.participants.values()) {
          if (other.userId === userId) continue;
          emitToUserRef(other.userId, "call:ended", {
            callId,
            reason: call.status === "active" ? "ended" : "cancelled",
          });
        }
      }
      void writeCallLogsForCall(call);
      logger.info({ callId, userId }, "Call closed after disconnect");
    }
  }

  try {
    const pending = await getPendingCallsForUser(userId);
    for (const record of pending) {
      clearPendingTimer(record.callId);
      await deletePendingCall(record.callId, record.calleeId);
      const otherId =
        record.callerId === userId ? record.calleeId : record.callerId;
      if (emitToUserRef) {
        emitToUserRef(otherId, "call:cancelled", { callId: record.callId });
      }
      writeCallLog(record, "missed");
    }
  } catch (error) {
    logger.error(
      { err: error.message, userId },
      "Failed to clean pending calls on disconnect",
    );
  }
};
