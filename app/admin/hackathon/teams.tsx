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
  HackathonAdminTeamSummary,
} from "../../../types/hackathon-admin";

type SortKey = "rank" | "score" | "missing" | "freshness";

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
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function TeamsScreen() {
  const [dashboard, setDashboard] = useState<HackathonAdminDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [showFilter, setShowFilter] = useState<"all" | "on-track" | "at-risk">(
    "all",
  );

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

  const teams = useMemo(() => {
    let list = dashboard?.teams ?? [];

    if (showFilter === "on-track") list = list.filter((t) => t.onTrack);
    else if (showFilter === "at-risk") list = list.filter((t) => !t.onTrack);

    return [...list].sort((a, b) => {
      if (sortBy === "rank") return (a.rank ?? 999) - (b.rank ?? 999);
      if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
      if (sortBy === "missing")
        return b.missingRequiredActivities - a.missingRequiredActivities;
      // freshness
      const aT = a.latestSubmittedAt
        ? new Date(a.latestSubmittedAt).getTime()
        : 0;
      const bT = b.latestSubmittedAt
        ? new Date(b.latestSubmittedAt).getTime()
        : 0;
      return bT - aT;
    });
  }, [dashboard, sortBy, showFilter]);

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
      <Text style={s.title}>Teams</Text>
      <Text style={s.subtitle}>
        {dashboard?.teams.length ?? 0} teams ·{" "}
        {dashboard?.overview.teamsOnTrackCount ?? 0} on track ·{" "}
        {dashboard?.overview.stuckTeamCount ?? 0} at risk
      </Text>

      {/* Filter + Sort */}
      <View style={s.controls}>
        <View style={s.toggleRow}>
          {(["all", "on-track", "at-risk"] as const).map((f) => (
            <Pressable
              key={f}
              style={[s.toggleBtn, showFilter === f && s.toggleActive]}
              onPress={() => setShowFilter(f)}
            >
              <Text
                style={[
                  s.toggleText,
                  showFilter === f && s.toggleTextActive,
                ]}
              >
                {f === "all" ? "All" : f === "on-track" ? "On Track" : "At Risk"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.toggleRow}>
          {(["rank", "score", "missing", "freshness"] as SortKey[]).map(
            (key) => (
              <Pressable
                key={key}
                style={[s.sortBtn, sortBy === key && s.sortActive]}
                onPress={() => setSortBy(key)}
              >
                <Text
                  style={[
                    s.sortText,
                    sortBy === key && s.sortTextActive,
                  ]}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      </View>

      <View style={s.list}>
        {teams.map((team) => {
          const completion =
            team.totalRequiredActivities > 0
              ? team.completedRequiredActivities /
                team.totalRequiredActivities
              : 0;

          return (
            <Pressable
              key={team.id}
              style={[s.card, !team.onTrack && s.cardAtRisk]}
              onPress={() =>
                router.push(
                  `/admin/hackathon/team/${team.id}` as never,
                )
              }
            >
              <View style={s.cardTop}>
                <View style={s.cardRank}>
                  <Text style={s.rankText}>#{team.rank ?? "-"}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName} numberOfLines={1}>
                    {team.name ?? team.team_name ?? "Unnamed"}
                  </Text>
                  <Text style={s.cardPhase} numberOfLines={1}>
                    {team.currentPhase?.title ?? "No phase"}
                  </Text>
                </View>
                <View style={s.cardMeta}>
                  <Text style={s.scoreText}>
                    {team.score ?? 0} pts
                  </Text>
                  <View
                    style={[
                      s.statusPill,
                      team.onTrack ? s.pillGreen : s.pillRed,
                    ]}
                  >
                    <Text
                      style={[
                        s.pillText,
                        team.onTrack ? s.pillTextGreen : s.pillTextRed,
                      ]}
                    >
                      {team.onTrack ? "On Track" : "At Risk"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.progressRow}>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${Math.round(completion * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={s.progressLabel}>
                  {team.completedRequiredActivities}/
                  {team.totalRequiredActivities}
                </Text>
              </View>

              <View style={s.cardStats}>
                <Text style={s.statItem}>
                  Members: {team.members.length}
                </Text>
                <Text style={s.statItem}>
                  Missing: {team.missingRequiredActivities}
                </Text>
                <Text style={s.statItem}>
                  Latest: {timeAgo(team.latestSubmittedAt)}
                </Text>
              </View>

              {!team.onTrack && team.offTrackReason && (
                <Text style={s.offTrackText} numberOfLines={2}>
                  {team.offTrackReason === "missing_required_activities"
                    ? `Missing ${team.missingRequiredActivities} required activities`
                    : team.offTrackReason === "no_recent_submission"
                      ? "No recent submissions"
                      : "No current phase"}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

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
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 8 },

  controls: { gap: 6, marginBottom: 14 },
  toggleRow: { flexDirection: "row", gap: 6 },
  toggleBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#111118",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleActive: { borderColor: "#22d3ee", backgroundColor: "#071b24" },
  toggleText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  toggleTextActive: { color: "#22d3ee" },
  sortBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b0b12",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortActive: { borderColor: "#6d28d9", backgroundColor: "#180b2b" },
  sortText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  sortTextActive: { color: "#a78bfa" },

  list: { gap: 8 },
  card: {
    backgroundColor: "#111118",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
  },
  cardAtRisk: { borderColor: "#7f1d1d" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 12, fontWeight: "800", color: "#e2e8f0" },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: "700", color: "#e2e8f0" },
  cardPhase: { fontSize: 11, color: "#64748b", marginTop: 1 },
  cardMeta: { alignItems: "flex-end", gap: 4 },
  scoreText: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  pillGreen: { borderColor: "#166534", backgroundColor: "#0a1d14" },
  pillRed: { borderColor: "#991b1b", backgroundColor: "#240a0a" },
  pillText: { fontSize: 10, fontWeight: "700" },
  pillTextGreen: { color: "#86efac" },
  pillTextRed: { color: "#fca5a5" },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#22d3ee" },
  progressLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  cardStats: { flexDirection: "row", gap: 12, marginTop: 8 },
  statItem: { fontSize: 11, color: "#64748b" },

  offTrackText: {
    marginTop: 6,
    fontSize: 11,
    color: "#fca5a5",
    lineHeight: 15,
  },
});
