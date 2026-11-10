import type { CallLog } from "@/types/api";

export type CallDirection = "outgoing" | "incoming";
export type CallTone = "success" | "danger";

export function callDirection(
  log: Pick<CallLog, "callerId">,
  currentUserId?: string,
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

export function formatCallDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayKey(value: string): string {
  const date = parseDate(value);
  if (!date) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(value: string): string {
  const date = parseDate(value);
  if (!date) return "Unknown";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function formatCallTime(value: string): string {
  const date = parseDate(value);
  if (!date) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
