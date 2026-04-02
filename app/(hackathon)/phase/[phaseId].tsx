// app/(hackathon)/phase/[phaseId].tsx
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../../components/AppText";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { getPhaseWithActivities } from "../../../lib/hackathonPhaseActivity";
import { readHackathonParticipant } from "../../../lib/hackathon-mode";
import { getPreviewPhaseWithActivities } from "../../../lib/hackathonProgramPreview";
import { Space } from "../../../lib/theme";
import type { HackathonPhaseWithActivities, HackathonPhaseActivityDetail } from "../../../types/hackathon-phase-activity";
import { fetchActivitySubmissionStatuses } from "../../../lib/hackathon-submit";

// ── Bioluminescent tokens ────────────────────────────────────────
const BG      = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN    = "#91C4E3";
const BLUE    = "#65ABFC";
const CYAN45  = "rgba(145,196,227,0.45)";
const BORDER  = "rgba(74,107,130,0.35)";
const WHITE   = "#FFFFFF";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";

type ActivityStatus = "not_started" | "draft" | "submitted" | "passed" | "revision_required";

type ActivityWithStatus = HackathonPhaseActivityDetail & {
  status: ActivityStatus;
};

async function fetchActivityStatuses(
  activities: HackathonPhaseActivityDetail[],
  _participantId: string
): Promise<Record<string, ActivityStatus>> {
  const ids = activities.map((a) => a.id);
  const raw = await fetchActivitySubmissionStatuses(ids);
  const result: Record<string, ActivityStatus> = {};
  for (const [id, status] of Object.entries(raw)) {
    result[id] = status as ActivityStatus;
  }
  return result;
}

export default function HackathonPhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<HackathonPhaseWithActivities | null>(null);
  const [activities, setActivities] = useState<ActivityWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [phaseData, participant] = await Promise.all([
            getPhaseWithActivities(phaseId!),
            readHackathonParticipant(),
          ]);

          if (cancelled) return;

          const resolvedPhase = phaseData ?? getPreviewPhaseWithActivities(phaseId!);
          console.log("[PhaseScreen] activities count:", resolvedPhase.activities.length, "phaseId:", phaseId);

          setPhase(resolvedPhase);
          setParticipantId(participant?.id ?? null);

          if (participant?.id && resolvedPhase.activities.length > 0) {
            const statuses = await fetchActivityStatuses(resolvedPhase.activities, participant.id);
            if (!cancelled) {
              setActivities(
                resolvedPhase.activities.map((a) => ({
                  ...a,
                  status: statuses[a.id] ?? "not_started",
                }))
              );
            }
          } else {
            if (!cancelled) {
              setActivities(
                resolvedPhase.activities.map((a) => ({ ...a, status: "not_started" }))
              );
            }
          }
        } catch (e) {
          console.error("[PhaseScreen] load error:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [phaseId]),
  );

  const completedCount = activities.filter(
    (a) => a.status === "passed" || a.status === "submitted"
  ).length;
  const totalCount = activities.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>Loading...</AppText>
      </View>
    );
  }

  if (!phase) return null;

  return (
    <View style={styles.root}>
      {/* Glow orbs */}
      <View style={styles.glowCyan} pointerEvents="none" />

      {/* Back button */}
      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>Phase {phase.phase_number}</AppText>
          <AppText variant="bold" style={styles.title}>{phase.title}</AppText>
          {phase.description ? (
            <AppText style={styles.subtitle}>{phase.description}</AppText>
          ) : null}
        </View>

        {/* Debug / Progress Panel */}
        <View style={styles.debugPanel}>
          <AppText style={styles.debugHeading}>Debug · Activity Progress</AppText>

          <View style={styles.debugRow}>
            <AppText style={styles.debugLabel}>Total activities</AppText>
            <AppText style={styles.debugValue}>{totalCount}</AppText>
          </View>
          <View style={styles.debugRow}>
            <AppText style={styles.debugLabel}>Completed</AppText>
            <AppText style={styles.debugValue}>{completedCount} / {totalCount} ({pct}%)</AppText>
          </View>
          <View style={styles.debugRow}>
            <AppText style={styles.debugLabel}>Participant ID</AppText>
            <AppText style={styles.debugValue} numberOfLines={1}>
              {participantId ?? "none (preview)"}
            </AppText>
          </View>

          <View style={styles.debugDivider} />

          {activities.length === 0 ? (
            <AppText style={styles.debugMuted}>No activities found for this phase.</AppText>
          ) : (
            activities.map((a, i) => (
              <View key={a.id} style={styles.debugActivityBlock}>
                <View style={styles.debugActivity}>
                  <View style={styles.debugActivityLeft}>
                    <StatusDot status={a.status} />
                    <AppText style={styles.debugActivityTitle} numberOfLines={1}>
                      {i + 1}. {a.title}
                    </AppText>
                  </View>
                  <AppText style={[styles.debugActivityStatus, statusColor(a.status)]}>
                    {a.status.replace(/_/g, " ")}
                  </AppText>
                </View>
                <View style={styles.debugActivityMeta}>
                  <AppText style={styles.debugMuted}>
                    content: {a.content.length > 0
                      ? a.content.map((c) => c.content_type).join(", ")
                      : "none"}
                  </AppText>
                  <AppText style={styles.debugMuted}>
                    assessment: {a.assessment ? a.assessment.assessment_type : "none"}
                  </AppText>
                  {a.estimated_minutes ? (
                    <AppText style={styles.debugMuted}>~{a.estimated_minutes} min</AppText>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Activity list */}
        {activities.length > 0 && (
          <View style={styles.activitySection}>
            <AppText style={styles.sectionLabel}>Activities</AppText>
            {activities.map((activity) => (
              <Pressable
                key={activity.id}
                style={({ pressed }) => [
                  styles.activityCard,
                  activityCardStyle(activity.status),
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push(`/(hackathon)/activity/${activity.id}`)}
              >
                <View style={styles.activityCardLeft}>
                  <StatusDot status={activity.status} />
                  <View style={styles.activityCardBody}>
                    <AppText variant="bold" style={[styles.activityTitle, activity.status !== "not_started" && statusColor(activity.status)]}>{activity.title}</AppText>
                    {activity.instructions ? (
                      <AppText style={styles.activityInstructions} numberOfLines={2}>
                        {activity.instructions}
                      </AppText>
                    ) : null}
                    <View style={styles.activityMeta}>
                      {activity.estimated_minutes ? (
                        <AppText style={styles.metaChip}>{activity.estimated_minutes} min</AppText>
                      ) : null}
                      {activity.assessment ? (
                        <AppText style={styles.metaChip}>{activity.assessment.assessment_type.replace("_", " ")}</AppText>
                      ) : null}
                      {activity.content.length > 0 ? (
                        <AppText style={styles.metaChip}>{activity.content.length} content</AppText>
                      ) : null}
                    </View>
                  </View>
                </View>
                <AppText style={styles.arrow}>→</AppText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatusDot({ status }: { status: ActivityStatus }) {
  const color = statusColorValue(status);
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function statusColorValue(status: ActivityStatus): string {
  switch (status) {
    case "passed": return "#4ADE80";
    case "submitted": return CYAN;
    case "draft": return "#FACC15";
    case "revision_required": return "#F87171";
    default: return "rgba(255,255,255,0.2)";
  }
}

function statusColor(status: ActivityStatus) {
  return { color: statusColorValue(status) };
}

function activityCardStyle(status: ActivityStatus) {
  switch (status) {
    case "passed":
      return { borderColor: "rgba(74,222,128,0.4)", backgroundColor: "rgba(74,222,128,0.06)" };
    case "submitted":
      return { borderColor: "rgba(145,196,227,0.45)", backgroundColor: "rgba(145,196,227,0.07)" };
    case "revision_required":
      return { borderColor: "rgba(248,113,113,0.4)", backgroundColor: "rgba(248,113,113,0.06)" };
    case "draft":
      return { borderColor: "rgba(250,204,21,0.35)", backgroundColor: "rgba(250,204,21,0.05)" };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Space.lg, paddingBottom: 96, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  glowCyan: {
    position: "absolute", top: -40, left: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: CYAN, opacity: 0.04,
  },
  headerActions: {
    position: "absolute",
    left: Space.lg,
    zIndex: 10,
  },

  header: { gap: Space.sm },
  eyebrow: { fontSize: 10, color: CYAN45, textTransform: "uppercase", letterSpacing: 2.5 },
  title: {
    fontSize: 28, lineHeight: 34, color: WHITE,
    textShadowColor: "rgba(145,196,227,0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: { fontSize: 14, lineHeight: 21, color: WHITE55 },

  // Debug panel
  debugPanel: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 14,
    padding: Space.md,
    gap: Space.sm,
  },
  debugHeading: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CYAN45,
    marginBottom: 4,
  },
  debugRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debugLabel: { fontSize: 12, color: WHITE28 },
  debugValue: { fontSize: 12, color: WHITE55, flex: 1, textAlign: "right" },
  debugDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 4,
  },
  debugMuted: { fontSize: 12, color: WHITE28 },
  debugActivityBlock: { gap: 3 },
  debugActivity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  debugActivityMeta: { paddingLeft: 20, gap: 1 },
  debugActivityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    flex: 1,
  },
  debugActivityTitle: { fontSize: 12, color: WHITE55, flex: 1 },
  debugActivityStatus: { fontSize: 11, textTransform: "capitalize" },

  // Activity list
  activitySection: { gap: Space.sm },
  sectionLabel: {
    fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: CYAN45,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: Space.lg,
    gap: Space.md,
  },
  activityCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
    flex: 1,
  },
  activityCardBody: { flex: 1, gap: 4 },
  activityTitle: { fontSize: 15, color: WHITE },
  activityInstructions: { fontSize: 12, lineHeight: 18, color: WHITE55 },
  activityMeta: { flexDirection: "row", flexWrap: "wrap", gap: Space.xs, marginTop: 4 },
  metaChip: {
    fontSize: 10,
    color: CYAN45,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  arrow: { fontSize: 16, color: BLUE },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 4,
  },
});
