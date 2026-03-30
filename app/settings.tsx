import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/onboarding";
import type { Profile, MobileSettings } from "../types/onboarding";
import { GlassCard } from "../components/Glass";
import {
  PageBg,
  Text as ThemeText,
  Accent,
  Radius,
  Shadow,
  Space,
  glassCard,
} from "../lib/theme";
import * as Sentry from "@sentry/react-native";

export default function SettingsScreen() {
  const { setUserLanguage, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      setLoading(true);
      const profileData = await getProfile(user.id);
      setProfile(profileData);
      setLoading(false);
    };

    loadProfile();
  }, [user?.id]);

  const updateSetting = async <K extends keyof MobileSettings>(
    key: K,
    value: MobileSettings[K]
  ) => {
    if (!user?.id || !profile) return;

    setSaving(true);
    const currentSettings = profile.mobile_settings || {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "light",
    };

    const newSettings: MobileSettings = {
      ...currentSettings,
      [key]: value,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ mobile_settings: newSettings })
      .eq("id", user.id);

    if (!error) {
      setProfile({ ...profile, mobile_settings: newSettings });
    }
    setSaving(false);
  };

  const updateLanguage = async (lang: "en" | "th") => {
    if (!user?.id || !profile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: lang })
      .eq("id", user.id);

    if (!error) {
      setProfile({ ...profile, preferred_language: lang });
      setUserLanguage(lang);
    }
    setSaving(false);
  };

  const settings = profile?.mobile_settings || {
    push_enabled: true,
    reminder_time: "09:00",
    theme: "light",
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        {saving && (
          <ActivityIndicator
            size="small"
            color={Accent.yellow}
            style={styles.savingIndicator}
          />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator color={Accent.yellow} />
          </View>
        ) : (
          <>
            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Language</Text>
              <GlassCard variant="neutral" size="small" noPadding>
                <Pressable
                  style={[
                    styles.optionRow,
                    profile?.preferred_language === "en" &&
                      styles.optionRowSelected,
                  ]}
                  onPress={() => updateLanguage("en")}
                >
                  <Text style={styles.optionText}>English</Text>
                  {profile?.preferred_language === "en" && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable
                  style={[
                    styles.optionRow,
                    profile?.preferred_language === "th" &&
                      styles.optionRowSelected,
                  ]}
                  onPress={() => updateLanguage("th")}
                >
                  <Text style={styles.optionText}>ไทย (Thai)</Text>
                  {profile?.preferred_language === "th" && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              </GlassCard>
            </View>

            {/* Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <GlassCard variant="neutral" size="small" noPadding>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Push Notifications</Text>
                  <Switch
                    value={settings.push_enabled}
                    onValueChange={(value) =>
                      updateSetting("push_enabled", value)
                    }
                    trackColor={{
                      false: ThemeText.muted,
                      true: Accent.yellowLight,
                    }}
                    thumbColor={settings.push_enabled ? Accent.yellow : "#fff"}
                  />
                </View>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow}>
                  <Text style={styles.optionText}>Reminder Time</Text>
                  <Text style={styles.optionValue}>
                    {settings.reminder_time}
                  </Text>
                </Pressable>
              </GlassCard>
            </View>

            {/* Appearance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Appearance</Text>
              <GlassCard variant="neutral" size="small" noPadding>
                <Pressable
                  style={[
                    styles.optionRow,
                    settings.theme === "light" && styles.optionRowSelected,
                  ]}
                  onPress={() => updateSetting("theme", "light")}
                >
                  <Text style={styles.optionText}>Light</Text>
                  {settings.theme === "light" && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable
                  style={[
                    styles.optionRow,
                    settings.theme === "dark" && styles.optionRowSelected,
                  ]}
                  onPress={() => updateSetting("theme", "dark")}
                >
                  <Text style={styles.optionText}>Dark</Text>
                  {settings.theme === "dark" && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              </GlassCard>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <GlassCard variant="neutral" size="small" noPadding>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Version</Text>
                  <Text style={styles.optionValue}>1.0.0</Text>
                </View>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow}>
                  <Text style={styles.optionText}>Privacy Policy</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow}>
                  <Text style={styles.optionText}>Terms of Service</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </GlassCard>
            </View>

            {/* Developer */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer</Text>
              <GlassCard variant="neutral" size="small" noPadding>
                <Pressable
                  style={styles.optionRow}
                  onPress={() =>
                    Sentry.captureException(new Error("First error"))
                  }
                >
                  <Text style={styles.optionText}>Test Sentry</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </GlassCard>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  header: {
    paddingTop: Space["3xl"],
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  backBtn: {
    paddingRight: Space.lg,
    paddingVertical: Space.sm,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.secondary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: ThemeText.primary,
    flex: 1,
  },
  savingIndicator: {
    marginLeft: Space.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space["2xl"],
    gap: Space["3xl"],
  },
  loadingSection: {
    paddingVertical: Space["5xl"],
    alignItems: "center",
  },
  section: {
    gap: Space.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: Space.xs,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
  },
  optionRowSelected: {
    backgroundColor: Accent.yellowLight,
  },
  optionText: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.primary,
    fontWeight: "500",
  },
  optionValue: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.secondary,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "700",
    color: Accent.yellow,
  },
  chevron: {
    fontSize: 20,
    color: ThemeText.tertiary,
    fontWeight: "300",
  },
  optionDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    marginHorizontal: Space.xl,
  },
});
