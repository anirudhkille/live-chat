import type { CallLog } from "@/types/api";

export type CallDirection = "outgoing" | "incoming";
export type CallTone = "success" | "danger";

export function callDirection(
  log: Pick<CallLog, "callerId">,
  currentUserId?: string
): CallDirection {
  return log.callerId === currentUserId ? "outgoing" : "incoming";
}

export function callStatusLabel(log: Pick<CallLog, "status">): string | null {
  if (log.status === "completed") return null;
  return log.status === "declined" ? "Declined" : "Missed";
}

export function callTone(log: Pick<CallLog, "status">): CallTone {
  return log.status === "completed" ? "success" : "danger";
}
