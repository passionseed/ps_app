import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Radius, Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileHeroCardProps = {
  name: string;
  email: string;
  university: string;
  role: string;
  teamEmoji: string | null;
  emojiRollCount: number;
  rollingEmoji: boolean;
  canRoll: boolean;
  onRollEmoji: () => void;
};

export function ProfileHeroCard({
  name,
  email,
  university,
  role,
  teamEmoji,
  emojiRollCount,
  rollingEmoji,
  canRoll,
  onRollEmoji,
}: ProfileHeroCardProps) {
  const meta = [university !== "—" ? university : null, role !== "—" ? role : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <HackathonGlassCard compact gradient="default">
      <AppText variant="bold" style={styles.eyebrow}>
        YOUR PROFILE
      </AppText>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarEmoji}>{teamEmoji ?? "👤"}</AppText>
        </View>
        <View style={styles.info}>
          <AppText variant="bold" style={styles.name} numberOfLines={1}>
            {name}
          </AppText>
          {meta ? (
            <AppText style={styles.meta} numberOfLines={1}>
              {meta}
            </AppText>
          ) : null}
          <AppText style={styles.email} numberOfLines={1}>
            {email}
          </AppText>
          {emojiRollCount > 0 ? (
            <AppText style={styles.rollHint}>Emoji rolled {emojiRollCount}×</AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Roll profile emoji"
          style={({ pressed }) => [
            styles.diceBtn,
            pressed && { opacity: 0.7 },
            rollingEmoji && { opacity: 0.5 },
          ]}
          onPress={onRollEmoji}
          disabled={rollingEmoji || !canRoll}
        >
          {rollingEmoji ? (
            <ActivityIndicator color={HACK_COLORS.white} size="small" />
          ) : (
            <AppText style={styles.diceText}>🎲</AppText>
          )}
        </Pressable>
      </View>
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    color: "rgba(145,196,227,0.55)",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(145,196,227,0.12)",
    borderWidth: 1,
    borderColor: HACK_ALPHA.cyanBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 20,
    lineHeight: 24,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  meta: {
    fontSize: 12,
    color: HACK_COLORS.cyan,
    fontFamily: "BaiJamjuree_500Medium",
  },
  email: {
    fontSize: 12,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  rollHint: {
    fontSize: 10,
    color: HACK_ALPHA.white35,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: 2,
  },
  diceBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  diceText: {
    fontSize: 20,
  },
});
