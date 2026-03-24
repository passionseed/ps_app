import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { callOnboardingChat, saveCareers } from "../../lib/onboarding";
import { logCareerSelected } from "../../lib/eventLogger";
import type { InterestCategory, CareerGoal } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  interests: InterestCategory[];
  onComplete: () => void;
};

export default function StepCareers({
  userId,
  userName,
  educationLevel,
  interests,
  onComplete,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customCareers, setCustomCareers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    const allSelected = interests.flatMap((c) => c.selected);
    callOnboardingChat({
      mode: "suggest_careers",
      chat_history: [],
      user_context: {
        name: userName,
        education_level: educationLevel,
        selected_interests: allSelected,
      },
    })
      .then((res) => {
        setSuggestions(res.action_data?.careers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSuggestion = (career: string) => {
    setSelected((prev) => {
      const isAdding = !prev.includes(career);
      if (isAdding) {
        logCareerSelected(career, "ai").catch(() => {});
      }
      return prev.includes(career)
        ? prev.filter((c) => c !== career)
        : [...prev, career];
    });
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    logCareerSelected(val, "custom").catch(() => {});
    setCustomCareers((prev) => [...prev, val]);
    setCustomInput("");
  };

  const handleContinue = async () => {
    setSaving(true);
    const goals: CareerGoal[] = [
      ...selected.map((c) => ({
        career_name: c,
        source: "ai_suggested" as const,
      })),
      ...customCareers.map((c) => ({
        career_name: c,
        source: "user_typed" as const,
      })),
    ];
    await saveCareers(userId, goals);
    onComplete();
    setSaving(false);
  };

  const totalSelected = selected.length + customCareers.length;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
        <Text style={styles.loadingText}>Finding paths for you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>
          Couldn't connect. Check your internet and try again.
        </Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What do you want to try?</Text>
        <Text style={styles.subtitle}>
          Based on your interests — no commitment needed
        </Text>

        <View style={styles.chipsWrap}>
          {suggestions.map((career) => {
            const active = selected.includes(career);
            return (
              <Pressable
                key={career}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleSuggestion(career)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {career}
                </Text>
              </Pressable>
            );
          })}
          {customCareers.map((career) => (
            <Pressable
              key={`custom-${career}`}
              style={[styles.chip, styles.chipActive]}
              onPress={() =>
                setCustomCareers((prev) => prev.filter((c) => c !== career))
              }
            >
              <Text style={[styles.chipText, styles.chipTextActive]}>
                {career} ×
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.customRow}>
          <TextInput
            style={styles.input}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="Add your own..."
            placeholderTextColor="rgba(0,0,0,0.4)"
            returnKeyType="done"
            onSubmitEditing={addCustom}
          />
          <Pressable style={styles.addBtn} onPress={addCustom}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          {totalSelected === 0
            ? "You can skip this — that's fine too"
            : `${totalSelected} selected`}
        </Text>

        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          <Text style={styles.btnText}>
            {saving
              ? "Saving..."
              : totalSelected === 0
                ? "Skip →"
                : "Continue →"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: {
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    fontSize: 15,
  },
  errorText: {
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 15,
    color: "#0a0514",
  },
  scroll: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 24,
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 28,
  },
  chipsWrap: {
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
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: "#4B5563",
  },
  chipTextActive: { color: "#0a0514" },
  customRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#111827",
    fontFamily: "Orbit_400Regular",
    fontSize: 15,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  addBtn: {
    backgroundColor: "rgba(0,0,0,0.05)",
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  addBtnText: { color: "#111827", fontSize: 24 },
  hint: {
    fontFamily: "Orbit_400Regular",
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
