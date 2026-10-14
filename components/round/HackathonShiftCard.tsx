import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/round/copy";

/**
 * 5.2: hackathon home card. SHIFT uses a Passion Seed account, so this exits hackathon mode
 * and opens the sign-in screen. Styled for the dark hackathon theme.
 */
export function HackathonShiftCard() {
  const { signOutHackathon, appLanguage } = useAuth();
  const lang = appLanguage === "en" ? "en" : "th";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(lang, "ui.hackathon.card")}
      onPress={async () => {
        await signOutHackathon();
        router.replace("/sign-in");
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>{t(lang, "ui.hackathon.card")}</Text>
        <Text style={styles.body}>{t(lang, "signin.hackathon")}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    minHeight: 64,
    backgroundColor: "rgba(241,236,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217,204,255,0.35)",
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: "#FFFFFF", fontSize: 16, fontFamily: "BaiJamjuree_700Bold", lineHeight: 24 },
  body: { color: "#E4DEF7", fontSize: 14, fontFamily: "BaiJamjuree_400Regular", lineHeight: 21 },
});
