import { prisma } from "../../config/prisma.js";

export const create = (email) => {
  return prisma.user.create({ data: { email } });
};

export const findEmail = (email) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findById = (id) => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateById = (id, data) => {
  return prisma.user.update({ where: { id }, data });
};