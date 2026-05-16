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
} from "../../../types/hackathon-phase3";

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
  onDelete?: (sessionId: string) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: HackathonPhase3TestSession[] | null;
}

function parseHypothesisParts(full: string) {
  // Try to extract WHO / WILL DO / BECAUSE / MEASURED BY from the full sentence
  const willMatch = full.match(/^(.*?)\s+will\s+(.*?)\s+because\s+(.*?)\s+measured by\s+(.*)$/i);
  if (willMatch) {
    return {
      who: willMatch[1].trim(),
      willDo: willMatch[2].trim(),
      because: willMatch[3].trim(),
      measuredBy: willMatch[4].trim(),
    };
  }
  return null;
}

export default function TestCaptureForm({
  cycleNumber,
  hypothesis,
  onSubmit,
  onDelete,
  aiFeedback,
  lang = "th",
  status = "draft",
  initialData = null,
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
    { value: "confirmed", label: lang === "th" ? "ผ่าน" : "Confirmed", color: GREEN, icon: "checkmark-circle" },
    { value: "killed", label: lang === "th" ? "ไม่ผ่าน" : "Kill", color: RED, icon: "close-circle" },
    { value: "unclear", label: lang === "th" ? "ไม่ชัดเจน" : "Unclear", color: YELLOW, icon: "help-circle" },
  ];

  const parsed = parseHypothesisParts(hypothesis);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 3: ทดสอบกับผู้ใช้จริง" : "Step 3: Test With Real Users"}
      </AppText>

      {parsed ? (
        <View style={styles.hypothesisCard}>
          <AppText style={styles.hypothesisCardLabel}>
            {lang === "th" ? "สมมติฐานที่ทดสอบ" : "Hypothesis Under Test"}
          </AppText>
          <View style={styles.hypothesisPartRow}>
            <View style={styles.hypothesisPartBadge}>
              <AppText style={styles.hypothesisPartBadgeText}>WHO</AppText>
            </View>
            <AppText style={styles.hypothesisPartValue}>{parsed.who}</AppText>
          </View>
          <View style={styles.hypothesisPartRow}>
            <View style={styles.hypothesisPartBadge}>
              <AppText style={styles.hypothesisPartBadgeText}>WILL DO</AppText>
            </View>
            <AppText style={styles.hypothesisPartValue}>{parsed.willDo}</AppText>
          </View>
          <View style={styles.hypothesisPartRow}>
            <View style={styles.hypothesisPartBadge}>
              <AppText style={styles.hypothesisPartBadgeText}>BECAUSE</AppText>
            </View>
            <AppText style={styles.hypothesisPartValue}>{parsed.because}</AppText>
          </View>
          <View style={styles.hypothesisPartRow}>
            <View style={styles.hypothesisPartBadge}>
              <AppText style={styles.hypothesisPartBadgeText}>MEASURED BY</AppText>
            </View>
            <AppText style={styles.hypothesisPartValue}>{parsed.measuredBy}</AppText>
          </View>
        </View>
      ) : hypothesis.length > 0 ? (
        <View style={styles.hypothesisBar}>
          <AppText style={styles.hypothesisLabel}>
            {lang === "th" ? "สมมติฐาน" : "Hypothesis"}
          </AppText>
          <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
        </View>
      ) : null}

      <View style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <Ionicons name="bulb" size={16} color={CYAN} />
          <AppText variant="bold" style={styles.guideTitle}>
            {lang === "th" ? "คำแนะนำการทดสอบ" : "Testing Guide"}
          </AppText>
        </View>
        <View style={styles.guideBody}>
          <View style={styles.guideItem}>
            <Ionicons name="people" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "หาผู้ทดสอบที่ไม่เคยเห็น pretotype มาก่อน (fresh tester)"
                : "Find testers who have never seen your pretotype before"}
            </AppText>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="eye" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "บันทึกพฤติกรรมจริง ไม่ใช่ความคิดเห็น — 'ทำอะไร' ไม่ใช่ 'ชอบไหม'"
                : "Log actual behavior, not opinions — what they DO, not what they say"}
            </AppText>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="chatbubble" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "จดคำพูดที่ผู้ทดสอบพูดเองโดยไม่ถาม (unprompted quotes)"
                : "Write down unprompted quotes — things they say without being asked"}
            </AppText>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="trending-up" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "ทดสอบอย่างน้อย 3 คน ถึงจะมีแนวโน้มที่เชื่อถือได้"
                : "Test at least 3 people to see a reliable pattern"}
            </AppText>
          </View>
        </View>
      </View>

      {status !== "draft" && initialData && initialData.length > 0 && (
        <View style={styles.submittedCard}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? "ส่งแล้ว ✓" : "Submitted ✓"}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            {initialData.map((session, idx) => (
              <View key={session.id ?? idx} style={styles.submittedRow}>
                <View style={styles.submittedRowHeader}>
                  <AppText style={styles.submittedLabel}>
                    {lang === "th" ? `ผู้ทดสอบ ${idx + 1}` : `Tester ${idx + 1}`}
                  </AppText>
                  {onDelete && (
                    <Pressable onPress={() => onDelete(session.id)}>
                      <Ionicons name="trash-outline" size={16} color={RED} />
                    </Pressable>
                  )}
                </View>
                <AppText style={styles.submittedValue}>{session.tester_name}</AppText>
                {session.tester_role && (
                  <AppText style={styles.submittedSecondary}>{session.tester_role}</AppText>
                )}
                <AppText style={styles.submittedValue}>{session.painful_detail}</AppText>
                <AppText
                  style={[
                    styles.submittedResult,
                    session.session_result === "confirmed" && { color: GREEN },
                    session.session_result === "killed" && { color: RED },
                    session.session_result === "unclear" && { color: YELLOW },
                  ]}
                >
                  {session.session_result === "confirmed"
                    ? lang === "th" ? "ผ่าน" : "Confirmed"
                    : session.session_result === "killed"
                    ? lang === "th" ? "ไม่ผ่าน" : "Killed"
                    : lang === "th" ? "ไม่ชัดเจน" : "Unclear"}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      <AppText style={styles.subtitle}>
        {status !== "draft" && initialData && initialData.length > 0
          ? lang === "th"
            ? `บันทึกเพิ่ม (มีแล้ว ${initialData.length} คน)`
            : `Log more (already have ${initialData.length})`
          : lang === "th"
            ? "เพิ่มผู้ทดสอบ บันทึกสั้นๆ เลือกผล"
            : "Add testers. Short notes. Pick result."}
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
            <AppText variant="bold" style={styles.aiTitle}>
              {lang === "th" ? "โค้ช AI — คำแนะนำ" : "AI Coach — Guidance"}
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
                  flag.severity === "blocking"
                    ? RED
                    : flag.severity === "warning"
                    ? YELLOW
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
  hypothesisCard: {
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    gap: 10,
  },
  hypothesisCardLabel: {
    color: CYAN,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: 2,
  },
  hypothesisPartRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  hypothesisPartBadge: {
    backgroundColor: CYAN20,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: CYAN45,
    minWidth: 90,
    alignItems: "center",
  },
  hypothesisPartBadgeText: {
    color: CYAN,
    fontSize: 10,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.5,
  },
  hypothesisPartValue: {
    color: WHITE75,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    flexWrap: "wrap",
    paddingTop: 2,
  },
  guideCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
    gap: 10,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideTitle: {
    color: CYAN,
    fontSize: 14,
  },
  guideBody: {
    gap: 10,
  },
  guideItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  guideItemText: {
    color: WHITE55,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
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
    marginBottom: 10,
  },
  aiFlagContent: {
    flex: 1,
    gap: 4,
  },
  aiFlagText: { color: WHITE75, fontSize: 13, lineHeight: 18 },
  aiFlagSuggestion: { color: WHITE55, fontSize: 12, lineHeight: 16, fontStyle: "italic" },
  aiResponse: {
    color: WHITE,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
  },
  submittedCard: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "rgba(78,205,196,0.08)",
    gap: 12,
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submittedTitle: { color: GREEN, fontSize: 16 },
  submittedBody: { gap: 14 },
  submittedRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
  },
  submittedRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  submittedLabel: { color: CYAN, fontSize: 12, textTransform: "uppercase" },
  submittedValue: { color: WHITE, fontSize: 14 },
  submittedSecondary: { color: WHITE55, fontSize: 13 },
  submittedResult: { fontSize: 14, fontWeight: "bold" },
});
