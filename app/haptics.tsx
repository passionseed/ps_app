import { useCallback, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText } from "../components/AppText";

type HapticAction = {
  title: string;
  emoji: string;
  detail: string;
  run: () => Promise<void>;
};

const notificationActions: HapticAction[] = [
  {
    title: "Success",
    emoji: "✅",
    detail: "แจ้งผลลัพธ์แบบสำเร็จ",
    run: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  },
  {
    title: "Error",
    emoji: "⚠️",
    detail: "แจ้งข้อผิดพลาด",
    run: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  },
  {
    title: "Warning",
    emoji: "⚠️",
    detail: "แจ้งเตือนแบบนุ่ม",
    run: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
];

const impactActions: HapticAction[] = [
  {
    title: "Light",
    emoji: "🌬️",
    detail: "สัมผัสเบา",
    run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  },
  {
    title: "Medium",
    emoji: "🫶",
    detail: "แรงสมดุล",
    run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  {
    title: "Heavy",
    emoji: "🚀",
    detail: "แรงชัด",
    run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  },
  {
    title: "Rigid",
    emoji: "⛰️",
    detail: "คมและคมชัด",
    run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  },
  {
    title: "Soft",
    emoji: "🪶",
    detail: "นุ่มและเบา",
    run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  },
];

export default function CoolHaptics() {
  const [lastAction, setLastAction] = useState("ยังไม่เรียกใช้");

  const run = useCallback(async (action: HapticAction) => {
    setLastAction(action.title);
    try {
      await action.run();
    } catch (error) {
      console.error("Haptics error:", error);
    }
  }, []);

  const runSelection = useCallback(async () => {
    setLastAction("Selection");
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error("Haptics error:", error);
    }
  }, []);

  const runPulse = useCallback(async () => {
    setLastAction("Pulse Sequence");
    const styles = [
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Heavy,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Light,
    ];

    try {
      for (const style of styles) {
        await Haptics.impactAsync(style);
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
    } catch (error) {
      console.error("Haptics error:", error);
    }
  }, []);

  return (
    <LinearGradient
      colors={["#0f1224", "#1d2b64", "#5b42f8", "#14f7ff"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>Haptics Lab</AppText>
        <AppText style={styles.subtitle}>เลือกปุ่มเพื่อทดลองฟีลสัมผัส</AppText>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>1) Selection</AppText>
          <AppText style={styles.cardHint}>
            เหมาะกับการเลื่อน หรือเปลี่ยนตัวเลือก
          </AppText>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={runSelection}
          >
              <AppText style={styles.primaryButtonText}>🫶 Selection Tap</AppText>
          </Pressable>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>2) Notification</AppText>
          <AppText style={styles.cardHint}>Success / Error / Warning</AppText>
          <View style={styles.grid}>
            {notificationActions.map((action) => (
              <Pressable
                key={action.title}
                style={({ pressed }) => [
                  styles.pill,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => run(action)}
              >
                <AppText style={styles.pillTitle}>
                  {action.emoji} {action.title}
                </AppText>
                <AppText style={styles.pillDetail}>{action.detail}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>3) Impact</AppText>
          <AppText style={styles.cardHint}>ปรับระดับแรงกระแทกให้ชัดเจนขึ้น</AppText>
          <View style={styles.grid}>
            {impactActions.map((action) => (
              <Pressable
                key={action.title}
                style={({ pressed }) => [
                  styles.pill,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => run(action)}
              >
                <AppText style={styles.pillTitle}>
                  {action.emoji} {action.title}
                </AppText>
                <AppText style={styles.pillDetail}>{action.detail}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>4) Signature Feel</AppText>
          <AppText style={styles.cardHint}>
            ชุดสั่นค่อยๆ ขึ้นลงแบบค่อยเป็นค่อยไป
          </AppText>
          <Pressable
            style={({ pressed }) => [
              styles.sequenceButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={runPulse}
          >
            <AppText style={styles.sequenceText}>✨ Run Vibe Pulse</AppText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <AppText style={styles.footerText}>
            Last action:
            <AppText style={styles.footerStrong}> {lastAction}</AppText>
          </AppText>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 36,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  subtitle: {
    color: "#dbe7ff",
    fontSize: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    gap: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  cardHint: {
    color: "#d0d9ff",
    fontSize: 13,
    marginBottom: 2,
  },
  grid: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  sequenceButton: {
    backgroundColor: "#BFFF00",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  primaryButtonText: {
    color: "#1a124a",
    fontSize: 16,
    fontWeight: "700",
  },
  sequenceText: {
    color: "#0d0f1f",
    fontSize: 16,
    fontWeight: "700",
  },
  pill: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pillTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  pillDetail: {
    color: "#d7def5",
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: 4,
  },
  footerText: {
    color: "rgba(232, 235, 255, 0.86)",
    fontSize: 14,
  },
  footerStrong: {
    color: "#fff",
    fontWeight: "700",
  },
});
