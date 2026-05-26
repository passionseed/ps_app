import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfilePushBannerProps = {
  enabling: boolean;
  onEnable: () => void;
};

export function ProfilePushBanner({ enabling, onEnable }: ProfilePushBannerProps) {
  return (
    <HackathonGlassCard
      active
      disabled={enabling}
      gradient="subtle"
      innerStyle={styles.inner}
      onPress={onEnable}
      style={styles.wrapper}
    >
      <View style={styles.content}>
        <AppText style={styles.icon}>🔔</AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="bold" style={styles.title}>
            Enable Notifications
          </AppText>
          <AppText style={styles.text}>
            Get updates from your team and mentors
          </AppText>
        </View>
        {enabling ? (
          <ActivityIndicator color={HACK_COLORS.amber} size="small" />
        ) : (
          <AppText variant="bold" style={styles.action}>
            ENABLE
          </AppText>
        )}
      </View>
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Space.sm,
  },
  inner: {
    borderColor: HACK_ALPHA.amberBorder,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  icon: { fontSize: 24 },
  title: {
    fontSize: 14,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  text: {
    fontSize: 12,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  action: {
    fontSize: 11,
    color: HACK_COLORS.amber,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
  },
});
