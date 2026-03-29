import { StyleSheet } from "react-native";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";

export function ResponsibilityBanner({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <GlassCard variant="destination" style={styles.card}>
      <AppText variant="bold" style={styles.kicker}>
        Responsibility
      </AppText>
      <AppText variant="bold" style={styles.label}>
        {label}
      </AppText>
      <AppText style={styles.detail}>{detail}</AppText>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 0.8,
    opacity: 0.75,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 18,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.86,
  },
});
