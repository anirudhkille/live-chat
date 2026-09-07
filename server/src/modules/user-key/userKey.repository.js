import { prisma } from "../../config/prisma.js";

export const findById = (userId) => {
  return prisma.userKey.findUnique({ where: { userId } });
};

export const findPublicKey = (userId) => {
  return prisma.userKey.findUnique({
    where: { userId },
    select: { publicKey: true },
  });
};

export const upsert = (userId, publicKey, recoveryBlob) => {
  return prisma.userKey.upsert({
    where: { userId },
    update: { publicKey, recoveryBlob },
    create: { userId, publicKey, recoveryBlob },
  });
};
