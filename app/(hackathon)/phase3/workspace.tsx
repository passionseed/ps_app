import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { HackathonBackground } from "../../../components/Hackathon/HackathonBackground";
import HypothesisForm from "../../../components/Hackathon/Phase3/HypothesisForm";
import PretotypeForm from "../../../components/Hackathon/Phase3/PretotypeForm";
import TestCaptureForm from "../../../components/Hackathon/Phase3/TestCaptureForm";
import SynthesisGate from "../../../components/Hackathon/Phase3/SynthesisGate";
import HypothesisTracker from "../../../components/Hackathon/Phase3/HypothesisTracker";

import {
  getPhase3Workspace,
  submitCycleStep,
  startPhase3Cycle,
  createTestSession,
  getTeamCycles,
  getTeamTestSessions,
  updateStepAIFeedback,
} from "../../../lib/hackathonPhase3";
import { supabase } from "../../../lib/supabase";
import { readHackathonParticipant } from "../../../lib/hackathon-mode";
import { requestAIMentorFeedback } from "../../../lib/hackathonAiPhase3";
import { Space } from "../../../lib/theme";
import type {
  Phase3Workspace,
  HackathonPhase3Cycle,
  HackathonPhase3TestSession,
  AICoachResponse,
} from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE55 = "rgba(255,255,255,0.55)";

export default function Phase3WorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const { teamId: paramTeamId, programPhaseId } = useLocalSearchParams<{
    teamId: string;
    programPhaseId: string;
  }>();

  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(paramTeamId ?? null);
  const [workspace, setWorkspace] = useState<Phase3Workspace | null>(null);
  const [cycles, setCycles] = useState<HackathonPhase3Cycle[]>([]);
  const [testSessions, setTestSessions] = useState<HackathonPhase3TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AICoachResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAI, setCheckingAI] = useState(false);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [manualStep, setManualStep] = useState<string | null>(null);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let tid = paramTeamId;
        if (!tid) {
          const participant = await readHackathonParticipant();
          if (participant?.id) {
            const { data: member } = await supabase
              .from("hackathon_team_members")
              .select("team_id")
              .eq("participant_id", participant.id)
              .maybeSingle();
            if (member?.team_id) tid = member.team_id;
          }
        }
        if (!cancelled) setResolvedTeamId(tid ?? null);
      } catch (e) {
        console.error("team resolution error", e);
        if (!cancelled) setResolvedTeamId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [paramTeamId]);

  const loadWorkspace = useCallback(async () => {
    if (!resolvedTeamId || !programPhaseId) {
      setLoading(false);
      if (!resolvedTeamId) setLoadError("No team found. Join a team to access the workspace.");
      else if (!programPhaseId) setLoadError("Missing program phase.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const ws = await getPhase3Workspace(resolvedTeamId, programPhaseId);
      setWorkspace(ws);
      const teamCycles = await getTeamCycles(resolvedTeamId);
      setCycles(teamCycles);
      const sessions = await getTeamTestSessions(resolvedTeamId);
      setTestSessions(sessions);
    } catch (e) {
      console.error("loadWorkspace error", e);
      setLoadError("Failed to load workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resolvedTeamId, programPhaseId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleStartCycle = useCallback(async () => {
    if (!resolvedTeamId || !programPhaseId) return;
    const newCycleId = await startPhase3Cycle(resolvedTeamId, programPhaseId);
    if (newCycleId) {
      await loadWorkspace();
    }
  }, [resolvedTeamId, programPhaseId, loadWorkspace]);

  const handleCheckAI = useCallback(
    async (data: {
      who: string;
      willDo: string;
      because: string;
      measuredBy: string;
    }) => {
      setCheckingAI(true);
      const fullHypothesis = `${data.who} will ${data.willDo} because ${data.because} measured by ${data.measuredBy}`;
      const aiResult = await requestAIMentorFeedback({
        step_type: "hypothesis",
        submission_data: {
          who: data.who,
          will_do: data.willDo,
          because: data.because,
          measured_by: data.measuredBy,
          full: fullHypothesis,
        },
      });
      setAiFeedback(aiResult);
      setCheckingAI(false);
      return aiResult;
    },
    []
  );

  const handleSubmitHypothesis = useCallback(
    async (data: {
      who: string;
      willDo: string;
      because: string;
      measuredBy: string;
    }) => {
      if (!workspace?.currentCycle) return;
      setSubmitting(true);
      const cycle = cycles.find(
        (c) => c.cycle_number === workspace.currentCycle!.cycleNumber
      );
      if (!cycle) {
        setSubmitting(false);
        return;
      }

      const fullHypothesis = `${data.who} will ${data.willDo} because ${data.because} measured by ${data.measuredBy}`;
      const success = await submitCycleStep(
        cycle.id,
        "hypothesis",
        {
          who: data.who,
          will_do: data.willDo,
          because: data.because,
          measured_by: data.measuredBy,
          full: fullHypothesis,
        },
        "submitted"
      );

      if (success) {
        if (aiFeedback) {
          await updateStepAIFeedback(cycle.id, "hypothesis", aiFeedback);
        }
        await loadWorkspace();
        setManualStep(null);
        setAiFeedback(null);
      }
      setSubmitting(false);
    },
    [workspace, cycles, loadWorkspace, aiFeedback]
  );

  const handleSubmitPretotype = useCallback(
    async (data: {
      method: string;
      variableChanged: string;
      artifactUrl: string | null;
      description: string;
    }) => {
      if (!workspace?.currentCycle) return;
      setSubmitting(true);
      const cycle = cycles.find(
        (c) => c.cycle_number === workspace.currentCycle!.cycleNumber
      );
      if (!cycle) {
        setSubmitting(false);
        return;
      }

      const success = await submitCycleStep(
        cycle.id,
        "pretotype",
        {
          method: data.method,
          variable_changed: data.variableChanged,
          artifact_url: data.artifactUrl,
          description: data.description,
        },
        "submitted"
      );

      if (success) {
        setAiFeedback({
          flags: [
            {
              severity: "info",
              flag_id: "pretotype_submitted",
              field: "pretotype",
              message: "Pretotype submitted. Test with real users.",
              suggestion: "Run at least 3 test sessions with fresh testers.",
            },
          ],
          response: "Pretotype locked in. Go test with real users now!",
        });
        await loadWorkspace();
        setManualStep(null);
      }
      setSubmitting(false);
    },
    [workspace, cycles, loadWorkspace]
  );

  const handleSubmitTest = useCallback(
    async (data: any) => {
      if (!workspace?.currentCycle) return;
      setSubmitting(true);
      const cycle = cycles.find(
        (c) => c.cycle_number === workspace.currentCycle!.cycleNumber
      );
      if (!cycle) {
        setSubmitting(false);
        return;
      }

      const sessionId = await createTestSession({
        ...data,
        team_id: resolvedTeamId,
        cycle_step_id: "",
      });

      if (sessionId) {
        setAiFeedback({
          flags: [
            {
              severity: "info",
              flag_id: "test_logged",
              field: "test_session",
              message: "Test session logged.",
              suggestion: "Continue testing or move to synthesis.",
            },
          ],
          response: "Test logged. Keep going or synthesize when ready.",
        });
      }
      setSubmitting(false);
    },
    [workspace, cycles, resolvedTeamId]
  );

  const handleGateDecision = useCallback(
    async (
      decision: "refine" | "proceed" | "kill",
      data: { whatChanged: string; nextVariable?: string }
    ) => {
      if (!workspace?.currentCycle) return;
      setSubmitting(true);
      const cycle = cycles.find(
        (c) => c.cycle_number === workspace.currentCycle!.cycleNumber
      );
      if (!cycle) {
        setSubmitting(false);
        return;
      }

      const success = await submitCycleStep(
        cycle.id,
        "synthesis",
        {
          gate_decision: decision,
          what_changed: data.whatChanged,
          next_variable: data.nextVariable,
        },
        "submitted"
      );

      if (success) {
        setAiFeedback(null);
        setManualStep(null);
        if (decision === "refine") {
          await handleStartCycle();
        } else if (decision === "proceed") {
          router.push(
            `/(hackathon)/phase3/video?teamId=${resolvedTeamId}&programPhaseId=${programPhaseId}`
          );
        } else {
          router.back();
        }
      }
      setSubmitting(false);
    },
    [workspace, cycles, resolvedTeamId, programPhaseId, handleStartCycle]
  );

  const activeStep = workspace?.currentCycle?.activeStep ?? "hypothesis";
  const currentCycle = workspace?.currentCycle;
  const priorCycle =
    cycles.length > 1 ? cycles[cycles.length - 2] : undefined;

  useEffect(() => {
    setManualStep(null);
  }, [activeStep]);

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
        <AppText style={styles.loadingText}>
          {lang === "th" ? "กำลังโหลด workspace..." : "Loading workspace..."}
        </AppText>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loadingRoot}>
        <Ionicons name="alert-circle" size={48} color="#E74C3C" style={{ marginBottom: 16 }} />
        <AppText variant="bold" style={[styles.emptyTitle, { textAlign: "center" }]}>
          {loadError}
        </AppText>
        <Pressable
          style={[styles.startButton, { marginTop: 24 }]}
          onPress={() => {
            setLoadError(null);
            loadWorkspace();
          }}
        >
          <AppText variant="bold" style={styles.startButtonText}>
            {lang === "th" ? "ลองใหม่" : "Retry"}
          </AppText>
        </Pressable>
      </View>
    );
  }

  const displayedStep = manualStep ?? activeStep;

  const stepLabels: Record<string, string> = {
    hypothesis: lang === "th" ? "สมมติฐาน" : "Hypothesis",
    pretotype: "Pretotype",
    test_session: lang === "th" ? "ทดสอบ" : "Test",
    synthesis: lang === "th" ? "สรุปผล" : "Synthesis",
  };

  const stepHints: Record<string, { th: string; en: string }> = {
    hypothesis: {
      th: "เขียนสมมติฐานที่ทดสอบได้ด้วยรูปแบบ WHO → WILL DO → BECAUSE → MEASURED BY ใช้ AI ตรวจสอบให้ได้คะแนน ≥80 ก่อนส่ง",
      en: "Write a testable hypothesis using WHO → WILL DO → BECAUSE → MEASURED BY. Get AI score ≥80 before submitting.",
    },
    pretotype: {
      th: "เลือกวิธีที่เร็วที่สุดในการทดสอบ เช่น Video Prototype หรือ Fake Door เปลี่ยนเพียง 1 ตัวแปรต่อ Cycle เท่านั้น",
      en: "Pick the fastest test method — Video Prototype, Fake Door, etc. Change only ONE variable per cycle.",
    },
    test_session: {
      th: "ทดสอบกับผู้ใช้จริงอย่างน้อย 3 คน บันทึกผลทุกครั้งแล้วไปสรุปผลในขั้นตอนถัดไป",
      en: "Test with at least 3 real users. Log every result, then move to synthesis.",
    },
    synthesis: {
      th: "วิเคราะห์ผลทั้งหมดแล้วตัดสินใจ: ยืนยัน / ไม่ผ่าน / หรือปรับแก้แล้วเริ่ม Cycle ใหม่",
      en: "Analyze all results and decide: confirm / kill / or refine and start a new cycle.",
    },
  };

  const stepOrder = ["hypothesis", "pretotype", "test_session", "synthesis"];

  const currentHypothesisFull = cycles.find(
    (c) => c.cycle_number === currentCycle?.cycleNumber
  )?.hypothesis_full ?? "";

  return (
    <View style={styles.root}>
      <HackathonBackground />

      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>

      <View style={[styles.headerRight, { top: insets.top + Space.xs }]}>
        <Pressable
          style={({ pressed }) => [
            styles.langToggle,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setLang((prev) => (prev === "th" ? "en" : "th"))}
        >
          <Ionicons name="language" size={14} color={CYAN} />
          <AppText variant="bold" style={styles.langToggleText}>
            {lang === "th" ? "TH" : "EN"}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <AppText style={styles.eyebrow}>
            {lang === "th" ? "เฟส 3" : "PHASE 3"}
          </AppText>
          <AppText variant="bold" style={styles.pageTitle}>
            {lang === "th" ? "Sprint Loop" : "Sprint Loop"}
          </AppText>
          {currentCycle && (
            <AppText style={styles.pageSubtitle}>
              Cycle {currentCycle.cycleNumber}
            </AppText>
          )}
        </View>

        <HypothesisTracker
          cycles={
            workspace?.tracker ??
            cycles.map((c) => ({
              cycleNumber: c.cycle_number,
              hypothesis: c.hypothesis_full,
              result: c.synthesis_result,
              variableChanged: c.variable_changed,
              score: c.ai_score ? (c.ai_score as any).total ?? null : null,
              status: c.status,
            }))
          }
          activeCycleNumber={currentCycle?.cycleNumber}
          lang={lang}
          compact
        />

        {currentCycle && !dismissedHints.has(displayedStep) && (
          <View style={styles.stepHint}>
            <View style={styles.stepHintRow}>
              <Ionicons name="bulb" size={16} color={CYAN} />
              <AppText style={styles.stepHintText}>
                {stepHints[displayedStep]?.[lang] ?? stepHints[displayedStep]?.en}
              </AppText>
            </View>
            <Pressable
              style={styles.stepHintClose}
              onPress={() =>
                setDismissedHints((prev) => {
                  const next = new Set(prev);
                  next.add(displayedStep);
                  return next;
                })
              }
            >
              <Ionicons name="close" size={14} color={WHITE55} />
            </Pressable>
          </View>
        )}

        {currentCycle ? (
          <>
            {displayedStep === "hypothesis" && (
              <HypothesisForm
                cycleId={String(currentCycle.cycleNumber)}
                teamId={resolvedTeamId ?? ""}
                onCheckAI={handleCheckAI}
                onSubmit={handleSubmitHypothesis}
                aiFeedback={aiFeedback}
                checkingAI={checkingAI}
                lang={lang}
                status={workspace?.steps?.find(s => s.stepType === "hypothesis")?.status ?? "draft"}
                initialData={(() => {
                  const cycle = cycles.find(c => c.cycle_number === currentCycle.cycleNumber);
                  const step = workspace?.steps?.find(s => s.stepType === "hypothesis");
                  const stepData = step?.submissionData;
                  return {
                    who: cycle?.hypothesis_who ?? (stepData?.who as string | null) ?? null,
                    willDo: cycle?.hypothesis_will_do ?? (stepData?.will_do as string | null) ?? null,
                    because: cycle?.hypothesis_because ?? (stepData?.because as string | null) ?? null,
                    measuredBy: cycle?.hypothesis_measured_by ?? (stepData?.measured_by as string | null) ?? null,
                    full: cycle?.hypothesis_full ?? (stepData?.full as string | null) ?? null,
                  };
                })()}
              />
            )}

            {displayedStep === "pretotype" && (
              <PretotypeForm
                cycleId={String(currentCycle.cycleNumber)}
                priorVariable={priorCycle?.variable_changed}
                onSubmit={handleSubmitPretotype}
                aiFeedback={aiFeedback}
                lang={lang}
                status={workspace?.steps?.find(s => s.stepType === "pretotype")?.status ?? "draft"}
                initialData={(() => {
                  const cycle = cycles.find(c => c.cycle_number === currentCycle.cycleNumber);
                  const step = workspace?.steps?.find(s => s.stepType === "pretotype");
                  const stepData = step?.submissionData;
                  return {
                    method: cycle?.pretotype_method ?? (stepData?.method as string | null) ?? null,
                    variableChanged: cycle?.variable_changed ?? (stepData?.variable_changed as string | null) ?? null,
                    artifactUrl: cycle?.pretotype_artifact_url ?? (stepData?.artifact_url as string | null) ?? null,
                    description: cycle?.pretotype_description ?? (stepData?.description as string | null) ?? null,
                  };
                })()}
              />
            )}

            {displayedStep === "test_session" && (
              <TestCaptureForm
                cycleId={String(currentCycle.cycleNumber)}
                teamId={resolvedTeamId ?? ""}
                cycleNumber={currentCycle.cycleNumber}
                hypothesis={currentHypothesisFull}
                onSubmit={handleSubmitTest}
                aiFeedback={aiFeedback}
                lang={lang}
              />
            )}

            {displayedStep === "synthesis" && (
              <SynthesisGate
                cycleId={String(currentCycle.cycleNumber)}
                hypothesis={currentHypothesisFull}
                hypothesisResult={
                  cycles.find(
                    (c) => c.cycle_number === currentCycle.cycleNumber
                  )?.synthesis_result ?? null
                }
                testSessions={testSessions.filter(
                  (s) => s.cycle_number === currentCycle.cycleNumber
                )}
                priorCycleVariable={priorCycle?.variable_changed}
                onGateDecision={handleGateDecision}
                aiFeedback={aiFeedback}
                lang={lang}
              />
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="flask"
              size={48}
              color={CYAN45}
              style={{ marginBottom: 16 }}
            />
            <AppText variant="bold" style={styles.emptyTitle}>
              {lang === "th" ? "ยังไม่มี Cycle" : "No Active Cycle"}
            </AppText>
            <AppText style={styles.emptySubtitle}>
              {lang === "th" ? "เริ่ม Cycle แรกเพื่อทดสอบสมมติฐาน" : "Start your first hypothesis test cycle"}
            </AppText>
            <Pressable style={styles.startButton} onPress={handleStartCycle}>
              <AppText variant="bold" style={styles.startButtonText}>
                {lang === "th" ? "เริ่ม Cycle 1" : "Start Cycle 1"}
              </AppText>
            </Pressable>
          </View>
        )}

      </ScrollView>

      {currentCycle && (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
          {stepOrder.map((step, index) => {
            const isActive = displayedStep === step;
            const isPast = stepOrder.indexOf(activeStep) > stepOrder.indexOf(step);
            const stepNum = index + 1;
            return (
              <Pressable
                key={step}
                style={[styles.bottomNavItem, isActive && styles.bottomNavItemActive]}
                onPress={() => setManualStep(step)}
              >
                <View style={[styles.bottomNavDot, isActive && styles.bottomNavDotActive]}>
                  <AppText variant="bold" style={[styles.bottomNavNumber, isActive && styles.bottomNavNumberActive]}>
                    {stepNum}
                  </AppText>
                </View>
                <AppText style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}>
                  {stepLabels[step]}
                </AppText>
                {isPast && (
                  <Ionicons name="checkmark" size={10} color={CYAN} style={{ marginTop: 2 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="small" color={CYAN} />
          <AppText style={styles.submittingText}>{lang === "th" ? "กำลังส่ง..." : "Submitting..."}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Space.lg, gap: Space.xl },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
    gap: Space.md,
  },
  loadingText: {
    color: CYAN,
    fontSize: 14,
    fontFamily: "BaiJamjuree_500Medium",
    letterSpacing: 0.4,
  },

  headerActions: {
    position: "absolute",
    left: Space.lg,
    zIndex: 10,
  },
  headerRight: {
    position: "absolute",
    right: Space.lg,
    zIndex: 10,
  },

  pageHeader: { gap: Space.sm },
  eyebrow: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontFamily: "BaiJamjuree_700Bold",
  },
  pageTitle: {
    fontSize: 32,
    lineHeight: 40,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    textShadowColor: "rgba(145,196,227,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: WHITE, fontSize: 20, marginBottom: 8 },
  emptySubtitle: { color: WHITE55, fontSize: 14, marginBottom: 24, textAlign: "center" },
  startButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  startButtonText: { color: BG, fontSize: 16 },

  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  langToggleText: { color: CYAN, fontSize: 12 },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(3,5,10,0.95)",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 8,
  },
  bottomNavItemActive: {
    backgroundColor: CYAN20,
  },
  bottomNavDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  bottomNavDotActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  bottomNavNumber: { color: WHITE55, fontSize: 12 },
  bottomNavNumberActive: { color: BG },
  bottomNavLabel: { color: WHITE55, fontSize: 10, marginTop: 3 },
  bottomNavLabelActive: { color: CYAN },

  stepHint: {
    borderLeftWidth: 2,
    borderLeftColor: CYAN,
    paddingLeft: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  stepHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  stepHintText: {
    color: WHITE55,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  stepHintClose: {
    padding: 4,
    marginTop: -2,
  },

  submittingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,5,10,0.6)",
    zIndex: 100,
  },
  submittingText: { color: CYAN, fontSize: 14, marginTop: 8 },
});
