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

export default function SettingsScreen() {
  const { user } = useAuth();
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
    value: MobileSettings[K],
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
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        {saving && (
          <ActivityIndicator
            size="small"
            color="#BFFF00"
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
            <ActivityIndicator color="#BFFF00" />
          </View>
        ) : (
          <>
            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Language</Text>
              <View style={styles.optionsCard}>
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
              </View>
            </View>

            {/* Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <View style={styles.optionsCard}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Push Notifications</Text>
                  <Switch
                    value={settings.push_enabled}
                    onValueChange={(value) =>
                      updateSetting("push_enabled", value)
                    }
                    trackColor={{ false: "#ddd", true: "#BFFF00" }}
                    thumbColor={settings.push_enabled ? "#111" : "#fff"}
                  />
                </View>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow}>
                  <Text style={styles.optionText}>Reminder Time</Text>
                  <Text style={styles.optionValue}>
                    {settings.reminder_time}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Appearance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Appearance</Text>
              <View style={styles.optionsCard}>
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
              </View>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.optionsCard}>
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
              </View>
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
    backgroundColor: "#FDFFF5",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  savingIndicator: {
    marginLeft: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  loadingSection: {
    paddingVertical: 40,
    alignItems: "center",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  optionsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionRowSelected: {
    backgroundColor: "#f0f8e8",
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  optionValue: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "600",
    color: "#BFFF00",
  },
  chevron: {
    fontSize: 18,
    color: "#999",
  },
  optionDivider: {
    height: 1,
    backgroundColor: "#f5f5f5",
    marginHorizontal: 16,
  },
});
