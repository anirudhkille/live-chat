import { api, putPresignedObject } from "@/lib/api";
import type { ApiResponse, Attachment } from "@/types/api";

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported";
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
}): Promise<ApiResponse<Attachment>> {
  const response = await api.post<ApiResponse<Attachment>>("/attachment", params);
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

export async function uploadAttachment(file: File): Promise<Attachment> {
  const { data: urlData } = await getAttachmentUploadUrl({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });

  await putPresignedObject(urlData.uploadUrl, file, file.type);

  const dimensions = await readImageDimensions(file);

  const { data: attachment } = await confirmAttachmentUpload({
    key: urlData.key,
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
    width: dimensions.width,
    height: dimensions.height,
  });

  return attachment;
}