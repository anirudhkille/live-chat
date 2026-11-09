import { File, UploadType } from "expo-file-system";

import { api } from "@/lib/api";
import type { ApiResponse, Attachment } from "@/types/api";

export type AttachmentUploadUrlInput = {
  contentType: string;
  fileName: string;
  fileSize: number;
};

export type AttachmentConfirmInput = AttachmentUploadUrlInput & {
  key: string;
  width?: number;
  height?: number;
  duration?: string;
};

export type AttachmentUploadInput = AttachmentUploadUrlInput & {
  uri: string;
  width?: number;
  height?: number;
  duration?: string;
};

export const attachmentApi = {
  getUploadUrl: async (input: AttachmentUploadUrlInput) => {
    const { data } = await api.post<
      ApiResponse<{ uploadUrl: string; key: string }>
    >(`/attachment/upload-url`, input);
    return data.data;
  },
  confirm: async (input: AttachmentConfirmInput) => {
    const { data } = await api.post<ApiResponse<Attachment>>(
      `/attachment`,
      input,
    );
    return data.data;
  },
  upload: async (input: AttachmentUploadInput): Promise<Attachment> => {
    const { uri, contentType, fileName, fileSize, width, height, duration } =
      input;

    const { uploadUrl, key } = await attachmentApi.getUploadUrl({
      contentType,
      fileName,
      fileSize,
    });

    const file = new File(uri);
    const result = await file.upload(uploadUrl, {
      httpMethod: "PUT",
      uploadType: UploadType.BINARY_CONTENT,
      mimeType: contentType,
      headers: { "Content-Type": contentType },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed with status ${result.status}`);
    }

    return attachmentApi.confirm({
      key,
      contentType,
      fileName,
      fileSize,
      width,
      height,
      duration,
    });
  },
};
