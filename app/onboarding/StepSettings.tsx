import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "../../lib/onboarding";
import {
  DEFAULT_MOBILE_SETTINGS,
  REMINDER_TIME_OPTIONS,
  disablePushNotifications,
  enablePushNotifications,
  isNotificationsAvailable,
} from "../../lib/notifications";
import { GlassCard } from "../../components/Glass/GlassCard";
import { Text as ThemeText, Shadow, Space } from "../../lib/theme";
import type { MobileSettings } from "../../types/onboarding";
const THEMES = [
  { value: "light" as const, label: "☀️ Light" },
  { value: "dark" as const, label: "🌙 Dark" },
];

type Props = { userId: string };

export default function StepSettings({ userId }: Props) {
  const [pushEnabled, setPushEnabled] = useState(
    DEFAULT_MOBILE_SETTINGS.push_enabled,
  );
  const [reminderTime, setReminderTime] = useState(
    DEFAULT_MOBILE_SETTINGS.reminder_time,
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    DEFAULT_MOBILE_SETTINGS.theme,
  );
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    let settings: MobileSettings = {
      push_enabled: pushEnabled,
      reminder_time: reminderTime,
      theme,
    };
    try {
      if (pushEnabled) {
        if (!isNotificationsAvailable()) {
          // Firebase not configured on this device — skip push, continue onboarding
          settings.push_enabled = false;
          Alert.alert(
            "Notifications Unavailable",
            "Push notifications are not available on this device. You can enable them later in Settings.",
          );
        } else {
          const result = await enablePushNotifications(userId, settings);
          settings = result.settings;

          if (!result.granted) {
            Alert.alert(
              "Notifications Disabled",
              "Please enable notifications in your device settings if you want reminder nudges later.",
            );
          }
        }
      } else {
        settings = await disablePushNotifications(userId, settings);
      }

      await completeOnboarding(userId, settings);
      router.replace("/(tabs)/discover");
    } catch (error) {
      // Guard against any unexpected notification errors (e.g. Firebase not initialized)
      console.warn("Onboarding settings error:", error);
      settings.push_enabled = false;
      await completeOnboarding(userId, settings);
      router.replace("/(tabs)/discover");
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = (enabled: boolean) => {
    setPushEnabled(enabled);
  };

  const handleTimeChange = (time: string) => {
    setReminderTime(time);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <GlassCard variant="master" size="large">
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Set up your preferences</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Daily reminders</Text>
            <Text style={styles.labelSub}>
              We&apos;ll nudge you to do your daily task
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handlePushToggle}
            trackColor={{ false: ThemeText.muted, true: "rgba(0, 230, 118, 0.4)" }}
            thumbColor={pushEnabled ? "#00E676" : "#fff"}
          />
        </View>

        {pushEnabled && (
          <>
            <Text style={styles.label}>Reminder time</Text>
            <View style={styles.chipRow}>
              {REMINDER_TIME_OPTIONS.map((h) => (
                <Pressable
                  key={h.value}
                  style={[
                    styles.chip,
                    reminderTime === h.value && styles.chipActive,
                  ]}
                  onPress={() => handleTimeChange(h.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reminderTime === h.value && styles.chipTextActive,
                    ]}
                  >
                    {h.label}
                  </Text>
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
              <Text
                style={[
                  styles.chipText,
                  theme === t.value && styles.chipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={saving}
        >
          <Text style={styles.btnText}>
            {saving ? "Setting up..." : "Let's go 🌱"}
          </Text>
        </Pressable>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: Space["2xl"] },
  title: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    fontSize: 26,
    color: ThemeText.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "300",
    fontSize: 15,
    color: ThemeText.secondary,
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  label: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    fontSize: 14,
    color: ThemeText.primary,
    marginBottom: 12,
  },
  labelSub: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 12,
    color: ThemeText.tertiary,
    marginTop: 2,
  },
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
    borderColor: "rgba(139, 92, 246, 0.16)",
    backgroundColor: "rgba(139, 92, 246, 0.05)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: ThemeText.secondary,
  },
  chipTextActive: { color: "#0a0514" },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    ...Shadow.ctaGlow,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
