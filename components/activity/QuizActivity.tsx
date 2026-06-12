import { View, StyleSheet } from "react-native";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import {
  Accent,
  Text as ThemeText,
  Space,
  Shadow,
} from "../../lib/theme";
import type { PathActivityWithContent, PathAssessment, PathQuizQuestion, PathAssessmentSubmission } from "../../types/pathlab-content";

interface Props {
  activity: PathActivityWithContent;
  onComplete?: () => void;
  isSubmitting?: boolean;
}

export default function QuizActivity({ activity }: Props) {
  const assessment = activity.path_assessment as (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null;
  const submission = activity.submission as PathAssessmentSubmission | null | undefined;
  const isCompleted = activity.progress?.status === "completed";

  if (!assessment) return null;

  const alreadyCompleted = isCompleted;

  if (alreadyCompleted) {
    return (
      <GlassCard style={styles.assessmentCard}>
        <AppText variant="bold" style={styles.assessmentType}>
          {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
        </AppText>
        {submission?.quiz_answers && (
          <View style={styles.submittedAnswerContainer}>
            <AppText style={styles.submittedAnswerText}>
              Quiz submitted
            </AppText>
          </View>
        )}
        <AppText style={styles.assessmentSubmittedLabel}>✓ Completed</AppText>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.assessmentCard}>
      <AppText variant="bold" style={styles.assessmentType}>
        {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
      </AppText>

      {assessment.quiz_questions && assessment.quiz_questions.length > 0 && (
        <View style={styles.quizContainer}>
          {assessment.quiz_questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <AppText style={styles.questionText}>
                {index + 1}. {question.question_text}
              </AppText>
              {question.options &&
                Array.isArray(question.options) &&
                question.options.map((opt: any, optIndex: number) => (
                  <View key={optIndex} style={styles.optionRow}>
                    <View style={styles.optionCircle} />
                    <AppText style={styles.optionText}>
                      {typeof opt === "string" ? opt : opt.text || opt.option}
                    </AppText>
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}
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
  quizContainer: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadow.neutral,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "500",
    color: ThemeText.primary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  optionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ThemeText.muted,
    marginRight: 12,
  },
  optionText: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
  assessmentSubmittedLabel: {
    fontSize: 13,
    color: Accent.yellowDark,
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
});
