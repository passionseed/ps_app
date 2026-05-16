import React, { useState, useCallback, useEffect } from "react";
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
import type { AICoachResponse } from "../../../types/hackathon-phase3";

const BG = "#03050a";
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
const ORANGE = "#FFA500";

interface HypothesisFormProps {
  cycleId: string;
  teamId: string;
  phase1Evidence?: Array<{ quote: string; source: string }>;
  targetUsers?: string[];
  onCheckAI: (data: {
    who: string;
    willDo: string;
    because: string;
    measuredBy: string;
  }) => Promise<AICoachResponse>;
  onSubmit: (data: {
    who: string;
    willDo: string;
    because: string;
    measuredBy: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
  checkingAI?: boolean;
  lang?: "th" | "en";
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: {
    who: string | null;
    willDo: string | null;
    because: string | null;
    measuredBy: string | null;
    full: string | null;
  } | null;
  priorHypothesis?: {
    who: string | null;
    willDo: string | null;
    because: string | null;
    measuredBy: string | null;
  } | null;
}

const WILL_DO_TEMPLATES = [
  "complete ___ without prompting",
  "skip ___ and choose ___ instead",
  "return within ___ hours unprompted",
  "forward the link to someone",
];

const MEASURED_BY_TEMPLATES = [
  "≥X of Y testers will ___",
  "Time to ___ will be < Z seconds",
  "Completion rate will be X%",
  "Error rate will be < X%",
];

export default function HypothesisForm({
  cycleId,
  phase1Evidence = [],
  targetUsers = [],
  onCheckAI,
  onSubmit,
  aiFeedback,
  checkingAI = false,
  lang = "th",
  status = "draft",
  initialData = null,
  priorHypothesis = null,
}: HypothesisFormProps) {
  const [who, setWho] = useState(initialData?.who ?? "");
  const [willDo, setWillDo] = useState(initialData?.willDo ?? "");
  const [because, setBecause] = useState(initialData?.because ?? "");
  const [measuredBy, setMeasuredBy] = useState(initialData?.measuredBy ?? "");
  const [showTemplates, setShowTemplates] = useState<string | null>(null);
  const [showWhoHint, setShowWhoHint] = useState(false);
  const [showBecauseHint, setShowBecauseHint] = useState(false);
  const [showWillDoHint, setShowWillDoHint] = useState(false);
  const [showMeasuredByHint, setShowMeasuredByHint] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setWho(initialData?.who ?? "");
    setWillDo(initialData?.willDo ?? "");
    setBecause(initialData?.because ?? "");
    setMeasuredBy(initialData?.measuredBy ?? "");
    setIsEditing(false);
  }, [cycleId, initialData?.who, initialData?.willDo, initialData?.because, initialData?.measuredBy]);

  const hasWho = who.trim().length > 0 && who !== "users";
  const hasWillDo = willDo.trim().length > 0;
  const hasBecause = because.trim().length > 0;
  const hasMeasuredBy = measuredBy.trim().length > 0;
  const canCheckAI = hasWho && hasWillDo && hasBecause && hasMeasuredBy;
  const hasPriorHypothesis = Boolean(
    (priorHypothesis?.who && priorHypothesis.who.trim().length > 0) ||
    (priorHypothesis?.willDo && priorHypothesis.willDo.trim().length > 0) ||
    (priorHypothesis?.because && priorHypothesis.because.trim().length > 0) ||
    (priorHypothesis?.measuredBy && priorHypothesis.measuredBy.trim().length > 0)
  );

  const score = aiFeedback?.score ?? null;
  const breakdown = aiFeedback?.breakdown ?? null;
  const passedGate = score !== null && score >= 80;

  const handleCheckAI = useCallback(async () => {
    if (!canCheckAI) return;
    await onCheckAI({ who, willDo, because, measuredBy });
  }, [canCheckAI, who, willDo, because, measuredBy, onCheckAI]);

  const handleSubmit = useCallback(() => {
    if (canCheckAI && passedGate) {
      onSubmit({ who, willDo, because, measuredBy });
    }
  }, [canCheckAI, passedGate, who, willDo, because, measuredBy, onSubmit]);

  const renderFieldStatus = (valid: boolean) => (
    <Ionicons
      name={valid ? "checkmark-circle" : "close-circle"}
      size={20}
      color={valid ? GREEN : RED}
    />
  );

  const getScoreColor = (s: number) => {
    if (s >= 80) return GREEN;
    if (s >= 60) return ORANGE;
    return RED;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 1: เขียน Hypothesis" : "Step 1: Write Your Hypothesis"}
      </AppText>
      <AppText style={styles.subtitle}>
        {lang === "th" ? "สมมติฐานที่ทดสอบได้ 4 ส่วน" : "Testable prediction with 4 parts"}
      </AppText>

      {hasPriorHypothesis && !initialData?.who && status === "draft" && (
        <Pressable
          style={styles.loadPriorBanner}
          onPress={() => {
            setWho(priorHypothesis?.who ?? "");
            setWillDo(priorHypothesis?.willDo ?? "");
            setBecause(priorHypothesis?.because ?? "");
            setMeasuredBy(priorHypothesis?.measuredBy ?? "");
          }}
        >
          <Ionicons name="copy-outline" size={15} color={CYAN} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.loadPriorTitle}>
              {lang === "th" ? "โหลด Hypothesis จาก Cycle ก่อน" : "Load previous hypothesis"}
            </AppText>
            <AppText style={styles.loadPriorPreview} numberOfLines={1}>
              {(priorHypothesis?.who ?? (lang === "th" ? "ผู้ใช้เดิม" : "same users"))} will {(priorHypothesis?.willDo ?? "...")}...
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={14} color={CYAN} />
        </Pressable>
      )}

      {status !== "draft" && !isEditing && initialData?.who && (
        <View style={styles.submittedView}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? "ส่งแล้ว ✓" : "Submitted ✓"}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>WHO</AppText>
              <AppText style={styles.submittedValue}>{initialData.who}</AppText>
            </View>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>WILL DO</AppText>
              <AppText style={styles.submittedValue}>{initialData.willDo}</AppText>
            </View>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>BECAUSE</AppText>
              <AppText style={styles.submittedValue}>{initialData.because}</AppText>
            </View>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>MEASURED BY</AppText>
              <AppText style={styles.submittedValue}>{initialData.measuredBy}</AppText>
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
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <AppText variant="bold" style={styles.fieldLabel}>{lang === "th" ? "ใคร (WHO)" : "WHO"}</AppText>
            <Pressable onPress={() => setShowWhoHint(true)}>
              <Ionicons name="help-circle-outline" size={18} color={CYAN45} />
            </Pressable>
          </View>
          {renderFieldStatus(hasWho)}
        </View>
        <AppText style={styles.fieldHint}>{lang === "th" ? "กลุ่มผู้ใช้เฉพาะ" : "Specific user type"}</AppText>
        <AppText style={styles.fieldExample}>{lang === "th" ? "เช่น คนทำงานออฟฟิศที่อยากออกกำลังกายแต่ไม่มีเวลา" : "e.g. office workers who want to exercise but feel they have no time"}</AppText>
        <View style={styles.dropdownContainer}>
          {targetUsers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {targetUsers.map((user) => (
                <Pressable
                  key={user}
                  style={[styles.chip, who === user && styles.chipActive]}
                  onPress={() => setWho(user)}
                >
                  <AppText style={[styles.chipText, who === user && styles.chipTextActive]}>
                    {user}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <TextInput
            style={styles.input}
            placeholder={lang === "th" ? "หรือพิมพ์เอง..." : "Or type custom user..."}
            placeholderTextColor={WHITE28}
            value={who}
            onChangeText={setWho}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <AppText variant="bold" style={styles.fieldLabel}>{lang === "th" ? "จะทำ (WILL DO)" : "WILL DO"}</AppText>
            <Pressable onPress={() => setShowWillDoHint(true)}>
              <Ionicons name="help-circle-outline" size={18} color={CYAN45} />
            </Pressable>
          </View>
          {renderFieldStatus(hasWillDo)}
        </View>
        <AppText style={styles.fieldHint}>{lang === "th" ? "การกระทำที่สังเกตได้" : "Observable action"}</AppText>
        <AppText style={styles.fieldExample}>{lang === "th" ? "เช่น ออกกำลังกาย 10 นาทีก่อนอาหารเช้าโดยไม่ต้องเตือน" : "e.g. exercise 10 minutes before breakfast without being reminded"}</AppText>
        <Pressable
          style={styles.templateToggle}
          onPress={() => setShowTemplates(showTemplates === "willDo" ? null : "willDo")}
        >
          <AppText style={styles.templateToggleText}>
            {showTemplates === "willDo"
              ? (lang === "th" ? "ซ่อนแม่แบบ" : "Hide templates")
              : (lang === "th" ? "แสดงแม่แบบ" : "Show templates")}
          </AppText>
          <Ionicons
            name={showTemplates === "willDo" ? "chevron-up" : "chevron-down"}
            size={16}
            color={CYAN}
          />
        </Pressable>
        {showTemplates === "willDo" && (
          <View style={styles.templateList}>
            {WILL_DO_TEMPLATES.map((t) => (
              <Pressable key={t} style={styles.templateItem} onPress={() => setWillDo(t)}>
                <AppText style={styles.templateText}>{t}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={lang === "th" ? "การกระทำเฉพาะ..." : "Specific action..."}
          placeholderTextColor={WHITE28}
          value={willDo}
          onChangeText={setWillDo}
          multiline
        />
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <AppText variant="bold" style={styles.fieldLabel}>{lang === "th" ? "เพราะ (BECAUSE)" : "BECAUSE"}</AppText>
            <Pressable onPress={() => setShowBecauseHint(true)}>
              <Ionicons name="help-circle-outline" size={18} color={CYAN45} />
            </Pressable>
          </View>
          {renderFieldStatus(hasBecause)}
        </View>
        <AppText style={styles.fieldHint}>{lang === "th" ? "หลักฐานจาก Phase 1" : "Evidence from Phase 1"}</AppText>
        <AppText style={styles.fieldExample}>{lang === "th" ? "เช่น การออกกำลังกายเริ่มต้นได้เลยโดยไม่ต้องเตรียมอุปกรณ์" : "e.g. exercising can be started immediately without any equipment"}</AppText>
        {phase1Evidence.length > 0 && (
          <View style={styles.evidenceList}>
            {phase1Evidence.slice(0, 3).map((ev, i) => (
              <Pressable
                key={i}
                style={styles.evidenceItem}
                onPress={() => setBecause(ev.quote)}
              >
                <AppText style={styles.evidenceQuote}>"{ev.quote}"</AppText>
                <AppText style={styles.evidenceSource}>— {ev.source}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={lang === "th" ? "ทำไมคุณเชื่อแบบนี้?..." : "Why do you believe this?..."}
          placeholderTextColor={WHITE28}
          value={because}
          onChangeText={setBecause}
          multiline
        />
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <AppText variant="bold" style={styles.fieldLabel}>{lang === "th" ? "วัดผลโดย (MEASURED BY)" : "MEASURED BY"}</AppText>
            <Pressable onPress={() => setShowMeasuredByHint(true)}>
              <Ionicons name="help-circle-outline" size={18} color={CYAN45} />
            </Pressable>
          </View>
          {renderFieldStatus(hasMeasuredBy)}
        </View>
        <AppText style={styles.fieldHint}>{lang === "th" ? "เกณฑ์ที่สังเกตได้" : "Observable threshold"}</AppText>
        <AppText style={styles.fieldExample}>{lang === "th" ? "เช่น 6 ใน 10 คนออกกำลังกายครบ 3 วันติดต่อกัน" : "e.g. 6 of 10 will exercise for 3 consecutive days"}</AppText>
        <Pressable
          style={styles.templateToggle}
          onPress={() => setShowTemplates(showTemplates === "measured" ? null : "measured")}
        >
          <AppText style={styles.templateToggleText}>
            {showTemplates === "measured"
              ? (lang === "th" ? "ซ่อนแม่แบบ" : "Hide templates")
              : (lang === "th" ? "แสดงแม่แบบ" : "Show templates")}
          </AppText>
          <Ionicons
            name={showTemplates === "measured" ? "chevron-up" : "chevron-down"}
            size={16}
            color={CYAN}
          />
        </Pressable>
        {showTemplates === "measured" && (
          <View style={styles.templateList}>
            {MEASURED_BY_TEMPLATES.map((t) => (
              <Pressable key={t} style={styles.templateItem} onPress={() => setMeasuredBy(t)}>
                <AppText style={styles.templateText}>{t}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder={lang === "th" ? "เกณฑ์..." : "Threshold..."}
          placeholderTextColor={WHITE28}
          value={measuredBy}
          onChangeText={setMeasuredBy}
        />
      </View>

      {canCheckAI && (
        <View style={styles.previewBlock}>
          <AppText variant="bold" style={styles.previewTitle}>
            {lang === "th" ? "Hypothesis ฉบับเต็ม" : "Full Hypothesis"}
          </AppText>
          <AppText style={styles.previewText}>
            {who} will {willDo} because {because} measured by {measuredBy}
          </AppText>
        </View>
      )}

      <Pressable
        style={[styles.aiCheckButton, !canCheckAI && styles.aiCheckButtonDisabled]}
        onPress={handleCheckAI}
        disabled={!canCheckAI || checkingAI}
      >
        {checkingAI ? (
          <ActivityIndicator size="small" color={BG} />
        ) : (
          <View style={styles.aiCheckRow}>
            <Ionicons name="sparkles" size={18} color={BG} />
            <AppText variant="bold" style={styles.aiCheckButtonText}>
              {lang === "th" ? "ตรวจสอบกับ AI" : "Check with AI"}
            </AppText>
          </View>
        )}
      </Pressable>

      {score !== null && (
        <View>
          <View style={styles.scoreHeader}>
            <AppText variant="bold" style={[styles.scoreValue, { color: getScoreColor(score) }]}>
              {score}/100
            </AppText>
            <AppText style={styles.scoreLabel}>
              {passedGate
                ? (lang === "th" ? "ผ่าน! สามารถส่งได้" : "Passed! Ready to submit")
                : (lang === "th" ? "ต้องแก้ไขก่อนส่ง (ต้อง ≥80)" : "Needs fix before submit (need ≥80)")
              }
            </AppText>
          </View>
          {breakdown && (
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <AppText style={styles.breakdownLabel}>WHO</AppText>
                <AppText style={[styles.breakdownValue, { color: getScoreColor(breakdown.who) }]}>
                  {breakdown.who}
                </AppText>
              </View>
              <View style={styles.breakdownItem}>
                <AppText style={styles.breakdownLabel}>WILL DO</AppText>
                <AppText style={[styles.breakdownValue, { color: getScoreColor(breakdown.will_do) }]}>
                  {breakdown.will_do}
                </AppText>
              </View>
              <View style={styles.breakdownItem}>
                <AppText style={styles.breakdownLabel}>BECAUSE</AppText>
                <AppText style={[styles.breakdownValue, { color: getScoreColor(breakdown.because) }]}>
                  {breakdown.because}
                </AppText>
              </View>
              <View style={styles.breakdownItem}>
                <AppText style={styles.breakdownLabel}>MEASURED BY</AppText>
                <AppText style={[styles.breakdownValue, { color: getScoreColor(breakdown.measured_by) }]}>
                  {breakdown.measured_by}
                </AppText>
              </View>
            </View>
          )}
        </View>
      )}

      <Pressable
        style={[styles.submitButton, (!canCheckAI || !passedGate) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canCheckAI || !passedGate}
      >
        <AppText variant="bold" style={styles.submitButtonText}>
          {lang === "th" ? "ส่ง Hypothesis" : "Submit Hypothesis"}
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
                    ? ORANGE
                    : CYAN
                }
              />
              <View style={styles.aiFlagContent}>
                <AppText style={styles.aiFlagText}>{flag.message}</AppText>
                <AppText style={styles.aiFlagSuggestion}>{flag.suggestion}</AppText>
              </View>
            </View>
          ))}
          {aiFeedback.response && (
            <AppText style={styles.aiResponse}>{aiFeedback.response}</AppText>
          )}
        </View>
      )}

      {showWhoHint && (
        <View style={styles.hintOverlay}>
          <View style={styles.hintCard}>
            <View style={styles.hintHeader}>
              <AppText variant="bold" style={styles.hintTitle}>
                {lang === "th" ? "ใคร (WHO) คืออะไร?" : "What is WHO?"}
              </AppText>
              <Pressable onPress={() => setShowWhoHint(false)}>
                <Ionicons name="close" size={20} color={WHITE55} />
              </Pressable>
            </View>
            <AppText style={styles.hintBody}>
              {lang === "th"
                ? "ระบุกลุ่มผู้ใช้ที่เฉพาะเจาะจง ไม่ใช่ 'users' ทั่วไป\n\nตัวอย่างที่ดี:\n• พยาบาลวิชาชีพในแผนกผู้ป่วยนอก\n• ผู้ป่วยโรคเบาหวานอายุ 40-60 ปี\n• แพทย์ผู้เชี่ยวชาญด้านจักษุ\n\nตัวอย่างที่ไม่ดี:\n• users (ทั่วไปเกินไป)\n• คนทุกคน (ไม่เฉพาะเจาะจง)\n• ผู้ป่วย (กว้างเกินไป)"
                : "Name a specific user group, not 'users' in general.\n\nGood examples:\n• Registered nurses in outpatient departments\n• Diabetic patients aged 40-60\n• Ophthalmology specialists\n\nBad examples:\n• users (too vague)\n• everyone (not specific)\n• patients (too broad)"}
            </AppText>
          </View>
        </View>
      )}

      {showBecauseHint && (
        <View style={styles.hintOverlay}>
          <View style={styles.hintCard}>
            <View style={styles.hintHeader}>
              <AppText variant="bold" style={styles.hintTitle}>
                {lang === "th" ? "เพราะ (BECAUSE) ต้องมีหลักฐาน" : "BECAUSE needs evidence"}
              </AppText>
              <Pressable onPress={() => setShowBecauseHint(false)}>
                <Ionicons name="close" size={20} color={WHITE55} />
              </Pressable>
            </View>
            <AppText style={styles.hintBody}>
              {lang === "th"
                ? "อย่าเขียนความรู้สึกที่คุณคาดเดา เช่น 'พวกเขากังวล' หรือ 'พวกเขาอยากได้'\n\nให้เขียนหลักฐานที่คุณเห็นหรือได้ยินจากผู้ใช้จริง\n\nตัวอย่างที่ดี (สุขภาพ):\n• 4 ใน 5 ผู้ป่วยเบาหวานบอกว่า 'ลืมตรวจน้ำตาลบ่อย'\n• พยาบาลใช้เวลาเฉลี่ย 15 นาทีค้นหาประวัติผู้ป่วยเก่า\n• 3 ใน 10 แพทย์เคยสั่งยาผิดเพราะไม่เห็นประวัติแพ้ยา\n\nตัวอย่างที่ไม่ดี:\n• พวกเขากังวล (คุณรู้ได้ไง?)\n• พวกเขาอยากได้แอป (คาดเดา)\n• ตลาดมีความต้องการสูง (ไม่เฉพาะเจาะจง)"
                : "Don't write feelings you guess, like 'they are worried' or 'they want'.\n\nWrite evidence you saw or heard from real users.\n\nGood examples (healthcare):\n• 4 of 5 diabetic patients said they 'often forget to check blood sugar'\n• Nurses spent average 15 minutes searching old patient records\n• 3 in 10 doctors had prescribed wrong drug because allergy history was missing\n\nBad examples:\n• they are worried (how do you know?)\n• they want an app (assumption)\n• market demand is high (not specific)"}
            </AppText>
          </View>
        </View>
      )}

      {showWillDoHint && (
        <View style={styles.hintOverlay}>
          <View style={styles.hintCard}>
            <View style={styles.hintHeader}>
              <AppText variant="bold" style={styles.hintTitle}>
                {lang === "th" ? "จะทำ (WILL DO) ต้องสังเกตได้" : "WILL DO must be observable"}
              </AppText>
              <Pressable onPress={() => setShowWillDoHint(false)}>
                <Ionicons name="close" size={20} color={WHITE55} />
              </Pressable>
            </View>
            <AppText style={styles.hintBody}>
              {lang === "th"
                ? "เขียนการกระทำที่คุณสามารถเห็นหรือวัดได้จริง ไม่ใช่ความรู้สึก\n\nตัวอย่างที่ดี (สุขภาพ):\n• กรอกค่าน้ำตาลในแอปทุกวันเวลา 8:00 โดยไม่ต้องเตือน\n• ข้ามการจดบันทึกกระดาษ แล้วใช้แอปบันทึกแทน\n• ส่งผลตรวจให้พยาบาลผ่านแอปภายใน 2 ชั่วโมง\n• แชร์ลิงก์นัดหมายให้ญาติผ่าน LINE\n\nตัวอย่างที่ไม่ดี:\n• รู้สึกดีขึ้น (วัดไม่ได้)\n• สนใจแอป (ไม่ชัดเจน)\n• ใช้บ่อยขึ้น (กำกวม)"
                : "Write an action you can actually see or measure, not a feeling.\n\nGood examples (healthcare):\n• Log blood sugar in the app daily at 8am without reminder\n• Skip paper records and use the app instead\n• Send lab results to nurse through app within 2 hours\n• Share appointment link to family via LINE\n\nBad examples:\n• feel better (not measurable)\n• interested in app (not clear)\n• use it more often (ambiguous)"}
            </AppText>
          </View>
        </View>
      )}

      {showMeasuredByHint && (
        <View style={styles.hintOverlay}>
          <View style={styles.hintCard}>
            <View style={styles.hintHeader}>
              <AppText variant="bold" style={styles.hintTitle}>
                {lang === "th" ? "วัดผลโดย (MEASURED BY) ต้องเป็นตัวเลข" : "MEASURED BY must be a number"}
              </AppText>
              <Pressable onPress={() => setShowMeasuredByHint(false)}>
                <Ionicons name="close" size={20} color={WHITE55} />
              </Pressable>
            </View>
            <AppText style={styles.hintBody}>
              {lang === "th"
                ? "ตั้งเกณฑ์ที่ชัดเจน มีตัวเลข และทดสอบได้ใน 1-2 สัปดาห์\n\nตัวอย่างที่ดี (สุขภาพ):\n• 6 ใน 10 พยาบาลจะบันทึกประวัติผู้ป่วยผ่านแอปภายใน 3 นาที\n• 70% ของผู้ป่วยเบาหวานจะกรอกค่าน้ำตาลครบ 7 วันติดต่อกัน\n• เวลาค้นหาประวัติผู้ป่วยจะลดจาก 15 นาที เหลือน้อยกว่า 2 นาที\n• ข้อผิดพลาดในการสั่งยาจะลดลงจาก 3% เหลือน้อยกว่า 1%\n\nตัวอย่างที่ไม่ดี:\n• คนส่วนใหญ่ชอบ (ไม่มีตัวเลข)\n• ใช้งานง่าย (วัดยาก)\n• ประสิทธิภาพดีขึ้น (กำกวม)"
                : "Set a clear threshold with a number, testable in 1-2 weeks.\n\nGood examples (healthcare):\n• 6 of 10 nurses will record patient history in app within 3 minutes\n• 70% of diabetic patients will log blood sugar for 7 consecutive days\n• Time to find patient records will drop from 15 min to under 2 min\n• Prescription errors will drop from 3% to under 1%\n\nBad examples:\n• most people like it (no number)\n• easy to use (hard to measure)\n• efficiency improves (ambiguous)"}
            </AppText>
          </View>
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
  subtitle: { color: WHITE55, fontSize: 14, marginBottom: 4 },
  loadPriorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "rgba(145,196,227,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.25)",
  },
  loadPriorTitle: { color: CYAN, fontSize: 13, fontFamily: "BaiJamjuree_700Bold" },
  loadPriorPreview: { color: WHITE55, fontSize: 11, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "rgba(74,107,130,0.2)",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldLabel: { color: CYAN, fontSize: 14 },
  fieldHint: { color: WHITE55, fontSize: 12, marginBottom: 2 },
  fieldExample: { color: WHITE28, fontSize: 12, marginBottom: 8, fontStyle: "italic" },
  dropdownContainer: { gap: 8 },
  chip: {
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  chipActive: { backgroundColor: CYAN45, borderColor: CYAN },
  chipText: { color: WHITE75, fontSize: 13 },
  chipTextActive: { color: WHITE },
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
  templateToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  templateToggleText: { color: CYAN, fontSize: 13 },
  templateList: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  templateItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  templateText: { color: WHITE75, fontSize: 13 },
  evidenceList: { gap: 8, marginBottom: 10 },
  evidenceItem: {
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: CYAN45,
  },
  evidenceQuote: { color: WHITE75, fontSize: 13, fontStyle: "italic" },
  evidenceSource: { color: WHITE55, fontSize: 11, marginTop: 4 },
  previewBlock: {
    borderLeftWidth: 3,
    borderLeftColor: CYAN,
    paddingLeft: 12,
  },
  previewTitle: { color: CYAN, fontSize: 14, marginBottom: 8 },
  previewText: { color: WHITE, fontSize: 14, lineHeight: 20 },
  aiCheckButton: {
    backgroundColor: "#6B8E9F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  aiCheckButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  aiCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiCheckButtonText: { color: BG, fontSize: 16 },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scoreValue: { fontSize: 28 },
  scoreLabel: { color: WHITE75, fontSize: 14 },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownItem: {
    alignItems: "center",
    flex: 1,
  },
  breakdownLabel: { color: WHITE55, fontSize: 11, marginBottom: 4 },
  breakdownValue: { fontSize: 18 },
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
  aiFlagContent: { flex: 1 },
  aiFlagText: { color: WHITE75, fontSize: 13 },
  aiFlagSuggestion: { color: WHITE55, fontSize: 12, marginTop: 2 },
  aiResponse: { color: WHITE75, fontSize: 13, marginTop: 8, lineHeight: 18 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hintOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3,5,10,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 24,
  },
  hintCard: {
    backgroundColor: "rgba(13,18,25,0.95)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: CYAN45,
    width: "100%",
    maxWidth: 400,
  },
  hintHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hintTitle: { color: WHITE, fontSize: 18 },
  hintBody: { color: WHITE75, fontSize: 13, lineHeight: 20 },
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
});
