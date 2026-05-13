import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import {
  getVideoSubmission,
  saveVideoStoryboard,
  submitRound1Video,
} from "../../../lib/hackathonPhase3";
import type {
  VideoStoryboardSection,
} from "../../../types/hackathon-phase3";

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
const GREEN = "#4ECDC4";

const DEFAULT_SECTIONS: VideoStoryboardSection[] = [
  { section: "hook", content: "", media_url: null, voiceover_url: null },
  { section: "problem", content: "", media_url: null, voiceover_url: null },
  { section: "solution", content: "", media_url: null, voiceover_url: null },
  { section: "demo", content: "", media_url: null, voiceover_url: null },
  { section: "ask", content: "", media_url: null, voiceover_url: null },
];

const HARD_GATES = [
  { key: "under_3_min", label: "Under 3 minutes" },
  { key: "face_on_camera", label: "Face on camera" },
  { key: "real_pretotype", label: "Shows real pretotype" },
  { key: "no_slides", label: "No slides / no Canva" },
];

export default function Phase3VideoScreen() {
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] =
    useState<VideoStoryboardSection[]>(DEFAULT_SECTIONS);
  const [videoUrl, setVideoUrl] = useState("");
  const [hardGates, setHardGates] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const loadSubmission = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const data = await getVideoSubmission(teamId);
    if (data?.storyboard && data.storyboard.length > 0) {
      setSections(data.storyboard as VideoStoryboardSection[]);
    }
    if (data?.video_url) {
      setVideoUrl(data.video_url);
    }
    if (data?.hard_gates) {
      setHardGates(data.hard_gates);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const updateSection = useCallback(
    (index: number, field: keyof VideoStoryboardSection, value: string) => {
      setSections((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const handleSaveStoryboard = useCallback(async () => {
    if (!teamId) return;
    setSaving(true);
    await saveVideoStoryboard(teamId, sections as any);
    setSaving(false);
  }, [teamId, sections]);

  const handleSubmitVideo = useCallback(async () => {
    if (!teamId || !videoUrl) return;
    setSaving(true);
    await submitRound1Video(teamId, {
      video_url: videoUrl,
      video_duration_sec: 120,
      video_file_size_mb: 25,
      hard_gates: hardGates,
      soft_gates: {},
    });
    setSaving(false);
    router.back();
  }, [teamId, videoUrl, hardGates]);

  const allHardGatesPass = HARD_GATES.every((g) => hardGates[g.key]);
  const canSubmit = allHardGatesPass && videoUrl.length > 0;

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top + 60 },
        ]}
      >
        <ActivityIndicator size="large" color={CYAN} />
        <AppText style={styles.loadingText}>Loading video...</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <AppText variant="bold" style={styles.headerTitle}>
          Round 1 Video
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Video Storyboard
        </AppText>
        <AppText style={styles.subtitle}>
          Plan your 3-minute pitch video
        </AppText>

        {sections.map((section, index) => (
          <View key={section.section} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <AppText variant="bold" style={styles.sectionLabel}>
                {section.section.charAt(0).toUpperCase() +
                  section.section.slice(1)}
              </AppText>
              <AppText style={styles.sectionHint}>
                {section.section === "hook" && "Grab attention in 10 sec"}
                {section.section === "problem" && "Show the pain"}
                {section.section === "solution" && "Your approach"}
                {section.section === "demo" && "Real user testing"}
                {section.section === "ask" && "What you need"}
              </AppText>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={`Describe ${section.section} section...`}
              placeholderTextColor={WHITE28}
              value={section.content}
              onChangeText={(text) => updateSection(index, "content", text)}
              multiline
            />
          </View>
        ))}

        <Pressable
          style={styles.saveButton}
          onPress={handleSaveStoryboard}
          disabled={saving}
        >
          <AppText variant="bold" style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Storyboard"}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.card}>
        <AppText variant="bold" style={styles.title}>
          Video Submission
        </AppText>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Video URL
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/... or https://drive.google.com/..."
            placeholderTextColor={WHITE28}
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bold" style={styles.fieldLabel}>
            Hard Gates
          </AppText>
          <AppText style={styles.fieldHint}>
            All must pass to submit
          </AppText>
          {HARD_GATES.map((gate) => (
            <Pressable
              key={gate.key}
              style={styles.gateRow}
              onPress={() =>
                setHardGates((prev) => ({
                  ...prev,
                  [gate.key]: !prev[gate.key],
                }))
              }
            >
              <Ionicons
                name={hardGates[gate.key] ? "checkbox" : "square-outline"}
                size={22}
                color={hardGates[gate.key] ? GREEN : WHITE55}
              />
              <AppText
                style={[
                  styles.gateText,
                  hardGates[gate.key] && styles.gateTextActive,
                ]}
              >
                {gate.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!canSubmit || saving) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitVideo}
          disabled={!canSubmit || saving}
        >
          <AppText variant="bold" style={styles.submitButtonText}>
            {saving ? "Submitting..." : "Submit Round 1 Video"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: { color: WHITE55, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { color: WHITE, fontSize: 18, flex: 1 },
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
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: { color: CYAN, fontSize: 14 },
  sectionHint: { color: WHITE55, fontSize: 11 },
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
  saveButton: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: CYAN45,
  },
  saveButtonText: { color: CYAN, fontSize: 14 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { color: CYAN, fontSize: 16, marginBottom: 8 },
  fieldHint: { color: WHITE55, fontSize: 12, marginBottom: 10 },
  gateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  gateText: { color: WHITE75, fontSize: 14 },
  gateTextActive: { color: GREEN },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
});
