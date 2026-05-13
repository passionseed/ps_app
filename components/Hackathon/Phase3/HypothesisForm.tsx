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
import type { AICoachResponse } from "../../types/hackathon-phase3";

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

interface HypothesisFormProps {
  cycleId: string;
  teamId: string;
  phase1Evidence?: Array<{ quote: string; source: string }>;
  targetUsers?: string[];
  onSubmit: (data: {
    who: string;
    willDo: string;
    because: string;
    measuredBy: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
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
  phase1Evidence = [],
  targetUsers = [],
  onSubmit,
  aiFeedback,
}: HypothesisFormProps) {
  const [who, setWho] = useState("");
  const [willDo, setWillDo] = useState("");
  const [because, setBecause] = useState("");
  const [measuredBy, setMeasuredBy] = useState("");
  const [showTemplates, setShowTemplates] = useState<string | null>(null);

  const hasWho = who.trim().length > 0 && who !== "users";
  const hasWillDo = willDo.trim().length > 0;
  const hasBecause = because.trim().length > 0;
  const hasMeasuredBy = measuredBy.trim().length > 0;
  const canSubmit = hasWho && hasWillDo && hasBecause && hasMeasuredBy;

  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit({ who, willDo, because, measuredBy });
    }
  }, [canSubmit, who, willDo, because, measuredBy, onSubmit]);

  const renderFieldStatus = (valid: boolean) => (
    <Ionicons
      name={valid ? "checkmark-circle" : "close-circle"}
      size={20}
      color={valid ? GREEN : RED}
    />
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Step 1: Write Your Hypothesis
        </AppText>
        <AppText style={styles.subtitle}>
          Testable prediction with 4 parts
        </AppText>

        {/* WHO */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>WHO</AppText>
            {renderFieldStatus(hasWho)}
          </View>
          <AppText style={styles.fieldHint}>Specific user type</AppText>
          <View style={styles.dropdownContainer}>
            {targetUsers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {targetUsers.map((user) => (
                  <Pressable
                    key={user}
                    style={[
                      styles.chip,
                      who === user && styles.chipActive,
                    ]}
                    onPress={() => setWho(user)}
                  >
                    <AppText
                      style={[
                        styles.chipText,
                        who === user && styles.chipTextActive,
                      ]}
                    >
                      {user}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <TextInput
              style={styles.input}
              placeholder="Or type custom user..."
              placeholderTextColor={WHITE28}
              value={who}
              onChangeText={setWho}
            />
          </View>
        </View>

        {/* WILL DO */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>WILL DO</AppText>
            {renderFieldStatus(hasWillDo)}
          </View>
          <AppText style={styles.fieldHint}>Observable action</AppText>
          <Pressable
            style={styles.templateToggle}
            onPress={() =>
              setShowTemplates(showTemplates === "willDo" ? null : "willDo")
            }
          >
            <AppText style={styles.templateToggleText}>
              {showTemplates === "willDo" ? "Hide templates" : "Show templates"}
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
                <Pressable
                  key={t}
                  style={styles.templateItem}
                  onPress={() => setWillDo(t)}
                >
                  <AppText style={styles.templateText}>{t}</AppText>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Specific action..."
            placeholderTextColor={WHITE28}
            value={willDo}
            onChangeText={setWillDo}
            multiline
          />
        </View>

        {/* BECAUSE */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>BECAUSE</AppText>
            {renderFieldStatus(hasBecause)}
          </View>
          <AppText style={styles.fieldHint}>Evidence from Phase 1</AppText>
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
            placeholder="Why do you believe this?..."
            placeholderTextColor={WHITE28}
            value={because}
            onChangeText={setBecause}
            multiline
          />
        </View>

        {/* MEASURED BY */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>MEASURED BY</AppText>
            {renderFieldStatus(hasMeasuredBy)}
          </View>
          <AppText style={styles.fieldHint}>Observable threshold</AppText>
          <Pressable
            style={styles.templateToggle}
            onPress={() =>
              setShowTemplates(showTemplates === "measured" ? null : "measured")
            }
          >
            <AppText style={styles.templateToggleText}>
              {showTemplates === "measured" ? "Hide templates" : "Show templates"}
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
                <Pressable
                  key={t}
                  style={styles.templateItem}
                  onPress={() => setMeasuredBy(t)}
                >
                  <AppText style={styles.templateText}>{t}</AppText>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Threshold..."
            placeholderTextColor={WHITE28}
            value={measuredBy}
            onChangeText={setMeasuredBy}
          />
        </View>

        {/* Preview */}
        {canSubmit && (
          <View style={styles.previewCard}>
            <AppText variant="bold" style={styles.previewTitle}>
              Full Hypothesis
            </AppText>
            <AppText style={styles.previewText}>
              {who} will {willDo} because {because} measured by {measuredBy}
            </AppText>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            Submit Hypothesis
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
                      ? "#FFA500"
                      : CYAN
                  }
                />
                <AppText style={styles.aiFlagText}>{flag.message}</AppText>
              </View>
            ))}
            {aiFeedback.response && (
              <AppText style={styles.aiResponse}>{aiFeedback.response}</AppText>
            )}
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
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldLabel: { color: CYAN, fontSize: 16 },
  fieldHint: { color: WHITE55, fontSize: 12, marginBottom: 8 },
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
    borderColor: BORDER,
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
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: CYAN45,
  },
  evidenceQuote: { color: WHITE75, fontSize: 13, fontStyle: "italic" },
  evidenceSource: { color: WHITE55, fontSize: 11, marginTop: 4 },
  previewCard: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  previewTitle: { color: CYAN, fontSize: 14, marginBottom: 8 },
  previewText: { color: WHITE, fontSize: 14, lineHeight: 20 },
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
  aiResponse: { color: WHITE75, fontSize: 13, marginTop: 8, lineHeight: 18 },
});
