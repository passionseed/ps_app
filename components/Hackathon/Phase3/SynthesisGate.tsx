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
  HackathonPhase3TestSession,
} from "../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
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
  testSessions: HackathonPhase3TestSession[];
  priorCycleVariable?: string | null;
  onGateDecision: (decision: "refine" | "proceed" | "kill", data: {
    whatChanged: string;
    nextVariable?: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
}

export default function SynthesisGate({
  hypothesis,
  hypothesisResult,
  testSessions,
  priorCycleVariable,
  onGateDecision,
  aiFeedback,
  lang = "th",
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
    lang === "th"
      ? hypothesisResult === "confirmed"
        ? "ยืนยัน"
        : hypothesisResult === "killed"
        ? "ไม่ผ่าน"
        : "ไม่ชัดเจน"
      : hypothesisResult === "confirmed"
      ? "Confirmed"
      : hypothesisResult === "killed"
      ? "Kill"
      : "Unclear";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 4: สังเคราะห์ + เลือก Gate" : "Step 4: Synthesize + Choose Gate"}
      </AppText>
      <AppText style={styles.subtitle}>{lang === "th" ? "สังเคราะห์อย่างตรงไปตรงมา ตัดสินใจ" : "Honest synthesis. Make a decision."}</AppText>

      <View style={styles.divider} />

        <View>
          <AppText style={styles.sectionLabel}>{lang === "th" ? "ทบทวน Hypothesis" : "Hypothesis Review"}</AppText>
          <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
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
            <AppText style={[styles.resultBadgeText, { color: resultColor }]}>
              {resultLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View>
          <AppText variant="bold" style={styles.sectionLabel}>
            {lang === "th" ? "ผลการทดสอบ" : "Test Results"}
          </AppText>
          {testSessions.length === 0 && (
            <AppText style={styles.mutedText}>
              {lang === "th" ? "ยังไม่มีข้อมูลการทดสอบ" : "No test data yet"}
            </AppText>
          )}
          {testSessions.slice(0, 4).map((session, i) => (
            <View key={session.id ?? i} style={styles.testerRow}>
              <View style={styles.testerHeader}>
                <AppText style={styles.testerName}>{session.tester_name}</AppText>
                <AppText
                  style={[
                    styles.testerResult,
                    session.session_result === "confirmed" && { color: GREEN },
                    session.session_result === "killed" && { color: RED },
                    session.session_result === "unclear" && { color: YELLOW },
                  ]}
                >
                  {session.session_result
                    ? session.session_result === "confirmed"
                      ? "ยืนยัน"
                      : session.session_result === "killed"
                      ? "ไม่ผ่าน"
                      : "ไม่ชัดเจน"
                    : "-"}
                </AppText>
              </View>
              <AppText style={styles.testerNote}>
                {session.painful_detail ?? session.behavior_log?.[0]?.action ?? ""}
              </AppText>
            </View>
          ))}
          {testSessions.length > 4 && (
            <AppText style={styles.mutedText}>
              {lang === "th"
                ? `+${testSessions.length - 4} ผู้ทดสอบอื่น`
                : `+${testSessions.length - 4} more testers`}
            </AppText>
          )}
        </View>

        <View style={styles.divider} />

        <View>
          <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "อะไรเปลี่ยนในการเข้าใจของเรา? *" : "What Changed About Our Understanding? *"}</AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={lang === "th" ? "Cycle นี้เผยอะไร?" : "What did this cycle reveal?"}
            placeholderTextColor={WHITE55}
            value={whatChanged}
            onChangeText={setWhatChanged}
            multiline
          />
        </View>

        {priorCycleVariable && (
          <View>
            <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "เปรียบเทียบกับ Cycle ก่อน" : "Compare to Prior Cycle"}</AppText>
            <AppText style={styles.mutedText}>
              {lang === "th" ? "ตัวแปรก่อนหน้า: " : "Prior variable: "}{priorCycleVariable}
            </AppText>
          </View>
        )}

        <View>
          <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "1 ตัวแปรที่จะเปลี่ยนใน Cycle ถัดไป" : "ONE Variable to Change Next Cycle"}</AppText>
          <TextInput
            style={styles.input}
            placeholder={lang === "th" ? "ถ้าปรับแต่ง สิ่งเดียวที่จะเปลี่ยนคืออะไร?" : "If refining, what ONE thing will you change?"}
            placeholderTextColor={WHITE55}
            value={nextVariable}
            onChangeText={setNextVariable}
          />
        </View>

        <View style={styles.divider} />

        <View>
          <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "คะแนน Cycle" : "Cycle Scorecard"}</AppText>
          <View style={styles.scoreRow}>
            {[
              lang === "th" ? "สมมติฐาน" : "Hypothesis",
              lang === "th" ? "ตัวแปร" : "Variable",
              lang === "th" ? "พฤติกรรม" : "Behavior",
              lang === "th" ? "ความสดใหม่" : "Freshness",
              lang === "th" ? "สังเคราะห์" : "Synthesis",
            ].map(
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

        <View style={styles.divider} />

        <View>
          <AppText variant="bold" style={styles.gateTitle}>{lang === "th" ? "เลือก Gate" : "Choose Gate"}</AppText>
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
              <AppText variant="bold" style={styles.gateButtonText}>{lang === "th" ? "ปรับแต่ง" : "Refine"}</AppText>
              <AppText style={styles.gateSubtext}>{lang === "th" ? "เริ่ม Cycle ใหม่" : "Start new cycle"}</AppText>
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
              <AppText variant="bold" style={styles.gateButtonText}>{lang === "th" ? "ดำเนินการ" : "Proceed"}</AppText>
              <AppText style={styles.gateSubtext}>{lang === "th" ? "ไปยังวิดีโอรอบ 1" : "To Round 1 video"}</AppText>
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
              <AppText variant="bold" style={styles.gateButtonText}>{lang === "th" ? "ไม่ผ่าน" : "Kill"}</AppText>
              <AppText style={styles.gateSubtext}>{lang === "th" ? "ออกจาก workspace" : "Exit workspace"}</AppText>
            </Pressable>
          </View>
        </View>

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
  subtitle: { color: WHITE55, fontSize: 14 },
  divider: {
    height: 1,
    backgroundColor: "rgba(74,107,130,0.2)",
  },
  sectionLabel: { color: CYAN, fontSize: 14, marginBottom: 10 },
  hypothesisText: { color: WHITE75, fontSize: 14, lineHeight: 20, marginBottom: 10 },
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
  resultBadgeText: { fontSize: 14 },
  mutedText: { color: WHITE55, fontSize: 13 },
  testerRow: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.15)",
    paddingBottom: 8,
  },
  testerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  testerName: { color: WHITE, fontSize: 14, fontWeight: "700" },
  testerResult: { fontSize: 12, fontWeight: "600" },
  testerNote: { color: WHITE75, fontSize: 13, lineHeight: 18 },
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
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
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
