import { api, putPresignedObject } from "@/lib/api";
import type { ApiResponse, User } from "@/types/api";

export async function searchUser(
  search: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<User[]>> {
  const response = await api.get<ApiResponse<User[]>>(
    `/user/search?search=${search}&page=${page}&limit=${limit}`
  );
  return response.data;
}

export type AvatarUploadUrl = {
  uploadUrl: string;
  key: string;
};

export async function getAvatarUploadUrl(
  contentType: string
): Promise<ApiResponse<AvatarUploadUrl>> {
  const response = await api.post<ApiResponse<AvatarUploadUrl>>(
    "/user/me/avatar-url",
    { contentType }
  );
  return response.data;
}

export async function confirmAvatarUpload(
  key: string
): Promise<ApiResponse<User>> {
  const response = await api.post<ApiResponse<User>>("/user/me/avatar", {
    key,
  });
  return response.data;
}

export async function uploadAvatar(
  blob: Blob,
  contentType: string
): Promise<ApiResponse<User>> {
  const { data: urlData } = await getAvatarUploadUrl(contentType);
  await putPresignedObject(urlData.uploadUrl, blob, contentType);
  return confirmAvatarUpload(urlData.key);
}
