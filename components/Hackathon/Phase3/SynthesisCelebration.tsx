import React from "react";
import { StyleSheet, View, Pressable, Linking } from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import type {
  HackathonPhase3SynthesisResult,
  HackathonPhase3TestSession,
} from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const GREEN = "#4ECDC4";
const RED = "#FF6B6B";
const YELLOW = "#FFA500";

interface SynthesisCelebrationProps {
  hypothesis: string;
  hypothesisResult: HackathonPhase3SynthesisResult | null;
  testSessions: HackathonPhase3TestSession[];
  whatChanged: string;
  cycleCount: number;
  onContinue: () => void;
  onStartNewCycle?: () => void;
  lang?: "th" | "en";
}

export default function SynthesisCelebration({
  hypothesis,
  hypothesisResult,
  testSessions,
  whatChanged,
  cycleCount,
  onContinue,
  onStartNewCycle,
  lang = "th",
}: SynthesisCelebrationProps) {
  const confirmedCount = testSessions.filter(
    (s) => s.session_result === "confirmed"
  ).length;
  const killedCount = testSessions.filter(
    (s) => s.session_result === "killed"
  ).length;
  const unclearCount = testSessions.filter(
    (s) => s.session_result === "unclear"
  ).length;

  const resultColor =
    hypothesisResult === "confirmed"
      ? GREEN
      : hypothesisResult === "killed"
      ? RED
      : YELLOW;

  const resultLabel =
    lang === "th"
      ? hypothesisResult === "confirmed"
        ? "สมมติฐานผ่าน"
        : hypothesisResult === "killed"
        ? "สมมติฐานไม่ผ่าน"
        : "ผลลัพธ์ไม่ชัดเจน"
      : hypothesisResult === "confirmed"
      ? "Hypothesis Confirmed"
      : hypothesisResult === "killed"
      ? "Hypothesis Killed"
      : "Results Unclear";

  const celebrationTitle =
    lang === "th"
      ? hypothesisResult === "confirmed"
        ? "Sprint เสร็จสิ้น!"
        : hypothesisResult === "killed"
        ? "ไม่ผ่าน แต่ได้เรียนรู้สิ่งสำคัญ"
        : "ผลยังไม่ชัดเจน"
      : hypothesisResult === "confirmed"
      ? "Sprint Complete!"
      : hypothesisResult === "killed"
      ? "Failed, but you learned something important"
      : "Results are unclear";

  const celebrationSub =
    lang === "th"
      ? hypothesisResult === "confirmed"
        ? "สมมติฐานมีหลักฐานสนับสนุน เลือกเริ่ม Cycle ใหม่หรือจบ Sprint"
        : hypothesisResult === "killed"
        ? "รู้ว่าอะไรไม่เวิร์ค ก็คือความก้าวหน้า บันทึกบทเรียนแล้วไปต่อ"
        : "ผลยังไม่ชัดเจน แต่คุณได้เก็บข้อมูลมีค่าไว้แล้ว"
      : hypothesisResult === "confirmed"
      ? "Your hypothesis has supporting evidence. Start a new cycle or complete sprint."
      : hypothesisResult === "killed"
      ? "Knowing what doesn't work is progress. Record your lessons and move on."
      : "Results are unclear, but you gathered valuable data.";

  return (
    <View style={styles.container}>
      {/* Celebration header */}
      <View style={styles.celebrationHeader}>
        <View style={[styles.celebrationIconCircle, { borderColor: resultColor }]}>
          <Ionicons
            name={
              hypothesisResult === "confirmed"
                ? "trophy"
                : hypothesisResult === "killed"
                ? "school"
                : "clipboard"
            }
            size={40}
            color={resultColor}
          />
        </View>
        <AppText variant="bold" style={styles.celebrationTitle}>
          {celebrationTitle}
        </AppText>
        <AppText style={styles.celebrationSub}>{celebrationSub}</AppText>
      </View>

      {/* Result badge */}
      <View style={[styles.resultBadge, { borderColor: resultColor }]}>
        <Ionicons
          name={
            hypothesisResult === "confirmed"
              ? "checkmark-circle"
              : hypothesisResult === "killed"
              ? "close-circle"
              : "help-circle"
          }
          size={20}
          color={resultColor}
        />
        <AppText variant="bold" style={[styles.resultBadgeText, { color: resultColor }]}>
          {resultLabel}
        </AppText>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppText variant="bold" style={[styles.statValue, { color: GREEN }]}>
            {confirmedCount}
          </AppText>
          <AppText style={styles.statLabel}>
            {lang === "th" ? "ผ่าน" : "Confirmed"}
          </AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppText variant="bold" style={[styles.statValue, { color: RED }]}>
            {killedCount}
          </AppText>
          <AppText style={styles.statLabel}>
            {lang === "th" ? "ไม่ผ่าน" : "Killed"}
          </AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppText variant="bold" style={[styles.statValue, { color: YELLOW }]}>
            {unclearCount}
          </AppText>
          <AppText style={styles.statLabel}>
            {lang === "th" ? "ไม่ชัดเจน" : "Unclear"}
          </AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppText variant="bold" style={styles.statValue}>
            {cycleCount}
          </AppText>
          <AppText style={styles.statLabel}>
            {lang === "th" ? "Cycles" : "Cycles"}
          </AppText>
        </View>
      </View>

      {/* What we learned */}
      <View style={styles.learningsCard}>
        <View style={styles.learningsHeader}>
          <Ionicons name="bulb" size={16} color={CYAN} />
          <AppText variant="bold" style={styles.learningsTitle}>
            {lang === "th" ? "บทเรียนสำคัญ" : "Key Learnings"}
          </AppText>
        </View>
        <AppText style={styles.learningsText}>{whatChanged}</AppText>
      </View>

      {/* Hypothesis reminder */}
      <View style={styles.hypothesisCard}>
        <AppText style={styles.hypothesisLabel}>
          {lang === "th" ? "สมมติฐานที่ทดสอบ" : "Hypothesis Tested"}
        </AppText>
        <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
      </View>

      {/* Support options for killed result */}
      {hypothesisResult === "killed" && (
        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <Ionicons name="help-buoy" size={16} color={CYAN} />
            <AppText variant="bold" style={styles.supportTitle}>
              {lang === "th" ? "ไม่แน่ใจว่าจะทำยังไงต่อ?" : "Not sure what to do next?"}
            </AppText>
          </View>
          <View style={styles.supportOptions}>
            <Pressable
              style={styles.supportOption}
              onPress={onStartNewCycle}
            >
              <Ionicons name="refresh" size={18} color={CYAN} />
              <View style={styles.supportOptionText}>
                <AppText variant="bold" style={styles.supportOptionTitle}>
                  {lang === "th" ? "เริ่ม Cycle ใหม่" : "Start New Cycle"}
                </AppText>
                <AppText style={styles.supportOptionDesc}>
                  {lang === "th" ? "ทดสอบสมมติฐานใหม่ที่ปรับปรุงแล้ว" : "Test a refined hypothesis"}
                </AppText>
              </View>
            </Pressable>

            <Pressable
              style={styles.supportOption}
              onPress={() => Linking.openURL("https://canary.discord.com/channels/1475061440627867781/1475062853508792330")}
            >
              <Ionicons name="chatbubbles" size={18} color={CYAN} />
              <View style={styles.supportOptionText}>
                <AppText variant="bold" style={styles.supportOptionTitle}>
                  {lang === "th" ? "ขอความช่วยเหลือ" : "Get Support"}
                </AppText>
                <AppText style={styles.supportOptionDesc}>
                  {lang === "th" ? "ติดต่อทีมงานผ่าน Discord" : "Contact us on Discord"}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <Pressable style={styles.continueButton} onPress={onContinue}>
        <AppText variant="bold" style={styles.continueButtonText}>
          {lang === "th" ? "จบ Sprint → กลับหน้าหลัก →" : "Complete Sprint → Back to Home →"}
        </AppText>
      </Pressable>

      {onStartNewCycle && (
        <Pressable style={styles.newCycleButton} onPress={onStartNewCycle}>
          <AppText variant="bold" style={styles.newCycleButtonText}>
            {lang === "th" ? "หรือ เริ่ม Cycle ใหม่แทน" : "Or Start a New Cycle Instead"}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    paddingVertical: 16,
  },
  celebrationHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  celebrationIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  celebrationTitle: {
    color: WHITE,
    fontSize: 22,
    textAlign: "center",
    lineHeight: 28,
  },
  celebrationSub: {
    color: WHITE55,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultBadgeText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: WHITE,
    fontSize: 20,
  },
  statLabel: {
    color: WHITE55,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(74,107,130,0.3)",
  },
  learningsCard: {
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    gap: 10,
  },
  learningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  learningsTitle: {
    color: CYAN,
    fontSize: 14,
  },
  learningsText: {
    color: WHITE75,
    fontSize: 14,
    lineHeight: 20,
  },
  hypothesisCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
    gap: 8,
  },
  hypothesisLabel: {
    color: WHITE55,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hypothesisText: {
    color: WHITE75,
    fontSize: 13,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  continueButtonText: {
    color: BG,
    fontSize: 16,
  },
  newCycleButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
  },
  newCycleButtonText: {
    color: CYAN,
    fontSize: 14,
  },
  supportCard: {
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    gap: 12,
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  supportTitle: {
    color: CYAN,
    fontSize: 14,
  },
  supportOptions: {
    gap: 8,
  },
  supportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.2)",
  },
  supportOptionText: {
    flex: 1,
    gap: 2,
  },
  supportOptionTitle: {
    color: WHITE,
    fontSize: 14,
  },
  supportOptionDesc: {
    color: WHITE55,
    fontSize: 12,
  },
});
