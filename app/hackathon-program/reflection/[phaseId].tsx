import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import { GlassButton } from "../../../components/Glass/GlassButton";
import { PageBg, Space } from "../../../lib/theme";

export default function HackathonPhaseReflectionScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [individualReflection, setIndividualReflection] = useState("");
  const [teamReflection, setTeamReflection] = useState("");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <AppText variant="bold" style={styles.title}>
        Phase reflection
      </AppText>
      <AppText style={styles.subtitle}>
        Capture what changed in how the team thinks after {phaseId?.replaceAll("-", " ")}.
      </AppText>

      <TeamWorkspaceSection
        title="Individual reflection"
        description="Each member should reflect on what surprised them, where their assumptions were wrong, and what they would investigate next."
        fields={[
          {
            key: "individual-reflection",
            label: "What changed in your thinking?",
            placeholder: "Write the strongest shift in your thinking after the interviews and research.",
            value: individualReflection,
            onChangeText: setIndividualReflection,
            multiline: true,
          },
        ]}
      />

      <TeamWorkspaceSection
        title="Team reflection"
        description="The team reflection should capture the shared learning and what the group now believes about the customer problem."
        fields={[
          {
            key: "team-reflection",
            label: "What does the team now believe?",
            placeholder: "Summarize the team's strongest shared insight.",
            value: teamReflection,
            onChangeText: setTeamReflection,
            multiline: true,
          },
        ]}
      />

      <GlassButton
        variant="primary"
        onPress={() =>
          Alert.alert(
            "Reflection captured in this slice",
            "The next step is wiring these fields into the hackathon reflection persistence layer.",
          )
        }
      >
        Submit reflection
      </GlassButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  content: {
    padding: Space.lg,
    gap: Space.lg,
    paddingBottom: 96,
  },
  backLink: {
    fontSize: 15,
    opacity: 0.82,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.82,
  },
});
