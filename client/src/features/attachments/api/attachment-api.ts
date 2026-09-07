import { api, putPresignedObject } from "@/lib/api";
import type { ApiResponse, Attachment } from "@/types/api";

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/aac",
];
export const ALLOWED_ATTACHMENT_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES];

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return "Only images and voice messages are supported";
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "Files must be 5MB or smaller";
  }
  return null;
}

type AttachmentUploadUrl = { uploadUrl: string; key: string };

async function getAttachmentUploadUrl(params: {
  contentType: string;
  fileName: string;
  fileSize: number;
}): Promise<ApiResponse<AttachmentUploadUrl>> {
  const response = await api.post<ApiResponse<AttachmentUploadUrl>>(
    "/attachment/upload-url",
    params
  );
  return response.data;
}

async function confirmAttachmentUpload(params: {
  key: string;
  contentType: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: string;
}): Promise<ApiResponse<Attachment>> {
  const response = await api.post<ApiResponse<Attachment>>(
    "/attachment",
    params
  );
  return response.data;
}

function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image dimensions"));
    };
    image.src = url;
  });
}

export function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const { data: urlData } = await getAttachmentUploadUrl({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });

  await putPresignedObject(urlData.uploadUrl, file, file.type);

  const dimensions = isImage ? await readImageDimensions(file) : null;

  const { data: attachment } = await confirmAttachmentUpload({
    key: urlData.key,
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
    ...(dimensions
      ? { width: dimensions.width, height: dimensions.height }
      : {}),
  });

  return attachment;
}

export async function uploadVoiceMessage(
  blob: Blob,
  contentType: string,
  durationSeconds: number
): Promise<Attachment> {
  const fileName = `voice-${Date.now()}.${contentType.split("/")[1] ?? "webm"}`;
  const { data: urlData } = await getAttachmentUploadUrl({
    contentType,
    fileName,
    fileSize: blob.size,
  });

  await putPresignedObject(urlData.uploadUrl, blob, contentType);

  const { data: attachment } = await confirmAttachmentUpload({
    key: urlData.key,
    contentType,
    fileName,
    fileSize: blob.size,
    duration: formatDuration(durationSeconds),
  });

  return attachment;
}
