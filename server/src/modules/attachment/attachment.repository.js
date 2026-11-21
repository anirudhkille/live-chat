import { prisma } from "../../config/prisma.js";

export const createAttachment = (data) => {
  return prisma.attachment.create({ data });
};

export const findByIds = (ids) => {
  return prisma.attachment.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, messageId: true },
  });
};
