"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { dayKey, dayLabel } from "@/lib/datetime";
import type { CallLog } from "@/types/api";
import type { CallType } from "../call-store";
import { useCallLogs } from "../hooks/useCallLogs";
import { CallItem } from "./call-item";

const FILTERS = ["all", "missed"] as const;
type Filter = (typeof FILTERS)[number];

type CallGroup = { key: string; label: string; items: CallLog[] };

function groupCalls(calls: CallLog[]): CallGroup[] {
  const groups: CallGroup[] = [];
  for (const call of calls) {
    const key = dayKey(call.startedAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.items.push(call);
    else groups.push({ key, label: dayLabel(call.startedAt), items: [call] });
  }
  return groups;
}

export function CallList({
  onCall,
}: {
  onCall: (log: CallLog, type: CallType) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: calls, isLoading, isError } = useCallLogs(filter);
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["call-logs"] });
  };

  useSocketEvents({
    "call:ended": refresh,
    "call:rejected": refresh,
    "call:cancelled": refresh,
    "call:timed-out": refresh,
    "call:unavailable": refresh,
    "call:pending-expired": refresh,
    "call:pending-timed-out": refresh,
    "call:accepted": refresh,
  });

  const groups = useMemo(() => groupCalls(calls ?? []), [calls]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b p-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "text-muted-foreground hover:bg-accent/60 rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === option && "bg-accent text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <Spinner size="sm" className="text-muted-foreground h-5 w-5" />
          </div>
        )}

        {isError && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-xs">Couldn&apos;t load calls.</p>
            <p className="text-[11px]">Check that the API is running.</p>
          </div>
        )}

        {!isLoading && !isError && groups.length === 0 && (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={Phone}
              title={filter === "missed" ? "No missed calls" : "No calls yet"}
              description={
                filter === "missed"
                  ? "When you miss a call, it will show up here."
                  : "Voice and video calls will show up here."
              }
            />
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium">
              {group.label}
            </p>
            {group.items.map((log) => (
              <CallItem
                key={log.id}
                log={log}
                currentUserId={currentUserId}
                onCall={onCall}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
