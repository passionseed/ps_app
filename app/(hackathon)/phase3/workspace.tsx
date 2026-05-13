import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
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
} from "../../../lib/hackathonPhase3";
import { supabase } from "../../../lib/supabase";
import type {
  Phase3Workspace,
  HackathonPhase3Cycle,
  AICoachResponse,
} from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
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
  const [loading, setLoading] = useState(true);
  const [aiFeedback, setAiFeedback] = useState<AICoachResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let tid = paramTeamId;
      if (!tid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from("hackathon_team_members")
            .select("team_id")
            .eq("participant_id", user.id)
            .single();
          if (member?.team_id) tid = member.team_id;
        }
      }
      if (!cancelled) setResolvedTeamId(tid ?? null);
    })();
    return () => { cancelled = true; };
  }, [paramTeamId]);

  const loadWorkspace = useCallback(async () => {
    if (!resolvedTeamId || !programPhaseId) return;
    setLoading(true);
    const ws = await getPhase3Workspace(resolvedTeamId, programPhaseId);
    setWorkspace(ws);
    const teamCycles = await getTeamCycles(resolvedTeamId);
    setCycles(teamCycles);
    setLoading(false);
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
        setAiFeedback({
          flags: [
            {
              severity: "info",
              flag_id: "hypothesis_submitted",
              field: "hypothesis",
              message: "Hypothesis submitted. Move on to pretotype.",
              suggestion: "Build the smallest testable version next.",
            },
          ],
          response: "Great hypothesis! Now pretotype it.",
        });
        await loadWorkspace();
      }
      setSubmitting(false);
    },
    [workspace, cycles, loadWorkspace]
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

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top + 60 },
        ]}
      >
        <ActivityIndicator size="large" color={CYAN} />
        <AppText style={styles.loadingText}>Loading workspace...</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <AppText variant="bold" style={styles.headerTitle}>
          Sprint Loop
        </AppText>
        <View style={styles.headerRight}>
          {currentCycle && (
            <View style={styles.cycleBadge}>
              <AppText variant="bold" style={styles.cycleBadgeText}>
                Cycle {currentCycle.cycleNumber}
              </AppText>
            </View>
          )}
        </View>
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
      />

      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="small" color={CYAN} />
          <AppText style={styles.submittingText}>Submitting...</AppText>
        </View>
      )}

      {activeStep === "hypothesis" && (
        <HypothesisForm
          cycleId={currentCycle ? String(currentCycle.cycleNumber) : ""}
          teamId={resolvedTeamId}
          onSubmit={handleSubmitHypothesis}
          aiFeedback={aiFeedback}
        />
      )}

      {activeStep === "pretotype" && (
        <PretotypeForm
          cycleId={currentCycle ? String(currentCycle.cycleNumber) : ""}
          priorVariable={priorCycle?.variable_changed}
          onSubmit={handleSubmitPretotype}
          aiFeedback={aiFeedback}
        />
      )}

      {activeStep === "test_session" && (
        <TestCaptureForm
          cycleId={currentCycle ? String(currentCycle.cycleNumber) : ""}
          teamId={resolvedTeamId}
          cycleNumber={currentCycle?.cycleNumber ?? 1}
          onSubmit={handleSubmitTest}
          aiFeedback={aiFeedback}
        />
      )}

      {activeStep === "synthesis" && (
        <SynthesisGate
          cycleId={currentCycle ? String(currentCycle.cycleNumber) : ""}
          hypothesis={
            cycles.find(
              (c) => c.cycle_number === currentCycle?.cycleNumber
            )?.hypothesis_full ?? ""
          }
          hypothesisResult={
            cycles.find(
              (c) => c.cycle_number === currentCycle?.cycleNumber
            )?.synthesis_result ?? null
          }
          testResults={[]}
          priorCycleVariable={priorCycle?.variable_changed}
          onGateDecision={handleGateDecision}
          aiFeedback={aiFeedback}
        />
      )}

      {!currentCycle && (
        <View style={styles.emptyCard}>
          <Ionicons
            name="flask"
            size={48}
            color={CYAN45}
            style={{ marginBottom: 16 }}
          />
          <AppText variant="bold" style={styles.emptyTitle}>
            No Active Cycle
          </AppText>
          <AppText style={styles.emptySubtitle}>
            Start your first hypothesis test cycle
          </AppText>
          <Pressable style={styles.startButton} onPress={handleStartCycle}>
            <AppText variant="bold" style={styles.startButtonText}>
              Start Cycle 1
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: { color: WHITE55, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { color: WHITE, fontSize: 18, flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cycleBadge: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  cycleBadgeText: { color: CYAN, fontSize: 12 },
  submittingOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(3,5,10,0.8)",
    zIndex: 10,
  },
  submittingText: { color: CYAN, fontSize: 14 },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 32,
    margin: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
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
});
