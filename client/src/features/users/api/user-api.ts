import { api } from "@/lib/api";
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
