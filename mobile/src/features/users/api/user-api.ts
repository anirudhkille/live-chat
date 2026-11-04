import { api } from "@/lib/api";
import type { ApiResponse, User } from "@/types/api";

export const userApi = {
  search: async (query: string) => {
    const { data } = await api.get<ApiResponse<User[]>>(`/user/search`, { params: { q: query } });
    return data.data;
  },
  me: async () => {
    const { data } = await api.get<ApiResponse<User>>(`/user/me`);
    return data.data;
  },
};