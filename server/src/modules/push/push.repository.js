import { prisma } from "../../config/prisma.js";

export const upsertSubscription = ({ userId, endpoint, keys }) => {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, keys },
    create: { userId, endpoint, keys },
  });
};

export const deleteSubscription = (userId, endpoint) => {
  return prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
};

export const getSubscriptionsByUserId = (userId) => {
  return prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};