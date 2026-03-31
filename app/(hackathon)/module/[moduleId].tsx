// app/(hackathon)/module/[moduleId].tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { JourneyNodeGraph } from "../../../components/Hackathon/JourneyNodeGraph";
import { ProgressGateCard } from "../../../components/Hackathon/ProgressGateCard";
import { ResponsibilityBanner } from "../../../components/Hackathon/ResponsibilityBanner";
import {
  buildModuleProgressSnapshot,
  getHackathonModuleDetail,
  getModuleActivityProgress,
} from "../../../lib/hackathonProgram";
import { getPreviewModuleDetail } from "../../../lib/hackathonProgramPreview";
import { Radius, Space } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import type { MapNode } from "../../../types/map";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const GREEN = "#10B981";

const SCREEN_WIDTH = Dimensions.get("window").width;

function nodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case "video": return "Video";
    case "quiz": return "Quiz";
    case "text": return "Text";
    case "file_upload": return "Upload";
    case "project": return "Project";
    case "npc_conversation": return "NPC";
    case "assessment": return "Assessment";
    default: return nodeType;
  }
}

export default function HackathonModuleScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<Awaited<ReturnType<typeof getHackathonModuleDetail>> | null>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [mod, { data: { user } }] = await Promise.all([
            getHackathonModuleDetail(moduleId!),
            supabase.auth.getUser(),
          ]);
          const resolvedMod = mod ?? getPreviewModuleDetail(moduleId!);
          if (cancelled) return;
          setModule(resolvedMod);

          if (user) {
            const progress = await getModuleActivityProgress(moduleId!, user.id);
            if (!cancelled) {
              setNodes(progress.nodes);
              setCompletedNodeIds(progress.completedNodeIds);
              setCurrentNodeId(progress.currentNodeId);
            }
          }
        } catch {
          if (!cancelled) {
            setModule(getPreviewModuleDetail(moduleId!));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [moduleId]),
  );

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  const graphWidth = SCREEN_WIDTH - Space["2xl"] * 2 - Space.md * 2;

  const snapshot = module
    ? buildModuleProgressSnapshot({
        memberStatuses: Array.from(
          { length: module.required_member_count ?? 3 },
          () => "pending" as const,
        ),
        workflow: {
          scope: module.workflow_scope,
          gate_rule: module.gate_rule,
          review_mode: module.review_mode,
          required_member_count: module.required_member_count,
        },
        teamSubmissionStatus: "not_started",
      })
    : null;

  const gateStatus = snapshot?.gate_status ?? "blocked";
  const gateCopy =
    gateStatus === "passed"
      ? { title: "Gate passed", body: "This module has enough evidence to move forward.", status: "passed" as const }
      : gateStatus === "revision_required"
        ? { title: "Revision required", body: "At least one submission needs another pass.", status: "revise" as const }
        : {
            title: "Progress gate",
            body: `${snapshot?.pending_members ?? 0} members still need progress.`,
            status: "blocked" as const,
          };

  const responsibilityCopy =
    module?.workflow_scope === "team"
      ? { label: "Team synthesis required", detail: "This module is owned by the team." }
      : module?.workflow_scope === "hybrid"
        ? { label: "Individual work unlocks team work", detail: "Each member contributes evidence first, then the team consolidates." }
        : { label: "Each member completes this activity", detail: "This step is individually owned so every participant builds real skill." };

  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>MODULE</AppText>
        <AppText variant="bold" style={styles.title}>{module?.title ?? "Module"}</AppText>
        <AppText style={styles.subtitle}>{module?.summary ?? ""}</AppText>
      </View>

      {/* Scope / gate badges */}
      <View style={styles.badges}>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{module?.workflow_scope ?? "individual"}</AppText>
        </View>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{module?.gate_rule ?? "complete"}</AppText>
        </View>
      </View>

      {/* Node graph */}
      {nodes.length > 0 && (
        <View style={styles.graphCard}>
          <JourneyNodeGraph
            nodes={nodes}
            completedNodeIds={completedNodeIds}
            currentNodeId={currentNodeId}
            width={graphWidth}
            height={90}
          />
        </View>
      )}

      {/* Responsibility banner + gate card */}
      {module && (
        <>
          <ResponsibilityBanner
            label={responsibilityCopy.label}
            detail={responsibilityCopy.detail}
          />
          <ProgressGateCard
            title={gateCopy.title}
            body={gateCopy.body}
            status={gateCopy.status}
          />
        </>
      )}

      {/* Activity list */}
      <View style={styles.section}>
        <AppText style={styles.sectionLabel}>ACTIVITIES</AppText>
        {nodes.length === 0 ? (
          <AppText style={{ color: WHITE40, fontSize: 13 }}>No activities configured yet.</AppText>
        ) : (
          nodes.map((node) => {
            const done = completedNodeIds.has(node.id);
            const current = node.id === currentNodeId;
            const locked = !done && !current;

            return (
              <Pressable
                key={node.id}
                onPress={() => {
                  if (!locked) {
                    router.push(`/(hackathon)/activity/${node.id}`);
                  }
                }}
                style={({ pressed }) => [
                  styles.activityRow,
                  done && styles.activityRowDone,
                  current && styles.activityRowCurrent,
                  locked && styles.activityRowLocked,
                  pressed && !locked && { opacity: 0.8 },
                ]}
                disabled={locked}
              >
                <View style={styles.activityIcon}>
                  {done && <AppText style={styles.iconDone}>✓</AppText>}
                  {current && <View style={styles.iconDot} />}
                  {locked && <AppText style={styles.iconLock}>🔒</AppText>}
                </View>

                <AppText
                  variant="bold"
                  style={[
                    styles.activityTitle,
                    done && { color: GREEN },
                    current && { color: WHITE },
                    locked && { color: WHITE40 },
                  ]}
                >
                  {node.title}
                </AppText>

                <View style={styles.typePill}>
                  <AppText style={styles.typePillText}>{nodeTypeLabel(node.node_type)}</AppText>
                </View>

                {current && <AppText style={styles.arrow}>→</AppText>}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space["2xl"], paddingBottom: 96, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  backLink: { fontSize: 15, color: CYAN },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 28, color: WHITE },
  subtitle: { fontSize: 14, lineHeight: 22, color: WHITE75 },
  badges: { flexDirection: "row", gap: Space.sm },
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, color: CYAN, textTransform: "uppercase", letterSpacing: 1 },
  graphCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(0,240,255,0.03)",
    padding: Space.md,
  },
  section: { gap: Space.sm },
  sectionLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: Space.xs,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.md,
    gap: Space.sm,
  },
  activityRowDone: {
    borderColor: "rgba(16,185,129,0.2)",
    backgroundColor: "rgba(16,185,129,0.06)",
  },
  activityRowCurrent: {
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
  },
  activityRowLocked: { opacity: 0.4 },
  activityIcon: { width: 24, alignItems: "center" },
  iconDone: { fontSize: 13, color: GREEN },
  iconDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CYAN },
  iconLock: { fontSize: 11 },
  activityTitle: { flex: 1, fontSize: 14 },
  typePill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: { fontSize: 9, color: CYAN, textTransform: "uppercase", letterSpacing: 1 },
  arrow: { fontSize: 14, color: CYAN },
});
