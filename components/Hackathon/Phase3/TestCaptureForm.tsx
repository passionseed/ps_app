import React, { useState, useCallback, useRef } from "react";
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
  HackathonPhase3TestSession,
  BehaviorLogEntry,
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
const WHITE28 = "rgba(255,255,255,0.28)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

interface TestCaptureFormProps {
  cycleId: string;
  teamId: string;
  cycleNumber: number;
  onSubmit: (data: Omit<HackathonPhase3TestSession, "id" | "created_at">) => void;
  aiFeedback?: AICoachResponse | null;
}

const CHANNELS = [
  { value: "in_person", label: "In-person" },
  { value: "zoom", label: "Zoom" },
  { value: "phone", label: "Phone" },
  { value: "line", label: "LINE" },
  { value: "other", label: "Other" },
];

export default function TestCaptureForm({
  cycleNumber,
  onSubmit,
  aiFeedback,
}: TestCaptureFormProps) {
  const [testerName, setTesterName] = useState("");
  const [testerRole, setTesterRole] = useState("");
  const [testerContact, setTesterContact] = useState("");
  const [channel, setChannel] = useState("");
  const [freshTester, setFreshTester] = useState(true);
  const [sessionDuration, setSessionDuration] = useState("");
  const [behaviorLog, setBehaviorLog] = useState<BehaviorLogEntry[]>([
    { interval: "0:00-0:30", action: "", surprise: false },
    { interval: "0:30-1:00", action: "", surprise: false },
  ]);
  const [unpromptedQuote, setUnpromptedQuote] = useState("");
  const [painfulDetail, setPainfulDetail] = useState("");
  const [result, setResult] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addInterval = useCallback(() => {
    const count = behaviorLog.length;
    const startMin = Math.floor((count * 30) / 60);
    const startSec = (count * 30) % 60;
    const endMin = Math.floor(((count + 1) * 30) / 60);
    const endSec = ((count + 1) * 30) % 60;
    const fmt = (n: number) => n.toString().padStart(2, "0");
    setBehaviorLog((prev) => [
      ...prev,
      {
        interval: `${fmt(startMin)}:${fmt(startSec)}-${fmt(endMin)}:${fmt(endSec)}`,
        action: "",
        surprise: false,
      },
    ]);
  }, [behaviorLog.length]);

  const updateBehavior = useCallback(
    (index: number, field: keyof BehaviorLogEntry, value: string | boolean) => {
      setBehaviorLog((prev) =>
        prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
      );
    },
    []
  );

  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    }
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const canSubmit =
    testerName.trim().length > 0 &&
    painfulDetail.trim().length > 0 &&
    result.length > 0 &&
    behaviorLog.some((b) => b.action.trim().length > 0);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      cycle_step_id: "", // filled by caller
      team_id: "", // filled by caller
      cycle_number: cycleNumber,
      tester_name: testerName,
      tester_role: testerRole || null,
      tester_contact: testerContact || null,
      tester_channel: channel || null,
      fresh_tester: freshTester,
      fresh_override_reason: null,
      session_date: new Date().toISOString().split("T")[0],
      session_duration_min: parseInt(sessionDuration) || null,
      behavior_log: behaviorLog,
      unprompted_quotes: unpromptedQuote ? [unpromptedQuote] : [],
      painful_detail: painfulDetail,
      session_result: result as any,
      clip_url: null,
      screenshot_urls: null,
      ai_behavior_quality: null,
    });
  }, [canSubmit, testerName, testerRole, testerContact, channel, freshTester, cycleNumber, sessionDuration, behaviorLog, unpromptedQuote, painfulDetail, result, onSubmit]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Step 3: Test With Real Users
        </AppText>
        <AppText style={styles.subtitle}>Log behavioral evidence</AppText>

        {/* Tester Info */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>Tester Info</AppText>
          <TextInput
            style={styles.input}
            placeholder="Tester name *"
            placeholderTextColor={WHITE28}
            value={testerName}
            onChangeText={setTesterName}
          />
          <TextInput
            style={styles.input}
            placeholder="Role (e.g., student, parent)"
            placeholderTextColor={WHITE28}
            value={testerRole}
            onChangeText={setTesterRole}
          />
          <TextInput
            style={styles.input}
            placeholder="Contact"
            placeholderTextColor={WHITE28}
            value={testerContact}
            onChangeText={setTesterContact}
          />
          <View style={styles.channelRow}>
            {CHANNELS.map((c) => (
              <Pressable
                key={c.value}
                style={[styles.channelChip, channel === c.value && styles.channelChipActive]}
                onPress={() => setChannel(c.value)}
              >
                <AppText
                  style={[styles.channelText, channel === c.value && styles.channelTextActive]}
                >
                  {c.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={styles.freshToggle}
            onPress={() => setFreshTester(!freshTester)}
          >
            <Ionicons
              name={freshTester ? "checkbox" : "square-outline"}
              size={20}
              color={freshTester ? GREEN : WHITE55}
            />
            <AppText style={styles.freshText}>Fresh tester (not used before)</AppText>
          </Pressable>
        </View>

        {/* Timer */}
        <View style={styles.timerCard}>
          <AppText variant="bold" style={styles.timerLabel}>Session Timer</AppText>
          <AppText style={styles.timerDisplay}>{formatTime(timerSeconds)}</AppText>
          <Pressable style={styles.timerButton} onPress={toggleTimer}>
            <AppText variant="bold" style={styles.timerButtonText}>
              {timerRunning ? "Stop" : "Start"}
            </AppText>
          </Pressable>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Duration (minutes)"
            placeholderTextColor={WHITE28}
            value={sessionDuration}
            onChangeText={setSessionDuration}
            keyboardType="numeric"
          />
        </View>

        {/* Behavior Log */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>Behavior Log *</AppText>
          <AppText style={styles.fieldHint}>What did the user DO? (not what they said)</AppText>
          {behaviorLog.map((entry, index) => (
            <View key={index} style={styles.behaviorRow}>
              <AppText style={styles.intervalLabel}>{entry.interval}</AppText>
              <TextInput
                style={[styles.input, styles.behaviorInput]}
                placeholder="User action..."
                placeholderTextColor={WHITE28}
                value={entry.action}
                onChangeText={(text) => updateBehavior(index, "action", text)}
                multiline
              />
              <Pressable
                style={[styles.surpriseToggle, entry.surprise && styles.surpriseActive]}
                onPress={() => updateBehavior(index, "surprise", !entry.surprise)}
              >
                <Ionicons name="flash" size={14} color={entry.surprise ? YELLOW : WHITE55} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addIntervalButton} onPress={addInterval}>
            <Ionicons name="add" size={16} color={CYAN} />
            <AppText style={styles.addIntervalText}>Add interval</AppText>
          </Pressable>
        </View>

        {/* Unprompted Quote */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>Unprompted Quote</AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did user say without being asked?"
            placeholderTextColor={WHITE28}
            value={unpromptedQuote}
            onChangeText={setUnpromptedQuote}
            multiline
          />
        </View>

        {/* Painful Detail */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.sectionLabel}>Painful Detail / Surprise *</AppText>
            <Ionicons
              name={painfulDetail.trim().length > 0 ? "checkmark-circle" : "close-circle"}
              size={20}
              color={painfulDetail.trim().length > 0 ? GREEN : RED}
            />
          </View>
          <AppText style={styles.fieldHint}>Required. What surprised you?</AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did you NOT expect?..."
            placeholderTextColor={WHITE28}
            value={painfulDetail}
            onChangeText={setPainfulDetail}
            multiline
          />
        </View>

        {/* Result */}
        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.sectionLabel}>Hypothesis Result *</AppText>
          <View style={styles.resultRow}>
            {["confirmed", "killed", "unclear"].map((r) => (
              <Pressable
                key={r}
                style={[styles.resultChip, result === r && styles.resultChipActive]}
                onPress={() => setResult(r)}
              >
                <Ionicons
                  name={
                    r === "confirmed"
                      ? "checkmark-circle"
                      : r === "killed"
                      ? "close-circle"
                      : "help-circle"
                  }
                  size={16}
                  color={
                    result === r
                      ? r === "confirmed"
                        ? GREEN
                        : r === "killed"
                        ? RED
                        : YELLOW
                      : WHITE55
                  }
                />
                <AppText
                  style={[
                    styles.resultText,
                    result === r && styles.resultTextActive,
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            Submit Test Log
          </AppText>
        </Pressable>

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
  fieldGroup: { marginBottom: 20 },
  sectionLabel: { color: CYAN, fontSize: 16, marginBottom: 8 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldHint: { color: WHITE55, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WHITE,
    fontSize: 15,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  channelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  channelChip: {
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  channelChipActive: { backgroundColor: CYAN45, borderColor: CYAN },
  channelText: { color: WHITE75, fontSize: 13 },
  channelTextActive: { color: WHITE },
  freshToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  freshText: { color: WHITE75, fontSize: 14 },
  timerCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  timerLabel: { color: CYAN, fontSize: 14, marginBottom: 8 },
  timerDisplay: { color: WHITE, fontSize: 36, fontFamily: "LibreFranklin_700Bold", marginBottom: 12 },
  timerButton: {
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  timerButtonText: { color: CYAN, fontSize: 14 },
  behaviorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  intervalLabel: {
    color: WHITE55,
    fontSize: 11,
    width: 50,
    marginTop: 12,
  },
  behaviorInput: { flex: 1, marginBottom: 0, minHeight: 60 },
  surpriseToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginTop: 4,
  },
  surpriseActive: { backgroundColor: "rgba(255,165,0,0.15)" },
  addIntervalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addIntervalText: { color: CYAN, fontSize: 13 },
  resultRow: {
    flexDirection: "row",
    gap: 10,
  },
  resultChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: CYAN45,
    flex: 1,
    justifyContent: "center",
  },
  resultChipActive: { backgroundColor: CYAN45, borderColor: CYAN },
  resultText: { color: WHITE75, fontSize: 13 },
  resultTextActive: { color: WHITE },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
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
