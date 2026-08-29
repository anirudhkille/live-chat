import { prisma } from "../../config/prisma.js";

export const createAttachment = (data) => {
  return prisma.attachment.create({ data });
};

export const linkAttachmentsToMessage = (attachmentIds, messageId) => {
  return prisma.attachment.updateMany({
    where: { id: { in: attachmentIds } },
    data: { messageId },
  });
};
