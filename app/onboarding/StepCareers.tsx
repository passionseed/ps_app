import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator
} from "react-native";
import { callOnboardingChat, saveCareers } from "../../lib/onboarding";
import type { InterestCategory, CareerGoal } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  interests: InterestCategory[];
  onComplete: () => void;
};

export default function StepCareers({ userId, userName, educationLevel, interests, onComplete }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [customCareers, setCustomCareers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const allSelected = interests.flatMap((c) => c.selected);
    callOnboardingChat({
      mode: 'suggest_careers',
      chat_history: [],
      user_context: {
        name: userName,
        education_level: educationLevel,
        selected_interests: allSelected,
      },
    }).then((res) => {
      setSuggestions(res.action_data?.careers ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSuggestion = (career: string) => {
    setSelected((prev) =>
      prev.includes(career) ? prev.filter((c) => c !== career) : [...prev, career]
    );
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    setCustomCareers((prev) => [...prev, val]);
    setCustomInput('');
  };

  const handleContinue = async () => {
    setSaving(true);
    const goals: CareerGoal[] = [
      ...selected.map((c) => ({ career_name: c, source: 'ai_suggested' as const })),
      ...customCareers.map((c) => ({ career_name: c, source: 'user_typed' as const })),
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

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>What do you want to try?</Text>
      <Text style={styles.subtitle}>Based on your interests — no commitment needed</Text>

      <View style={styles.chipsWrap}>
        {suggestions.map((career) => {
          const active = selected.includes(career);
          return (
            <Pressable
              key={career}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleSuggestion(career)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{career}</Text>
            </Pressable>
          );
        })}
        {customCareers.map((career) => (
          <Pressable
            key={`custom-${career}`}
            style={[styles.chip, styles.chipActive]}
            onPress={() => setCustomCareers((prev) => prev.filter((c) => c !== career))}
          >
            <Text style={[styles.chipText, styles.chipTextActive]}>{career} ×</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.input}
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="Add your own..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <Pressable style={styles.addBtn} onPress={addCustom}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {totalSelected === 0 ? "You can skip this — that's fine too" : `${totalSelected} selected`}
      </Text>

      <Pressable style={[styles.btn, saving && styles.btnDisabled]} onPress={handleContinue} disabled={saving}>
        <Text style={styles.btnText}>{saving ? 'Saving...' : totalSelected === 0 ? 'Skip →' : 'Continue →'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontFamily: 'Orbit_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 24, color: '#fff', marginBottom: 8 },
  subtitle: { fontFamily: 'Orbit_400Regular', fontWeight: '300', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: '#BFFF00', borderColor: '#BFFF00' },
  chipText: { fontFamily: 'Orbit_400Regular', fontWeight: '500', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  chipTextActive: { color: '#0a0514' },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    color: '#fff', fontFamily: 'Orbit_400Regular', fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', width: 48, height: 48,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  addBtnText: { color: '#fff', fontSize: 24 },
  hint: {
    fontFamily: 'Orbit_400Regular', fontSize: 13,
    color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24,
  },
  btn: { backgroundColor: '#BFFF00', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 17, color: '#0a0514' },
});
