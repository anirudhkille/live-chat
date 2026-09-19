import { redis } from "./redis.js";

export const PENDING_CALL_TTL_SECONDS = 120;
export const PENDING_CALL_TTL_MS = PENDING_CALL_TTL_SECONDS * 1000;

const pendingKey = (callId) => `call:pending:${callId}`;
const userPendingKey = (userId) => `user:pending-calls:${userId}`;

export const setPendingCall = async (call) => {
  const pipeline = redis.pipeline();
  pipeline.set(
    pendingKey(call.callId),
    JSON.stringify(call),
    "EX",
    PENDING_CALL_TTL_SECONDS,
  );
  pipeline.sadd(userPendingKey(call.calleeId), call.callId);
  pipeline.expire(userPendingKey(call.calleeId), PENDING_CALL_TTL_SECONDS);
  await pipeline.exec();
};

export const getPendingCall = async (callId) => {
  const raw = await redis.get(pendingKey(callId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const deletePendingCall = async (callId, calleeId) => {
  const pipeline = redis.pipeline();
  pipeline.del(pendingKey(callId));
  if (calleeId) {
    pipeline.srem(userPendingKey(calleeId), callId);
  }
  await pipeline.exec();
};

export const getPendingCallsForUser = async (userId) => {
  const ids = await redis.smembers(userPendingKey(userId));
  if (ids.length === 0) return [];

  const raws = await redis.mget(ids.map((id) => pendingKey(id)));
  const calls = [];
  const stale = [];

  raws.forEach((raw, index) => {
    if (!raw) {
      stale.push(ids[index]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.status === "pending") {
        calls.push(parsed);
      } else {
        stale.push(ids[index]);
      }
    } catch {
      stale.push(ids[index]);
    }
  });

  if (stale.length > 0) {
    await redis.srem(userPendingKey(userId), ...stale);
  }

  return calls;
};
