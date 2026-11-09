import { File, UploadType } from "expo-file-system";

import { api } from "@/lib/api";
import type { ApiResponse, User, UserPreferences } from "@/types/api";

export type AvatarUploadInput = {
  uri: string;
  contentType: string;
};

export const userApi = {
  search: async (query: string) => {
    const { data } = await api.get<ApiResponse<User[]>>(`/user/search`, {
      params: { search: query, limit: 30 },
    });
    return data.data;
  },
  getPreferences: async () => {
    const { data } =
      await api.get<ApiResponse<UserPreferences>>(`/user/me/preferences`);
    return data.data;
  },
  updatePreferences: async (body: Partial<UserPreferences>) => {
    const { data } = await api.patch<ApiResponse<UserPreferences>>(
      `/user/me/preferences`,
      body,
    );
    return data.data;
  },
  getAvatarUploadUrl: async (contentType: string) => {
    const { data } = await api.post<
      ApiResponse<{ uploadUrl: string; key: string }>
    >(`/user/me/avatar-url`, { contentType });
    return data.data;
  },
  confirmAvatar: async (key: string) => {
    const { data } = await api.post<ApiResponse<User>>(`/user/me/avatar`, {
      key,
    });
    return data.data;
  },
  uploadAvatar: async ({ uri, contentType }: AvatarUploadInput) => {
    const { uploadUrl, key } = await userApi.getAvatarUploadUrl(contentType);

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

    return userApi.confirmAvatar(key);
  },
  getWallpaperUploadUrl: async (contentType: string) => {
    const { data } = await api.post<
      ApiResponse<{ uploadUrl: string; key: string }>
    >(`/user/me/wallpaper-url`, { contentType });
    return data.data;
  },
  confirmWallpaper: async (key: string) => {
    const { data } = await api.post<ApiResponse<UserPreferences>>(
      `/user/me/wallpaper`,
      { key },
    );
    return data.data;
  },
};
