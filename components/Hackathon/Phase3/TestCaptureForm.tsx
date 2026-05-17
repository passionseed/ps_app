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
  oldHabit: string;
}

interface TestCaptureFormProps {
  cycleId: string;
  teamId: string;
  cycleNumber: number;
  hypothesis: string;
  onSubmit: (data: { testers: Array<{ name: string; role: string; oldHabit: string }> }) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: Array<{ name: string; role: string; oldHabit: string }> | null;
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
  hypothesis,
  onSubmit,
  aiFeedback,
  lang = "th",
  status = "draft",
  initialData = null,
}: TestCaptureFormProps) {
  const [testers, setTesters] = useState<SimpleTester[]>([
    { id: 1, name: "", role: "", oldHabit: "" },
  ]);

  const addTester = useCallback(() => {
    setTesters((prev) => [
      ...prev,
      { id: prev.length + 1, name: "", role: "", oldHabit: "" },
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
    (t) => t.name.trim().length > 0
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const validTesters = testers.filter((t) => t.name.trim().length > 0);
    onSubmit({ testers: validTesters.map(t => ({ name: t.name, role: t.role, oldHabit: t.oldHabit })) });
  }, [canSubmit, testers, onSubmit]);

  const parsed = parseHypothesisParts(hypothesis);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 3: หาคนทดสอบ" : "Step 3: Find Testers"}
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
            {lang === "th" ? "คำแนะนำ" : "Guide"}
          </AppText>
        </View>
        <View style={styles.guideBody}>
          <View style={styles.guideItem}>
            <Ionicons name="people" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "หาคนที่ไม่เคยเห็น pretotype ของคุณมาก่อน (fresh tester)"
                : "Find people who have never seen your pretotype before"}
            </AppText>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="person" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "บันทึกข้อมูลพื้นฐานและพฤติกรรมเดิมก่อนทดสอบ"
                : "Record their background and existing habits before the test"}
            </AppText>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="trending-up" size={14} color={CYAN45} />
            <AppText style={styles.guideItemText}>
              {lang === "th"
                ? "หาอย่างน้อย 3 คน ถึงจะมีแนวโน้มที่เชื่อถือได้"
                : "Find at least 3 people to see a reliable pattern"}
            </AppText>
          </View>
        </View>
      </View>

      {status !== "draft" && initialData && initialData.length > 0 && (
        <View style={styles.submittedCard}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? `บันทึกแล้ว ${initialData.length} คน ✓` : `${initialData.length} testers saved ✓`}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            {initialData.map((tester, idx) => (
              <View key={idx} style={styles.submittedRow}>
                <AppText style={styles.submittedLabel}>
                  {lang === "th" ? `คนที่ ${idx + 1}` : `Tester ${idx + 1}`}
                </AppText>
                <AppText style={styles.submittedValue}>{tester.name}</AppText>
                {tester.role ? <AppText style={styles.submittedSecondary}>{tester.role}</AppText> : null}
                {tester.oldHabit ? <AppText style={styles.submittedSecondary}>{tester.oldHabit}</AppText> : null}
              </View>
            ))}
          </View>
        </View>
      )}

      <AppText style={styles.subtitle}>
        {lang === "th" ? "เพิ่มคนทดสอบ บันทึกข้อมูลพื้นฐาน" : "Add testers and record their background"}
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
            placeholder={lang === "th" ? "บทบาท (เช่น นักศึกษา, พนักงานออฟฟิศ)" : "Role (e.g., student, office worker)"}
            placeholderTextColor={WHITE28}
            value={tester.role}
            onChangeText={(text) => updateTester(tester.id, "role", text)}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={lang === "th" ? "พฤติกรรมเดิมของเขาก่อนทดสอบ (เช่น ปกติออกกำลังกายไหม? ใช้อะไรอยู่แล้ว?)" : "Their existing habit before the test (e.g., do they currently exercise? what do they use now?)"}
            placeholderTextColor={WHITE28}
            value={tester.oldHabit}
            onChangeText={(text) => updateTester(tester.id, "oldHabit", text)}
            multiline
          />
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
          {lang === "th" ? "บันทึกคนทดสอบ" : "Save Testers"}
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
});
