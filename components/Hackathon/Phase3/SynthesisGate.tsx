import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
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
  onGateDecision: (decision: "next_cycle" | "finish" | "kill", data: {
    whatChanged: string;
    nextVariable?: string;
  }) => void;
  onSaveDraft?: (data: { whatChanged: string; nextVariable?: string }) => Promise<boolean>;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
  onConfirmRequest?: (gate: string, data: { whatChanged: string; nextVariable?: string }) => void;
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: {
    whatChanged: string | null;
    nextVariable: string | null;
    gateDecision: string | null;
  } | null;
}

export default function SynthesisGate({
  hypothesis,
  hypothesisResult,
  testSessions,
  priorCycleVariable,
  onGateDecision,
  onSaveDraft,
  aiFeedback,
  lang = "th",
  onConfirmRequest,
  status = "draft",
  initialData = null,
}: SynthesisGateProps) {
  const [whatChanged, setWhatChanged] = useState(initialData?.whatChanged ?? "");
  const [nextVariable, setNextVariable] = useState(initialData?.nextVariable ?? "");
  const [selectedGate, setSelectedGate] = useState<string | null>(initialData?.gateDecision ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isSubmitted = status !== "draft" && initialData?.gateDecision;
  const canSubmit = whatChanged.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!onSaveDraft || !whatChanged.trim()) return;
    setSaving(true);
    const success = await onSaveDraft({
      whatChanged,
      nextVariable: nextVariable || undefined,
    });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [onSaveDraft, whatChanged, nextVariable]);

  const handleGate = useCallback(
    (gate: "next_cycle" | "finish" | "kill") => {
      if (!canSubmit) return;
      onGateDecision(gate, {
        whatChanged,
        nextVariable: gate === "next_cycle" ? nextVariable : undefined,
      });
    },
    [canSubmit, whatChanged, nextVariable, onGateDecision]
  );

  const requestConfirm = useCallback(
    (gate: string) => {
      onConfirmRequest?.(gate, {
        whatChanged,
        nextVariable: gate === "next_cycle" ? nextVariable : undefined,
      });
    },
    [onConfirmRequest, whatChanged, nextVariable]
  );

  // Derive result from gateDecision fallback if hypothesisResult is null
  // Map UI gate values to result values
  const effectiveResult: HackathonPhase3SynthesisResult | null =
    hypothesisResult ??
    (initialData?.gateDecision === "finish" || initialData?.gateDecision === "proceed"
      ? "confirmed"
      : initialData?.gateDecision === "kill"
      ? "killed"
      : initialData?.gateDecision === "next_cycle" || initialData?.gateDecision === "refine"
      ? "unclear"
      : null);

  const resultColor =
    effectiveResult === "confirmed"
      ? GREEN
      : effectiveResult === "killed"
      ? RED
      : YELLOW;

  const resultLabel =
    lang === "th"
      ? effectiveResult === "confirmed"
        ? "ผ่าน"
        : effectiveResult === "killed"
        ? "ไม่ผ่าน"
        : "ไม่ชัดเจน"
      : effectiveResult === "confirmed"
      ? "Confirmed"
      : effectiveResult === "killed"
      ? "Killed"
      : "Unclear";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 4: สรุปผล" : "Step 4: Synthesize + Choose Gate"}
      </AppText>
      <AppText style={styles.subtitle}>{lang === "th" ? "วิเคราะห์ผลทดสอบแล้วตัดสินใจทิศทาง" : "Honest synthesis. Make a decision."}</AppText>

      {isSubmitted && !isEditing && (
        <View style={styles.submittedView}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? "ส่งแล้ว ✓" : "Submitted ✓"}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>
                {lang === "th" ? "สิ่งที่เรียนรู้" : "What Changed"}
              </AppText>
              <AppText style={styles.submittedValue}>{initialData?.whatChanged}</AppText>
            </View>
            {initialData?.nextVariable && (
              <View style={styles.submittedRow}>
                <AppText style={styles.submittedLabel}>
                  {lang === "th" ? "ตัวแปรถัดไป" : "Next Variable"}
                </AppText>
                <AppText style={styles.submittedValue}>{initialData?.nextVariable}</AppText>
              </View>
            )}
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>
                {lang === "th" ? "การตัดสินใจ" : "Decision"}
              </AppText>
              <AppText
                style={[
                  styles.submittedValue,
                  initialData?.gateDecision === "proceed" && { color: GREEN },
                  initialData?.gateDecision === "kill" && { color: RED },
                  initialData?.gateDecision === "refine" && { color: CYAN },
                ]}
              >
                {initialData?.gateDecision === "finish"
                  ? lang === "th" ? "เสร็จสิ้น → จบ Sprint" : "Finish → Complete Sprint"
                  : initialData?.gateDecision === "kill"
                  ? lang === "th" ? "เปลี่ยน Idea → เริ่มใหม่" : "Change Idea → Start Fresh"
                  : lang === "th" ? "Cycle ถัดไป → ทดสอบใหม่" : "Next Cycle → Test New Hypothesis"}
              </AppText>
            </View>
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={16} color={CYAN} />
            <AppText style={styles.editButtonText}>
              {lang === "th" ? "แก้ไข" : "Edit"}
            </AppText>
          </Pressable>
        </View>
      )}

      <View style={styles.divider} />

        <View>
          <AppText style={styles.sectionLabel}>{lang === "th" ? "สมมติฐานที่ทดสอบ" : "Hypothesis Review"}</AppText>
          <AppText style={styles.hypothesisText}>{hypothesis}</AppText>
          <View style={[styles.resultBadge, { borderColor: resultColor }]}>
            <Ionicons
              name={
                effectiveResult === "confirmed"
                  ? "checkmark-circle"
                  : effectiveResult === "killed"
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
                      ? "ผ่าน"
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

        {(!isSubmitted || isEditing) && (
          <>
            <View>
              <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "เรียนรู้อะไรจาก Cycle นี้? *" : "What Changed About Our Understanding? *"}</AppText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={lang === "th" ? "สิ่งที่ได้เรียนรู้จริงๆ ไม่ต้องสวยงาม..." : "What did this cycle reveal?"}
                placeholderTextColor={WHITE55}
                value={whatChanged}
                onChangeText={setWhatChanged}
                multiline
              />
            </View>

            {priorCycleVariable && (
              <View>
                <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "ตัวแปรจาก Cycle ก่อน" : "Compare to Prior Cycle"}</AppText>
                <AppText style={styles.mutedText}>
                  {lang === "th" ? "ตัวแปรก่อนหน้า: " : "Prior variable: "}{priorCycleVariable}
                </AppText>
              </View>
            )}

            <View>
              <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "ตัวแปรถัดไป (ถ้าปรับ)" : "ONE Variable to Change Next Cycle"}</AppText>
              <TextInput
                style={styles.input}
                placeholder={lang === "th" ? "สิ่งเดียวที่จะเปลี่ยน..." : "If refining, what ONE thing will you change?"}
                placeholderTextColor={WHITE55}
                value={nextVariable}
                onChangeText={setNextVariable}
              />
            </View>

            {/* Save button */}
            {onSaveDraft && (
              <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || !whatChanged.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={CYAN} />
                ) : (
                  <>
                    <Ionicons name={saved ? "checkmark" : "save-outline"} size={16} color={saved ? GREEN : CYAN} />
                    <AppText style={[styles.saveButtonText, saved && { color: GREEN }]}>
                      {saved
                        ? (lang === "th" ? "บันทึกแล้ว" : "Saved")
                        : (lang === "th" ? "บันทึกร่าง" : "Save Draft")}
                    </AppText>
                  </>
                )}
              </Pressable>
            )}

            <View style={styles.divider} />

            <View>
              <AppText variant="bold" style={styles.sectionLabel}>{lang === "th" ? "สรุป Cycle" : "Cycle Summary"}</AppText>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <AppText variant="bold" style={styles.summaryValue}>{testSessions.length}</AppText>
                  <AppText style={styles.summaryLabel}>{lang === "th" ? "ผู้ทดสอบ" : "Testers"}</AppText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AppText variant="bold" style={[styles.summaryValue, { color: GREEN }]}>
                    {testSessions.filter(s => s.session_result === "confirmed").length}
                  </AppText>
                  <AppText style={styles.summaryLabel}>{lang === "th" ? "ผ่าน" : "Confirmed"}</AppText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AppText variant="bold" style={[styles.summaryValue, { color: RED }]}>
                    {testSessions.filter(s => s.session_result === "killed").length}
                  </AppText>
                  <AppText style={styles.summaryLabel}>{lang === "th" ? "ไม่ผ่าน" : "Killed"}</AppText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AppText variant="bold" style={[styles.summaryValue, { color: YELLOW }]}>
                    {testSessions.filter(s => s.session_result === "unclear").length}
                  </AppText>
                  <AppText style={styles.summaryLabel}>{lang === "th" ? "ไม่ชัดเจน" : "Unclear"}</AppText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View>
              <AppText variant="bold" style={styles.gateTitle}>{lang === "th" ? "ตัดสินใจ" : "Choose Gate"}</AppText>
              {!canSubmit && (
                <View style={styles.gateBlockedHint}>
                  <Ionicons name="lock-closed" size={13} color={YELLOW} />
                  <AppText style={styles.gateBlockedText}>
                    {lang === "th" ? "กรอกสิ่งที่เรียนรู้ก่อนจึงจะเลือกได้" : "Fill in what you learned above first"}
                  </AppText>
                </View>
              )}
              <View style={styles.gateRow}>
                <Pressable
                  style={[
                    styles.gateButton,
                    styles.gateRefine,
                    selectedGate === "next_cycle" && styles.gateRefineActive,
                    !canSubmit && styles.gateButtonLocked,
                  ]}
                  onPress={() => {
                    if (!canSubmit) return;
                    requestConfirm("next_cycle");
                  }}
                >
                  <Ionicons name="arrow-forward" size={20} color={canSubmit ? CYAN : WHITE55} />
                  <AppText variant="bold" style={[styles.gateButtonText, !canSubmit && styles.gateButtonTextLocked]}>{lang === "th" ? "Cycle ถัดไป" : "Next Cycle"}</AppText>
                  <AppText style={styles.gateSubtext}>{lang === "th" ? "ทดสอบสมมติฐานใหม่" : "Test new hypothesis"}</AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.gateButton,
                    styles.gateProceed,
                    selectedGate === "finish" && styles.gateProceedActive,
                    !canSubmit && styles.gateButtonLocked,
                  ]}
                  onPress={() => {
                    if (!canSubmit) return;
                    requestConfirm("finish");
                  }}
                >
                  <Ionicons name="checkmark-done" size={20} color={canSubmit ? GREEN : WHITE55} />
                  <AppText variant="bold" style={[styles.gateButtonText, !canSubmit && styles.gateButtonTextLocked]}>{lang === "th" ? "เสร็จสิ้น" : "Finish"}</AppText>
                  <AppText style={styles.gateSubtext}>{lang === "th" ? "จบ Sprint นี้" : "Complete this sprint"}</AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.gateButton,
                    styles.gateKill,
                    selectedGate === "kill" && styles.gateKillActive,
                    !canSubmit && styles.gateButtonLocked,
                  ]}
                  onPress={() => {
                    if (!canSubmit) return;
                    requestConfirm("kill");
                  }}
                >
                  <Ionicons name="swap-horizontal" size={20} color={canSubmit ? RED : WHITE55} />
                  <AppText variant="bold" style={[styles.gateButtonText, !canSubmit && styles.gateButtonTextLocked]}>{lang === "th" ? "เปลี่ยน Idea" : "Change Idea"}</AppText>
                  <AppText style={styles.gateSubtext}>{lang === "th" ? "เริ่ม Idea ใหม่" : "Start new idea"}</AppText>
                </Pressable>
              </View>
            </View>
          </>
        )}

  

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
  container: { flex: 1 },
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    color: WHITE,
    fontSize: 20,
  },
  summaryLabel: {
    color: WHITE55,
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(74,107,130,0.3)",
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
  gateButtonTextLocked: { color: WHITE55 },
  gateButtonLocked: { opacity: 0.45 },
  gateSubtext: { color: WHITE55, fontSize: 11 },
  gateBlockedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "rgba(255,165,0,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.25)",
  },
  gateBlockedText: { color: YELLOW, fontSize: 13, flex: 1 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: CYAN20,
    borderWidth: 1,
    borderColor: CYAN45,
    alignSelf: "flex-start",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: CYAN,
    fontSize: 13,
  },
  submittedView: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
    borderRadius: 12,
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  submittedTitle: { color: GREEN, fontSize: 16 },
  submittedBody: { gap: 10 },
  submittedRow: { gap: 2 },
  submittedLabel: { color: WHITE55, fontSize: 11, textTransform: "uppercase" },
  submittedValue: { color: WHITE, fontSize: 14, lineHeight: 20 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: CYAN20,
    alignSelf: "flex-start",
  },
  editButtonText: { color: CYAN, fontSize: 13 },
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
