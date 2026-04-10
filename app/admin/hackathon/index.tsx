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
  HackathonAdminInboxItem,
  HackathonAdminAttentionItem,
  HackathonAdminTeamSummary,
  HackathonAdminPhaseSummary,
} from "../../../types/hackathon-admin";

const INBOX_LIMIT = 8;
const TEAM_LIMIT = 6;

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

function fmtNum(n: number | null | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

export default function CommandCenterScreen() {
  const [dashboard, setDashboard] = useState<HackathonAdminDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await loadDashboard();
      setDashboard(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const inbox = useMemo(() => {
    if (!dashboard) return [];
    const { deriveSubmissionInbox } = require("../../../lib/hackathonAdmin");
    return (deriveSubmissionInbox(dashboard) as HackathonAdminInboxItem[]).slice(
      0,
      INBOX_LIMIT,
    );
  }, [dashboard]);

  const attention = useMemo(() => {
    if (!dashboard) return [];
    const { deriveAttentionQueue } = require("../../../lib/hackathonAdmin");
    return deriveAttentionQueue(dashboard) as HackathonAdminAttentionItem[];
  }, [dashboard]);

  const teamPreview = useMemo(
    () => (dashboard?.teams ?? []).slice(0, TEAM_LIMIT),
    [dashboard],
  );

  if (loading) {
    return (
      <View style={s.center}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (error && !dashboard) {
    return (
      <View style={s.errorWrap}>
        <Text style={s.pageTitle}>Command Center</Text>
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={load}>
          <Text style={s.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const ov = dashboard!.overview;
  const phases = dashboard!.phases;
  const currentPhase = phases.find((p) => p.id === ov.currentPhaseId);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22d3ee"
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Command Center</Text>
        <Text style={s.pageSubtitle}>
          {currentPhase
            ? `Phase ${currentPhase.phase_number}: ${currentPhase.title}`
            : "Hackathon Dashboard"}
        </Text>
      </View>

      {error && (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>Refresh failed: {error}</Text>
        </View>
      )}

      {/* Hero Metrics */}
      <View style={s.heroStrip}>
        <HeroMetric label="Students" value={ov.participantCount} tone="cyan" />
        <HeroMetric label="On Track" value={ov.teamsOnTrackCount} tone="green" />
        <HeroMetric label="At Risk" value={ov.stuckTeamCount} tone="red" />
        <HeroMetric label="24h Subs" value={ov.submissionsLast24h} tone="violet" />
      </View>

      <View style={s.heroStrip}>
        <HeroMetric label="Teams" value={ov.teamCount} tone="blue" />
        <HeroMetric label="Assigned" value={ov.assignedParticipantCount} tone="emerald" />
        <HeroMetric label="Unassigned" value={ov.unassignedParticipantCount} tone="amber" />
        <HeroMetric label="Phase %" value={ov.currentPhaseSubmissionRate} tone="rose" suffix="%" />
      </View>

      {/* Submission Inbox */}
      <SectionHeader
        title="Latest Submissions"
        count={inbox.length}
        actionLabel="View All"
        onAction={() =>
          router.push("/admin/hackathon/submissions" as never)
        }
      />
      {inbox.length > 0 ? (
        <View style={s.cardList}>
          {inbox.map((item) => (
            <InboxRow key={item.submissionId} item={item} />
          ))}
        </View>
      ) : (
        <EmptyCard text="No submissions yet" />
      )}

      {/* Attention Queue */}
      {attention.length > 0 && (
        <>
          <SectionHeader
            title="Needs Attention"
            count={attention.length}
            accent
            actionLabel="All Teams"
            onAction={() =>
              router.push("/admin/hackathon/teams" as never)
            }
          />
          <View style={s.cardList}>
            {attention.map((item) => (
              <Pressable
                key={item.id}
                style={s.attentionRow}
                onPress={() =>
                  router.push(
                    `/admin/hackathon/team/${item.id}` as never,
                  )
                }
              >
                <View
                  style={[
                    s.severityDot,
                    item.severity === "critical"
                      ? s.dotCritical
                      : s.dotWarning,
                  ]}
                />
                <View style={s.attentionInfo}>
                  <Text style={s.attentionName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.attentionReason} numberOfLines={1}>
                    {item.reason}
                  </Text>
                </View>
                <Text style={s.attentionTime}>
                  {item.lastActiveAt ? timeAgo(item.lastActiveAt) : "Never"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Team Leaderboard */}
      <SectionHeader
        title="Team Leaderboard"
        count={dashboard!.teams.length}
        actionLabel="View All"
        onAction={() => router.push("/admin/hackathon/teams" as never)}
      />
      {teamPreview.length > 0 ? (
        <View style={s.cardList}>
          {teamPreview.map((team) => (
            <TeamPreviewRow key={team.id} team={team} />
          ))}
        </View>
      ) : (
        <EmptyCard text="No teams yet" />
      )}

      {/* Phase Pipeline */}
      <SectionHeader title="Phase Pipeline" count={phases.length} />
      {phases.length > 0 ? (
        <View style={s.cardList}>
          {phases.map((phase) => (
            <PhaseRow key={phase.id} phase={phase} />
          ))}
        </View>
      ) : (
        <EmptyCard text="No phases configured" />
      )}

      {/* Quick Links */}
      <View style={s.quickLinks}>
        <Pressable
          style={s.quickLinkBtn}
          onPress={() => router.push("/admin/hackathon/students" as never)}
        >
          <Text style={s.quickLinkText}>All Students</Text>
        </Pressable>
        <Pressable
          style={s.quickLinkBtn}
          onPress={() =>
            router.push("/admin/hackathon/submissions" as never)
          }
        >
          <Text style={s.quickLinkText}>All Submissions</Text>
        </Pressable>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function HeroMetric({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: keyof typeof toneMap;
  suffix?: string;
}) {
  const colors = toneMap[tone];
  return (
    <View style={[s.heroCard, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <Text style={s.heroValue}>
        {fmtNum(value)}
        {suffix ?? ""}
      </Text>
      <Text style={s.heroLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  accent,
  actionLabel,
  onAction,
}: {
  title: string;
  count?: number;
  accent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <Text style={[s.sectionTitle, accent && { color: "#fca5a5" }]}>
          {title}
        </Text>
        {typeof count === "number" && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={s.viewAllText}>{actionLabel} →</Text>
        </Pressable>
      )}
    </View>
  );
}

function InboxRow({ item }: { item: HackathonAdminInboxItem }) {
  const hasAssets = Boolean(item.imageUrl || (item.fileUrls && item.fileUrls.length > 0));
  return (
    <Pressable
      style={s.inboxRow}
      onPress={() =>
        item.teamId
          ? router.push(`/admin/hackathon/team/${item.teamId}` as never)
          : item.participantId
            ? router.push(`/admin/hackathon/student/${item.participantId}` as never)
            : undefined
      }
    >
      <View style={s.inboxLeft}>
        <Text style={s.inboxName} numberOfLines={1}>
          {item.participantName ?? "Unknown"}
        </Text>
        <Text style={s.inboxActivity} numberOfLines={1}>
          {item.activityTitle}
        </Text>
      </View>
      <View style={s.inboxRight}>
        <View style={s.inboxBadges}>
          <View style={[s.scopeBadge, item.scope === "team" ? s.badgeTeam : s.badgeIndividual]}>
            <Text style={s.scopeBadgeText}>
              {item.scope === "team" ? "Team" : "Solo"}
            </Text>
          </View>
          {hasAssets && (
            <View style={s.assetBadge}>
              <Text style={s.assetBadgeText}>📎</Text>
            </View>
          )}
        </View>
        <Text style={s.inboxTime}>{timeAgo(item.submittedAt)}</Text>
      </View>
    </Pressable>
  );
}

function TeamPreviewRow({ team }: { team: HackathonAdminTeamSummary }) {
  const completion =
    team.totalRequiredActivities > 0
      ? team.completedRequiredActivities / team.totalRequiredActivities
      : 0;

  return (
    <Pressable
      style={s.teamRow}
      onPress={() =>
        router.push(`/admin/hackathon/team/${team.id}` as never)
      }
    >
      <View style={s.teamRank}>
        <Text style={s.teamRankText}>#{team.rank ?? "-"}</Text>
      </View>
      <View style={s.teamInfo}>
        <Text style={s.teamName} numberOfLines={1}>
          {team.name ?? team.team_name ?? "Unnamed"}
        </Text>
        <View style={s.progressTrack}>
          <View
            style={[s.progressFill, { width: `${Math.round(completion * 100)}%` }]}
          />
        </View>
      </View>
      <View style={s.teamMeta}>
        <Text style={s.teamScore}>{fmtNum(team.score)} pts</Text>
        <View
          style={[s.statusDot, team.onTrack ? s.dotGreen : s.dotRed]}
        />
      </View>
    </Pressable>
  );
}

function PhaseRow({ phase }: { phase: HackathonAdminPhaseSummary }) {
  return (
    <View style={[s.phaseRow, phase.isCurrent && s.phaseRowCurrent]}>
      <View style={s.phaseLeft}>
        <View
          style={[
            s.phaseDot,
            phase.isCurrent && s.phaseDotCurrent,
            phase.completionRate === 100 && s.phaseDotComplete,
          ]}
        />
        <Text
          style={[s.phaseName, phase.isCurrent && s.phaseNameCurrent]}
          numberOfLines={1}
        >
          {phase.title}
        </Text>
      </View>
      <View style={s.phaseMeta}>
        <Text style={[s.phaseRate, phase.isCurrent && { color: "#22d3ee" }]}>
          {phase.completionRate}%
        </Text>
        <Text style={s.phaseDetail}>
          {phase.requiredActivityCount} req · {phase.activityCount} total
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const toneMap = {
  cyan: { border: "#155e75", bg: "#071b24" },
  blue: { border: "#1d4ed8", bg: "#07162b" },
  green: { border: "#166534", bg: "#071a12" },
  amber: { border: "#92400e", bg: "#241507" },
  rose: { border: "#9f1239", bg: "#22070f" },
  violet: { border: "#6d28d9", bg: "#180b2b" },
  red: { border: "#991b1b", bg: "#220808" },
  emerald: { border: "#047857", bg: "#051913" },
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 16, paddingBottom: 24 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
  },
  header: { marginBottom: 12 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#f8fafc" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", marginTop: 2 },

  errorWrap: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    padding: 16,
    justifyContent: "center",
  },
  errorText: { fontSize: 13, color: "#fca5a5", marginTop: 8, marginBottom: 14 },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111118",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryBtnText: { fontSize: 13, color: "#e2e8f0", fontWeight: "700" },

  errorBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#92400e",
    backgroundColor: "#231406",
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: { fontSize: 12, color: "#fbbf24" },

  // Hero
  heroStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  heroCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  heroValue: { fontSize: 22, fontWeight: "800", color: "#f8fafc" },
  heroLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600", marginTop: 2, textTransform: "uppercase" },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#e2e8f0" },
  countBadge: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  viewAllText: { fontSize: 12, fontWeight: "700", color: "#22d3ee" },

  // Card list
  cardList: { gap: 6 },

  // Inbox
  inboxRow: {
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
  inboxLeft: { flex: 1, minWidth: 0 },
  inboxName: { fontSize: 13, fontWeight: "700", color: "#e2e8f0" },
  inboxActivity: { fontSize: 11, color: "#64748b", marginTop: 1 },
  inboxRight: { alignItems: "flex-end", gap: 4 },
  inboxBadges: { flexDirection: "row", gap: 4 },
  scopeBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTeam: { backgroundColor: "#0a1f2a", borderWidth: 1, borderColor: "#155e75" },
  badgeIndividual: { backgroundColor: "#180b2b", borderWidth: 1, borderColor: "#6d28d9" },
  scopeBadgeText: { fontSize: 9, fontWeight: "700", color: "#94a3b8" },
  assetBadge: { paddingHorizontal: 2 },
  assetBadgeText: { fontSize: 10 },
  inboxTime: { fontSize: 10, color: "#64748b" },

  // Attention
  attentionRow: {
    backgroundColor: "#1a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  dotCritical: { backgroundColor: "#ef4444" },
  dotWarning: { backgroundColor: "#f59e0b" },
  attentionInfo: { flex: 1, minWidth: 0 },
  attentionName: { fontSize: 13, fontWeight: "700", color: "#fca5a5" },
  attentionReason: { fontSize: 11, color: "#f87171", marginTop: 1 },
  attentionTime: { fontSize: 10, color: "#64748b" },

  // Teams
  teamRow: {
    backgroundColor: "#111118",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  teamRankText: { fontSize: 11, fontWeight: "800", color: "#e2e8f0" },
  teamInfo: { flex: 1, minWidth: 0, gap: 4 },
  teamName: { fontSize: 13, fontWeight: "700", color: "#e2e8f0" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#22d3ee" },
  teamMeta: { alignItems: "flex-end", gap: 4 },
  teamScore: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: "#22c55e" },
  dotRed: { backgroundColor: "#ef4444" },

  // Phase
  phaseRow: {
    backgroundColor: "#111118",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phaseRowCurrent: { borderColor: "#155e75", backgroundColor: "#071b24" },
  phaseLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#334155",
    borderWidth: 2,
    borderColor: "#475569",
  },
  phaseDotCurrent: { backgroundColor: "#22d3ee", borderColor: "#22d3ee" },
  phaseDotComplete: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  phaseName: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  phaseNameCurrent: { color: "#e2e8f0", fontWeight: "700" },
  phaseMeta: { alignItems: "flex-end" },
  phaseRate: { fontSize: 13, fontWeight: "800", color: "#64748b" },
  phaseDetail: { fontSize: 10, color: "#475569", marginTop: 1 },

  // Empty
  emptyCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#334155",
    backgroundColor: "#0b0b12",
    padding: 16,
    alignItems: "center",
  },
  emptyText: { fontSize: 12, color: "#64748b" },

  // Quick links
  quickLinks: { flexDirection: "row", gap: 8, marginTop: 20 },
  quickLinkBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#111118",
    paddingVertical: 12,
    alignItems: "center",
  },
  quickLinkText: { fontSize: 12, fontWeight: "700", color: "#22d3ee" },
});
