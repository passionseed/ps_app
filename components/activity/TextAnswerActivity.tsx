import { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import { GlassButton } from "../Glass/GlassButton";
import {
  Text as ThemeText,
  Space,
  Radius,
  Shadow,
} from "../../lib/theme";
import type { PathActivityWithContent, PathAssessment } from "../../types/pathlab-content";

interface Props {
  activity: PathActivityWithContent;
  onComplete: (answer: string) => void;
}

export default function TextAnswerActivity({ activity, onComplete }: Props) {
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const assessment = activity.path_assessment as PathAssessment | null;

  if (!assessment) return null;

  if (submitted) {
    return (
      <GlassCard style={styles.assessmentCard}>
        <AppText variant="bold" style={styles.assessmentType}>
          {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
        </AppText>
        <View style={styles.submittedAnswerContainer}>
          <AppText style={styles.submittedAnswerText}>{textAnswer}</AppText>
        </View>
        <AppText style={styles.assessmentSubmittedLabel}>✓ Completed</AppText>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.assessmentCard}>
      <AppText variant="bold" style={styles.assessmentType}>
        {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
      </AppText>

      <View style={styles.textAnswerContainer}>
        <TextInput
          style={styles.textAnswerInput}
          placeholder="Write your response..."
          placeholderTextColor="rgba(0, 0, 0, 0.3)"
          value={textAnswer}
          onChangeText={setTextAnswer}
          multiline
          textAlignVertical="top"
        />
        <AppText style={styles.characterCount}>
          {textAnswer.length} characters
        </AppText>
        <GlassButton
          variant="primary"
          fullWidth
          textStyle={styles.glassButtonText}
          style={{ marginTop: 12 }}
          disabled={textAnswer.trim().length === 0}
          onPress={() => {
            setSubmitted(true);
            onComplete(textAnswer);
          }}
        >
          Submit
        </GlassButton>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  assessmentCard: {
    marginBottom: Space.lg,
  },
  assessmentType: {
    fontSize: 11,
    fontWeight: "600",
    color: ThemeText.muted,
    marginBottom: 12,
  },
  textAnswerContainer: {
    marginTop: 12,
  },
  textAnswerInput: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: Radius.md,
    minHeight: 120,
    fontSize: 14,
    fontFamily: "BaiJamjuree_400Regular",
    color: ThemeText.primary,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Shadow.neutral,
  },
  characterCount: {
    fontSize: 12,
    color: ThemeText.muted,
    textAlign: "right",
    marginTop: 8,
  },
  assessmentSubmittedLabel: {
    fontSize: 13,
    color: "#9FE800",
    fontWeight: "600",
    marginTop: 12,
  },
  submittedAnswerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 8,
  },
  submittedAnswerText: {
    fontSize: 14,
    color: ThemeText.primary,
    lineHeight: 20,
  },
  glassButtonText: {
    fontFamily: "BaiJamjuree_700Bold",
  },
});
