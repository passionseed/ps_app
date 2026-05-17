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
import type { AICoachResponse } from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

export interface TesterRun {
  name: string;
  role: string;
  oldHabit: string;
  observation: string;
  result: "confirmed" | "killed" | "unclear" | "";
}

interface TestRunFormProps {
  cycleNumber: number;
  hypothesis: string;
  testers: Array<{ name: string; role: string; oldHabit: string }>;
  onSubmit: (data: { runs: TesterRun[] }) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: TesterRun[] | null;
}

function parseHypothesisParts(full: string) {
  const m = full.match(/^(.*?)\s+will\s+(.*?)\s+because\s+(.*?)\s+measured by\s+(.*)$/i);
  if (m) return { who: m[1].trim(), willDo: m[2].trim(), because: m[3].trim(), measuredBy: m[4].trim() };
  return null;
}

export default function TestRunForm({
  hypothesis,
  testers,
  onSubmit,
  aiFeedback,
  lang = "th",
  status = "draft",
  initialData = null,
}: TestRunFormProps) {
  const parsed = parseHypothesisParts(hypothesis);
  const [runs, setRuns] = useState<TesterRun[]>(
    initialData ??
      testers.map((t) => ({ ...t, observation: "", result: "" }))
  );

  const updateRun = useCallback(
    (index: number, field: keyof TesterRun, value: string) => {
      setRuns((prev) =>
        prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const canSubmit = runs.some(
    (r) => r.observation.trim().length > 0 && r.result.length > 0
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({ runs });
  }, [canSubmit, runs, onSubmit]);

  const resultOptions: { value: TesterRun["result"]; label: string; color: string; icon: any }[] = [
    { value: "confirmed", label: lang === "th" ? "ผ่าน" : "Confirmed", color: GREEN, icon: "checkmark-circle" },
    { value: "killed", label: lang === "th" ? "ไม่ผ่าน" : "Kill", color: RED, icon: "close-circle" },
    { value: "unclear", label: lang === "th" ? "ไม่ชัดเจน" : "Unclear", color: YELLOW, icon: "help-circle" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 4: ทดสอบ" : "Step 4: Run the Test"}
      </AppText>
      <AppText style={styles.subtitle}>
        {lang === "th"
          ? "บันทึกสิ่งที่แต่ละคนทำและพูดระหว่างทดสอบ"
          : "Record what each person did and said during the test"}
      </AppText>

      {hypothesis.length > 0 && (
        <View style={styles.hypothesisBar}>
          <AppText style={styles.hypothesisLabel}>
            {lang === "th" ? "สมมติฐาน" : "Hypothesis"}
          </AppText>
          <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
        </View>
      )}

      {status !== "draft" && initialData && initialData.length > 0 && (
        <View style={styles.submittedCard}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? "ส่งแล้ว ✓" : "Submitted ✓"}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            {initialData.map((run, idx) => (
              <View key={idx} style={styles.submittedRow}>
                <AppText style={styles.submittedLabel}>
                  {run.name} {run.role ? `· ${run.role}` : ""}
                </AppText>
                <AppText style={styles.submittedValue}>{run.observation}</AppText>
                <AppText
                  style={[
                    styles.submittedResult,
                    run.result === "confirmed" && { color: GREEN },
                    run.result === "killed" && { color: RED },
                    run.result === "unclear" && { color: YELLOW },
                  ]}
                >
                  {run.result === "confirmed"
                    ? lang === "th" ? "ผ่าน" : "Confirmed"
                    : run.result === "killed"
                    ? lang === "th" ? "ไม่ผ่าน" : "Killed"
                    : lang === "th" ? "ไม่ชัดเจน" : "Unclear"}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {runs.map((run, index) => (
        <View key={index} style={styles.runCard}>
          <View style={styles.runHeader}>
            <Ionicons name="person-circle" size={20} color={CYAN} />
            <View style={{ flex: 1 }}>
              <AppText variant="bold" style={styles.runName}>{run.name}</AppText>
              {run.role ? <AppText style={styles.runRole}>{run.role}</AppText> : null}
            </View>
          </View>

          {run.oldHabit ? (
            <View style={styles.contextBlock}>
              <AppText style={styles.contextLabel}>
                {lang === "th" ? "พฤติกรรมเดิม" : "Prior habit"}
              </AppText>
              <AppText style={styles.contextText}>{run.oldHabit}</AppText>
            </View>
          ) : null}

          {parsed?.because ? (
            <View style={[styles.contextBlock, styles.becauseBlock]}>
              <AppText style={styles.contextLabel}>
                {lang === "th" ? "พฤติกรรมที่คาดว่าจะเห็น (BECAUSE)" : "Expected behavior (BECAUSE)"}
              </AppText>
              <AppText style={styles.contextText}>{parsed.because}</AppText>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={lang === "th"
              ? "เขาทำอะไร? พูดอะไร? สังเกตพฤติกรรมจริง ไม่ใช่ความคิดเห็น *"
              : "What did they do? Say? Log real behavior, not opinions *"}
            placeholderTextColor={WHITE28}
            value={run.observation}
            onChangeText={(text) => updateRun(index, "observation", text)}
            multiline
          />

          <View style={styles.resultRow}>
            {resultOptions.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.resultChip,
                  run.result === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}20` },
                ]}
                onPress={() => updateRun(index, "result", opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={run.result === opt.value ? opt.color : WHITE55}
                />
                <AppText
                  style={[
                    styles.resultText,
                    run.result === opt.value && { color: opt.color },
                  ]}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <AppText variant="bold" style={styles.submitButtonText}>
          {lang === "th" ? "ส่งผลการทดสอบ" : "Submit Test Results"}
        </AppText>
      </Pressable>

      {aiFeedback && (
        <View style={styles.aiFeedback}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={16} color={CYAN} />
            <AppText variant="bold" style={styles.aiTitle}>
              {lang === "th" ? "โค้ช AI" : "AI Coach"}
            </AppText>
          </View>
          {aiFeedback.response && (
            <AppText style={styles.aiResponse}>{aiFeedback.response}</AppText>
          )}
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
                  flag.severity === "blocking" ? RED
                    : flag.severity === "warning" ? YELLOW
                    : CYAN
                }
              />
              <View style={styles.aiFlagContent}>
                <AppText style={styles.aiFlagText}>{flag.message}</AppText>
                {flag.suggestion && (
                  <AppText style={styles.aiFlagSuggestion}>{flag.suggestion}</AppText>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 16, gap: 20 },
  title: { color: WHITE, fontSize: 20, marginBottom: 2 },
  subtitle: { color: WHITE55, fontSize: 14 },
  hypothesisBar: {
    borderLeftWidth: 3,
    borderLeftColor: CYAN,
    paddingLeft: 12,
  },
  hypothesisLabel: { color: CYAN, fontSize: 11, textTransform: "uppercase", marginBottom: 4 },
  hypothesisText: { color: WHITE75, fontSize: 13, lineHeight: 18 },
  runCard: {
    gap: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
  },
  runHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  runName: { color: CYAN, fontSize: 15 },
  runRole: { color: WHITE55, fontSize: 12, marginTop: 2 },
  contextBlock: {
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: CYAN45,
  },
  becauseBlock: {
    backgroundColor: "rgba(255,165,0,0.06)",
    borderLeftColor: "rgba(255,165,0,0.5)",
  },
  contextLabel: { color: WHITE55, fontSize: 11, textTransform: "uppercase", marginBottom: 4 },
  contextText: { color: WHITE75, fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
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
  resultRow: { flexDirection: "row", gap: 8 },
  resultChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: CYAN45,
    flex: 1,
    justifyContent: "center",
  },
  resultText: { color: WHITE75, fontSize: 13 },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
  aiFeedback: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(74,107,130,0.2)",
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  aiTitle: { color: CYAN, fontSize: 14 },
  aiResponse: { color: WHITE, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  aiFlag: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  aiFlagContent: { flex: 1, gap: 4 },
  aiFlagText: { color: WHITE75, fontSize: 13, lineHeight: 18 },
  aiFlagSuggestion: { color: WHITE55, fontSize: 12, lineHeight: 16, fontStyle: "italic" },
  submittedCard: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "rgba(78,205,196,0.08)",
    gap: 12,
  },
  submittedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  submittedTitle: { color: GREEN, fontSize: 16 },
  submittedBody: { gap: 14 },
  submittedRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
  },
  submittedLabel: { color: CYAN, fontSize: 12 },
  submittedValue: { color: WHITE, fontSize: 14, lineHeight: 20 },
  submittedResult: { fontSize: 13, fontWeight: "bold" },
});
