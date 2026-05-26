import { StyleSheet } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfilePlaceholderCardProps = {
  title: string;
  description: string;
  badge?: string;
};

export function ProfilePlaceholderCard({
  title,
  description,
  badge,
}: ProfilePlaceholderCardProps) {
  return (
    <HackathonGlassCard gradient="subtle" style={styles.card}>
      <AppText variant="bold" style={styles.title}>
        {title}
      </AppText>
      <AppText style={styles.text}>{description}</AppText>
      {badge ? (
        <AppText variant="bold" style={styles.badge}>
          {badge}
        </AppText>
      ) : null}
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Space.sm,
  },
  title: {
    fontSize: 16,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  text: {
    fontSize: 13,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  badge: {
    fontSize: 10,
    color: HACK_COLORS.amber,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: Space.xs,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
