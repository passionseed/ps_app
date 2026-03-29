import { StyleSheet, View } from "react-native";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";

export function ProgressGateCard({
  title,
  body,
  status,
}: {
  title: string;
  body: string;
  status: string;
}) {
  return (
    <GlassCard variant="neutral" style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bold" style={styles.title}>
          {title}
        </AppText>
        <View style={styles.statusPill}>
          <AppText variant="bold" style={styles.statusText}>
            {status}
          </AppText>
        </View>
      </View>
      <AppText style={styles.body}>{body}</AppText>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "rgba(191,255,0,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.86,
  },
});
