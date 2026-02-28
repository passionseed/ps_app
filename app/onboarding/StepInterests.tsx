import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator
} from "react-native";
import { callOnboardingChat, saveInterests } from "../../lib/onboarding";
import type { ChatMessage, InterestCategory } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  chatHistory: ChatMessage[];
  onComplete: (categories: InterestCategory[]) => void;
};

export default function StepInterests({ userId, userName, educationLevel, chatHistory, onComplete }: Props) {
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    callOnboardingChat({
      mode: 'generate_interests',
      chat_history: chatHistory,
      user_context: { name: userName, education_level: educationLevel },
    }).then((res) => {
      if (res.action_data?.categories) {
        setCategories(
          res.action_data.categories.map((c) => ({
            category_name: c.name,
            statements: c.statements,
            selected: [],
          }))
        );
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleStatement = (catIndex: number, statement: string) => {
    setCategories((prev) =>
      prev.map((cat, i) => {
        if (i !== catIndex) return cat;
        const alreadySelected = cat.selected.includes(statement);
        if (alreadySelected) {
          return { ...cat, selected: cat.selected.filter((s) => s !== statement) };
        }
        if (cat.selected.length >= 2) return cat;
        return { ...cat, selected: [...cat.selected, statement] };
      })
    );
  };

  const handleContinue = async () => {
    setSaving(true);
    await saveInterests(userId, categories);
    onComplete(categories);
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
        <Text style={styles.loadingText}>Analyzing your interests...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>What resonates with you?</Text>
      <Text style={styles.subtitle}>Select up to 2 statements per theme (optional)</Text>

      {categories.map((cat, catIndex) => (
        <View key={catIndex} style={styles.category}>
          <Text style={styles.categoryName}>{cat.category_name}</Text>
          {cat.statements.map((stmt, si) => {
            const selected = cat.selected.includes(stmt);
            return (
              <Pressable
                key={si}
                style={[styles.statementCard, selected && styles.statementCardActive]}
                onPress={() => toggleStatement(catIndex, stmt)}
              >
                <Text style={[styles.statementText, selected && styles.statementTextActive]}>
                  {stmt}
                </Text>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable style={[styles.btn, saving && styles.btnDisabled]} onPress={handleContinue} disabled={saving}>
        <Text style={styles.btnText}>{saving ? 'Saving...' : 'Continue →'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontFamily: 'Orbit_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 24, color: '#fff', marginBottom: 8 },
  subtitle: { fontFamily: 'Orbit_400Regular', fontWeight: '300', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 },
  category: { marginBottom: 32 },
  categoryName: { fontFamily: 'Orbit_400Regular', fontWeight: '600', fontSize: 16, color: '#BFFF00', marginBottom: 12 },
  statementCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statementCardActive: { borderColor: '#BFFF00', backgroundColor: 'rgba(191,255,0,0.08)' },
  statementText: { fontFamily: 'Orbit_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 20 },
  statementTextActive: { color: '#BFFF00' },
  checkmark: { color: '#BFFF00', fontSize: 16, marginLeft: 8, fontWeight: '700' },
  btn: { backgroundColor: '#BFFF00', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 17, color: '#0a0514' },
});
