import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import AICoach from "../../../components/Hackathon/Phase3/AICoach";
import {
  getMidphaseSynthesis,
  submitMidphaseSynthesis,
} from "../../../lib/hackathonPhase3";
import type {
  HackathonPhase3MidphaseSynthesis,
  AICoachResponse,
} from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";
const GREEN = "#4ECDC4";

export default function Phase3SynthesisScreen() {
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();

  const [synthesis, setSynthesis] =
    useState<HackathonPhase3MidphaseSynthesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AICoachResponse | null>(null);

  const [whatLearned, setWhatLearned] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [whatWrong, setWhatWrong] = useState("");
  const [nextHypothesis, setNextHypothesis] = useState("");
  const [pretotypeUrl, setPretotypeUrl] = useState("");
  const [confidence, setConfidence] = useState(5);

  const loadSynthesis = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const data = await getMidphaseSynthesis(teamId);
    setSynthesis(data);
    if (data) {
      setWhatLearned(data.what_learned ?? "");
      setWhatChanged(data.what_changed ?? "");
      setWhatWrong(data.what_wrong ?? "");
      setNextHypothesis(data.next_hypothesis ?? "");
      setPretotypeUrl(data.pretotype_state_url ?? "");
      setConfidence(data.confidence_score ?? 5);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    loadSynthesis();
  }, [loadSynthesis]);

  const handleSubmit = useCallback(async () => {
    if (!teamId) return;
    setSubmitting(true);

    const success = await submitMidphaseSynthesis(teamId, {
      what_learned: whatLearned,
      what_changed: whatChanged,
      what_wrong: whatWrong,
      next_hypothesis: nextHypothesis,
      pretotype_state_url: pretotypeUrl || undefined,
      confidence_score: confidence,
    });

    if (success) {
      setAiFeedback({
        flags: [
          {
            severity: "info",
            flag_id: "synthesis_submitted",
            field: "synthesis",
            message: "Mid-phase synthesis submitted.",
            suggestion: "Continue testing or prepare Round 1 video.",
          },
        ],
        response:
          "Great reflection! Your synthesis is now recorded. Keep iterating or prepare for Round 1.",
      });
    }
    setSubmitting(false);
  }, [teamId, whatLearned, whatChanged, whatWrong, nextHypothesis, pretotypeUrl, confidence]);

  const canSubmit =
    whatLearned.trim().length > 0 &&
    whatChanged.trim().length > 0 &&
    whatWrong.trim().length > 0;

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top + 60 },
        ]}
      >
        <ActivityIndicator size="large" color={CYAN} />
        <AppText style={styles.loadingText}>Loading synthesis...</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <AppText variant="bold" style={styles.headerTitle}>
          Mid-Phase Synthesis
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {synthesis?.auto_draft && (
        <View style={styles.autoDraftCard}>
          <View style={styles.autoDraftHeader}>
            <Ionicons name="sparkles" size={16} color={CYAN} />
            <AppText variant="bold" style={styles.autoDraftTitle}>
              AI-Generated Draft
            </AppText>
          </View>
          <AppText style={styles.autoDraftText}>
            {synthesis.auto_draft}
          </AppText>
          <AppText style={styles.autoDraftHint}>
            Edit below to make it your own.
          </AppText>
        </View>
      )}

      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Day 6: What Did We Learn?
        </AppText>
        <AppText style={styles.subtitle}>
          Honest reflection on your cycles so far
        </AppText>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            What did we learn? *
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Key insights from test sessions..."
            placeholderTextColor={WHITE28}
            value={whatLearned}
            onChangeText={setWhatLearned}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            What changed about our understanding? *
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="How did your view of the problem shift?"
            placeholderTextColor={WHITE28}
            value={whatChanged}
            onChangeText={setWhatChanged}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            What were we wrong about? *
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Be honest. What assumption failed?"
            placeholderTextColor={WHITE28}
            value={whatWrong}
            onChangeText={setWhatWrong}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Next Hypothesis
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="If continuing, what will you test next?"
            placeholderTextColor={WHITE28}
            value={nextHypothesis}
            onChangeText={setNextHypothesis}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Pretotype State URL
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={WHITE28}
            value={pretotypeUrl}
            onChangeText={setPretotypeUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Confidence: {confidence}/10
          </AppText>
          <View style={styles.confidenceRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.confidenceDot,
                  confidence >= n && styles.confidenceDotActive,
                ]}
                onPress={() => setConfidence(n)}
              >
                <AppText
                  style={[
                    styles.confidenceDotText,
                    confidence >= n && styles.confidenceDotTextActive,
                  ]}
                >
                  {n}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={styles.confidenceHint}>
            {confidence <= 3
              ? "Low confidence — keep testing"
              : confidence <= 7
              ? "Moderate — more evidence needed"
              : "High — ready for Round 1 video"}
          </AppText>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!canSubmit || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Synthesis"}
          </AppText>
        </Pressable>

        {aiFeedback && (
          <View style={{ marginTop: 16 }}>
            <AICoach feedback={aiFeedback} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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
  autoDraftCard: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  autoDraftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  autoDraftTitle: { color: CYAN, fontSize: 14 },
  autoDraftText: { color: WHITE75, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  autoDraftHint: { color: WHITE55, fontSize: 12, fontStyle: "italic" },
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
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { color: CYAN, fontSize: 16, marginBottom: 8 },
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
  confidenceRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  confidenceDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  confidenceDotActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  confidenceDotText: { color: WHITE55, fontSize: 11 },
  confidenceDotTextActive: { color: BG, fontWeight: "600" },
  confidenceHint: { color: WHITE55, fontSize: 12, marginTop: 8 },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
});
