import { prisma } from "../../config/prisma.js";

export const create = (email) => {
  return prisma.user.create({ data: { email } });
};

export const upsertByEmail = (email) => {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });
};

export const findEmail = (email) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findById = (id) => {
  return prisma.user.findUnique({ where: { id } });
};

export const findByIds = (ids) => {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
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

export const updateAvatar = (userId, avatarUrl) => {
  return prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });
};

export const findPreferencesById = (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      showOnline: true,
      readReceipts: true,
      profileVisible: true,
      phoneVisible: true,
      typingIndicators: true,
      pushNotifications: true,
      chatWallpaperUrl: true,
      chatWallpaperColor: true,
    },
  });
};

export const updatePreferences = (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      showOnline: true,
      readReceipts: true,
      profileVisible: true,
      phoneVisible: true,
      typingIndicators: true,
      pushNotifications: true,
      chatWallpaperUrl: true,
      chatWallpaperColor: true,
    },
  });
};

export const updateWallpaper = (userId, wallpaperUrl) => {
  return prisma.user.update({
    where: { id: userId },
    data: { chatWallpaperUrl: wallpaperUrl },
  });
};

export const updatePresence = (id, isOnline, lastOnlineAt) => {
  return prisma.user.update({
    where: { id },
    data: { isOnline, lastOnlineAt },
  });
};
