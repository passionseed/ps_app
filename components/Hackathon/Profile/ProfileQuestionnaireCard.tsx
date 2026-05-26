import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { Radius, Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type QuestionnaireData = {
  dream_faculty?: string | null;
  team_role_preference?: string | null;
  ai_proficiency?: string | null;
  why_hackathon?: string | null;
  loves?: string | null;
  good_at?: string | null;
};

const FIELD_LABELS: { key: keyof QuestionnaireData; label: string }[] = [
  { key: "dream_faculty", label: "Dream Faculty" },
  { key: "team_role_preference", label: "Preferred Role" },
  { key: "ai_proficiency", label: "AI Proficiency" },
  { key: "why_hackathon", label: "Goal" },
  { key: "loves", label: "Passions" },
  { key: "good_at", label: "Strengths" },
];

export function buildQuestionnaireSummary(
  questionnaire: QuestionnaireData | null,
): string {
  if (!questionnaire) return "Complete on web";
  const count = FIELD_LABELS.filter(({ key }) => questionnaire[key]).length;
  if (count === 0) return "Complete on web";
  return `${count} answer${count === 1 ? "" : "s"} saved`;
}

export function ProfileQuestionnaireFields({
  questionnaire,
}: {
  questionnaire: QuestionnaireData;
}) {
  return (
    <View style={styles.qList}>
      {FIELD_LABELS.map(({ key, label }) => {
        const value = questionnaire[key];
        if (!value) return null;
        return <QItem key={key} label={label} value={value} />;
      })}
    </View>
  );
}

export function ProfileQuestionnaireEmptyFields() {
  return (
    <>
      <AppText style={styles.emptyText}>
        Fill this out once before the hackathon starts.
      </AppText>
      <Pressable
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
        onPress={() =>
          Linking.openURL("https://www.passionseed.org/hackathon/onboarding")
        }
      >
        <AppText variant="bold" style={styles.linkBtnText}>
          Open questionnaire
        </AppText>
      </Pressable>
    </>
  );
}

function QItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.qItem}>
      <AppText style={styles.qLabel}>{label}</AppText>
      <AppText style={styles.qValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  qList: {
    gap: Space.sm,
  },
  qItem: {
    gap: 2,
    backgroundColor: HACK_COLORS.bgElevated,
    padding: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HACK_ALPHA.glassBorder,
  },
  qLabel: {
    fontSize: 10,
    color: HACK_COLORS.cyan,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  qValue: {
    fontSize: 13,
    color: HACK_COLORS.white,
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  emptyText: {
    fontSize: 13,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  linkBtn: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1,
    borderColor: HACK_ALPHA.cyanBorderStrong,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Space.md,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  linkBtnText: {
    color: HACK_COLORS.cyan,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
