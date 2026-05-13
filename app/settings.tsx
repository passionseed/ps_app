import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Animated,
  Alert,
  TextInput,
  Modal,
  Linking,
  Platform,
  ActivityIndicator,
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
  isNotificationsAvailable,
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

declare const __DEV__: boolean;

type DevUserData = {
  loaded_at: string;
  auth_user: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  onboarding_state: Record<string, unknown> | null;
  user_interests: unknown[];
  career_goals: unknown[];
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setUserLanguage, user, appLanguage, signOut, isHackathon, signOutHackathon, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDevUserDataModal, setShowDevUserDataModal] = useState(false);
  const [devUserData, setDevUserData] = useState<DevUserData | null>(null);
  const [devUserDataError, setDevUserDataError] = useState<string | null>(null);
  const [devUserDataLoading, setDevUserDataLoading] = useState(false);

  const isDev = typeof __DEV__ !== "undefined" && __DEV__;
  const isThai = appLanguage === "th";
  const copy = {
    back: isThai ? "กลับ" : "Back",
    settings: isThai ? "ตั้งค่า" : "Settings",
    logout: isThai ? "ออกจากระบบ" : "Log Out",
    logoutConfirm: isThai ? "คุณต้องการออกจากระบบหรือไม่?" : "Are you sure you want to log out?",
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
    contactSupport: isThai ? "ติดต่อฝ่ายสนับสนุน" : "Contact Support",
    contactSupportDesc: isThai
      ? "ส่งอีเมลถึงทีมงานของเรา"
      : "Send an email to our team",
    deleteAccount: isThai ? "ลบบัญชี" : "Delete Account",
    deleteAccountDesc: isThai
      ? "ลบบัญชีและข้อมูลทั้งหมดถาวร"
      : "Permanently delete your account and all data",
    deleteAccountWarning: isThai
      ? "การลบบัญชีนี้ไม่สามารถเลิกทำได้ ข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวรรวมถึงโปรไฟล์ การลงทะเบียน และการสะท้อนคิด"
      : "Deleting your account cannot be undone. All your data will be permanently deleted including your profile, enrollments, and reflections.",
    deleteConfirmPrompt: isThai
      ? "พิมพ์ DELETE เพื่อยืนยัน"
      : "Type DELETE to confirm",
    cancel: isThai ? "ยกเลิก" : "Cancel",
    delete: isThai ? "ลบบัญชี" : "Delete Account",
    account: isThai ? "บัญชี" : "Account",
    developer: isThai ? "นักพัฒนา" : "Developer",
    showUserData: isThai ? "แสดงข้อมูลผู้ใช้" : "Show User Data",
    userDataDebug: isThai ? "ข้อมูลผู้ใช้สำหรับดีบัก" : "User Data Debug",
    close: isThai ? "ปิด" : "Close",
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Missing Supabase configuration");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": publishableKey,
        },
        body: JSON.stringify({
          userId: user.id,
          confirmDelete: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete account");
      }

      setShowDeleteModal(false);
      Alert.alert(
        isThai ? "บัญชีถูกลบแล้ว" : "Account Deleted",
        isThai
          ? "ข้อมูลบัญชีของคุณถูกลบอย่างถาวรแล้ว"
          : "Your account has been permanently deleted.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (error) {
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        error instanceof Error ? error.message : (isThai ? "ไม่สามารถลบบัญชีได้" : "Could not delete account")
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleContactSupport = () => {
    const email = "support@passionseed.org";
    const subject = isThai ? "คำขอสนับสนุนจากแอป Passion Seed" : "Support Request from Passion Seed App";
    const body = isThai
      ? `\n\n---\nรายละเอียดอุปกรณ์:\nอุปกรณ์: ${Platform.OS}\nเวอร์ชันแอป: ${Constants.expoConfig?.version || "Unknown"}`
      : `\n\n---\nDevice Info:\nPlatform: ${Platform.OS}\nApp Version: ${Constants.expoConfig?.version || "Unknown"}`;

    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleShowDevUserData = async () => {
    if (!isDev || !user?.id) return;

    setShowDevUserDataModal(true);
    setDevUserDataLoading(true);
    setDevUserDataError(null);

    try {
      const [
        profileResult,
        onboardingStateResult,
        interestsResult,
        careerGoalsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("onboarding_state").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_interests").select("*").eq("user_id", user.id),
        supabase.from("career_goals").select("*").eq("user_id", user.id),
      ]);

      const firstError =
        profileResult.error ||
        onboardingStateResult.error ||
        interestsResult.error ||
        careerGoalsResult.error;

      if (firstError) {
        throw firstError;
      }

      const authUser = user as unknown as Record<string, unknown>;

      setDevUserData({
        loaded_at: new Date().toISOString(),
        auth_user: {
          id: user.id,
          email: authUser.email,
          phone: authUser.phone,
          role: authUser.role,
          aud: authUser.aud,
          app_metadata: authUser.app_metadata,
          user_metadata: authUser.user_metadata,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
          confirmed_at: authUser.confirmed_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          identities: authUser.identities,
        },
        profile: (profileResult.data as Record<string, unknown> | null) ?? null,
        onboarding_state: (onboardingStateResult.data as Record<string, unknown> | null) ?? null,
        user_interests: interestsResult.data ?? [],
        career_goals: careerGoalsResult.data ?? [],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string"
            ? (error as { message: string }).message
            : typeof error === "object" && error !== null
              ? JSON.stringify(error)
              : String(error);

      setDevUserDataError(errorMessage);
      setDevUserData(null);
    } finally {
      setDevUserDataLoading(false);
    }
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
        if (!isNotificationsAvailable()) {
          // Firebase not configured on this device — cannot enable push
          Alert.alert(
            "Notifications Unavailable",
            "Push notifications are not available on this device. Make sure Firebase is configured correctly.",
          );
          return;
        }

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
    } catch (error) {
      // Guard against unexpected notification/Firebase errors
      console.warn("Push toggle error:", error);
      Alert.alert(
        "Error",
        "Could not update notification settings. Please try again later.",
      );
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

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{copy.deleteAccount}</Text>
            <Text style={styles.modalWarning}>{copy.deleteAccountWarning}</Text>
            <Text style={styles.modalPrompt}>{copy.deleteConfirmPrompt}</Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>{copy.cancel}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDeleteBtn,
                  deleteConfirmText !== "DELETE" && styles.modalDeleteBtnDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>{copy.delete}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {isDev && (
        <Modal
          visible={showDevUserDataModal}
          animationType="slide"
          onRequestClose={() => setShowDevUserDataModal(false)}
        >
          <View style={[styles.devModalContainer, { paddingTop: insets.top + Space.lg }]}>
            <View style={styles.devModalHeader}>
              <View>
                <Text style={styles.devEyebrow}>DEV ONLY</Text>
                <Text style={styles.devModalTitle}>{copy.userDataDebug}</Text>
              </View>
              <Pressable
                style={styles.devCloseButton}
                onPress={() => setShowDevUserDataModal(false)}
              >
                <Text style={styles.devCloseText}>{copy.close}</Text>
              </Pressable>
            </View>

            {devUserDataLoading ? (
              <View style={styles.devLoading}>
                <ActivityIndicator color="#8B5CF6" />
                <Text style={styles.devHint}>Loading user data...</Text>
              </View>
            ) : devUserDataError ? (
              <Text style={styles.devError}>{devUserDataError}</Text>
            ) : (
              <ScrollView
                style={styles.devJsonScroll}
                contentContainerStyle={styles.devJsonContent}
              >
                <Text selectable style={styles.devJsonText}>
                  {JSON.stringify(devUserData, null, 2)}
                </Text>
              </ScrollView>
            )}
          </View>
        </Modal>
      )}

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

            {isDev && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{copy.developer}</Text>
                <View style={styles.card}>
                  <Pressable
                    style={styles.optionRow}
                    onPress={handleShowDevUserData}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionText}>{copy.showUserData}</Text>
                      <Text style={styles.optionHint}>
                        profiles.*, onboarding_state, interests, career goals
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.account}</Text>
              <View style={styles.card}>
                <Pressable
                  style={styles.optionRow}
                  onPress={handleContactSupport}
                >
                  <Text style={styles.optionText}>{copy.contactSupport}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable
                  style={styles.logoutRow}
                  onPress={() => {
                    Alert.alert(
                      copy.logout,
                      copy.logoutConfirm,
                      [
                        { text: isThai ? "ยกเลิก" : "Cancel", style: "cancel" },
                        {
                          text: copy.logout,
                          style: "destructive",
                          onPress: async () => {
                            if (isHackathon) {
                              await signOutHackathon();
                            } else {
                              await signOut();
                            }
                            router.replace("/");
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.logoutText}>{copy.logout}</Text>
                </Pressable>
                <View style={styles.optionDivider} />
                <Pressable
                  style={styles.deleteRow}
                  onPress={() => {
                    setDeleteConfirmText("");
                    setShowDeleteModal(true);
                  }}
                >
                  <Text style={styles.deleteText}>{copy.deleteAccount}</Text>
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
  logoutRow: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 15,
    color: "#EF4444",
    fontWeight: "600",
  },
  deleteRow: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  deleteText: {
    fontSize: 15,
    color: "#DC2626",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Space.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    padding: Space.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: Space.md,
    textAlign: "center",
  },
  modalWarning: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: Space.lg,
    textAlign: "center",
  },
  modalPrompt: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: Space.sm,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    fontSize: 16,
    color: "#111827",
    marginBottom: Space.xl,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Space.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Space.md,
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: Space.md,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: "#DC2626",
  },
  modalDeleteBtnDisabled: {
    backgroundColor: "#FCA5A5",
  },
  modalDeleteText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  devModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: Space.lg,
  },
  devModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
    paddingBottom: Space.md,
  },
  devEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B5CF6",
    letterSpacing: 1,
  },
  devModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  devCloseButton: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  devCloseText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  devLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Space.md,
  },
  devHint: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  devError: {
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#FECACA",
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
    padding: Space.lg,
  },
  devJsonScroll: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: Space.lg,
  },
  devJsonContent: {
    padding: Space.md,
  },
  devJsonText: {
    color: "#D1FAE5",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
});
