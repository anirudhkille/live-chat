import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import type { CallLog } from "@/types/api";

import { useCallLogs } from "../hooks/use-call-logs";
import { dayKey, dayLabel } from "../lib/call-meta";
import type { CallLogFilter, CallType } from "../types";
import { CallItem } from "./call-item";

const FILTERS: CallLogFilter[] = ["all", "missed"];

type CallGroup = {
  key: string;
  label: string;
  data: CallLog[];
};

function groupCalls(calls: CallLog[]): CallGroup[] {
  const groups: CallGroup[] = [];
  for (const call of calls) {
    const key = dayKey(call.startedAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.data.push(call);
    else {
      groups.push({
        key,
        label: dayLabel(call.startedAt),
        data: [call],
      });
    }
  }
  return groups;
}

function CallSeparator() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return <View style={styles.separator} />;
}

export function CallList({
  onCall,
}: {
  onCall: (log: CallLog, type: CallType) => void;
}) {
  const [filter, setFilter] = useState<CallLogFilter>("all");
  const currentUserId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { data, isLoading, isError, isFetching, refetch } = useCallLogs(filter);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    };

    socket.on("call:ended", refresh);
    socket.on("call:rejected", refresh);
    socket.on("call:cancelled", refresh);
    socket.on("call:timed-out", refresh);
    socket.on("call:unavailable", refresh);
    socket.on("call:pending-expired", refresh);
    socket.on("call:pending-timed-out", refresh);
    socket.on("call:participants", refresh);
    socket.on("call:participant-joined", refresh);

    return () => {
      socket.off("call:ended", refresh);
      socket.off("call:rejected", refresh);
      socket.off("call:cancelled", refresh);
      socket.off("call:timed-out", refresh);
      socket.off("call:unavailable", refresh);
      socket.off("call:pending-expired", refresh);
      socket.off("call:pending-timed-out", refresh);
      socket.off("call:participants", refresh);
      socket.off("call:participant-joined", refresh);
    };
  }, [queryClient]);

  const groups = useMemo(() => groupCalls(data ?? []), [data]);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((option) => (
          <TouchableOpacity
            key={option}
            activeOpacity={0.7}
            style={[
              styles.filterButton,
              filter === option && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(option)}
            accessibilityRole="button"
            accessibilityLabel={`${option} calls`}
          >
            <Text
              style={[
                styles.filterText,
                filter === option && styles.filterTextActive,
              ]}
            >
              {option === "all" ? "All" : "Missed"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Couldn&apos;t load calls.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void refetch()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CallItem
              log={item}
              currentUserId={currentUserId}
              onCall={onCall}
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.label}</Text>
          )}
          ItemSeparatorComponent={CallSeparator}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={
            groups.length === 0 ? styles.emptyContent : styles.content
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {filter === "missed" ? "No missed calls" : "No calls yet"}
              </Text>
              <Text style={styles.mutedText}>
                {filter === "missed"
                  ? "When you miss a call, it will show up here."
                  : "Voice and video calls will show up here."}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={palette.textMuted}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    filters: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.divider,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    filterButtonActive: { backgroundColor: palette.surface },
    filterText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    filterTextActive: { color: palette.text },
    content: { paddingBottom: 24 },
    emptyContent: { flexGrow: 1 },
    sectionHeader: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 70,
      backgroundColor: palette.divider,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 24,
    },
    emptyTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "700",
    },
    mutedText: {
      color: palette.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: palette.primary,
    },
    retryText: { color: palette.primaryText, fontWeight: "600" },
  });
