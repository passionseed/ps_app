import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { Space, Radius } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileHeaderProps = {
  name: string;
  teamEmoji: string | null;
  emojiRollCount: number;
  rollingEmoji: boolean;
  canRoll: boolean;
  onRollEmoji: () => void;
};

export function ProfileHeader({
  name,
  teamEmoji,
  emojiRollCount,
  rollingEmoji,
  canRoll,
  onRollEmoji,
}: ProfileHeaderProps) {
  return (
    <>
      <AppText variant="bold" style={styles.eyebrow}>
        YOUR PROFILE
      </AppText>
      <View style={styles.titleRow}>
        {teamEmoji ? (
          <AppText style={styles.titleEmoji}>{teamEmoji}</AppText>
        ) : null}
        <View style={styles.titleTextWrap}>
          <AppText variant="bold" style={styles.title}>
            {name}
          </AppText>
          {emojiRollCount > 0 ? (
            <AppText style={styles.rollCountInline}>
              Rolled {emojiRollCount} times
            </AppText>
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
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    color: HACK_COLORS.cyan,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  titleEmoji: {
    fontSize: 36,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rollCountInline: {
    fontSize: 11,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  diceBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  diceText: {
    fontSize: 24,
    lineHeight: 30,
  },
});
