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
  getTeamDailyCheckins,
  submitDailyCheckin,
} from "../../../lib/hackathonPhase3";
import type {
  HackathonPhase3DailyCheckin,
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
const YELLOW = "#FFA500";

export default function Phase3DailyScreen() {
  const insets = useSafeAreaInsets();
  const { teamId, dayNumber } = useLocalSearchParams<{
    teamId: string;
    dayNumber: string;
  }>();

  const day = parseInt(dayNumber ?? "1", 10);

  const [checkins, setCheckins] = useState<HackathonPhase3DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AICoachResponse | null>(null);

  const [currentCycle, setCurrentCycle] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [currentHypothesis, setCurrentHypothesis] = useState("");
  const [variableChanged, setVariableChanged] = useState("");
  const [testSessionsToday, setTestSessionsToday] = useState("0");

  const loadCheckins = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const data = await getTeamDailyCheckins(teamId);
    setCheckins(data);
    const today = data.find((c) => c.day_number === day);
    if (today) {
      setCurrentCycle(today.current_cycle_number?.toString() ?? "");
      setCurrentState(today.current_cycle_state ?? "");
      setCurrentHypothesis(today.current_hypothesis ?? "");
      setVariableChanged(today.variable_changed ?? "");
      setTestSessionsToday(today.test_sessions_today?.toString() ?? "0");
    }
    setLoading(false);
  }, [teamId, day]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  const handleSubmit = useCallback(async () => {
    if (!teamId) return;
    setSubmitting(true);

    const success = await submitDailyCheckin(teamId, day, {
      current_cycle_number: parseInt(currentCycle) || undefined,
      current_cycle_state: currentState || undefined,
      current_hypothesis: currentHypothesis || undefined,
      variable_changed: variableChanged || undefined,
      test_sessions_today: parseInt(testSessionsToday) || 0,
      status: "submitted",
    });

    if (success) {
      setAiFeedback({
        flags: [
          {
            severity: "info",
            flag_id: "checkin_submitted",
            field: "daily_checkin",
            message: `Day ${day} check-in submitted.`,
            suggestion: "Keep testing. Every day counts.",
          },
        ],
        response: "Daily check-in recorded. Keep the momentum going!",
      });
      await loadCheckins();
    }
    setSubmitting(false);
  }, [
    teamId,
    day,
    currentCycle,
    currentState,
    currentHypothesis,
    variableChanged,
    testSessionsToday,
    loadCheckins,
  ]);

  const existing = checkins.find((c) => c.day_number === day);
  const isLate = existing?.status === "late";
  const isSubmitted = existing?.status === "submitted";

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top + 60 },
        ]}
      >
        <ActivityIndicator size="large" color={CYAN} />
        <AppText style={styles.loadingText}>Loading check-in...</AppText>
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
          Day {day} Check-in
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {isLate && (
        <View style={styles.lateBanner}>
          <Ionicons name="time" size={16} color={YELLOW} />
          <AppText style={styles.lateText}>Late submission</AppText>
        </View>
      )}

      {isSubmitted && !isLate && (
        <View style={styles.submittedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={GREEN} />
          <AppText style={styles.submittedText}>Submitted</AppText>
        </View>
      )}

      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Daily Stand-up
        </AppText>
        <AppText style={styles.subtitle}>
          Where are you in the sprint loop?
        </AppText>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Current Cycle
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2"
            placeholderTextColor={WHITE28}
            value={currentCycle}
            onChangeText={setCurrentCycle}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Current State
          </AppText>
          <View style={styles.stateRow}>
            {["planning", "testing", "synthesizing", "completed"].map(
              (s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.stateChip,
                    currentState === s && styles.stateChipActive,
                  ]}
                  onPress={() => setCurrentState(s)}
                >
                  <AppText
                    style={[
                      styles.stateChipText,
                      currentState === s && styles.stateChipTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </AppText>
                </Pressable>
              )
            )}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Current Hypothesis
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are you testing today?"
            placeholderTextColor={WHITE28}
            value={currentHypothesis}
            onChangeText={setCurrentHypothesis}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Variable Changed This Cycle
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="ONE thing you changed"
            placeholderTextColor={WHITE28}
            value={variableChanged}
            onChangeText={setVariableChanged}
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Test Sessions Today
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={WHITE28}
            value={testSessionsToday}
            onChangeText={setTestSessionsToday}
            keyboardType="numeric"
          />
        </View>

        <Pressable
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Check-in"}
          </AppText>
        </Pressable>

        {aiFeedback && (
          <View style={{ marginTop: 16 }}>
            <AICoach feedback={aiFeedback} />
          </View>
        )}
      </View>

      {checkins.length > 0 && (
        <View style={styles.historyCard}>
          <AppText variant="bold" style={styles.historyTitle}>
            Previous Check-ins
          </AppText>
          {checkins.map((c) => (
            <View key={c.day_number} style={styles.historyRow}>
              <AppText style={styles.historyDay}>Day {c.day_number}</AppText>
              <View
                style={[
                  styles.statusBadge,
                  c.status === "submitted" && styles.statusBadgeGreen,
                  c.status === "late" && styles.statusBadgeYellow,
                  c.status === "excused" && styles.statusBadgeGray,
                ]}
              >
                <AppText style={styles.statusText}>{c.status}</AppText>
              </View>
            </View>
          ))}
        </View>
      )}
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
  lateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,165,0,0.1)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.3)",
  },
  lateText: { color: YELLOW, fontSize: 14 },
  submittedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(78,205,196,0.1)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
  },
  submittedText: { color: GREEN, fontSize: 14 },
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
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  stateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stateChip: {
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  stateChipActive: {
    backgroundColor: CYAN45,
    borderColor: CYAN,
  },
  stateChipText: { color: WHITE75, fontSize: 13 },
  stateChipTextActive: { color: WHITE, fontWeight: "600" },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
  historyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyTitle: { color: WHITE, fontSize: 16, marginBottom: 12 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historyDay: { color: WHITE75, fontSize: 14 },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusBadgeGreen: { backgroundColor: "rgba(78,205,196,0.15)" },
  statusBadgeYellow: { backgroundColor: "rgba(255,165,0,0.15)" },
  statusBadgeGray: { backgroundColor: "rgba(255,255,255,0.1)" },
  statusText: { color: WHITE55, fontSize: 11, textTransform: "capitalize" },
});
