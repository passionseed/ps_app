// app/(hackathon)/reflection/[phaseId].tsx
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../../components/AppText";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import { Radius, Space } from "../../../lib/theme";
import { createHackathonTeamReflection } from "../../../lib/hackathonReflections";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";

export default function HackathonPhaseReflectionScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const insets = useSafeAreaInsets();
  const [prevHypothesis, setPrevHypothesis] = useState("");
  const [newReality, setNewReality] = useState("");
  const [keyInsight, setKeyInsight] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!phaseId) return;

    if (!prevHypothesis.trim() || !newReality.trim() || !keyInsight.trim()) {
      Alert.alert("Incomplete reflection", "Please complete all reflection fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await createHackathonTeamReflection({
        phaseId,
        prevHypothesis,
        newReality,
        keyInsight,
      });
      Alert.alert("Reflection saved", "Your team reflection has been captured.");
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to save reflection",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
      >
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
          title="What we believed before"
          description="Capture the strongest assumption or hypothesis your team carried into this phase."
          fields={[{
            key: "prev-hypothesis",
            label: "Previous hypothesis",
            placeholder: "What did your team expect to be true before the interviews and research?",
            value: prevHypothesis,
            onChangeText: setPrevHypothesis,
            multiline: true,
          }]}
        />

        <TeamWorkspaceSection
          title="What reality taught us"
          description="Describe what the evidence changed about your understanding of the customer problem."
          fields={[{
            key: "new-reality",
            label: "New reality",
            placeholder: "What did your team discover that challenged the original belief?",
            value: newReality,
            onChangeText: setNewReality,
            multiline: true,
          }, {
            key: "key-insight",
            label: "Key insight",
            placeholder: "Summarize the most important insight you will carry into the next phase.",
            value: keyInsight,
            onChangeText: setKeyInsight,
            multiline: true,
          }]}
        />

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <AppText variant="bold" style={styles.submitBtnText}>
            {submitting ? "Saving reflection..." : "Submit reflection →"}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  headerActions: {
    position: "absolute",
    left: Space["2xl"],
    zIndex: 10,
  },
  content: { padding: Space["2xl"], gap: Space.xl, paddingBottom: 120 },
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
