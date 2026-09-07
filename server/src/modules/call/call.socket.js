import { randomUUID } from "crypto";
import { logger } from "../../config/logger.js";

const CALL_TYPES = new Set(["voice", "video"]);
const RING_TIMEOUT_MS = 30 * 1000;

const calls = new Map(); // callId -> call record

let ioRef = null;

const getCall = (callId) => calls.get(callId);
const removeCall = (callId) => {
  const call = calls.get(callId);
  if (call && call.timeout) clearTimeout(call.timeout);
  calls.delete(callId);
  return call;
};

export const registerCallHandlers = ({ io, socket, getOnline, emitToUser }) => {
  ioRef = io;
  const send = (socketId, event, payload) =>
    io.to(socketId).emit(event, payload);

  socket.on("call:initiate", (payload) => {
    const { conversationId, targetUserId, type, callerName, callId } =
      payload ?? {};
    if (!CALL_TYPES.has(type) || !targetUserId || !conversationId) return;
    if (targetUserId === socket.userId) return;

    const onlineSet = getOnline(targetUserId);
    if (!onlineSet || onlineSet.size === 0) {
      send(socket.id, "call:unavailable", {
        conversationId,
        targetUserId,
        type,
      });
      return;
    }

    const resolvedCallId =
      typeof callId === "string" && callId.length > 0 ? callId : randomUUID();

    const call = {
      callId: resolvedCallId,
      type,
      conversationId,
      callerId: socket.userId,
      callerSocketId: socket.id,
      callerName: typeof callerName === "string" ? callerName : null,
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

  socket.on("call:reject", (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (!call || call.calleeId !== socket.userId) return;
    send(call.callerSocketId, "call:rejected", { callId: call.callId });
    removeCall(call.callId);
  });

  socket.on("call:cancel", (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (!call || call.callerId !== socket.userId) return;
    if (call.calleeSocketId) {
      send(call.calleeSocketId, "call:cancelled", { callId: call.callId });
    }
    removeCall(call.callId);
  });

  socket.on("call:hangup", (payload) => {
    const { callId } = payload ?? {};
    const call = getCall(callId);
    if (!call) return;
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
};

export const handleCallDisconnect = (userId) => {
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
};
