import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText as Text } from "../../../components/AppText";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import { router } from "expo-router";
import type {
  HackathonAdminDashboard,
  HackathonAdminInboxItem,
} from "../../../types/hackathon-admin";

type GroupMode = "time" | "phase" | "activity";

async function loadDashboard(): Promise<HackathonAdminDashboard> {
  const mod = await import("../../../lib/hackathonAdmin");
  return mod.getHackathonAdminDashboard();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0 || Number.isNaN(diff)) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SubmissionsScreen() {
  const [dashboard, setDashboard] = useState<HackathonAdminDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupMode>("time");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await loadDashboard();
      setDashboard(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allItems = useMemo(() => {
    if (!dashboard) return [];
    const { deriveSubmissionInbox } = require("../../../lib/hackathonAdmin");
    return deriveSubmissionInbox(dashboard) as HackathonAdminInboxItem[];
  }, [dashboard]);

  const grouped = useMemo(() => {
    if (groupBy === "time") return [{ label: `All (${allItems.length})`, items: allItems }];
    const map = new Map<string, HackathonAdminInboxItem[]>();
    for (const item of allItems) {
      const key =
        groupBy === "phase"
          ? item.phaseTitle
          : item.activityTitle;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      label: `${label} (${items.length})`,
      items,
    }));
  }, [allItems, groupBy]);

  if (loading) {
    return (
      <View style={s.center}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor="#22d3ee"
        />
      }
    >
      <Text style={s.title}>Submissions</Text>
      <Text style={s.subtitle}>{allItems.length} total submissions</Text>

      {/* Group toggle */}
      <View style={s.toggleRow}>
        {(["time", "phase", "activity"] as GroupMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[s.toggleBtn, groupBy === mode && s.toggleBtnActive]}
            onPress={() => setGroupBy(mode)}
          >
            <Text
              style={[
                s.toggleText,
                groupBy === mode && s.toggleTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {grouped.map((group) => (
        <View key={group.label} style={s.group}>
          {groupBy !== "time" && (
            <Text style={s.groupLabel}>{group.label}</Text>
          )}
          <View style={s.list}>
            {group.items.map((item) => (
              <Pressable
                key={item.submissionId}
                style={s.row}
                onPress={() =>
                  setExpandedId((prev) =>
                    prev === item.submissionId ? null : item.submissionId,
                  )
                }
              >
                <View style={s.rowTop}>
                  <View style={s.rowLeft}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {item.participantName ?? "Unknown"}
                    </Text>
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {item.activityTitle} · {item.teamName ?? "No team"}
                    </Text>
                  </View>
                  <View style={s.rowRight}>
                    <View
                      style={[
                        s.badge,
                        item.scope === "team" ? s.badgeTeam : s.badgeSolo,
                      ]}
                    >
                      <Text style={s.badgeText}>
                        {item.scope === "team" ? "Team" : "Solo"}
                      </Text>
                    </View>
                    <Text style={s.rowTime}>{timeAgo(item.submittedAt)}</Text>
                  </View>
                </View>

                {expandedId === item.submissionId && (
                  <View style={s.expanded}>
                    <Text style={s.expandedLabel}>Phase</Text>
                    <Text style={s.expandedValue}>{item.phaseTitle}</Text>
                    <Text style={s.expandedLabel}>Submitted</Text>
                    <Text style={s.expandedValue}>
                      {fmtDate(item.submittedAt)}
                    </Text>
                    {item.textAnswer && (
                      <>
                        <Text style={s.expandedLabel}>Answer</Text>
                        <Text style={s.expandedAnswer} numberOfLines={6}>
                          {item.textAnswer}
                        </Text>
                      </>
                    )}
                    {(item.imageUrl ||
                      (item.fileUrls && item.fileUrls.length > 0)) && (
                      <Text style={s.expandedAssets}>
                        {[
                          item.imageUrl ? "Image" : null,
                          item.fileUrls?.length
                            ? `${item.fileUrls.length} file(s)`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                    <View style={s.expandedActions}>
                      {item.participantId && (
                        <Pressable
                          style={s.actionBtn}
                          onPress={() =>
                            router.push(
                              `/admin/hackathon/student/${item.participantId}` as never,
                            )
                          }
                        >
                          <Text style={s.actionText}>View Student</Text>
                        </Pressable>
                      )}
                      {item.teamId && (
                        <Pressable
                          style={s.actionBtn}
                          onPress={() =>
                            router.push(
                              `/admin/hackathon/team/${item.teamId}` as never,
                            )
                          }
                        >
                          <Text style={s.actionText}>View Team</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 16 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#f8fafc" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 12 },

  toggleRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  toggleBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#111118",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnActive: { borderColor: "#22d3ee", backgroundColor: "#071b24" },
  toggleText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  toggleTextActive: { color: "#22d3ee" },

  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 6,
  },
  list: { gap: 6 },

  row: {
    backgroundColor: "#111118",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLeft: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: "700", color: "#e2e8f0" },
  rowMeta: { fontSize: 11, color: "#64748b", marginTop: 1 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1 },
  badgeTeam: { borderColor: "#155e75", backgroundColor: "#0a1f2a" },
  badgeSolo: { borderColor: "#6d28d9", backgroundColor: "#180b2b" },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#94a3b8" },
  rowTime: { fontSize: 10, color: "#64748b" },

  expanded: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingTop: 8,
    gap: 4,
  },
  expandedLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  expandedValue: { fontSize: 12, color: "#cbd5e1" },
  expandedAnswer: { fontSize: 12, color: "#e2e8f0", lineHeight: 17 },
  expandedAssets: {
    fontSize: 11,
    color: "#22d3ee",
    fontWeight: "700",
    marginTop: 4,
  },
  expandedActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0b0b12",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: { fontSize: 11, fontWeight: "700", color: "#22d3ee" },
});
