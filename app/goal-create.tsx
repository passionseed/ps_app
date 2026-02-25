import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  gradeGoal,
  realityCheck,
  parseGoal,
  SmartGradeResult,
  RealityCheckResult,
  GoalParseResult,
} from "../lib/ai";
import { useAuth } from "../lib/auth";

const MEASUREMENT_OPTIONS = [
  { id: "photo", label: "📷 Photo" },
  { id: "video", label: "📹 Video" },
  { id: "screenshot", label: "📸 Screenshot" },
  { id: "text", label: "📝 Text" },
  { id: "voice", label: "🎤 Voice" },
];

const SMART_DIMS = [
  { key: "specific", label: "S", full: "Specific" },
  { key: "measurable", label: "M", full: "Measurable" },
  { key: "achievable", label: "A", full: "Achievable" },
  { key: "relevant", label: "R", full: "Relevant" },
  { key: "time_bound", label: "T", full: "Time-bound" },
] as const;

export default function GoalCreateScreen() {
  const { profile } = useAuth();

  const [goalText, setGoalText] = useState("");
  const [smartGrade, setSmartGrade] = useState<SmartGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const [parsedGoal, setParsedGoal] = useState<GoalParseResult | null>(null);
  const [parseChipDismissed, setParseChipDismissed] = useState(false);

  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const [proofDescription, setProofDescription] = useState("");

  const [realityResult, setRealityResult] = useState<RealityCheckResult | null>(null);
  const [checkingReality, setCheckingReality] = useState(false);
  const [realityDone, setRealityDone] = useState(false);
  const [realityError, setRealityError] = useState<string | null>(null);

  const [friendSearch, setFriendSearch] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalInputRef = useRef<TextInput>(null);
  const friendInputRef = useRef<TextInput>(null);

  const showMeasurement = goalText.trim().length > 5;
  const showRealityCheck = selectedMeasurements.length > 0;
  const showInvite = realityDone;

  const userProfileForGrading = profile
    ? { life_areas: profile.life_areas, direction: profile.direction, values: profile.values }
    : null;

  const runGrading = useCallback(
    async (
      text: string,
      proofTypes: string[],
      proofDesc: string,
      parsed: GoalParseResult | null
    ) => {
      if (text.trim().length < 5) return;
      setGrading(true);
      setGradeError(null);
      try {
        const result = await gradeGoal({
          goalText: text,
          proofTypes,
          proofDescription: proofDesc,
          userProfile: userProfileForGrading,
          parsedFrequency: parsed?.humanReadable ?? null,
        });
        setSmartGrade(result);
      } catch (err: unknown) {
        setGradeError(err instanceof Error ? err.message : String(err));
      } finally {
        setGrading(false);
      }
    },
    [profile]
  );

  const handleGoalBlur = useCallback(async () => {
    if (goalText.trim().length < 5) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setParseChipDismissed(false);
      // Fire parse + grade in parallel
      const [parseResult] = await Promise.all([
        parseGoal(goalText).catch(() => null),
        runGrading(goalText, selectedMeasurements, proofDescription, null),
      ]);
      if (parseResult) {
        setParsedGoal(parseResult);
        // Re-grade with frequency context
        if (parseResult.humanReadable) {
          await runGrading(goalText, selectedMeasurements, proofDescription, parseResult);
        }
      }
    }, 800);
  }, [goalText, selectedMeasurements, proofDescription, runGrading]);

  const handleProofChange = useCallback(
    (newTypes: string[], newDesc: string) => {
      runGrading(goalText, newTypes, newDesc, parsedGoal);
    },
    [goalText, parsedGoal, runGrading]
  );

  const toggleMeasurement = (id: string) => {
    const next = selectedMeasurements.includes(id)
      ? selectedMeasurements.filter((m) => m !== id)
      : [...selectedMeasurements, id];
    setSelectedMeasurements(next);
    handleProofChange(next, proofDescription);
  };

  const handleRealityCheck = async () => {
    Keyboard.dismiss();
    setCheckingReality(true);
    setRealityError(null);
    try {
      const result = await realityCheck({
        goalText,
        proofTypes: selectedMeasurements,
        parsedFrequency: parsedGoal?.humanReadable ?? null,
      });
      setRealityResult(result);
      setRealityDone(true);
    } catch (err: unknown) {
      setRealityError(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingReality(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#BFFF00";
    if (score >= 50) return "#FFE500";
    return "#FF6B6B";
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />

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
        {/* Section 1: Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 What's your goal?</Text>
          <View style={styles.inputCard}>
            <TextInput
              ref={goalInputRef}
              style={styles.goalInput}
              multiline
              placeholder={"I will...  (include how often, e.g. 3× a week)"}
              placeholderTextColor="#999"
              value={goalText}
              onChangeText={setGoalText}
              onBlur={handleGoalBlur}
              blurOnSubmit={false}
            />
          </View>

          {/* Parse chip */}
          {parsedGoal?.humanReadable && !parseChipDismissed && (
            <View style={styles.parseChip}>
              <Text style={styles.parseChipText}>
                📅 {parsedGoal.humanReadable} · interpreted from your goal
              </Text>
              <Pressable onPress={() => setParseChipDismissed(true)}>
                <Text style={styles.parseChipDismiss}>✕</Text>
              </Pressable>
            </View>
          )}

          {gradeError && <Text style={styles.errorText}>⚠️ {gradeError}</Text>}
          {grading && (
            <View style={styles.gradeRow}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.gradingText}>Grading...</Text>
            </View>
          )}

          {!grading && smartGrade && (
            <View style={styles.gradeContainer}>
              <View style={styles.overallRow}>
                <Text style={styles.overallLabel}>SMART Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(smartGrade.score) }]}>
                  <Text style={styles.scoreText}>{smartGrade.score}%</Text>
                </View>
              </View>
              {SMART_DIMS.map(({ key, label, full }) => {
                const score = smartGrade.scores?.[key] ?? 0;
                const tip = smartGrade.tips[key];
                return (
                  <View key={key} style={styles.dimRow}>
                    <View style={styles.dimLabelWrap}>
                      <Text style={styles.dimLetter}>{label}</Text>
                      <Text style={styles.dimFull}>{full}</Text>
                    </View>
                    <View style={styles.dimBarTrack}>
                      <View
                        style={[
                          styles.dimBarFill,
                          { width: `${score}%` as any, backgroundColor: scoreColor(score) },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dimScore, { color: scoreColor(score) }]}>{score}</Text>
                    {tip && <Text style={styles.dimTip}>⚠️ {tip}</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Section 2: Proof type */}
        {showMeasurement && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📏 Proof type</Text>
            <View style={styles.chipRow}>
              {MEASUREMENT_OPTIONS.map((opt) => {
                const selected = selectedMeasurements.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleMeasurement(opt.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              📝 Proof description (optional)
            </Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.proofInput}
                multiline
                placeholder="Describe what the proof should show..."
                placeholderTextColor="#999"
                value={proofDescription}
                onChangeText={(v) => {
                  setProofDescription(v);
                  handleProofChange(selectedMeasurements, v);
                }}
              />
            </View>
          </View>
        )}

        {/* Section 3: Reality Check */}
        {showRealityCheck && (
          <View style={styles.section}>
            <Pressable
              style={[styles.realityBtn, checkingReality && styles.realityBtnDisabled]}
              onPress={handleRealityCheck}
              disabled={checkingReality}
            >
              {checkingReality ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={styles.realityBtnText}>🔍 Run Reality Check</Text>
              )}
            </Pressable>

            {realityError && <Text style={styles.errorText}>⚠️ {realityError}</Text>}
            {realityResult && (
              <View style={styles.realityResult}>
                <Text style={styles.likelihoodText}>{realityResult.likelihood}% likelihood</Text>
                {realityResult.pitfalls.map((p, i) => (
                  <Text key={i} style={styles.pitfallText}>⚠️ {p}</Text>
                ))}
                {realityResult.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestionText}>💡 {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section 4: Invite */}
        {showInvite && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Invite friends</Text>
            <View style={styles.inputCard}>
              <TextInput
                ref={friendInputRef}
                style={styles.searchInput}
                placeholder="Search username..."
                placeholderTextColor="#999"
                value={friendSearch}
                onChangeText={setFriendSearch}
                returnKeyType="done"
              />
            </View>
            <Pressable style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>🔗 Copy invite link</Text>
            </Pressable>
            <Text style={styles.inviteNote}>
              Friends set their own goal. Challenge starts once you both approve.
            </Text>
          </View>
        )}

        {showInvite && (
          <View style={styles.section}>
            <Pressable style={styles.startBtn}>
              <Text style={styles.startBtnText}>🚀 Start Challenge</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    width: 60,
  },
  title: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 10,
    fontWeight: "500",
  },
  inputCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  goalInput: {
    padding: 16,
    minHeight: 80,
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  parseChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FFD6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    gap: 8,
  },
  parseChipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#4A7000",
  },
  parseChipDismiss: {
    fontSize: 12,
    color: "#888",
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  gradingText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  gradeContainer: {
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  overallLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    letterSpacing: 0.5,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dimLabelWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    width: 90,
  },
  dimLetter: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  dimFull: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
  },
  dimBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  dimBarFill: {
    height: 6,
    borderRadius: 3,
  },
  dimScore: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    width: 28,
    textAlign: "right",
  },
  dimTip: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    width: "100%",
    paddingLeft: 98,
    lineHeight: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipSelected: { backgroundColor: "#111" },
  chipText: { fontSize: 13, fontFamily: "Orbit_400Regular", color: "#111" },
  chipTextSelected: { color: "#BFFF00" },
  proofInput: {
    padding: 14,
    minHeight: 60,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  realityBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  realityBtnDisabled: { opacity: 0.5 },
  realityBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.5,
  },
  realityResult: {
    marginTop: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  likelihoodText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  pitfallText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    lineHeight: 18,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 18,
  },
  searchInput: {
    padding: 14,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  shareBtn: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  inviteNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#FF6B6B",
    marginTop: 8,
  },
});
