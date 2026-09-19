import { AppError } from "../../utils/AppError.js";
import * as userRepository from "./user.repository.js";
import {
  generatePresignedUploadUrl,
  getObjectMetadata,
} from "../storage/storage.service.js";
import { env } from "../../config/env.config.js";

export const findUserByEmailOrThrow = async (email) => {
  const user = await userRepository.findEmail(email);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const findUserByIdOrThrow = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const searchUser = async (search, page, limit, id) => {
  if (!search?.trim()) {
    throw new AppError(400, "Search query is required");
  }
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return userRepository.searchUser(search.trim(), safePage, safeLimit, id);
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function getAvatarUploadUrl(userId, contentType) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, "Unsupported file type");
  }

  const key = `avatars/${userId}`;
  const uploadUrl = await generatePresignedUploadUrl(key, contentType);

  return { uploadUrl, key };
}

export async function confirmAvatarUpload(userId, key) {
  if (key !== `avatars/${userId}`) {
    throw new AppError(403, "Invalid upload key");
  }
  await assertUploadSize(key);
  const avatarUrl = `${env.R2_PUBLIC_URL}/${key}`;
  return userRepository.updateAvatar(userId, avatarUrl);
}

export async function getWallpaperUploadUrl(userId, contentType) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, "Unsupported file type");
  }

  const key = `wallpapers/${userId}`;
  const uploadUrl = await generatePresignedUploadUrl(key, contentType);

  return { uploadUrl, key };
}

export async function confirmWallpaperUpload(userId, key) {
  if (key !== `wallpapers/${userId}`) {
    throw new AppError(403, "Invalid upload key");
  }
  await assertUploadSize(key);
  const wallpaperUrl = `${env.R2_PUBLIC_URL}/${key}`;
  return userRepository.updateWallpaper(userId, wallpaperUrl);
}

const assertUploadSize = async (key) => {
  let metadata;
  try {
    metadata = await getObjectMetadata(key);
  } catch {
    throw new AppError(404, "Uploaded file not found");
  }
  if ((metadata.ContentLength ?? 0) > MAX_SIZE) {
    throw new AppError(400, "File too large");
  }
};

export const getUserPreferences = async (userId) => {
  const preferences = await userRepository.findPreferencesById(userId);
  if (!preferences) {
    throw new AppError(404, "User not found");
  }
  return preferences;
};

export const updateUserPreferences = async (userId, data) => {
  return userRepository.updatePreferences(userId, data);
};

export const setUserPresence = async (userId, isOnline) => {
  return userRepository.updatePresence(
    userId,
    isOnline,
    isOnline ? null : new Date(),
  );
};
