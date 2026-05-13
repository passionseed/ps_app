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
const YELLOW = "#FFA500";

interface PretotypeFormProps {
  cycleId: string;
  priorVariable?: string | null;
  onSubmit: (data: {
    method: string;
    variableChanged: string;
    artifactUrl: string | null;
    description: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
}

const METHODS = [
  {
    value: "video_prototype",
    label: "Video Prototype",
    description: "Fake demo video of product experience",
  },
  {
    value: "one_pager",
    label: "One-Pager",
    description: "Single page describing the product",
  },
  {
    value: "facade",
    label: "Facade",
    description: "Fake storefront / landing page",
  },
  {
    value: "demo",
    label: "Live Demo",
    description: "Wizard-of-Oz mockup you control",
  },
  {
    value: "roleplay",
    label: "Roleplay",
    description: "Act out the user experience",
  },
  {
    value: "concierge",
    label: "Concierge",
    description: "Manual service pretending to be product",
  },
  {
    value: "digital_mockup",
    label: "Digital Mockup",
    description: "Figma / sketch of interface",
  },
  {
    value: "physical_mockup",
    label: "Physical Mockup",
    description: "Cardboard / paper prototype",
  },
];

export default function PretotypeForm({
  priorVariable,
  onSubmit,
  aiFeedback,
}: PretotypeFormProps) {
  const [method, setMethod] = useState("");
  const [variableChanged, setVariableChanged] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [description, setDescription] = useState("");
  const [showMethodInfo, setShowMethodInfo] = useState<string | null>(null);

  const selectedMethod = METHODS.find((m) => m.value === method);
  const hasMethod = method.length > 0;
  const hasVariable = variableChanged.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const canSubmit = hasMethod && hasVariable && hasDescription;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      method,
      variableChanged,
      artifactUrl: artifactUrl.trim() || null,
      description,
    });
  }, [canSubmit, method, variableChanged, artifactUrl, description, onSubmit]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Step 2: Pretotype
        </AppText>
        <AppText style={styles.subtitle}>
          Build the smallest testable version
        </AppText>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>
              Pretotype Method *
            </AppText>
            <Ionicons
              name={hasMethod ? "checkmark-circle" : "close-circle"}
              size={20}
              color={hasMethod ? GREEN : RED}
            />
          </View>
          <AppText style={styles.fieldHint}>
            Choose the fastest way to test your hypothesis
          </AppText>
          <View style={styles.methodGrid}>
            {METHODS.map((m) => (
              <Pressable
                key={m.value}
                style={[
                  styles.methodCard,
                  method === m.value && styles.methodCardActive,
                ]}
                onPress={() => {
                  setMethod(m.value);
                  setShowMethodInfo(
                    showMethodInfo === m.value ? null : m.value
                  );
                }}
              >
                <View style={styles.methodHeader}>
                  <Ionicons
                    name={
                      m.value === "video_prototype"
                        ? "videocam"
                        : m.value === "one_pager"
                        ? "document-text"
                        : m.value === "facade"
                        ? "browsers"
                        : m.value === "demo"
                        ? "play-circle"
                        : m.value === "roleplay"
                        ? "people"
                        : m.value === "concierge"
                        ? "hand-left"
                        : m.value === "digital_mockup"
                        ? "desktop"
                        : "cube"
                    }
                    size={18}
                    color={method === m.value ? CYAN : WHITE55}
                  />
                  <AppText
                    style={[
                      styles.methodLabel,
                      method === m.value && styles.methodLabelActive,
                    ]}
                  >
                    {m.label}
                  </AppText>
                </View>
                {showMethodInfo === m.value && (
                  <AppText style={styles.methodDescription}>
                    {m.description}
                  </AppText>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>
              ONE Variable Changed *
            </AppText>
            <Ionicons
              name={hasVariable ? "checkmark-circle" : "close-circle"}
              size={20}
              color={hasVariable ? GREEN : RED}
            />
          </View>
          <AppText style={styles.fieldHint}>
            What is the ONE thing you changed from the last cycle?
          </AppText>
          {priorVariable && (
            <View style={styles.priorVariableCard}>
              <AppText style={styles.priorVariableLabel}>Prior variable:</AppText>
              <AppText style={styles.priorVariableText}>{priorVariable}</AppText>
            </View>
          )}
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="We changed ___ because we learned ___"
            placeholderTextColor={WHITE28}
            value={variableChanged}
            onChangeText={setVariableChanged}
            multiline
          />
          <AppText style={styles.variableTip}>
            <Ionicons name="bulb" size={12} color={YELLOW} /> Tip: Change only
            ONE variable per cycle. Otherwise you won't know what caused the
            result.
          </AppText>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Pretotype Artifact
          </AppText>
          <AppText style={styles.fieldHint}>
            Link to your prototype (URL, Figma, photo, etc.)
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={WHITE28}
            value={artifactUrl}
            onChangeText={setArtifactUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <AppText variant="bold" style={styles.fieldLabel}>
              How You Will Test *
            </AppText>
            <Ionicons
              name={hasDescription ? "checkmark-circle" : "close-circle"}
              size={20}
              color={hasDescription ? GREEN : RED}
            />
          </View>
          <AppText style={styles.fieldHint}>
            Describe exactly how someone will interact with your pretotype
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="User will see ___ and then ___"
            placeholderTextColor={WHITE28}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {selectedMethod && (
          <View style={styles.previewCard}>
            <AppText variant="bold" style={styles.previewTitle}>
              Pretotype Plan
            </AppText>
            <View style={styles.previewRow}>
              <AppText style={styles.previewLabel}>Method:</AppText>
              <AppText style={styles.previewValue}>
                {selectedMethod.label}
              </AppText>
            </View>
            <View style={styles.previewRow}>
              <AppText style={styles.previewLabel}>Variable:</AppText>
              <AppText style={styles.previewValue}>{variableChanged}</AppText>
            </View>
            <View style={styles.previewRow}>
              <AppText style={styles.previewLabel}>Test:</AppText>
              <AppText style={styles.previewValue}>{description}</AppText>
            </View>
          </View>
        )}

        <Pressable
          style={[
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            Submit Pretotype
          </AppText>
        </Pressable>

        {aiFeedback && (
          <View style={styles.aiFeedbackCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={16} color={CYAN} />
              <AppText variant="bold" style={styles.aiTitle}>
                AI Coach
              </AppText>
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
            {aiFeedback.response && (
              <AppText style={styles.aiResponse}>
                {aiFeedback.response}
              </AppText>
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
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  methodCardActive: {
    backgroundColor: CYAN20,
    borderColor: CYAN,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodLabel: { color: WHITE75, fontSize: 13 },
  methodLabelActive: { color: WHITE, fontWeight: "600" },
  methodDescription: {
    color: WHITE55,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  priorVariableCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: CYAN45,
  },
  priorVariableLabel: { color: WHITE55, fontSize: 11, marginBottom: 4 },
  priorVariableText: { color: WHITE75, fontSize: 13 },
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
  variableTip: {
    color: WHITE55,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  previewTitle: { color: CYAN, fontSize: 14, marginBottom: 10 },
  previewRow: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 8,
  },
  previewLabel: { color: WHITE55, fontSize: 12, width: 70 },
  previewValue: { color: WHITE, fontSize: 13, flex: 1, lineHeight: 18 },
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
