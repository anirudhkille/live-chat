import { useQuery } from "@tanstack/react-query";
import { getOwnKey } from "../api/user-key-api";

export function useUserKey() {
  return useQuery({
    queryKey: ["user-key", "me"],
    queryFn: async () => {
      const { data } = await getOwnKey();
      return data;
    },
  });
}
