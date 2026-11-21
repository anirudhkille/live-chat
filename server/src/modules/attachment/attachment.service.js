import { randomUUID } from "crypto";
import { env } from "../../config/env.config.js";
import { AppError } from "../../utils/AppError.js";
import {
  deleteObject,
  generatePresignedUploadUrl,
  getObjectMetadata,
} from "../storage/storage.service.js";
import * as attachmentRepository from "./attachment.repository.js";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/aac",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const CONTENT_TYPE_TO_ENUM = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "audio/webm": "AUDIO",
  "audio/ogg": "AUDIO",
  "audio/mpeg": "AUDIO",
  "audio/mp4": "AUDIO",
  "audio/wav": "AUDIO",
  "audio/aac": "AUDIO",
};

export async function getAttachmentUploadUrl(
  userId,
  { contentType, fileSize },
) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, "Unsupported file type");
  }
  if (fileSize && fileSize > MAX_SIZE) {
    throw new AppError(400, "File too large");
  }

  const extension = contentType.split("/")[1];
  const key = `attachments/${userId}/${randomUUID()}.${extension}`;

  const uploadUrl = await generatePresignedUploadUrl(key, contentType);

  return { uploadUrl, key };
}

export async function confirmAttachmentUpload(userId, data) {
  const { key, contentType, fileName, fileSize, width, height, duration } =
    data;

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, "Unsupported file type");
  }
  if (fileSize > MAX_SIZE) {
    throw new AppError(400, "File too large");
  }
  const prefix = `attachments/${userId}/`;
  if (!key.startsWith(prefix) || key.includes("..")) {
    throw new AppError(403, "Invalid upload key");
  }
  const objectName = key.slice(prefix.length);
  if (!objectName || objectName.includes("/")) {
    throw new AppError(403, "Invalid upload key");
  }

  let metadata;
  try {
    metadata = await getObjectMetadata(key);
  } catch {
    throw new AppError(404, "Uploaded file not found");
  }
  if ((metadata.ContentLength ?? 0) !== fileSize) {
    await deleteObject(key).catch(() => {});
    throw new AppError(400, "Upload size does not match declared size");
  }
  if (metadata.ContentType && metadata.ContentType !== contentType) {
    await deleteObject(key).catch(() => {});
    throw new AppError(400, "Upload content type does not match declared type");
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
