import { randomUUID } from "crypto";
import { logger } from "../../config/logger.js";
import {
  setPendingCall,
  getPendingCall,
  deletePendingCall,
  getPendingCallsForUser,
  PENDING_CALL_TTL_MS,
} from "../../config/call-registry.js";
import * as userRepository from "../user/user.repository.js";
import * as pushService from "../push/push.service.js";

const CALL_TYPES = new Set(["voice", "video"]);
const RING_TIMEOUT_MS = 30 * 1000;

const calls = new Map(); // callId -> active in-memory call record
const pendingTimers = new Map(); // callId -> setTimeout handle

let ioRef = null;
let emitToUserRef = null;

const getCall = (callId) => calls.get(callId);
const removeCall = (callId) => {
  const call = calls.get(callId);
  if (call && call.timeout) clearTimeout(call.timeout);
  calls.delete(callId);
  return call;
};

const clearPendingTimer = (callId) => {
  const timer = pendingTimers.get(callId);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(callId);
};

export const registerCallHandlers = ({ io, socket, getOnline, emitToUser }) => {
  ioRef = io;
  emitToUserRef = emitToUser;
  const send = (socketId, event, payload) =>
    io.to(socketId).emit(event, payload);

  socket.on("call:initiate", async (payload) => {
    const { conversationId, targetUserId, type, callerName, callId } =
      payload ?? {};
    if (!CALL_TYPES.has(type) || !targetUserId || !conversationId) return;
    if (targetUserId === socket.userId) return;

    const onlineSet = getOnline(targetUserId);
    const isOnline = Boolean(onlineSet && onlineSet.size > 0);
    const resolvedCallId =
      typeof callId === "string" && callId.length > 0 ? callId : randomUUID();
    const resolvedCallerName =
      typeof callerName === "string" ? callerName : null;

    if (!isOnline) {
      let canPush = false;
      try {
        const target = await userRepository.findById(targetUserId);
        canPush = Boolean(target?.pushNotifications);
      } catch (error) {
        logger.error(
          { err: error.message, targetUserId },
          "Failed to load call target",
        );
      }

      if (!canPush) {
        send(socket.id, "call:unavailable", {
          conversationId,
          targetUserId,
          type,
        });
        return;
      }

      const pending = {
        callId: resolvedCallId,
        type,
        conversationId,
        callerId: socket.userId,
        callerSocketId: socket.id,
        callerName: resolvedCallerName,
        calleeId: targetUserId,
        status: "pending",
      };

      try {
        await setPendingCall(pending);
      } catch (error) {
        logger.error(
          { err: error.message, callId: resolvedCallId },
          "Failed to store pending call",
        );
        send(socket.id, "call:unavailable", {
          conversationId,
          targetUserId,
          type,
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
        targetUserId,
        callerName: resolvedCallerName,
      });

      await pushService.sendCallNotification({
        userId: targetUserId,
        callerName: resolvedCallerName,
        conversationId,
        callType: type,
        callId: resolvedCallId,
      });

      logger.info(
        {
          callId: resolvedCallId,
          callerId: socket.userId,
          calleeId: targetUserId,
        },
        "Pending call created",
      );
      return;
    }

    const call = {
      callId: resolvedCallId,
      type,
      conversationId,
      callerId: socket.userId,
      callerSocketId: socket.id,
      callerName: resolvedCallerName,
      calleeId: targetUserId,
      calleeSocketId: null,
      status: "ringing",
      timeout: null,
    };

    call.timeout = setTimeout(() => {
      const record = calls.get(call.callId);
      if (!record || record.status !== "ringing") return;
      if (record.calleeSocketId) {
        send(record.calleeSocketId, "call:timed-out", {
          callId: record.callId,
        });
      }
      send(record.callerSocketId, "call:timed-out", { callId: record.callId });
      removeCall(record.callId);
    }, RING_TIMEOUT_MS);

    calls.set(call.callId, call);

    emitToUser(targetUserId, "call:ringing", {
      callId: call.callId,
      type: call.type,
      conversationId: call.conversationId,
      callerId: call.callerId,
      callerName: call.callerName,
    });
    logger.info(
      { callId: call.callId, callerId: call.callerId, calleeId: call.calleeId },
      "Call initiated",
    );
  });

  socket.on("call:accept", (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (!call || call.status !== "ringing" || call.calleeId !== socket.userId) {
      return;
    }
    call.calleeSocketId = socket.id;
    call.status = "active";
    if (call.timeout) {
      clearTimeout(call.timeout);
      call.timeout = null;
    }
    send(call.callerSocketId, "call:accepted", {
      callId: call.callId,
      calleeId: call.calleeId,
    });
    logger.info({ callId: call.callId }, "Call accepted");
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

    const call = {
      callId,
      type: record.type,
      conversationId: record.conversationId,
      callerId: record.callerId,
      callerSocketId: record.callerSocketId,
      callerName: record.callerName,
      calleeId: socket.userId,
      calleeSocketId: socket.id,
      status: "active",
      timeout: null,
    };
    calls.set(callId, call);
    if (emitToUserRef) {
      emitToUserRef(record.callerId, "call:accepted", {
        callId,
        calleeId: socket.userId,
      });
    }
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
    logger.info({ callId }, "Pending call rejected");
  });

  socket.on("call:reject", (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (!call || call.calleeId !== socket.userId) return;
    send(call.callerSocketId, "call:rejected", { callId: call.callId });
    removeCall(call.callId);
  });

  socket.on("call:cancel", async (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (call) {
      if (call.callerId !== socket.userId) return;
      if (call.calleeSocketId) {
        send(call.calleeSocketId, "call:cancelled", { callId: call.callId });
      }
      removeCall(call.callId);
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
  });

  socket.on("call:hangup", async (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (call) {
      const isParticipant =
        call.callerId === socket.userId || call.calleeId === socket.userId;
      if (!isParticipant) return;

      const otherSocketId =
        socket.id === call.callerSocketId
          ? call.calleeSocketId
          : call.callerSocketId;
      if (otherSocketId) {
        send(otherSocketId, "call:ended", { callId: call.callId });
      }
      removeCall(call.callId);
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
  });

  socket.on("call:peer-offer", (payload) => {
    const { callId, sdp } = payload ?? {};
    const call = getCall(callId);
    if (!call || !sdp) return;
    const otherSocketId =
      socket.id === call.callerSocketId
        ? call.calleeSocketId
        : call.callerSocketId;
    if (otherSocketId) send(otherSocketId, "call:peer-offer", { callId, sdp });
  });

  socket.on("call:peer-answer", (payload) => {
    const { callId, sdp } = payload ?? {};
    const call = getCall(callId);
    if (!call || !sdp) return;
    const otherSocketId =
      socket.id === call.callerSocketId
        ? call.calleeSocketId
        : call.callerSocketId;
    if (otherSocketId) send(otherSocketId, "call:peer-answer", { callId, sdp });
  });

  socket.on("call:ice-candidate", (payload) => {
    const { callId, candidate } = payload ?? {};
    const call = getCall(callId);
    if (!call || candidate == null) return;
    const otherSocketId =
      socket.id === call.callerSocketId
        ? call.calleeSocketId
        : call.callerSocketId;
    if (otherSocketId) {
      send(otherSocketId, "call:ice-candidate", { callId, candidate });
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
    const isParticipant = call.callerId === userId || call.calleeId === userId;
    if (!isParticipant) continue;
    const otherSocketId =
      userId === call.callerId ? call.calleeSocketId : call.callerSocketId;
    if (otherSocketId && ioRef) {
      ioRef.to(otherSocketId).emit("call:ended", { callId });
    }
    removeCall(callId);
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
    }
  } catch (error) {
    logger.error(
      { err: error.message, userId },
      "Failed to clean pending calls on disconnect",
    );
  }
};
