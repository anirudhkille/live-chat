import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import { registerExpoPushToken } from "./register";

export const pushApi = {
  register: registerExpoPushToken,
  unregister: async (token: string) => {
    const { data } = await api.delete<ApiResponse<null>>("/push/expo-token", {
      data: { token },
    });
    return data;
  },
};

export { registerExpoPushToken };
export default pushApi;
