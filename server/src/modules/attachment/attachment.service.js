import { randomUUID } from "crypto";
import { env } from "../../config/env.config.js";
import { generatePresignedUploadUrl } from "../storage/storage.service.js";
import * as attachmentRepository from "./attachment.repository.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const CONTENT_TYPE_TO_ENUM = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
};

export async function getAttachmentUploadUrl(
  userId,
  { contentType, fileSize },
) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Unsupported file type");
  }
  if (fileSize && fileSize > MAX_SIZE) {
    throw new Error("File too large");
  }

  const extension = contentType.split("/")[1];
  const key = `attachments/${userId}/${randomUUID()}.${extension}`;

  const uploadUrl = await generatePresignedUploadUrl(
    key,
    contentType,
    MAX_SIZE,
  );

  return { uploadUrl, key };
}

export async function confirmAttachmentUpload(userId, data) {
  const { key, contentType, fileName, fileSize, width, height, duration } =
    data;

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Unsupported file type");
  }
  if (fileSize > MAX_SIZE) {
    throw new Error("File too large");
  }

  const url = `${env.R2_PUBLIC_URL}/${key}`;
  const type = CONTENT_TYPE_TO_ENUM[contentType] ?? "FILE";

  return attachmentRepository.createAttachment({
    url,
    type,
    fileName,
    fileSize,
    width,
    height,
    duration,
  });
}
