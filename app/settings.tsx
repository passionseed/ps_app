import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Animated,
} from "react-native";
import { AppText as Text } from "../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/onboarding";
import type { Profile, MobileSettings } from "../types/onboarding";
import {
  PageBg,
  Text as ThemeText,
  Accent,
  Radius,
  Shadow,
  Space,
} from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setUserLanguage, user, appLanguage } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isThai = appLanguage === "th";
  const copy = {
    back: isThai ? "กลับ" : "Back",
    settings: isThai ? "ตั้งค่า" : "Settings",
    language: isThai ? "ภาษา" : "Language",
    notifications: isThai ? "การแจ้งเตือน" : "Notifications",
    push: isThai ? "การแจ้งเตือนแบบพุช" : "Push Notifications",
    reminder: isThai ? "เวลาแจ้งเตือน" : "Reminder Time",
    appearance: isThai ? "รูปลักษณ์" : "Appearance",
    light: isThai ? "สว่าง" : "Light",
    dark: isThai ? "มืด" : "Dark",
    about: isThai ? "เกี่ยวกับ" : "About",
    version: isThai ? "เวอร์ชัน" : "Version",
    privacy: isThai ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy",
    tos: isThai ? "ข้อกำหนดการให้บริการ" : "Terms of Service",
  };

  const RadioButton = ({ selected }: { selected: boolean }) => {
    const scale = useRef(new Animated.Value(selected ? 1 : 0)).current;

    useEffect(() => {
      Animated.spring(scale, {
        toValue: selected ? 1 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    }, [selected, scale]);

    return (
      <View style={[styles.radioOutline, selected && styles.radioSelected]}>
        <Animated.View style={[styles.radioInner, { transform: [{ scale }] }]} />
      </View>
    );
  };

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
    <LinearGradient colors={["#FFFFFF", "#F9F5FF", "#F3EAFF"]} style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ {copy.back}</Text>
        </Pressable>
        <Text style={styles.title}>{copy.settings}</Text>
        {saving && (
          <ActivityIndicator
            size="small"
            color="#00E676"
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
            <ActivityIndicator color="#00E676" />
          </View>
        ) : (
          <>
            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.language}</Text>
              <View style={styles.card}>
                <Pressable
                  style={[
                    styles.optionRow,
                    profile?.preferred_language === "en" &&
                      styles.optionRowSelected,
                  ]}
                  onPress={() => updateLanguage("en")}
                >
                  <Text style={styles.optionText}>English</Text>
                  <RadioButton selected={profile?.preferred_language === "en"} />
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
                  <RadioButton selected={profile?.preferred_language === "th"} />
                </Pressable>
              </View>
            </View>

            {/* Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.notifications}</Text>
              <View style={styles.card}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>{copy.push}</Text>
                  <Switch
                    value={settings.push_enabled}
                    onValueChange={(value) =>
                      updateSetting("push_enabled", value)
                    }
                    trackColor={{
                      false: ThemeText.muted,
                      true: "rgba(0, 230, 118, 0.4)", // green with opacity
                    }}
                    thumbColor={settings.push_enabled ? "#00E676" : "#fff"}
                  />
                </View>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow}>
                  <Text style={styles.optionText}>{copy.reminder}</Text>
                  <Text style={styles.optionValue}>
                    {settings.reminder_time}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.about}</Text>
              <View style={styles.card}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>{copy.version}</Text>
                  <Text style={styles.optionValue}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>
                </View>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow} onPress={() => WebBrowser.openBrowserAsync('https://passionseed.org/privacy')}>
                  <Text style={styles.optionText}>{copy.privacy}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable style={styles.optionRow} onPress={() => WebBrowser.openBrowserAsync('https://passionseed.org/tos')}>
                  <Text style={styles.optionText}>{copy.tos}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backBtn: {
    paddingRight: Space.lg,
    paddingVertical: Space.sm,
  },
  backBtnText: {
    fontSize: 16,
    color: ThemeText.secondary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
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
    fontWeight: "700",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: Space.xs,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.12)",
    ...Shadow.neutral,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
  },
  optionRowSelected: {
    backgroundColor: "rgba(0, 230, 118, 0.08)", // subtle green
  },
  optionText: {
    fontSize: 15,
    color: ThemeText.primary,
    fontWeight: "500",
  },
  optionValue: {
    fontSize: 15,
    color: ThemeText.secondary,
  },
  radioOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#00E676",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00E676",
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
