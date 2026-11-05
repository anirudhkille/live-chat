import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export const attachmentApi = {
  getUploadUrl: async (contentType: string, fileName: string) => {
    const { data } = await api.post<
      ApiResponse<{ uploadUrl: string; key: string }>
    >(`/attachment/upload-url`, {
      contentType,
      fileName,
    });
    return data.data;
  },
  confirm: async (key: string) => {
    const { data } = await api.post<ApiResponse<{ id: string; url: string }>>(
      `/attachment`,
      { key },
    );
    return data.data;
  },
};
