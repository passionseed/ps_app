import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Radius, Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

export function ProfileAdminCard() {
  return (
    <HackathonGlassCard gradient="admin" style={styles.card}>
      <AppText variant="bold" style={styles.title}>
        Hackathon Admin
      </AppText>
      <AppText style={styles.text}>
        Review app stats, activity submissions, and team progress.
      </AppText>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/admin/hackathon" as never)}
      >
        <AppText variant="bold" style={styles.btnText}>
          Open Dashboard
        </AppText>
      </Pressable>
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Space.sm,
  },
  title: {
    fontSize: 17,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    color: HACK_ALPHA.white75,
    fontFamily: "BaiJamjuree_400Regular",
  },
  btn: {
    backgroundColor: "rgba(101,171,252,0.18)",
    borderWidth: 1,
    borderColor: "rgba(101,171,252,0.4)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Space.xs,
  },
  btnText: {
    color: HACK_COLORS.cyan,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
