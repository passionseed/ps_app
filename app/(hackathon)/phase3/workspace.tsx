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
  getCycleWorkspaceSteps,
  submitCycleStep,
  startPhase3Cycle,
  createTestSession,
  deleteTestSession,
  deleteCycleById,
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
  Phase3WorkspaceStep,
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
const WHITE75 = "rgba(255,255,255,0.75)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

function readStepField(
  data: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

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
  const [deletingCycle, setDeletingCycle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [manualStep, setManualStep] = useState<string | null>(null);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [workingCycleNum, setWorkingCycleNum] = useState<number | null>(null);
  const [workingCycleSteps, setWorkingCycleSteps] = useState<Phase3WorkspaceStep[]>([]);
  const [loadingWorkingCycle, setLoadingWorkingCycle] = useState(false);
  const [priorCycleStepData, setPriorCycleStepData] = useState<Record<string, unknown> | null>(null);

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
    setDeleteError(null);
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

  useEffect(() => {
    if (workingCycleNum === null) {
      setWorkingCycleSteps([]);
      return;
    }
    const cycleData = cycles.find(c => c.cycle_number === workingCycleNum);
    if (!cycleData) return;
    let cancelled = false;
    setLoadingWorkingCycle(true);
    getCycleWorkspaceSteps(cycleData.id).then((steps) => {
      if (!cancelled) {
        setWorkingCycleSteps(steps);
        setLoadingWorkingCycle(false);
      }
    });
    return () => { cancelled = true; };
  }, [workingCycleNum, cycles]);

  // Load prior cycle's hypothesis step data so the "load prior" banner can show
  useEffect(() => {
    if (cycles.length < 2) { setPriorCycleStepData(null); return; }
    const prior = cycles[cycles.length - 2];
    let cancelled = false;
    getCycleWorkspaceSteps(prior.id).then((steps) => {
      if (!cancelled) {
        const hyp = steps.find(s => s.stepType === "hypothesis");
        setPriorCycleStepData(hyp?.submissionData ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [cycles]);

  const handleStartCycle = useCallback(async () => {
    if (!resolvedTeamId || !programPhaseId) return;
    const newCycleId = await startPhase3Cycle(resolvedTeamId, programPhaseId);
    if (newCycleId) {
      await loadWorkspace();
    }
  }, [resolvedTeamId, programPhaseId, loadWorkspace]);

  const handleDeleteLatestCycle = useCallback(async () => {
    if (cycles.length === 0) return;
    const latestCycle = cycles[cycles.length - 1];
    setDeletingCycle(true);
    setConfirmDelete(false);
    setDeleteError(null);
    const success = await deleteCycleById(latestCycle.id);
    if (success) {
      setWorkingCycleNum(null);
      setManualStep(null);
      await loadWorkspace();
    } else {
      setDeleteError(lang === "th" ? "ลบ Cycle ไม่สำเร็จ กรุณาลองใหม่" : "Failed to delete cycle. Please try again.");
    }
    setDeletingCycle(false);
  }, [cycles, loadWorkspace, lang]);

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
      if (!workspace?.currentCycle && !workingCycleNum) return;
      setSubmitting(true);
      const targetCycleNum = workingCycleNum ?? workspace!.currentCycle!.cycleNumber;
      const cycle = cycles.find((c) => c.cycle_number === targetCycleNum);
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
    [workspace, cycles, loadWorkspace, aiFeedback, workingCycleNum]
  );

  const handleSubmitPretotype = useCallback(
    async (data: {
      method: string;
      variableChanged: string;
      artifactUrl: string | null;
      description: string;
    }) => {
      if (!workspace?.currentCycle && !workingCycleNum) return;
      setSubmitting(true);
      const targetCycleNum = workingCycleNum ?? workspace!.currentCycle!.cycleNumber;
      const cycle = cycles.find((c) => c.cycle_number === targetCycleNum);
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
    [workspace, cycles, loadWorkspace, workingCycleNum]
  );

  const handleSubmitTest = useCallback(
    async (data: any) => {
      if (!workspace?.currentCycle && !workingCycleNum) return;
      setSubmitting(true);
      const targetCycleNum = workingCycleNum ?? workspace!.currentCycle!.cycleNumber;
      const cycle = cycles.find((c) => c.cycle_number === targetCycleNum);
      if (!cycle) {
        setSubmitting(false);
        return;
      }

      await submitCycleStep(
        cycle.id,
        "test_session",
        { sessions_logged: (testSessions.filter(s => s.cycle_number === cycle.cycle_number).length + 1) },
        "submitted"
      );

      const refreshedWs = await getPhase3Workspace(resolvedTeamId!, programPhaseId!);
      const refreshedStep = refreshedWs?.steps?.find(
        (s) => s.stepType === "test_session"
      );

      const sessionId = await createTestSession({
        ...data,
        team_id: resolvedTeamId,
        cycle_step_id: refreshedStep?.stepId || null,
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
        await loadWorkspace();
      }
      setSubmitting(false);
    },
    [workspace, cycles, resolvedTeamId, loadWorkspace, testSessions, workingCycleNum]
  );

  const handleGateDecision = useCallback(
    async (
      decision: "refine" | "proceed" | "kill",
      data: { whatChanged: string; nextVariable?: string }
    ) => {
      if (!workspace?.currentCycle && !workingCycleNum) return;
      setSubmitting(true);
      const targetCycleNum = workingCycleNum ?? workspace!.currentCycle!.cycleNumber;
      const cycle = cycles.find((c) => c.cycle_number === targetCycleNum);
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
    [workspace, cycles, resolvedTeamId, programPhaseId, handleStartCycle, workingCycleNum]
  );

  const currentCycle = workspace?.currentCycle;
  const priorCycle =
    cycles.length > 1 ? cycles[cycles.length - 2] : undefined;

  const isViewingPrior = workingCycleNum !== null && workingCycleNum !== currentCycle?.cycleNumber;
  const effectiveCycleNum = isViewingPrior ? workingCycleNum! : currentCycle?.cycleNumber;
  const effectiveSteps = isViewingPrior ? workingCycleSteps : (workspace?.steps ?? []);
  const effectiveSessions = testSessions.filter(s => s.cycle_number === effectiveCycleNum);
  const effectiveCycleData = cycles.find(c => c.cycle_number === effectiveCycleNum);

  const activeStep = workspace?.currentCycle?.activeStep ?? "hypothesis";
  const effectiveActiveStep: string = isViewingPrior
    ? (() => {
        const incomplete = workingCycleSteps.find(s => s.status === "draft");
        if (incomplete) return incomplete.stepType;
        const stepOrderArr = ["hypothesis", "pretotype", "test_session", "synthesis"];
        for (let i = stepOrderArr.length - 1; i >= 0; i--) {
          if (workingCycleSteps.find(s => s.stepType === stepOrderArr[i])) return stepOrderArr[i];
        }
        return "synthesis";
      })()
    : activeStep;

  useEffect(() => {
    setManualStep(null);
  }, [activeStep, workingCycleNum]);

  const displayedStep = manualStep ?? effectiveActiveStep;

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

  const hypothesisStepData = effectiveSteps.find(
    (s) => s.stepType === "hypothesis"
  )?.submissionData;

  const currentHypothesisFull = (() => {
    const isGarbage = (s: string) => /^[\s]*will[\s]+because[\s]+measured by[\s]*$/.test(s.trim());
    const full = (hypothesisStepData?.full as string | undefined) ?? effectiveCycleData?.hypothesis_full ?? "";
    if (full && full.trim().length > 20 && !isGarbage(full)) return full;
    const who = readStepField(hypothesisStepData, "who") ?? effectiveCycleData?.hypothesis_who ?? "";
    const willDo = readStepField(hypothesisStepData, "will_do", "willDo") ?? effectiveCycleData?.hypothesis_will_do ?? "";
    const because = readStepField(hypothesisStepData, "because") ?? effectiveCycleData?.hypothesis_because ?? "";
    const measuredBy = readStepField(hypothesisStepData, "measured_by", "measuredBy") ?? effectiveCycleData?.hypothesis_measured_by ?? "";
    if (who && willDo && because && measuredBy) {
      return `${who} will ${willDo} because ${because} measured by ${measuredBy}`;
    }
    return "";
  })();

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
          {cycles.length > 0 && (
            <View style={styles.cycleNav}>
              <Pressable
                style={[styles.cycleNavArrow, !effectiveCycleNum || effectiveCycleNum <= 1 ? styles.cycleNavArrowDisabled : null]}
                onPress={() => {
                  if (!effectiveCycleNum || effectiveCycleNum <= 1) return;
                  setWorkingCycleNum(effectiveCycleNum - 1);
                  setManualStep(null);
                }}
              >
                <Ionicons name="chevron-back" size={16} color={!effectiveCycleNum || effectiveCycleNum <= 1 ? "rgba(145,196,227,0.25)" : CYAN} />
              </Pressable>
              <View style={styles.cycleNavLabel}>
                <AppText variant="bold" style={[styles.pageSubtitle, { marginBottom: 0 }]}>
                  Cycle {effectiveCycleNum ?? currentCycle?.cycleNumber ?? 1}
                </AppText>
                {isViewingPrior && (
                  <AppText style={styles.priorBadge}>{lang === "th" ? "รอบก่อน" : "PREVIOUS"}</AppText>
                )}
              </View>
              <Pressable
                style={[styles.cycleNavArrow, isViewingPrior && effectiveCycleNum! < (currentCycle?.cycleNumber ?? 1) ? null : styles.cycleNavArrowDisabled]}
                onPress={() => {
                  if (!isViewingPrior || !effectiveCycleNum) return;
                  const next = effectiveCycleNum + 1;
                  if (next === currentCycle?.cycleNumber) {
                    setWorkingCycleNum(null);
                  } else {
                    setWorkingCycleNum(next);
                  }
                  setManualStep(null);
                }}
              >
                <Ionicons name="chevron-forward" size={16} color={isViewingPrior && effectiveCycleNum! < (currentCycle?.cycleNumber ?? 1) ? CYAN : "rgba(145,196,227,0.25)"} />
              </Pressable>

              {!isViewingPrior && cycles.length > 0 && (
                deletingCycle ? (
                  <ActivityIndicator size="small" color={RED} style={{ marginLeft: 4 }} />
                ) : confirmDelete ? (
                  <View style={styles.deleteConfirmRow}>
                    <AppText style={styles.deleteConfirmText}>
                      {lang === "th" ? "ลบ Cycle นี้?" : "Delete?"}
                    </AppText>
                    <Pressable style={styles.deleteConfirmYes} onPress={handleDeleteLatestCycle}>
                      <AppText style={styles.deleteConfirmYesText}>{lang === "th" ? "ใช่" : "Yes"}</AppText>
                    </Pressable>
                    <Pressable onPress={() => setConfirmDelete(false)}>
                      <AppText style={styles.deleteConfirmNo}>{lang === "th" ? "ไม่" : "No"}</AppText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.cycleDeleteBtn}
                    onPress={() => {
                      setDeleteError(null);
                      setConfirmDelete(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color={RED} />
                  </Pressable>
                )
              )}
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color={CYAN} />
          </View>
        )}

        {loadError && !loading && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={18} color="#E74C3C" />
            <AppText style={styles.inlineErrorText}>{loadError}</AppText>
            <Pressable onPress={() => { setLoadError(null); loadWorkspace(); }}>
              <AppText style={styles.inlineRetry}>{lang === "th" ? "ลองใหม่" : "Retry"}</AppText>
            </Pressable>
          </View>
        )}

        {deleteError && !loading && !loadError && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={18} color="#E74C3C" />
            <AppText style={styles.inlineErrorText}>{deleteError}</AppText>
          </View>
        )}

        {!loading && !loadError && <HypothesisTracker
          cycles={
            workspace?.tracker ??
            cycles.map((c) => {
              const step = workspace?.steps?.find(
                (s) => s.stepType === "hypothesis"
              );
              const stepData = step?.submissionData;
              const rawFull = (stepData?.full as string | null) ?? c.hypothesis_full ?? null;
              const isGarbageFull = (s: string) => /^[\s]*will[\s]+because[\s]+measured by[\s]*$/.test(s.trim());
              let hypothesis = rawFull && rawFull.trim().length > 20 && !isGarbageFull(rawFull) ? rawFull : null;
              if (!hypothesis) {
                const who =
                  (stepData?.who as string | null) ??
                  readStepField(stepData, "who") ??
                  null;
                const willDo =
                  (stepData?.will_do as string | null) ??
                  readStepField(stepData, "will_do", "willDo") ??
                  null;
                const because =
                  (stepData?.because as string | null) ??
                  readStepField(stepData, "because") ??
                  null;
                const measuredBy =
                  (stepData?.measured_by as string | null) ??
                  readStepField(stepData, "measured_by", "measuredBy") ??
                  null;
                if (who && willDo && because && measuredBy) {
                  hypothesis = `${who} will ${willDo} because ${because} measured by ${measuredBy}`;
                }
              }
              return {
                cycleNumber: c.cycle_number,
                hypothesis,
                result: c.synthesis_result,
                variableChanged: c.variable_changed,
                score: c.ai_score ? (c.ai_score as any).total ?? null : null,
                status: c.status,
              };
            })
          }
          activeCycleNumber={currentCycle?.cycleNumber}
          onCyclePress={(n) => {
            setWorkingCycleNum(n === currentCycle?.cycleNumber ? null : n);
            setManualStep(null);
          }}
          lang={lang}
          compact
        />}

        {!loading && !loadError && currentCycle && !dismissedHints.has(displayedStep) && (
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

        {!loading && !loadError && isViewingPrior && loadingWorkingCycle && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color={CYAN} />
          </View>
        )}

        {!loading && !loadError && !currentCycle && (
          <View style={styles.emptyState}>
            <Ionicons name="flask" size={48} color={CYAN45} style={{ marginBottom: 16 }} />
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

        {!loading && !loadError && (currentCycle || isViewingPrior) && !loadingWorkingCycle && (
          <>
            {isViewingPrior && (
              <Pressable
                style={styles.priorCycleBanner}
                onPress={() => { setWorkingCycleNum(null); setManualStep(null); }}
              >
                <Ionicons name="arrow-forward" size={14} color={CYAN} />
                <AppText style={styles.priorCycleBannerText}>
                  {lang === "th"
                    ? `กำลังดู Cycle ${effectiveCycleNum} — แตะเพื่อกลับ Cycle ปัจจุบัน`
                    : `Viewing Cycle ${effectiveCycleNum} — tap to return to current`}
                </AppText>
              </Pressable>
            )}

            {displayedStep === "hypothesis" && (
              <HypothesisForm
                cycleId={String(effectiveCycleNum)}
                teamId={resolvedTeamId ?? ""}
                onCheckAI={handleCheckAI}
                onSubmit={handleSubmitHypothesis}
                aiFeedback={isViewingPrior ? null : aiFeedback}
                checkingAI={isViewingPrior ? false : checkingAI}
                lang={lang}
                status={effectiveSteps.find(s => s.stepType === "hypothesis")?.status ?? "draft"}
                initialData={(() => {
                  const stepData = effectiveSteps.find(s => s.stepType === "hypothesis")?.submissionData;
                  return {
                    who: effectiveCycleData?.hypothesis_who ?? readStepField(stepData, "who"),
                    willDo: effectiveCycleData?.hypothesis_will_do ?? readStepField(stepData, "will_do", "willDo"),
                    because: effectiveCycleData?.hypothesis_because ?? readStepField(stepData, "because"),
                    measuredBy: effectiveCycleData?.hypothesis_measured_by ?? readStepField(stepData, "measured_by", "measuredBy"),
                    full: effectiveCycleData?.hypothesis_full ?? (stepData?.full as string | null) ?? null,
                  };
                })()}
                priorHypothesis={!isViewingPrior && priorCycle ? {
                  who: readStepField(priorCycleStepData, "who") ?? priorCycle.hypothesis_who,
                  willDo: readStepField(priorCycleStepData, "will_do", "willDo") ?? priorCycle.hypothesis_will_do,
                  because: readStepField(priorCycleStepData, "because") ?? priorCycle.hypothesis_because,
                  measuredBy: readStepField(priorCycleStepData, "measured_by", "measuredBy") ?? priorCycle.hypothesis_measured_by,
                } : null}
              />
            )}

            {displayedStep === "pretotype" && (
              <PretotypeForm
                cycleId={String(effectiveCycleNum)}
                teamId={resolvedTeamId ?? ""}
                hypothesis={currentHypothesisFull}
                priorVariable={!isViewingPrior ? priorCycle?.variable_changed : undefined}
                onSubmit={handleSubmitPretotype}
                aiFeedback={isViewingPrior ? null : aiFeedback}
                lang={lang}
                status={effectiveSteps.find(s => s.stepType === "pretotype")?.status ?? "draft"}
                initialData={(() => {
                  const stepData = effectiveSteps.find(s => s.stepType === "pretotype")?.submissionData;
                  return {
                    method: effectiveCycleData?.pretotype_method ?? (stepData?.method as string | null) ?? null,
                    variableChanged: effectiveCycleData?.variable_changed ?? (stepData?.variable_changed as string | null) ?? null,
                    artifactUrl: effectiveCycleData?.pretotype_artifact_url ?? (stepData?.artifact_url as string | null) ?? null,
                    description: effectiveCycleData?.pretotype_description ?? (stepData?.description as string | null) ?? null,
                  };
                })()}
              />
            )}

            {displayedStep === "test_session" && (
              <TestCaptureForm
                cycleId={String(effectiveCycleNum)}
                teamId={resolvedTeamId ?? ""}
                cycleNumber={effectiveCycleNum ?? 1}
                hypothesis={currentHypothesisFull}
                onSubmit={isViewingPrior ? async () => {} : handleSubmitTest}
                onDelete={isViewingPrior ? undefined : async (sessionId) => {
                  const success = await deleteTestSession(sessionId);
                  if (success) await loadWorkspace();
                }}
                aiFeedback={isViewingPrior ? null : aiFeedback}
                lang={lang}
                status={effectiveSteps.find(s => s.stepType === "test_session")?.status ?? "draft"}
                initialData={effectiveSessions}
              />
            )}

            {displayedStep === "synthesis" && (
              <>
                <SynthesisGate
                  cycleId={String(effectiveCycleNum)}
                  hypothesis={currentHypothesisFull}
                  hypothesisResult={effectiveCycleData?.synthesis_result ?? null}
                  testSessions={effectiveSessions}
                  priorCycleVariable={!isViewingPrior ? priorCycle?.variable_changed : undefined}
                  onGateDecision={isViewingPrior ? async () => {} : handleGateDecision}
                  aiFeedback={isViewingPrior ? null : aiFeedback}
                  lang={lang}
                />
                {!isViewingPrior && (() => {
                  const synthStep = effectiveSteps.find(s => s.stepType === "synthesis");
                  const synthDone = synthStep && synthStep.status !== "draft";
                  const gateDecision = effectiveCycleData?.gate_decision;
                  if (synthDone && !gateDecision) {
                    return (
                      <Pressable style={styles.startButton} onPress={handleStartCycle}>
                        <AppText variant="bold" style={styles.startButtonText}>
                          {lang === "th"
                            ? `เริ่ม Cycle ${currentCycle!.cycleNumber + 1}`
                            : `Start Cycle ${currentCycle!.cycleNumber + 1}`}
                        </AppText>
                      </Pressable>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </>
        )}

      </ScrollView>

      {(currentCycle || isViewingPrior) && (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
          {stepOrder.map((step, index) => {
            const isActive = displayedStep === step;
            const stepStatus = effectiveSteps.find(s => s.stepType === step)?.status;
            const isDone = stepStatus && stepStatus !== "draft";
            const stepNum = index + 1;
            return (
              <Pressable
                key={step}
                style={[styles.bottomNavItem, isActive && styles.bottomNavItemActive]}
                onPress={() => { setManualStep(step); }}
              >
                <View style={[styles.bottomNavDot, isActive && styles.bottomNavDotActive, isDone && !isActive && styles.bottomNavDotDone]}>
                  {isDone && !isActive
                    ? <Ionicons name="checkmark" size={14} color={CYAN} />
                    : <AppText variant="bold" style={[styles.bottomNavNumber, isActive && styles.bottomNavNumberActive]}>{stepNum}</AppText>
                  }
                </View>
                <AppText style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive, isDone && !isActive && styles.bottomNavLabelDone]}>
                  {stepLabels[step]}
                </AppText>
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
  inlineLoader: {
    paddingVertical: 32,
    alignItems: "center",
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "rgba(231,76,60,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(231,76,60,0.25)",
  },
  inlineErrorText: { color: WHITE55, fontSize: 13, flex: 1 },
  inlineRetry: { color: CYAN, fontSize: 13 },

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

  cycleNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cycleNavArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cycleNavArrowDisabled: {
    borderColor: "rgba(145,196,227,0.1)",
  },
  cycleDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  deleteConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 4,
  },
  deleteConfirmText: {
    color: RED,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
  },
  deleteConfirmYes: {
    backgroundColor: RED,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteConfirmYesText: {
    color: BG,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
  },
  deleteConfirmNo: {
    color: WHITE55,
    fontSize: 12,
    fontFamily: "BaiJamjuree_400Regular",
  },
  cycleNavLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorBadge: {
    fontSize: 9,
    color: YELLOW,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1.2,
    backgroundColor: "rgba(255,165,0,0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.3)",
  },
  priorCycleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(145,196,227,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  priorCycleBannerText: {
    flex: 1,
    color: CYAN,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },

  cycleReview: {
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(145,196,227,0.04)",
  },
  cycleReviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cycleReviewTitle: { color: CYAN, fontSize: 16 },
  cycleReviewCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: CYAN20,
    borderRadius: 8,
  },
  cycleReviewCloseText: { color: CYAN, fontSize: 12 },
  cycleReviewSection: { gap: 4 },
  cycleReviewLabel: {
    fontSize: 10,
    color: WHITE55,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  cycleReviewValue: { color: WHITE75, fontSize: 14, lineHeight: 20 },
  cycleReviewMuted: { color: WHITE55, fontSize: 12, lineHeight: 18 },
  cycleReviewResults: { gap: 8 },
  cycleReviewResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cycleReviewTesterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  cycleReviewTesterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  cycleReviewTesterTop: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cycleReviewTesterName: {
    flex: 1,
    color: WHITE75,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  cycleReviewTesterResult: {
    fontSize: 11,
    fontFamily: "BaiJamjuree_700Bold",
  },
  cycleReviewTesterNote: {
    color: WHITE55,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    marginTop: 2,
  },
  resultPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultPillText: { fontSize: 12, fontFamily: "BaiJamjuree_700Bold" },
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
  bottomNavDotDone: {
    backgroundColor: "rgba(145,196,227,0.12)",
    borderColor: CYAN,
  },
  bottomNavNumber: { color: WHITE55, fontSize: 12 },
  bottomNavNumberActive: { color: BG },
  bottomNavLabel: { color: WHITE55, fontSize: 10, marginTop: 3 },
  bottomNavLabelActive: { color: CYAN },
  bottomNavLabelDone: { color: CYAN },

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
