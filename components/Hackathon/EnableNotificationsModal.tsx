import React, { useState } from "react";
import { Modal, View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";

const WHITE = "#FFFFFF";
const WHITE40 = "rgba(255,255,255,0.4)";
const WHITE70 = "rgba(255,255,255,0.7)";
const CYAN = "#91C4E3";

type Props = {
  visible: boolean;
  onEnable: () => Promise<void>;
  onDismiss: () => void;
};

export function EnableNotificationsModal({ visible, onEnable, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      await onEnable();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <AppText style={styles.emoji}>🔔</AppText>
          <AppText variant="bold" style={styles.title}>
            เปิดการแจ้งเตือน
          </AppText>
          <AppText style={styles.body}>
            รับแจ้งเตือนเมื่อมีข้อความจาก Mentor, คะแนนทีม, และกิจกรรมใหม่
          </AppText>

          <Pressable
            style={styles.enableBtn}
            onPress={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#03050a" size="small" />
            ) : (
              <AppText variant="bold" style={styles.enableText}>
                เปิดการแจ้งเตือน
              </AppText>
            )}
          </Pressable>

          <Pressable onPress={onDismiss} disabled={loading} style={styles.skipBtn}>
            <AppText style={styles.skipText}>ไว้ทีหลัง</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Space.xl,
  },
  card: {
    backgroundColor: "#1A2332",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.15)",
    padding: Space["2xl"],
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    gap: Space.sm,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 20,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: WHITE70,
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  enableBtn: {
    backgroundColor: CYAN,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginTop: Space.md,
  },
  enableText: {
    fontSize: 15,
    color: "#03050a",
    fontFamily: "BaiJamjuree_700Bold",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: WHITE40,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
