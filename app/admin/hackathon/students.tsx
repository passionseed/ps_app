import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppText as Text } from "../../../components/AppText";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import type {
  HackathonAdminDashboard,
  HackathonAdminStudentRow,
} from "../../../types/hackathon-admin";

type SortKey = "recent" | "submissions" | "name";

async function loadDashboard(): Promise<HackathonAdminDashboard> {
  const mod = await import("../../../lib/hackathonAdmin");
  return mod.getHackathonAdminDashboard();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0 || Number.isNaN(diff)) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StudentsScreen() {
  const [dashboard, setDashboard] = useState<HackathonAdminDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");

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

  const students = useMemo(() => {
    if (!dashboard) return [];
    const { deriveStudentDirectory } = require("../../../lib/hackathonAdmin");
    const rows = deriveStudentDirectory(dashboard) as HackathonAdminStudentRow[];

    if (sortBy === "submissions")
      return [...rows].sort((a, b) => b.submissionCount - a.submissionCount);
    if (sortBy === "name")
      return [...rows].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
    return rows; // default: recent (already sorted)
  }, [dashboard, sortBy]);

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
      <Text style={s.title}>Students</Text>
      <Text style={s.subtitle}>{students.length} participants</Text>

      <View style={s.sortRow}>
        {(["recent", "submissions", "name"] as SortKey[]).map((key) => (
          <Pressable
            key={key}
            style={[s.sortBtn, sortBy === key && s.sortActive]}
            onPress={() => setSortBy(key)}
          >
            <Text style={[s.sortText, sortBy === key && s.sortTextActive]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.list}>
        {students.map((student) => (
          <Pressable
            key={student.participantId}
            style={s.row}
            onPress={() =>
              router.push(
                `/admin/hackathon/student/${student.participantId}` as never,
              )
            }
          >
            <View style={s.rowLeft}>
              <Text style={s.rowName} numberOfLines={1}>
                {student.teamEmoji ? `${student.teamEmoji} ` : ""}
                {student.name ?? "Unknown"}
              </Text>
              <Text style={s.rowMeta} numberOfLines={1}>
                {student.teamName ?? "No team"} ·{" "}
                {student.submissionCount} submissions
              </Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowTime}>
                {timeAgo(student.latestSubmittedAt)}
              </Text>
              <Text style={s.rowLink}>View →</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {students.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText}>No students found</Text>
        </View>
      )}

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
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 10 },

  sortRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  sortBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#111118",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortActive: { borderColor: "#22d3ee", backgroundColor: "#071b24" },
  sortText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  sortTextActive: { color: "#22d3ee" },

  list: { gap: 6 },
  row: {
    backgroundColor: "#111118",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLeft: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: "700", color: "#e2e8f0" },
  rowMeta: { fontSize: 11, color: "#64748b", marginTop: 1 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowTime: { fontSize: 10, color: "#64748b" },
  rowLink: { fontSize: 11, fontWeight: "700", color: "#22d3ee" },

  empty: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#334155",
    backgroundColor: "#0b0b12",
    padding: 16,
    alignItems: "center",
  },
  emptyText: { fontSize: 12, color: "#64748b" },
});
