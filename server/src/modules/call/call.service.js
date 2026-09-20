import { logger } from "../../config/logger.js";
import * as callRepository from "./call.repository.js";

const CALL_STATUSES = new Set(["completed", "missed", "declined"]);

const toCallLogResponse = (call, usersById) => ({
  id: call.id,
  callId: call.callId,
  type: call.type,
  status: call.status,
  conversationId: call.conversationId,
  callerId: call.callerId,
  calleeId: call.calleeId,
  caller: usersById.get(call.callerId) ?? null,
  callee: usersById.get(call.calleeId) ?? null,
  durationSeconds: call.durationSeconds,
  startedAt: call.startedAt,
  answeredAt: call.answeredAt,
  endedAt: call.endedAt,
});

export const writeCallLog = (record, endStatus = "missed") => {
  const status = CALL_STATUSES.has(endStatus) ? endStatus : "missed";
  const endedAt = new Date();
  const answeredAt =
    status === "completed" ? (record.answeredAt ?? endedAt) : null;
  const durationSeconds =
    status === "completed"
      ? Math.max(
          0,
          Math.floor((endedAt - (record.answeredAt ?? endedAt)) / 1000),
        )
      : 0;

  const data = {
    type: record.type,
    conversationId: record.conversationId,
    callerId: record.callerId,
    calleeId: record.calleeId,
    status,
    startedAt: record.startedAt ?? new Date(),
    answeredAt,
    endedAt,
    durationSeconds,
  };

  return callRepository.upsert(record.callId, data).catch((error) => {
    logger.error(
      { err: error.message, callId: record.callId },
      "Failed to write call log",
    );
  });
};

export const getCallLogsForUser = async (userId, { filter } = {}) => {
  const status =
    typeof filter === "string" && CALL_STATUSES.has(filter)
      ? filter === "missed"
        ? ["missed", "declined"]
        : filter
      : undefined;
  const rows = await callRepository.findByParticipant(userId, { status });
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.flatMap((row) => [row.callerId, row.calleeId]))];
  const users = await callRepository.findUsersByIds(ids);
  const usersById = new Map(users.map((user) => [user.id, user]));

  return rows.map((row) => toCallLogResponse(row, usersById));
};
