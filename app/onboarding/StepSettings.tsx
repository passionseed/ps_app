import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch
} from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "../../lib/onboarding";
import type { MobileSettings } from "../../types/onboarding";

const REMINDER_TIMES = ['07:00', '09:00', '12:00', '18:00', '21:00'];
const THEMES = [
  { value: 'light' as const, label: '☀️ Light' },
  { value: 'dark' as const, label: '🌙 Dark' },
];

type Props = { userId: string };

export default function StepSettings({ userId }: Props) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    const settings: MobileSettings = {
      push_enabled: pushEnabled,
      reminder_time: reminderTime,
      theme,
    };
    await completeOnboarding(userId, settings);
    router.replace('/(tabs)/discover');
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Set up your preferences</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Daily reminders</Text>
            <Text style={styles.labelSub}>We'll nudge you to do your daily task</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#BFFF00' }}
            thumbColor="#fff"
          />
        </View>

        {pushEnabled && (
          <>
            <Text style={styles.label}>Reminder time</Text>
            <View style={styles.chipRow}>
              {REMINDER_TIMES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, reminderTime === t && styles.chipActive]}
                  onPress={() => setReminderTime(t)}
                >
                  <Text style={[styles.chipText, reminderTime === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Theme</Text>
        <View style={styles.chipRow}>
          {THEMES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.chip, theme === t.value && styles.chipActive]}
              onPress={() => setTheme(t.value)}
            >
              <Text style={[styles.chipText, theme === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.btn, saving && styles.btnDisabled]} onPress={handleFinish} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Setting up...' : "Let's go 🌱"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 26, color: '#fff', marginBottom: 8 },
  subtitle: { fontFamily: 'Orbit_400Regular', fontWeight: '300', fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  label: { fontFamily: 'Orbit_400Regular', fontWeight: '600', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  labelSub: { fontFamily: 'Orbit_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: '#BFFF00', borderColor: '#BFFF00' },
  chipText: { fontFamily: 'Orbit_400Regular', fontWeight: '500', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  chipTextActive: { color: '#0a0514' },
  btn: { backgroundColor: '#BFFF00', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Orbit_400Regular', fontWeight: '700', fontSize: 17, color: '#0a0514' },
});
