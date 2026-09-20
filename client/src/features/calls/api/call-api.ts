import { api } from "@/lib/api";
import type { ApiResponse, CallLog } from "@/types/api";

export type CallLogFilter = "all" | "missed";

export async function getCallLogs(
  filter: CallLogFilter = "all"
): Promise<ApiResponse<CallLog[]>> {
  const response = await api.get<ApiResponse<CallLog[]>>("/call", {
    params: filter === "missed" ? { filter: "missed" } : undefined,
  });
  return response.data;
}
