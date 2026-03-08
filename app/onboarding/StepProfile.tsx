import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { saveProfileStep } from "../../lib/onboarding";
import type { CollectedData } from "../../types/onboarding";

type Props = {
  userId: string;
  onComplete: (data: CollectedData) => void;
};

const EDUCATION_OPTIONS = [
  { value: "high_school" as const, label: "🏫 High School" },
  { value: "university" as const, label: "🎓 University" },
  { value: "unaffiliated" as const, label: "🌍 Self-directed" },
];

const LANGUAGE_OPTIONS = [
  { value: "th" as const, label: "🇹🇭 ภาษาไทย" },
  { value: "en" as const, label: "🇬🇧 English" },
];

export default function StepProfile({ userId, onComplete }: Props) {
  const [education, setEducation] = useState<
    CollectedData["education_level"] | null
  >(null);
  const [language, setLanguage] = useState<
    CollectedData["preferred_language"] | null
  >(null);
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = !!education && !!language;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    const data: CollectedData = {
      education_level: education!,
      preferred_language: language!,
      school_name: school.trim() || undefined,
    };
    await saveProfileStep(userId, data);
    onComplete(data);
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.subtitle}>Just a few quick things first</Text>

          <Text style={styles.label}>Education level</Text>
          <View style={styles.chipRow}>
            {EDUCATION_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                style={[
                  styles.chip,
                  education === o.value && styles.chipActive,
                ]}
                onPress={() => setEducation(o.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    education === o.value && styles.chipTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>
            School / University name{" "}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={school}
            onChangeText={setSchool}
            placeholder="e.g. Chulalongkorn University"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.label}>Preferred language</Text>
          <View style={styles.chipRow}>
            {LANGUAGE_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                style={[styles.chip, language === o.value && styles.chipActive]}
                onPress={() => setLanguage(o.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    language === o.value && styles.chipTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.btn, !canContinue && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || saving}
          >
            <Text style={styles.btnText}>
              {saving ? "Saving..." : "Continue →"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 26,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 32,
  },
  label: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  optional: { fontWeight: "300", color: "rgba(255,255,255,0.4)" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  chipTextActive: { color: "#0a0514" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 15,
    marginBottom: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
