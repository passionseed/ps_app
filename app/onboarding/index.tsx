import React, { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../../components/AppText";
import {
  Button,
  Card,
  ErrorMessage,
  styles,
} from "../../components/shift/CampUI";
import { completeOnboarding } from "../../lib/onboarding";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function Welcome() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<"en" | "th">(
    Intl.DateTimeFormat().resolvedOptions().locale.startsWith("th")
      ? "th"
      : "en",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const finish = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ preferred_language: language })
        .eq("id", user.id)
        .select("id")
        .single();
      if (profileError) throw profileError;
      await completeOnboarding(user.id, {
        push_enabled: false,
        reminder_time: "09:00",
        theme: "light",
      });
      router.replace("/(tabs)/discover");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text variant="bold" style={styles.title}>
        {t("Start with curiosity", "เริ่มจากความอยากลอง")}
      </Text>
      <Card>
        <Text style={styles.body}>
          {t(
            "You do not need to know your future yet. Try something small, learn from it, and find people to grow with.",
            "ยังไม่ต้องรู้อนาคตของตัวเอง ลองสิ่งเล็กๆ เรียนรู้จากมัน และพบเพื่อนที่เติบโตไปด้วยกัน",
          )}
        </Text>
        <View style={styles.wrap}>
          <Button
            secondary
            selected={language === "en"}
            label="English"
            onPress={() => setLanguage("en")}
          />
          <Button
            secondary
            selected={language === "th"}
            label="ภาษาไทย"
            onPress={() => setLanguage("th")}
          />
        </View>
        <Text style={styles.body}>
          {t(
            "Enrolled in SHIFT? Staff will connect your account to your camp. Your project and peer group will appear when you sign in.",
            "สมัคร SHIFT แล้ว? ทีมงานจะเชื่อมบัญชีกับค่าย โปรเจกต์และกลุ่มเพื่อนจะปรากฏเมื่อลงชื่อเข้าใช้",
          )}
        </Text>
        <ErrorMessage message={error} />
        <Button
          disabled={busy || !user}
          label={
            busy
              ? t("Saving…", "กำลังบันทึก…")
              : t("Explore something", "ลองดูสิ่งที่สนใจ")
          }
          onPress={finish}
        />
        <Button
          secondary
          label={t("See SHIFT camps", "ดูค่าย SHIFT")}
          onPress={() => {
            void Linking.openURL("https://passionseed.org/shift").catch(() =>
              setError(
                t("Could not open the camp page.", "เปิดหน้าค่ายไม่ได้"),
              ),
            );
          }}
        />
      </Card>
    </ScrollView>
  );
}
