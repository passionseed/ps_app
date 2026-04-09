import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText as Text } from "../../../../components/AppText";
import { PathLabSkiaLoader } from "../../../../components/PathLabSkiaLoader";
import type {
  HackathonAdminDashboard,
  HackathonAdminTeamSummary,
  HackathonAdminInboxItem,
} from "../../../../types/hackathon-admin";

async function loadDashboard(): Promise<HackathonAdminDashboard> {
  const mod = await import("../../../../lib/hackathonAdmin");
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

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [dashboard, setDashboard] = useState<HackathonAdminDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const team = useMemo(
    () => dashboard?.teams.find((t) => t.id === teamId) ?? null,
    [dashboard, teamId],
  );

  const submissions = useMemo(() => {
    if (!dashboard || !team) return [];
    const { deriveSubmissionInbox } = require("../../../../lib/hackathonAdmin");
    const all = deriveSubmissionInbox(dashboard) as HackathonAdminInboxItem[];
    const memberIds = new Set(team.members.map((m) => m.participantId));
    return all.filter(
      (s) =>
        s.teamId === teamId ||
        (s.participantId && memberIds.has(s.participantId)),
    );
  }, [dashboard, team, teamId]);

  if (loading) {
    return (
      <View style={s.center}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Team not found</Text>
      </View>
    );
  }

  const completion =
    team.totalRequiredActivities > 0
      ? team.completedRequiredActivities / team.totalRequiredActivities
      : 0;

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
      {/* Header */}
      <View style={s.header}>
        <Text style={s.teamName}>
          {team.name ?? team.team_name ?? "Unnamed Team"}
        </Text>
        <View style={s.headerMeta}>
          <View style={[s.pill, team.onTrack ? s.pillGreen : s.pillRed]}>
            <Text
              style={[
                s.pillText,
                team.onTrack ? s.pillTextGreen : s.pillTextRed,
              ]}
            >
              {team.onTrack ? "On Track" : "At Risk"}
            </Text>
          </View>
          <Text style={s.rankScore}>
            #{team.rank ?? "-"} · {team.score ?? 0} pts
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Phase Progress</Text>
        <Text style={s.phaseLabel}>
          {team.currentPhase?.title ?? "No current phase"}
        </Text>
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
            {team.completedRequiredActivities}/{team.totalRequiredActivities}{" "}
            ({Math.round(completion * 100)}%)
          </Text>
        </View>
        {team.missingRequiredActivities > 0 && (
          <Text style={s.missingText}>
            Missing {team.missingRequiredActivities} required activities
          </Text>
        )}
      </View>

      {/* Members */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          Members ({team.members.length})
        </Text>
        <View style={s.memberList}>
          {team.members.map((member) => (
            <Pressable
              key={member.participantId}
              style={s.memberRow}
              onPress={() =>
                router.push(
                  `/admin/hackathon/student/${member.participantId}` as never,
                )
              }
            >
              <View style={s.memberDot} />
              <Text style={s.memberName} numberOfLines={1}>
                {member.teamEmoji ? `${member.teamEmoji} ` : ""}
                {member.name ?? "Unknown"}
              </Text>
              <Text style={s.memberLink}>View →</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Submissions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          Submissions ({submissions.length})
        </Text>
        {submissions.length > 0 ? (
          <View style={s.subList}>
            {submissions.map((sub) => (
              <View key={sub.submissionId} style={s.subRow}>
                <View style={s.subTop}>
                  <Text style={s.subName} numberOfLines={1}>
                    {sub.participantName ?? "Unknown"}
                  </Text>
                  <Text style={s.subTime}>
                    {timeAgo(sub.submittedAt)}
                  </Text>
                </View>
                <Text style={s.subActivity} numberOfLines={1}>
                  {sub.activityTitle}
                </Text>
                {sub.textAnswer && (
                  <Text style={s.subAnswer} numberOfLines={3}>
                    {sub.textAnswer}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.emptyText}>No submissions yet</Text>
        )}
      </View>

      {/* Info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Info</Text>
        <View style={s.infoGrid}>
          <InfoItem label="Latest activity" value={timeAgo(team.latestSubmittedAt)} />
          <InfoItem label="Status" value={team.onTrack ? "On track" : (team.offTrackReason ?? "Off track")} />
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoItem}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
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

  header: { marginBottom: 16 },
  teamName: { fontSize: 24, fontWeight: "800", color: "#f8fafc" },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  pillGreen: { borderColor: "#166534", backgroundColor: "#0a1d14" },
  pillRed: { borderColor: "#991b1b", backgroundColor: "#240a0a" },
  pillText: { fontSize: 10, fontWeight: "700" },
  pillTextGreen: { color: "#86efac" },
  pillTextRed: { color: "#fca5a5" },
  rankScore: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },

  section: {
    marginBottom: 20,
    backgroundColor: "#111118",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#e2e8f0", marginBottom: 8 },
  phaseLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#22d3ee" },
  progressLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  missingText: { fontSize: 11, color: "#fca5a5", marginTop: 6 },

  memberList: { gap: 6 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0b0b12",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22d3ee" },
  memberName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#e2e8f0" },
  memberLink: { fontSize: 11, fontWeight: "700", color: "#22d3ee" },

  subList: { gap: 6 },
  subRow: {
    backgroundColor: "#0b0b12",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  subTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subName: { fontSize: 13, fontWeight: "700", color: "#e2e8f0", flex: 1 },
  subTime: { fontSize: 10, color: "#64748b" },
  subActivity: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  subAnswer: { fontSize: 12, color: "#cbd5e1", lineHeight: 17, marginTop: 6 },

  infoGrid: { gap: 8 },
  infoItem: { gap: 2 },
  infoLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 13, color: "#e2e8f0" },

  emptyText: { fontSize: 12, color: "#64748b" },
});
