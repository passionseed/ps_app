import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/AppText";
import { GlassCard } from "../../../components/Glass/GlassCard";
import { ProgressGateCard } from "../../../components/Hackathon/ProgressGateCard";
import { ResponsibilityBanner } from "../../../components/Hackathon/ResponsibilityBanner";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import {
  getHackathonModuleDetail,
} from "../../../lib/hackathonProgram";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import { getPreviewModuleDetail } from "../../../lib/hackathonProgramPreview";
import {
  buildPainPointFeedbackInput,
  getPainPointFeedbackVerdictLabel,
  requestPainPointFeedback,
  type PainPointFeedbackResult,
} from "../../../lib/hackathonAi";
import {
  Accent,
  Border,
  PageBg,
  Radius,
  Space,
  Text as ThemeText,
  Type,
} from "../../../lib/theme";
import type { PathActivityScope } from "../../../types/pathlab-content";

function getResponsibilityCopy(scope: PathActivityScope) {
  switch (scope) {
    case "team":
      return {
        label: "Team synthesis required",
        detail:
          "This module is owned by the team. Individual evidence should feed the shared output before submission.",
      };
    case "hybrid":
      return {
        label: "Individual work unlocks team work",
        detail:
          "Each member contributes evidence first, then the team consolidates it into one shared submission.",
      };
    default:
      return {
        label: "Each member completes this activity",
        detail:
          "This step is individually owned so every participant builds real customer discovery skill, not just the loudest teammate.",
      };
  }
}

function getGateCardCopy(params: {
  gateStatus: string;
  gateRule: string;
  reviewMode: string;
  requiredMemberCount: number | null;
}) {
  const requiredCount = params.requiredMemberCount ?? 3;

  switch (params.gateStatus) {
    case "passed":
      return {
        title: "Gate passed",
        status: "passed",
        body: "This module has enough evidence to move forward. Keep refining the team artifact before the next handoff.",
      };
    case "revision_required":
      return {
        title: "Revision required",
        status: "revise",
        body: "At least one submission needs another pass. Tighten the evidence and resubmit before proceeding.",
      };
    case "ready_for_team":
      return {
        title: "Ready for team synthesis",
        status: "ready",
        body:
          params.gateRule === "all_members_complete"
            ? "Every required member has completed the prerequisite work. The team can now consolidate this into the shared output."
            : `At least ${requiredCount} members have enough progress. The team can open the shared submission and push it toward ${params.reviewMode}.`,
      };
    default:
      return {
        title: "Progress gate",
        status: "blocked",
        body:
          params.gateRule === "all_members_complete"
            ? "Every member must finish their part before the team can move on."
            : `This module needs more individual evidence before the team can advance. Target at least ${requiredCount} members with usable progress.`,
      };
  }
}

export default function HackathonModuleScreen() {
  const insets = useSafeAreaInsets();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState<Awaited<
    ReturnType<typeof getHackathonModuleDetail>
  > | null>(null);
  const [problemStatement, setProblemStatement] = useState("");
  const [customer, setCustomer] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<PainPointFeedbackResult | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!moduleId) return;

      try {
        const result = await getHackathonModuleDetail(moduleId);
        if (!cancelled) {
          const fallback = result ?? getPreviewModuleDetail(moduleId);
          setModule(fallback);
          setError(fallback ? null : "Module not found");
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = getPreviewModuleDetail(moduleId);
          setModule(fallback);
          setError(
            fallback
              ? null
              : err instanceof Error
                ? err.message
                : "Unable to load module",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const moduleSnapshot = useMemo(() => {
    if (!module) return null;

    return buildModuleProgressSnapshot({
      memberStatuses: Array.from(
        { length: module.required_member_count ?? 3 },
        () => "pending",
      ),
      workflow: {
        scope: module.workflow_scope,
        gate_rule: module.gate_rule,
        review_mode: module.review_mode,
        required_member_count: module.required_member_count,
      },
      teamSubmissionStatus: "not_started",
    });
  }, [module]);

  const responsibilityCopy = getResponsibilityCopy(
    module?.workflow_scope ?? "individual",
  );
  const gateCopy = getGateCardCopy({
    gateStatus: moduleSnapshot?.gate_status ?? "blocked",
    gateRule: module?.gate_rule ?? "complete",
    reviewMode: module?.review_mode ?? "auto",
    requiredMemberCount: module?.required_member_count ?? null,
  });

  const isPainPointModule = Boolean(
    module?.slug?.includes("pain-point") ||
      module?.title?.toLowerCase().includes("pain point"),
  );

  async function handleFeedback() {
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const result = await requestPainPointFeedback(
        buildPainPointFeedbackInput({
          problemStatement,
          customer,
          evidenceText,
        }),
      );
      setFeedback(result);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : "Unable to get feedback",
      );
    } finally {
      setFeedbackLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Space.xl, paddingBottom: Space["4xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <AppText style={styles.backText}>‹ Back</AppText>
          </Pressable>
          <AppText variant="bold" style={styles.title}>
            {module?.title ?? "Module"}
          </AppText>
          <AppText style={styles.subtitle}>
            {module?.summary ??
              error ??
              "This module trains a concrete customer discovery skill."}
          </AppText>
        </View>

        <ResponsibilityBanner
          label={responsibilityCopy.label}
          detail={responsibilityCopy.detail}
        />

        <View style={styles.metaGrid}>
          <MetaPill
            label="Scope"
            value={module?.workflow_scope ?? "individual"}
          />
          <MetaPill label="Gate" value={module?.gate_rule ?? "complete"} />
          <MetaPill label="Review" value={module?.review_mode ?? "auto"} />
          <MetaPill
            label="Members"
            value={String(module?.required_member_count ?? 3)}
          />
        </View>

        {moduleSnapshot ? (
          <>
            <ProgressGateCard
              title={gateCopy.title}
              body={gateCopy.body}
              status={gateCopy.status}
            />
            <GlassCard style={styles.snapshotCard}>
              <AppText style={styles.sectionLabel}>Gate snapshot</AppText>
              <AppText style={styles.snapshotText}>
                {moduleSnapshot.pending_members} members still need progress
                before the team can confidently move forward.
              </AppText>
            </GlassCard>
          </>
        ) : null}

        {isPainPointModule ? (
          <>
            <TeamWorkspaceSection
              title="Problem statement"
              description="Draft the team’s pain point clearly. Then use the feedback loop to sharpen it before submission."
              fields={[
                {
                  key: "problem-statement",
                  label: "Pain point draft",
                  placeholder: "Describe the specific healthcare problem your team observed.",
                  value: problemStatement,
                  onChangeText: setProblemStatement,
                  multiline: true,
                },
              ]}
            />
            <TeamWorkspaceSection
              title="Target customer"
              description="Name the exact healthcare user segment this pain belongs to."
              fields={[
                {
                  key: "target-customer",
                  label: "Customer segment",
                  placeholder: "Example: outpatient clinic managers handling insurance denials",
                  value: customer,
                  onChangeText: setCustomer,
                },
              ]}
            />
            <TeamWorkspaceSection
              title="Evidence bullets"
              description="Paste one interview fact per line. Use observed details, counts, or exact moments from interviews."
              fields={[
                {
                  key: "evidence-bullets",
                  label: "Interview evidence",
                  placeholder: "One interview observation per line",
                  value: evidenceText,
                  onChangeText: setEvidenceText,
                  multiline: true,
                },
              ]}
            />

            <Pressable
              onPress={handleFeedback}
              disabled={feedbackLoading}
              style={[
                styles.feedbackButton,
                feedbackLoading ? styles.feedbackButtonDisabled : null,
              ]}
            >
              <AppText variant="bold" style={styles.feedbackButtonText}>
                {feedbackLoading ? (
                  <PathLabSkiaLoader size="tiny" />
                ) : (
                  "Get AI feedback"
                )}
              </AppText>
            </Pressable>

            {feedbackError ? (
              <AppText style={styles.errorText}>{feedbackError}</AppText>
            ) : null}

            {feedback ? (
              <GlassCard variant="education" style={styles.feedbackResult}>
                <AppText variant="bold" style={styles.resultTitle}>
                  {getPainPointFeedbackVerdictLabel(feedback.verdict)}
                </AppText>
                <AppText style={styles.resultScores}>
                  Specificity {feedback.specificityScore} · Evidence{" "}
                  {feedback.evidenceScore} · Severity {feedback.severityScore} ·
                  Clarity {feedback.clarityScore}
                </AppText>
                <View style={styles.noteList}>
                  {feedback.revisionNotes.map((note) => (
                    <View key={note} style={styles.noteRow}>
                      <View style={styles.noteDot} />
                      <AppText style={styles.noteText}>{note}</AppText>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : (
          <GlassCard style={styles.placeholderCard}>
            <AppText style={styles.sectionLabel}>Submission workspace</AppText>
            <AppText variant="bold" style={styles.placeholderTitle}>
              Shared workspace contract is ready
            </AppText>
            <AppText style={styles.placeholderBody}>
              This module already carries scope, gate, and review metadata. The
              next layer is binding the real submission records and mentor
              review states to this UI.
            </AppText>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <AppText style={styles.metaLabel}>{label}</AppText>
      <AppText variant="bold" style={styles.metaValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PageBg.default,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    gap: Space.xl,
  },
  header: {
    gap: Space.sm,
  },
  backText: {
    fontSize: 14,
    color: Accent.purple,
  },
  title: {
    fontSize: 28,
    color: ThemeText.primary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: ThemeText.secondary,
  },
  sectionLabel: {
    fontSize: Type.label.fontSize,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  metaPill: {
    minWidth: 120,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: ThemeText.tertiary,
  },
  metaValue: {
    fontSize: 13,
    color: ThemeText.primary,
  },
  snapshotCard: {
    gap: Space.sm,
  },
  snapshotText: {
    fontSize: 14,
    lineHeight: 21,
    color: ThemeText.secondary,
  },
  feedbackResult: {
    gap: Space.sm,
  },
  feedbackButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    backgroundColor: Accent.yellow,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  feedbackButtonDisabled: {
    opacity: 0.7,
  },
  feedbackButtonText: {
    color: "#101418",
    fontSize: 15,
  },
  resultTitle: {
    fontSize: 17,
    color: ThemeText.primary,
  },
  resultScores: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
  noteList: {
    gap: Space.xs,
  },
  noteRow: {
    flexDirection: "row",
    gap: Space.sm,
    alignItems: "flex-start",
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Accent.purple,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: ThemeText.secondary,
  },
  errorText: {
    color: Accent.red,
    fontSize: 13,
  },
  placeholderCard: {
    gap: Space.sm,
  },
  placeholderTitle: {
    fontSize: 18,
    color: ThemeText.primary,
  },
  placeholderBody: {
    fontSize: 14,
    lineHeight: 21,
    color: ThemeText.secondary,
  },
});
