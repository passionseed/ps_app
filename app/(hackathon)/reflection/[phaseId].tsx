// app/(hackathon)/reflection/[phaseId].tsx
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import { Radius, Space } from "../../../lib/theme";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";

export default function HackathonPhaseReflectionScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [individualReflection, setIndividualReflection] = useState("");
  const [teamReflection, setTeamReflection] = useState("");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>REFLECTION</AppText>
        <AppText variant="bold" style={styles.title}>
          Phase reflection
        </AppText>
        <AppText style={styles.subtitle}>
          Capture what changed in how the team thinks after {phaseId?.replaceAll("-", " ")}.
        </AppText>
      </View>

      <TeamWorkspaceSection
        title="Individual reflection"
        description="Each member should reflect on what surprised them, where their assumptions were wrong, and what they would investigate next."
        fields={[{
          key: "individual-reflection",
          label: "What changed in your thinking?",
          placeholder: "Write the strongest shift in your thinking after the interviews and research.",
          value: individualReflection,
          onChangeText: setIndividualReflection,
          multiline: true,
        }]}
      />

      <TeamWorkspaceSection
        title="Team reflection"
        description="The team reflection should capture the shared learning and what the group now believes about the customer problem."
        fields={[{
          key: "team-reflection",
          label: "What does the team now believe?",
          placeholder: "Summarize the team's strongest shared insight.",
          value: teamReflection,
          onChangeText: setTeamReflection,
          multiline: true,
        }]}
      />

      <Pressable
        style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
        onPress={() =>
          Alert.alert(
            "Reflection captured",
            "The next step is wiring these fields into the hackathon reflection persistence layer.",
          )
        }
      >
        <AppText variant="bold" style={styles.submitBtnText}>Submit reflection →</AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 96 },
  backLink: { fontSize: 15, color: CYAN },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 30, lineHeight: 36, color: WHITE },
  subtitle: { fontSize: 15, lineHeight: 23, color: WHITE75 },
  submitBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingVertical: Space.md,
    alignItems: "center",
    marginTop: Space.sm,
  },
  submitBtnText: { color: CYAN, fontSize: 15, letterSpacing: 0.5 },
});
