import { useQuery } from "@tanstack/react-query";

import { callApi } from "../api/call-api";
import type { CallLogFilter } from "../types";

export function useCallLogs(filter: CallLogFilter = "all") {
  return useQuery({
    queryKey: ["call-logs", filter],
    queryFn: () => callApi.list(filter),
    staleTime: 30 * 1000,
  });
}
