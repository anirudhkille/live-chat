import { prisma } from "../../config/prisma.js";

export const upsert = (callId, data) => {
  return prisma.call.upsert({
    where: { callId },
    update: data,
    create: { callId, ...data },
  });
};

export const findByParticipant = (userId, { status } = {}) => {
  const where = { OR: [{ callerId: userId }, { calleeId: userId }] };
  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }
  return prisma.call.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 100,
  });
};

export const findUsersByIds = (ids) => {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, avatar: true },
  });
};
