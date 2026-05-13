import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import type {
  AICoachResponse,
  HackathonPhase3SynthesisResult,
} from "../../types/hackathon-phase3";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

interface SynthesisGateProps {
  cycleId: string;
  hypothesis: string;
  hypothesisResult: HackathonPhase3SynthesisResult | null;
  testResults: Array<{ interval: string; action: string }>;
  priorCycleVariable?: string | null;
  onGateDecision: (decision: "refine" | "proceed" | "kill", data: {
    whatChanged: string;
    nextVariable?: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
}

export default function SynthesisGate({
  hypothesis,
  hypothesisResult,
  testResults,
  priorCycleVariable,
  onGateDecision,
  aiFeedback,
}: SynthesisGateProps) {
  const [whatChanged, setWhatChanged] = useState("");
  const [nextVariable, setNextVariable] = useState("");
  const [selectedGate, setSelectedGate] = useState<string | null>(null);

  const canSubmit = whatChanged.trim().length > 0;

  const handleGate = useCallback(
    (gate: "refine" | "proceed" | "kill") => {
      if (!canSubmit) return;
      onGateDecision(gate, {
        whatChanged,
        nextVariable: gate === "refine" ? nextVariable : undefined,
      });
    },
    [canSubmit, whatChanged, nextVariable, onGateDecision]
  );

  const resultColor =
    hypothesisResult === "confirmed"
      ? GREEN
      : hypothesisResult === "killed"
      ? RED
      : YELLOW;

  const resultLabel =
    hypothesisResult === "confirmed"
      ? "Confirmed"
      : hypothesisResult === "killed"
      ? "Killed"
      : "Unclear";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Step 4: Synthesize + Choose Gate
        </AppText>
        <AppText style={styles.subtitle}>Honest synthesis. Make a decision.</AppText>

        {/* Hypothesis Review */}
        <View style={styles.reviewCard}>
          <AppText variant="bold" style={styles.reviewTitle}>Hypothesis Review</AppText>
          <AppText style={styles.reviewHypothesis}>{hypothesis}</AppText>
          <View style={[styles.resultBadge, { borderColor: resultColor }]}>
            <Ionicons
              name={
                hypothesisResult === "confirmed"
                  ? "checkmark-circle"
                  : hypothesisResult === "killed"
                  ? "close-circle"
                  : "help-circle"
              }
              size={18}
              color={resultColor}
            />
            <AppText style={[styles.resultText, { color: resultColor }]}>
              {resultLabel}
            </AppText>
          </View>
        </View>

        {/* Key Behaviors */}
        <View style={styles.behaviorCard}>
          <AppText variant="bold" style={styles.sectionLabel}>Key Behaviors Observed</AppText>
          {testResults.slice(0, 4).map((r, i) => (
            <View key={i} style={styles.behaviorItem}>
              <AppText style={styles.behaviorInterval}>{r.interval}</AppText>
              <AppText style={styles.behaviorAction}>{r.action}</AppText>
            </View>
          ))}
        </View>

        {/* What Changed */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>What Changed About Our Understanding? *</AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did this cycle reveal?"
            placeholderTextColor={WHITE55}
            value={whatChanged}
            onChangeText={setWhatChanged}
            multiline
          />
        </View>

        {/* Compare to Prior */}
        {priorCycleVariable && (
          <View style={styles.compareCard}>
            <AppText variant="bold" style={styles.sectionLabel}>Compare to Prior Cycle</AppText>
            <AppText style={styles.compareText}>
              Prior variable: {priorCycleVariable}
            </AppText>
          </View>
        )}

        {/* Next Variable (if Refine) */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>ONE Variable to Change Next Cycle</AppText>
          <TextInput
            style={styles.input}
            placeholder="If refining, what ONE thing will you change?"
            placeholderTextColor={WHITE55}
            value={nextVariable}
            onChangeText={setNextVariable}
          />
        </View>

        {/* Scorecard Preview */}
        <View style={styles.scorecard}>
          <AppText variant="bold" style={styles.scorecardTitle}>Cycle Scorecard</AppText>
          <View style={styles.scoreRow}>
            {["Hypothesis", "Variable", "Behavior", "Freshness", "Synthesis"].map(
              (label) => (
                <View key={label} style={styles.scoreItem}>
                  <AppText style={styles.scoreLabel}>{label}</AppText>
                  <View style={styles.scoreBar}>
                    <View style={[styles.scoreFill, { width: "60%" }]} />
                  </View>
                </View>
              )
            )}
          </View>
        </View>

        {/* Gate Decision */}
        <View style={styles.gateSection}>
          <AppText variant="bold" style={styles.gateTitle}>Choose Gate</AppText>
          <View style={styles.gateRow}>
            <Pressable
              style={[
                styles.gateButton,
                styles.gateRefine,
                selectedGate === "refine" && styles.gateRefineActive,
              ]}
              onPress={() => {
                setSelectedGate("refine");
                handleGate("refine");
              }}
            >
              <Ionicons name="refresh" size={20} color={CYAN} />
              <AppText variant="bold" style={styles.gateButtonText}>Refine</AppText>
              <AppText style={styles.gateSubtext}>Start new cycle</AppText>
            </Pressable>

            <Pressable
              style={[
                styles.gateButton,
                styles.gateProceed,
                selectedGate === "proceed" && styles.gateProceedActive,
              ]}
              onPress={() => {
                setSelectedGate("proceed");
                handleGate("proceed");
              }}
            >
              <Ionicons name="arrow-forward" size={20} color={GREEN} />
              <AppText variant="bold" style={styles.gateButtonText}>Proceed</AppText>
              <AppText style={styles.gateSubtext}>To Round 1 video</AppText>
            </Pressable>

            <Pressable
              style={[
                styles.gateButton,
                styles.gateKill,
                selectedGate === "kill" && styles.gateKillActive,
              ]}
              onPress={() => {
                setSelectedGate("kill");
                handleGate("kill");
              }}
            >
              <Ionicons name="close" size={20} color={RED} />
              <AppText variant="bold" style={styles.gateButtonText}>Kill</AppText>
              <AppText style={styles.gateSubtext}>Exit workspace</AppText>
            </Pressable>
          </View>
        </View>

        {/* AI Feedback */}
        {aiFeedback && (
          <View style={styles.aiFeedbackCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={16} color={CYAN} />
              <AppText variant="bold" style={styles.aiTitle}>AI Coach</AppText>
            </View>
            {aiFeedback.flags.map((flag: any, i: number) => (
              <View key={i} style={styles.aiFlag}>
                <Ionicons
                  name={
                    flag.severity === "blocking"
                      ? "close-circle"
                      : flag.severity === "warning"
                      ? "warning"
                      : "information-circle"
                  }
                  size={16}
                  color={
                    flag.severity === "blocking"
                      ? RED
                      : flag.severity === "warning"
                      ? YELLOW
                      : CYAN
                  }
                />
                <AppText style={styles.aiFlagText}>{flag.message}</AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: { color: WHITE, fontSize: 22, marginBottom: 4 },
  subtitle: { color: WHITE55, fontSize: 14, marginBottom: 20 },
  reviewCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewTitle: { color: CYAN, fontSize: 14, marginBottom: 8 },
  reviewHypothesis: { color: WHITE, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultText: { fontSize: 14 },
  behaviorCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: { color: CYAN, fontSize: 16, marginBottom: 10 },
  behaviorItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  behaviorInterval: { color: WHITE55, fontSize: 11, width: 60 },
  behaviorAction: { color: WHITE75, fontSize: 13, flex: 1 },
  fieldGroup: { marginBottom: 20 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WHITE,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  compareCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  compareText: { color: WHITE75, fontSize: 13 },
  scorecard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scorecardTitle: { color: CYAN, fontSize: 14, marginBottom: 12 },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  scoreItem: { width: "30%", marginBottom: 8 },
  scoreLabel: { color: WHITE55, fontSize: 11, marginBottom: 4 },
  scoreBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
  },
  scoreFill: {
    height: 6,
    backgroundColor: CYAN,
    borderRadius: 3,
  },
  gateSection: { marginTop: 10 },
  gateTitle: { color: WHITE, fontSize: 18, marginBottom: 12 },
  gateRow: {
    flexDirection: "row",
    gap: 10,
  },
  gateButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  gateRefine: {
    backgroundColor: CYAN20,
    borderColor: CYAN45,
  },
  gateRefineActive: {
    backgroundColor: CYAN45,
    borderColor: CYAN,
  },
  gateProceed: {
    backgroundColor: "rgba(78,205,196,0.1)",
    borderColor: "rgba(78,205,196,0.3)",
  },
  gateProceedActive: {
    backgroundColor: "rgba(78,205,196,0.25)",
    borderColor: GREEN,
  },
  gateKill: {
    backgroundColor: "rgba(255,107,107,0.1)",
    borderColor: "rgba(255,107,107,0.3)",
  },
  gateKillActive: {
    backgroundColor: "rgba(255,107,107,0.25)",
    borderColor: RED,
  },
  gateButtonText: { color: WHITE, fontSize: 14 },
  gateSubtext: { color: WHITE55, fontSize: 11 },
  aiFeedbackCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  aiTitle: { color: CYAN, fontSize: 14 },
  aiFlag: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  aiFlagText: { color: WHITE75, fontSize: 13, flex: 1 },
});
