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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polyline } from "react-native-svg";
import { AppText } from "../../../components/AppText";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { HackathonJellyfishLoader } from "../../../components/Hackathon/HackathonJellyfishLoader";
import { getHackathonActivityHref } from "../../../lib/hackathonActivityRoute";
import { isHackathonActivityAccessible } from "../../../lib/hackathonRelease";
import {
  getCachedHackathonPhaseBundle,
  loadHackathonPhaseBundle,
  preloadHackathonActivityBundle,
  type HackathonPhaseActivityWithStatus,
} from "../../../lib/hackathonScreenData";
import { Space } from "../../../lib/theme";
import type {
  HackathonPhaseWithActivities,
  HackathonPhaseActivitySubmissionStatus,
} from "../../../types/hackathon-phase-activity";

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

type ActivityStatus = HackathonPhaseActivitySubmissionStatus;
type ActivityDisplayStatus = ActivityStatus | "locked";

export default function HackathonPhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const insets = useSafeAreaInsets();
  const cachedBundle = phaseId ? getCachedHackathonPhaseBundle(phaseId) : null;
  const [phase, setPhase] = useState<HackathonPhaseWithActivities | null>(
    cachedBundle?.phase ?? null,
  );
  const [activities, setActivities] = useState<HackathonPhaseActivityWithStatus[]>(
    cachedBundle?.activities ?? [],
  );
  const [loading, setLoading] = useState(!cachedBundle);
  const [isAdmin, setIsAdmin] = useState(cachedBundle?.isAdmin ?? false);
  const [teamSubmissionStatuses, setTeamSubmissionStatuses] = useState<Record<string, string>>(
    cachedBundle?.teamSubmissionStatuses ?? {},
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const cached = phaseId ? getCachedHackathonPhaseBundle(phaseId) : null;
      if (cached) {
        setPhase(cached.phase);
        setActivities(cached.activities);
        setIsAdmin(cached.isAdmin ?? false);
        setTeamSubmissionStatuses(cached.teamSubmissionStatuses ?? {});
        setLoading(false);
      } else {
        setLoading(true);
      }

      (async () => {
        try {
          const bundle = await loadHackathonPhaseBundle(phaseId!);
          if (cancelled) return;
          setPhase(bundle.phase);
          setActivities(bundle.activities);
          setIsAdmin(bundle.isAdmin);
          setTeamSubmissionStatuses(bundle.teamSubmissionStatuses ?? {});
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
    (a) => a.submissionStatus === "passed" || a.submissionStatus === "submitted"
  ).length;
  const totalCount = activities.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <HackathonJellyfishLoader />
        <AppText style={styles.loadingText}>กำลังโหลดรายละเอียดเฟส...</AppText>
      </View>
    );
  }

  if (!phase) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: WHITE28 }}>ไม่พบเฟสนี้</AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Glow orbs */}
      <View style={styles.glowCyan} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      {/* Back button */}
      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/(hackathon)/journey");
          }}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>เฟส {String(phase.phase_number).padStart(2, "0")}</AppText>
          <AppText variant="bold" style={styles.title}>{phase.title}</AppText>
          {phase.description ? (
            <AppText style={styles.subtitle}>{phase.description}</AppText>
          ) : null}
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
            </View>
            <AppText style={styles.progressText}>สำเร็จ {completedCount} จาก {totalCount}</AppText>
          </View>
        </View>

        {/* Activity list */}
        {activities.length > 0 && (
          <View style={styles.activitySection}>
            {activities.map((activity, i) => {
              const prevActivity = i > 0 ? activities[i - 1] : null;
              const prevIsTeam = prevActivity?.submission_scope === "team" ||
                (prevActivity?.assessments ?? []).some((a: any) => a.metadata?.is_group_submission === true);
              const prevSubmissionStatus: HackathonPhaseActivitySubmissionStatus | null = prevActivity
                ? (prevIsTeam
                    ? ((teamSubmissionStatuses[prevActivity.id] as HackathonPhaseActivitySubmissionStatus) ?? null)
                    : (prevActivity.submissionStatus ?? null))
                : null;
              const locked = !isHackathonActivityAccessible({
                phaseStatus: phase.status,
                activityStatus: activity.status,
                previousActivitySubmissionStatus: prevSubmissionStatus,
                isAdmin,
              });
              if (locked) {
                console.log(
                  `[PhaseScreen] Activity ${i + 1} "${activity.title}" is locked`,
                );
              }
              return (
              <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={i}
                  locked={locked}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActivityCard({
  activity,
  index,
  locked,
}: {
  activity: HackathonPhaseActivityWithStatus;
  index: number;
  locked: boolean;
}) {
  const displayStatus: ActivityDisplayStatus = locked ? "locked" : activity.submissionStatus;
  const isCompleted = activity.submissionStatus === "passed" || activity.submissionStatus === "submitted";
  const isDraft = activity.submissionStatus === "draft";
  const isRevision = activity.submissionStatus === "revision_required";
  const isTeam = activity.submission_scope === "team" ||
    (activity.assessments ?? []).some((a: any) => a.metadata?.is_group_submission === true);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.activityCardWrapper,
        locked && { opacity: 0.4 },
        !locked && pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPressIn={() => !locked && void preloadHackathonActivityBundle(activity.id)}
      onPress={() => {
        if (locked) {
          console.log(`[PhaseScreen] Tap blocked — activity "${activity.title}" is locked`);
          return;
        }
        router.push(getHackathonActivityHref(activity.id));
      }}
    >
      <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
        <LinearGradient
          colors={[
            isCompleted ? 'rgba(145, 196, 227, 0.12)' : 'rgba(255, 255, 255, 0.04)', 
            'rgba(255, 255, 255, 0.01)'
          ]}
          style={[
            styles.activityCardInner, 
            isCompleted && { borderColor: 'rgba(145, 196, 227, 0.3)' },
            isRevision && { borderColor: 'rgba(248, 113, 113, 0.4)' },
            isDraft && { borderColor: 'rgba(250, 204, 21, 0.3)' },
            locked && { borderColor: "rgba(255,255,255,0.12)" },
          ]}
        >
          <View style={styles.activityCardLeft}>
            <StatusIcon status={displayStatus} />
            <View style={styles.activityCardBody}>
              <View style={styles.activityHeaderRow}>
                <AppText style={styles.stepLabel}>ขั้นตอน {index + 1}</AppText>
                <AppText style={[styles.statusBadge, statusBadgeStyle(displayStatus)]}>
                  {formatStatus(displayStatus)}
                </AppText>
              </View>
              
              <AppText variant="bold" style={[styles.activityTitle, isCompleted && { color: CYAN }]}>
                {activity.title}
              </AppText>
              
              {activity.instructions ? (
                <AppText style={styles.activityInstructions} numberOfLines={2}>
                  {activity.instructions}
                </AppText>
              ) : null}
              
              <View style={styles.activityMeta}>
                <AppText style={[styles.metaChip, isTeam && styles.metaChipTeam]}>
                  {isTeam ? "👥 ทีม" : "👤 เดี่ยว"}
                </AppText>
                {activity.estimated_minutes ? (
                  <AppText style={styles.metaChip}>⏱️ {activity.estimated_minutes} นาที</AppText>
                ) : null}
                {activity.assessments?.length > 0 ? (
                  <AppText style={styles.metaChip}>📝 {activity.assessments.length > 1 ? `${activity.assessments.length} คำถาม` : formatAssessment(activity.assessments[0].assessment_type)}</AppText>
                ) : null}
              </View>
            </View>
          </View>
          
          <View style={styles.arrowContainer}>
            <AppText style={styles.arrow}>{locked ? "🔒" : "→"}</AppText>
          </View>
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

function StatusIcon({ status }: { status: ActivityDisplayStatus }) {
  const color = statusColorValue(status);
  
  if (status === "passed") {
    return (
      <View style={[styles.statusIconWrap, { backgroundColor: "rgba(74,222,128,0.15)", borderColor: "rgba(74,222,128,0.4)" }]}>
        <Svg width="14" height="14" viewBox="0 0 16 16">
          <Polyline points="3,8 7,12 13,4" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    );
  }
  
  if (status === "submitted") {
    return (
      <View style={[styles.statusIconWrap, { backgroundColor: "rgba(145,196,227,0.15)", borderColor: "rgba(145,196,227,0.4)" }]}>
        <Svg width="14" height="14" viewBox="0 0 16 16">
          <Polyline points="4,8 12,8" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="8,4 12,8 8,12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    );
  }

  // default / draft / not_started / revision
  return (
    <View style={[styles.statusIconWrap, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
    </View>
  );
}

function statusColorValue(status: ActivityDisplayStatus): string {
  switch (status) {
    case "passed": return "#4ADE80";
    case "submitted": return CYAN;
    case "draft": return "#FACC15";
    case "revision_required": return "#F87171";
    case "locked": return "rgba(255,255,255,0.22)";
    default: return "rgba(255,255,255,0.3)";
  }
}

function statusBadgeStyle(status: ActivityDisplayStatus) {
  switch (status) {
    case "passed": return { color: "#4ADE80", backgroundColor: "rgba(74,222,128,0.15)" };
    case "submitted": return { color: CYAN, backgroundColor: "rgba(145,196,227,0.15)" };
    case "draft": return { color: "#FACC15", backgroundColor: "rgba(250,204,21,0.15)" };
    case "revision_required": return { color: "#F87171", backgroundColor: "rgba(248,113,113,0.15)" };
    case "locked": return { color: WHITE55, backgroundColor: "rgba(255,255,255,0.08)" };
    default: return { color: WHITE55, backgroundColor: "rgba(255,255,255,0.1)" };
  }
}

function formatStatus(status: ActivityDisplayStatus) {
  switch (status) {
    case "passed": return "ผ่านแล้ว";
    case "submitted": return "ส่งแล้ว";
    case "draft": return "แบบร่าง";
    case "revision_required": return "ต้องแก้ไข";
    case "locked": return "ยังไม่ปล่อย";
    default: return "ยังไม่เริ่ม";
  }
}

function formatAssessment(type: string) {
  if (type === "text_answer") return "ข้อความ";
  if (type === "file_upload") return "อัปโหลดไฟล์";
  if (type === "image_upload") return "รูปภาพ";
  return type.replace(/_/g, " ");
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Space.lg, paddingBottom: 96, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, gap: Space.md },
  loadingText: {
    color: CYAN,
    fontSize: 14,
    fontFamily: "BaiJamjuree_500Medium",
    letterSpacing: 0.4,
  },

  glowCyan: {
    position: "absolute", top: -80, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: CYAN, opacity: 0.07,
  },
  glowBlue: {
    position: "absolute", top: 100, right: -100,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: BLUE, opacity: 0.05,
  },
  headerActions: {
    position: "absolute",
    left: Space.lg,
    zIndex: 10,
  },

  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2.5, fontFamily: "BaiJamjuree_700Bold" },
  title: {
    fontSize: 32, lineHeight: 40, color: WHITE, fontFamily: "BaiJamjuree_700Bold",
    textShadowColor: "rgba(145,196,227,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: { fontSize: 15, lineHeight: 22, color: WHITE55, fontFamily: "BaiJamjuree_400Regular" },
  
  progressContainer: { marginTop: Space.md, gap: 8 },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: CYAN, borderRadius: 3 },
  progressText: { fontSize: 12, color: CYAN45, fontFamily: "BaiJamjuree_500Medium", textTransform: "uppercase", letterSpacing: 1 },

  // Activity list
  activitySection: { gap: Space.md, marginTop: Space.md },
  activityCardWrapper: {
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBlur: {
    borderRadius: 18,
    overflow: "hidden",
  },
  activityCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
  },
  activityCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
    flex: 1,
  },
  activityCardBody: { flex: 1, gap: 6 },
  activityHeaderRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginBottom: 2 },
  stepLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255, 255, 255, 0.4)", fontFamily: "BaiJamjuree_700Bold" },
  statusBadge: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden", fontFamily: "BaiJamjuree_700Bold", letterSpacing: 0.5 },
  activityTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  activityInstructions: { fontSize: 13, lineHeight: 19, color: "rgba(255, 255, 255, 0.6)", fontFamily: "BaiJamjuree_400Regular" },
  activityMeta: { flexDirection: "row", flexWrap: "wrap", gap: Space.xs, marginTop: 6 },
  metaChip: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: "BaiJamjuree_500Medium",
    overflow: "hidden",
  },
  metaChipTeam: {
    color: "#D8B4FE",
    backgroundColor: "rgba(192,132,252,0.1)",
    borderColor: "rgba(192,132,252,0.2)",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Space.sm,
  },
  arrow: { fontSize: 16, color: WHITE55, fontWeight: "500" },

  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
