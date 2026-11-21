import { useQuery } from "@tanstack/react-query";
import { getOwnKey } from "../api/user-key-api";
import { useAuthStore } from "@/store/auth-store";

export function useUserKey() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  return useQuery({
    queryKey: ["user-key", "me", userId],
    queryFn: async () => {
      const { data } = await getOwnKey();
      return data;
    },
    enabled: !!userId,
  });
}
