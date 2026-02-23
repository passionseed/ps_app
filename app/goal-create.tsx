import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { gradeGoal, realityCheck, SmartGradeResult, RealityCheckResult } from "../lib/ai";

const MEASUREMENT_OPTIONS = [
  { id: "video", label: "📹 Video" },
  { id: "screenshot", label: "📸 Screenshot" },
  { id: "text", label: "📝 Text log" },
  { id: "voice", label: "🎤 Voice note" },
];

const FREQ_UNITS = ["day", "week", "month"] as const;

export default function GoalCreateScreen() {
  // Goal text
  const [goalText, setGoalText] = useState("");
  const [smartGrade, setSmartGrade] = useState<SmartGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measurement
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);

  // Time
  const [freqCount, setFreqCount] = useState(3);
  const [freqUnit, setFreqUnit] = useState<"day" | "week" | "month">("week");
  const [durationType, setDurationType] = useState<"count" | "date">("count");
  const [durationCount, setDurationCount] = useState(8);
  const [durationCountUnit, setDurationCountUnit] = useState<"weeks" | "months">("weeks");
  const [durationDate, setDurationDate] = useState("");

  // Reality check
  const [realityResult, setRealityResult] = useState<RealityCheckResult | null>(null);
  const [checkingReality, setCheckingReality] = useState(false);
  const [realityDone, setRealityDone] = useState(false);
  const [realityError, setRealityError] = useState<string | null>(null);

  // Invite
  const [friendSearch, setFriendSearch] = useState("");

  // Derived reveal flags
  const showMeasurement = goalText.trim().length > 5;
  const showTime = selectedMeasurements.length > 0;
  const showRealityCheck =
    showTime &&
    freqCount > 0 &&
    (durationType === "count" ? durationCount > 0 : durationDate.length > 0);
  const showInvite = realityDone;

  // SMART grade on blur with debounce
  const handleGoalBlur = useCallback(async () => {
    if (goalText.trim().length < 5) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setGrading(true);
      setGradeError(null);
      try {
        console.log("[smart-grade] calling with:", goalText);
        console.log("[smart-grade] function URL:", `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/smart-grade`);
        const result = await gradeGoal(goalText);
        console.log("[smart-grade] result:", result);
        setSmartGrade(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : "";
        console.error("[smart-grade] error:", msg, stack, err);
        setGradeError(msg);
      } finally {
        setGrading(false);
      }
    }, 800);
  }, [goalText]);

  const handleRealityCheck = async () => {
    setCheckingReality(true);
    setRealityError(null);
    try {
      console.log("[reality-check] calling with:", {
        goalText,
        measurementTypes: selectedMeasurements,
        frequencyCount: freqCount,
        frequencyUnit: freqUnit,
        durationType,
        durationValue: durationType === "count" ? `${durationCount} ${durationCountUnit}` : durationDate,
      });
      const result = await realityCheck({
        goalText,
        measurementTypes: selectedMeasurements,
        frequencyCount: freqCount,
        frequencyUnit: freqUnit,
        durationType,
        durationValue: durationType === "count" ? `${durationCount} ${durationCountUnit}` : durationDate,
      });
      console.log("[reality-check] result:", result);
      setRealityResult(result);
      setRealityDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[reality-check] error:", msg, err);
      setRealityError(msg);
    } finally {
      setCheckingReality(false);
    }
  };

  const toggleMeasurement = (id: string) => {
    setSelectedMeasurements((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#BFFF00";
    if (score >= 50) return "#FFE500";
    return "#FF4444";
  };

  const durationSummary = () => {
    const freq = `${freqCount}× per ${freqUnit}`;
    const dur =
      durationType === "count"
        ? `for ${durationCount} ${durationCountUnit}`
        : `until ${durationDate}`;
    return `${freq}, ${dur}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>New Goal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Goal Text ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 What's your goal?</Text>
          <TextInput
            style={styles.goalInput}
            multiline
            placeholder="I will..."
            placeholderTextColor="#999"
            value={goalText}
            onChangeText={setGoalText}
            onBlur={handleGoalBlur}
          />

          {/* SMART Grade */}
          {gradeError && (
            <Text style={styles.errorText}>⚠️ Grade error: {gradeError}</Text>
          )}
          {grading && (
            <View style={styles.gradeRow}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.gradingText}>Grading...</Text>
            </View>
          )}
          {!grading && smartGrade && (
            <View style={styles.gradeContainer}>
              <View
                style={[
                  styles.scoreBadge,
                  { borderColor: scoreColor(smartGrade.score) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    { color: scoreColor(smartGrade.score) },
                  ]}
                >
                  {smartGrade.score}% SMART
                </Text>
              </View>
              {Object.entries(smartGrade.tips)
                .filter(([, tip]) => tip !== null)
                .map(([dim, tip]) => (
                  <Text key={dim} style={styles.tipText}>
                    ⚠️ {dim.replace("_", "-")}: {tip}
                  </Text>
                ))}
            </View>
          )}
        </View>

        {/* ── Section 2: Measurement ── */}
        {showMeasurement && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📏 How will you prove it?</Text>
            <View style={styles.chipRow}>
              {MEASUREMENT_OPTIONS.map((opt) => {
                const selected = selectedMeasurements.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleMeasurement(opt.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Section 3: Time Commitment ── */}
        {showTime && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>⏱️ Time commitment</Text>

            {/* Frequency */}
            <Text style={styles.subLabel}>Frequency</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.stepper}
                onPress={() => setFreqCount((v) => Math.max(1, v - 1))}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{freqCount}</Text>
              <Pressable
                style={styles.stepper}
                onPress={() => setFreqCount((v) => Math.min(30, v + 1))}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
              <Text style={styles.unitLabel}>times per</Text>
              <View style={styles.unitSelector}>
                {FREQ_UNITS.map((u) => (
                  <Pressable
                    key={u}
                    style={[
                      styles.unitChip,
                      freqUnit === u && styles.unitChipSelected,
                    ]}
                    onPress={() => setFreqUnit(u)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        freqUnit === u && styles.unitChipTextSelected,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Duration */}
            <Text style={styles.subLabel}>Duration</Text>
            <View style={styles.row}>
              <Pressable
                style={[
                  styles.durationToggle,
                  durationType === "count" && styles.durationToggleSelected,
                ]}
                onPress={() => setDurationType("count")}
              >
                <Text
                  style={[
                    styles.durationToggleText,
                    durationType === "count" && styles.durationToggleTextSelected,
                  ]}
                >
                  # weeks
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.durationToggle,
                  durationType === "date" && styles.durationToggleSelected,
                ]}
                onPress={() => setDurationType("date")}
              >
                <Text
                  style={[
                    styles.durationToggleText,
                    durationType === "date" && styles.durationToggleTextSelected,
                  ]}
                >
                  end date
                </Text>
              </Pressable>
            </View>

            {durationType === "count" ? (
              <View style={styles.row}>
                <Pressable
                  style={styles.stepper}
                  onPress={() => setDurationCount((v) => Math.max(1, v - 1))}
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{durationCount}</Text>
                <Pressable
                  style={styles.stepper}
                  onPress={() => setDurationCount((v) => v + 1)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
                <View style={styles.unitSelector}>
                  {(["weeks", "months"] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[
                        styles.unitChip,
                        durationCountUnit === u && styles.unitChipSelected,
                      ]}
                      onPress={() => setDurationCountUnit(u)}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          durationCountUnit === u && styles.unitChipTextSelected,
                        ]}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={durationDate}
                onChangeText={setDurationDate}
              />
            )}

            {/* Summary line */}
            {showRealityCheck && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>📅 {durationSummary()}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Section 4: Reality Check ── */}
        {showRealityCheck && (
          <View style={styles.section}>
            <Pressable
              style={[
                styles.realityBtn,
                checkingReality && styles.realityBtnDisabled,
              ]}
              onPress={handleRealityCheck}
              disabled={checkingReality}
            >
              {checkingReality ? (
                <ActivityIndicator size="small" color="#FDFFF5" />
              ) : (
                <Text style={styles.realityBtnText}>🔍 Reality Check</Text>
              )}
            </Pressable>

            {realityError && (
              <Text style={[styles.errorText, { marginTop: 12 }]}>⚠️ Error: {realityError}</Text>
            )}
            {realityResult && (
              <View style={styles.realityResult}>
                <Text style={styles.likelihoodText}>
                  {realityResult.likelihood}% chance you'll complete this
                </Text>
                {realityResult.pitfalls.map((p, i) => (
                  <Text key={i} style={styles.pitfallText}>
                    ⚠️ {p}
                  </Text>
                ))}
                {realityResult.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestionText}>
                    💡 {s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Section 5: Invite Friends ── */}
        {showInvite && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Invite friends</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#999"
              value={friendSearch}
              onChangeText={setFriendSearch}
            />
            <Pressable style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>🔗 Share invite link</Text>
            </Pressable>
            <Text style={styles.inviteNote}>
              Friends set their own goal. Challenge starts once you approve at least one.
            </Text>
          </View>
        )}

        {/* ── Start Challenge ── */}
        {showInvite && (
          <View style={styles.section}>
            <Pressable style={[styles.startBtn, styles.startBtnDisabled]} disabled>
              <Text style={styles.startBtnText}>🚀 Start Challenge</Text>
            </Pressable>
            <Text style={styles.startNote}>
              Waiting for a friend to submit their goal
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
  },
  backBtn: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    width: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    marginBottom: 8,
    marginTop: 12,
  },
  goalInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
    minHeight: 100,
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    textAlignVertical: "top",
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  gradingText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
  },
  gradeContainer: { marginTop: 10, gap: 6 },
  scoreBadge: {
    alignSelf: "flex-start",
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
  },
  tipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    lineHeight: 18,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: "#111" },
  chipText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  chipTextSelected: { color: "#BFFF00" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  stepper: {
    borderWidth: 2,
    borderColor: "#111",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 20,
  },
  stepperValue: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    minWidth: 32,
    textAlign: "center",
  },
  unitLabel: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#555",
  },
  unitSelector: { flexDirection: "row", gap: 6 },
  unitChip: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  unitChipSelected: { backgroundColor: "#111" },
  unitChipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  unitChipTextSelected: { color: "#BFFF00" },
  durationToggle: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  durationToggleSelected: { backgroundColor: "#111" },
  durationToggleText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  durationToggleTextSelected: { color: "#BFFF00" },
  dateInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  summaryBox: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: "#BFFF00",
    backgroundColor: "#F5FFD6",
    padding: 10,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  realityBtn: {
    backgroundColor: "#111",
    padding: 16,
    alignItems: "center",
  },
  realityBtnDisabled: { opacity: 0.5 },
  realityBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
    letterSpacing: 1,
  },
  realityResult: {
    marginTop: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
  },
  likelihoodText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 4,
  },
  pitfallText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    lineHeight: 18,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 18,
  },
  searchInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 12,
  },
  shareBtn: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  inviteNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: "#BFFF00",
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111",
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    letterSpacing: 1,
  },
  startNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    textAlign: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#FF4444",
    marginTop: 8,
    lineHeight: 16,
  },
});
