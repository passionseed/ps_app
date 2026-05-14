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
  HackathonPhase3TestSession,
} from "../../types/hackathon-phase3";

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

interface SimpleTester {
  id: number;
  name: string;
  role: string;
  note: string;
  result: "confirmed" | "killed" | "unclear" | "";
}

interface TestCaptureFormProps {
  cycleId: string;
  teamId: string;
  cycleNumber: number;
  hypothesis: string;
  onSubmit: (data: Omit<HackathonPhase3TestSession, "id" | "created_at">) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
}

export default function TestCaptureForm({
  cycleNumber,
  hypothesis,
  onSubmit,
  aiFeedback,
  lang = "th",
}: TestCaptureFormProps) {
  const [testers, setTesters] = useState<SimpleTester[]>([
    { id: 1, name: "", role: "", note: "", result: "" },
  ]);

  const addTester = useCallback(() => {
    setTesters((prev) => [
      ...prev,
      { id: prev.length + 1, name: "", role: "", note: "", result: "" },
    ]);
  }, []);

  const removeTester = useCallback((id: number) => {
    setTesters((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTester = useCallback(
    (id: number, field: keyof SimpleTester, value: string) => {
      setTesters((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const canSubmit = testers.some(
    (t) => t.name.trim().length > 0 && t.note.trim().length > 0 && t.result.length > 0
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const validTesters = testers.filter(
      (t) => t.name.trim().length > 0 && t.note.trim().length > 0 && t.result.length > 0
    );
    validTesters.forEach((tester) => {
      onSubmit({
        cycle_step_id: "",
        team_id: "",
        cycle_number: cycleNumber,
        tester_name: tester.name,
        tester_role: tester.role || null,
        tester_contact: null,
        tester_channel: null,
        fresh_tester: true,
        fresh_override_reason: null,
        session_date: new Date().toISOString().split("T")[0],
        session_duration_min: null,
        behavior_log: [{ interval: "session", action: tester.note, surprise: false }],
        unprompted_quotes: [],
        painful_detail: tester.note,
        session_result: tester.result as any,
        clip_url: null,
        screenshot_urls: null,
        ai_behavior_quality: null,
      });
    });
  }, [canSubmit, testers, cycleNumber, onSubmit]);

  const resultOptions: { value: SimpleTester["result"]; label: string; color: string; icon: any }[] = [
    { value: "confirmed", label: lang === "th" ? "ยืนยัน" : "Confirmed", color: GREEN, icon: "checkmark-circle" },
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
        {lang === "th" ? "ขั้นตอนที่ 3: ทดสอบกับผู้ใช้จริง" : "Step 3: Test With Real Users"}
      </AppText>

      {hypothesis.length > 0 && (
        <View style={styles.hypothesisBar}>
          <AppText style={styles.hypothesisLabel}>
            {lang === "th" ? "สมมติฐาน" : "Hypothesis"}
          </AppText>
          <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
        </View>
      )}

      <AppText style={styles.subtitle}>
        {lang === "th" ? "เพิ่มผู้ทดสอบ บันทึกสั้นๆ เลือกผล" : "Add testers. Short notes. Pick result."}
      </AppText>

      {testers.map((tester, index) => (
        <View key={tester.id} style={styles.testerRow}>
            <View style={styles.testerHeader}>
              <AppText variant="bold" style={styles.testerNumber}>
                {lang === "th" ? `ผู้ทดสอบ ${index + 1}` : `Tester ${index + 1}`}
              </AppText>
              {testers.length > 1 && (
                <Pressable onPress={() => removeTester(tester.id)}>
                  <Ionicons name="trash-outline" size={18} color={RED} />
                </Pressable>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder={lang === "th" ? "ชื่อ *" : "Name *"}
              placeholderTextColor={WHITE28}
              value={tester.name}
              onChangeText={(text) => updateTester(tester.id, "name", text)}
            />
            <TextInput
              style={styles.input}
              placeholder={lang === "th" ? "บทบาท (เช่น นักเรียน)" : "Role (e.g., student)"}
              placeholderTextColor={WHITE28}
              value={tester.role}
              onChangeText={(text) => updateTester(tester.id, "role", text)}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={lang === "th" ? "สังเกตอะไร? (ทำอะไร พูดอะไร) *" : "What did you observe? *"}
              placeholderTextColor={WHITE28}
              value={tester.note}
              onChangeText={(text) => updateTester(tester.id, "note", text)}
              multiline
            />

            <View style={styles.resultRow}>
              {resultOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.resultChip,
                    tester.result === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}20` },
                  ]}
                  onPress={() => updateTester(tester.id, "result", opt.value)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={tester.result === opt.value ? opt.color : WHITE55}
                  />
                  <AppText
                    style={[
                      styles.resultText,
                      tester.result === opt.value && { color: opt.color },
                    ]}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.addTesterButton} onPress={addTester}>
          <Ionicons name="add" size={18} color={CYAN} />
          <AppText style={styles.addTesterText}>
            {lang === "th" ? "เพิ่มผู้ทดสอบ" : "Add tester"}
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            {lang === "th" ? "ส่งบันทึกการทดสอบ" : "Submit Test Log"}
          </AppText>
        </Pressable>

        {aiFeedback && (
          <View style={styles.aiFeedback}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={16} color={CYAN} />
              <AppText variant="bold" style={styles.aiTitle}>{lang === "th" ? "โค้ช AI" : "AI Coach"}</AppText>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: {
    paddingVertical: 16,
    gap: 20,
  },
  title: { color: WHITE, fontSize: 20, marginBottom: 2 },
  hypothesisBar: {
    borderLeftWidth: 3,
    borderLeftColor: CYAN,
    paddingLeft: 12,
  },
  hypothesisLabel: { color: CYAN, fontSize: 12, marginBottom: 4, textTransform: "uppercase" },
  hypothesisText: { color: WHITE75, fontSize: 14, lineHeight: 20 },
  subtitle: { color: WHITE55, fontSize: 14 },
  testerRow: {
    gap: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
  },
  testerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  testerNumber: { color: CYAN, fontSize: 14 },
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
    minHeight: 60,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  resultRow: {
    flexDirection: "row",
    gap: 8,
  },
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
  addTesterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  addTesterText: { color: CYAN, fontSize: 14 },
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
