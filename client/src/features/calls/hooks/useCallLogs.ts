import { useQuery } from "@tanstack/react-query";

import { getCallLogs, type CallLogFilter } from "../api/call-api";

export function useCallLogs(filter: CallLogFilter = "all") {
  return useQuery({
    queryKey: ["call-logs", filter],
    queryFn: () => getCallLogs(filter),
    staleTime: 30 * 1000,
    select: (data) => data.data,
  });
}
