import { useQuery } from "@tanstack/react-query";
import { searchUser } from "../api/user-api";

export function useSearchUsers(query: string, page: number, limit: number) {
  return useQuery({
    queryKey: ["users", query, page, limit],
    queryFn: () => searchUser(query, page, limit),
    select: (data) => data.data,
  });
}
