import { AppError } from "../../utils/AppError.js";
import * as userRepository from "./user.repository.js";
import { generatePresignedUploadUrl, buildKey } from "../storage/storage.service.js";
import {env} from "../../config/env.config.js"

export const findUserByEmailOrThrow = async (email) => {
  const user = await userRepository.findEmail(email);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const createUser = async (email) => {
  return userRepository.create(email);
};

export const findUserByIdOrThrow = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const updateUser = async (id, data) => {
  return userRepository.updateById(id, data);
};

export const searchUser = async (search, page, limit, id) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return userRepository.searchUser(search, safePage, safeLimit, id);
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB, enforce client-side too

export async function getAvatarUploadUrl(userId, contentType) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Unsupported file type");
  }

  const key = `avatars/${userId}`;
  const uploadUrl = await generatePresignedUploadUrl(key, contentType);

  return { uploadUrl, key };
}

export async function confirmAvatarUpload(userId, key) {
  const avatarUrl = `${env.R2_PUBLIC_URL}/${key}`;
  return userRepository.updateAvatar(userId, avatarUrl);
}