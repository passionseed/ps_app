import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Animated,
  Alert,
} from "react-native";
import { AppText as Text } from "../components/AppText";
import { PathLabSkiaLoader } from "../components/PathLabSkiaLoader";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/onboarding";
import type { Profile, MobileSettings } from "../types/onboarding";
import {
  DEFAULT_MOBILE_SETTINGS,
  REMINDER_TIME_OPTIONS,
  disablePushNotifications,
  enablePushNotifications,
  saveNotificationSettings,
} from "../lib/notifications";
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
    reminderHelp: isThai
      ? "เลือกเวลาที่อยากให้เตือนทุกวัน"
      : "Choose when daily reminders should appear",
    disabledHelp: isThai
      ? "ปิดการแจ้งเตือนทั้งหมดได้ทุกเมื่อ"
      : "You can unsubscribe from all push reminders here",
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

  const updateNotificationProfile = (
    nextSettings: MobileSettings,
    expoPushToken: string | null = profile?.expo_push_token ?? null,
  ) => {
    if (!profile) return;
    setProfile({
      ...profile,
      mobile_settings: nextSettings,
      expo_push_token: expoPushToken,
    });
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!user?.id || !profile) return;

    setSaving(true);
    try {
      const currentSettings = profile.mobile_settings || DEFAULT_MOBILE_SETTINGS;

      if (enabled) {
        const result = await enablePushNotifications(user.id, {
          ...currentSettings,
          push_enabled: true,
        });
        updateNotificationProfile(result.settings, result.expoPushToken);

        if (!result.granted) {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings if you want reminder nudges later.",
          );
        }
        return;
      }

      const disabledSettings = await disablePushNotifications(user.id, currentSettings);
      updateNotificationProfile(disabledSettings, null);
    } finally {
      setSaving(false);
    }
  };

  const handleReminderTimeChange = async (reminderTime: string) => {
    if (!user?.id || !profile) return;

    setSaving(true);
    try {
      const currentSettings = profile.mobile_settings || DEFAULT_MOBILE_SETTINGS;
      const newSettings = await saveNotificationSettings(user.id, {
        ...currentSettings,
        reminder_time: reminderTime,
      }, profile.expo_push_token ?? null);
      updateNotificationProfile(newSettings);
    } finally {
      setSaving(false);
    }
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

  const settings = profile?.mobile_settings || DEFAULT_MOBILE_SETTINGS;

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
          <PathLabSkiaLoader size="tiny" />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingSection}>
            <PathLabSkiaLoader size="small" />
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
                    onValueChange={handlePushToggle}
                    trackColor={{
                      false: ThemeText.muted,
                      true: "rgba(0, 230, 118, 0.4)", // green with opacity
                    }}
                    thumbColor={settings.push_enabled ? "#00E676" : "#fff"}
                  />
                </View>
                <View style={styles.optionDivider} />
                <View style={styles.optionStack}>
                  <View style={styles.optionRowStatic}>
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionText}>{copy.reminder}</Text>
                      <Text style={styles.optionHint}>{copy.reminderHelp}</Text>
                    </View>
                    <Text style={styles.optionValue}>
                      {settings.reminder_time}
                    </Text>
                  </View>
                  <View style={styles.chipRow}>
                    {REMINDER_TIME_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => handleReminderTimeChange(option.value)}
                        disabled={!settings.push_enabled || saving}
                        style={[
                          styles.reminderChip,
                          settings.reminder_time === option.value &&
                            styles.reminderChipActive,
                          !settings.push_enabled && styles.reminderChipDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reminderChipText,
                            settings.reminder_time === option.value &&
                              styles.reminderChipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.sectionNote}>{copy.disabledHelp}</Text>
                </View>
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
  optionRowStatic: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Space.md,
  },
  optionRowSelected: {
    backgroundColor: "rgba(0, 230, 118, 0.08)", // subtle green
  },
  optionStack: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    gap: Space.md,
  },
  optionCopy: {
    flex: 1,
    gap: Space.xs,
  },
  optionText: {
    fontSize: 15,
    color: ThemeText.primary,
    fontWeight: "500",
  },
  optionHint: {
    fontSize: 13,
    color: ThemeText.tertiary,
    lineHeight: 18,
  },
  optionValue: {
    fontSize: 15,
    color: ThemeText.secondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  reminderChip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.16)",
    backgroundColor: "rgba(139, 92, 246, 0.05)",
  },
  reminderChipActive: {
    borderColor: "#00E676",
    backgroundColor: "rgba(0, 230, 118, 0.14)",
  },
  reminderChipDisabled: {
    opacity: 0.45,
  },
  reminderChipText: {
    fontSize: 14,
    color: ThemeText.secondary,
    fontWeight: "600",
  },
  reminderChipTextActive: {
    color: ThemeText.primary,
  },
  sectionNote: {
    fontSize: 12,
    color: ThemeText.tertiary,
    lineHeight: 18,
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
