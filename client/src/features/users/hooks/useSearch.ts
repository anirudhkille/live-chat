import { useQuery } from "@tanstack/react-query";
import { searchUser } from "../api/user-api";

export function useSearchUsers(query: string, page: number, limit: number) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["users", trimmed, page, limit],
    queryFn: () => searchUser(trimmed, page, limit),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
    select: (data) => data.data,
  });
}
