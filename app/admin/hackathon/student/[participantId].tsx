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
  HackathonAdminInboxItem,
  HackathonAdminTeamMember,
  HackathonAdminTeamSummary,
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

type StudentInfo = {
  member: HackathonAdminTeamMember;
  team: HackathonAdminTeamSummary;
} | null;

export default function StudentDetailScreen() {
  const { participantId } = useLocalSearchParams<{
    participantId: string;
  }>();
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

  const studentInfo: StudentInfo = useMemo(() => {
    if (!dashboard) return null;
    for (const team of dashboard.teams) {
      const member = team.members.find(
        (m) => m.participantId === participantId,
      );
      if (member) return { member, team };
    }
    return null;
  }, [dashboard, participantId]);

  const submissions = useMemo(() => {
    if (!dashboard) return [];
    const { deriveSubmissionInbox } = require("../../../../lib/hackathonAdmin");
    const all = deriveSubmissionInbox(dashboard) as HackathonAdminInboxItem[];
    return all.filter((s) => s.participantId === participantId);
  }, [dashboard, participantId]);

  if (loading) {
    return (
      <View style={s.center}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  const member = studentInfo?.member;
  const team = studentInfo?.team;
  const displayName = member?.name ?? "Unknown Student";

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
        <Text style={s.name}>
          {member?.teamEmoji ? `${member.teamEmoji} ` : ""}
          {displayName}
        </Text>
        {team && (
          <Pressable
            onPress={() =>
              router.push(`/admin/hackathon/team/${team.id}` as never)
            }
          >
            <Text style={s.teamLink}>
              Team: {team.name ?? team.team_name ?? "Unnamed"} →
            </Text>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatCard label="Submissions" value={String(submissions.length)} />
        <StatCard
          label="Latest"
          value={
            submissions.length > 0
              ? timeAgo(submissions[0].submittedAt)
              : "Never"
          }
        />
        <StatCard label="Team Rank" value={team ? `#${team.rank ?? "-"}` : "—"} />
      </View>

      {/* Submissions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          Submission History ({submissions.length})
        </Text>
        {submissions.length > 0 ? (
          <View style={s.subList}>
            {submissions.map((sub) => (
              <View key={sub.submissionId} style={s.subRow}>
                <View style={s.subTop}>
                  <Text style={s.subActivity} numberOfLines={1}>
                    {sub.activityTitle}
                  </Text>
                  <View
                    style={[
                      s.badge,
                      sub.scope === "team" ? s.badgeTeam : s.badgeSolo,
                    ]}
                  >
                    <Text style={s.badgeText}>
                      {sub.scope === "team" ? "Team" : "Solo"}
                    </Text>
                  </View>
                </View>
                <Text style={s.subPhase}>
                  {sub.phaseTitle} · {fmtDate(sub.submittedAt)}
                </Text>
                {sub.textAnswer && (
                  <Text style={s.subAnswer} numberOfLines={4}>
                    {sub.textAnswer}
                  </Text>
                )}
                {(sub.imageUrl ||
                  (sub.fileUrls && sub.fileUrls.length > 0)) && (
                  <Text style={s.subAssets}>
                    {[
                      sub.imageUrl ? "Image" : null,
                      sub.fileUrls?.length
                        ? `${sub.fileUrls.length} file(s)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyText}>
              No submissions from this student yet
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
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
  name: { fontSize: 24, fontWeight: "800", color: "#f8fafc" },
  teamLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22d3ee",
    marginTop: 4,
  },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#111118",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "800", color: "#f8fafc" },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
    textTransform: "uppercase",
  },

  section: {
    backgroundColor: "#111118",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: 8,
  },

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
    gap: 8,
  },
  subActivity: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e2e8f0",
    flex: 1,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
  },
  badgeTeam: { borderColor: "#155e75", backgroundColor: "#0a1f2a" },
  badgeSolo: { borderColor: "#6d28d9", backgroundColor: "#180b2b" },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#94a3b8" },
  subPhase: { fontSize: 11, color: "#64748b", marginTop: 2 },
  subAnswer: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 17,
    marginTop: 6,
  },
  subAssets: {
    fontSize: 11,
    color: "#22d3ee",
    fontWeight: "700",
    marginTop: 4,
  },

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
