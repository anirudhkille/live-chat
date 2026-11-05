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

export const getSubscriptionsByUserIds = (userIds) => {
  return prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
  });
};

export const upsertExpoPushToken = ({ userId, token }) => {
  return prisma.expoPushToken.upsert({
    where: { token },
    update: { userId },
    create: { userId, token },
  });
};

export const deleteExpoPushToken = (userId, token) => {
  return prisma.expoPushToken.deleteMany({
    where: { userId, token },
  });
};

export const deleteExpoPushTokenByToken = (token) => {
  return prisma.expoPushToken.deleteMany({
    where: { token },
  });
};

export const getExpoPushTokensByUserId = (userId) => {
  return prisma.expoPushToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const getExpoPushTokensByUserIds = (userIds) => {
  return prisma.expoPushToken.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
  });
};
