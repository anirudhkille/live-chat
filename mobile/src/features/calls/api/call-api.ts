import { api } from "@/lib/api";
import type { ApiResponse, CallLog } from "@/types/api";

import type { CallLogFilter } from "../types";

export type { CallLogFilter } from "../types";

export const callApi = {
  list: async (filter: CallLogFilter = "all") => {
    const { data } = await api.get<ApiResponse<CallLog[]>>(`/call`, {
      params: filter === "missed" ? { filter: "missed" } : undefined,
    });
    return data.data;
  },
};
