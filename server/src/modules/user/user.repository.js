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

export const searchUser = (search, page, limit, id) => {
  return prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
        {
          id: { not: id },
        },
      ],
    },
    take: limit,
    skip: (page - 1) * limit,
  });
};

export const updateAvatar=(userId,avatarUrl)=>{

return  prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  })
}