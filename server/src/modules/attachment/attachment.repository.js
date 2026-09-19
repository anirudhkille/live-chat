import { prisma } from "../../config/prisma.js";

export const createAttachment = (data) => {
  return prisma.attachment.create({ data });
};
