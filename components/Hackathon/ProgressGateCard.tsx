import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../AppText";
import { Radius, Space } from "../../lib/theme";

const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";

const STATUS_COLORS: Record<string, string> = {
  passed: "#10B981",
  ready: "#10B981",
  revise: "#F59E0B",
  blocked: "rgba(255,255,255,0.4)",
};

export function ProgressGateCard({
  title,
  body,
  status,
}: {
  title: string;
  body: string;
  status: string;
}) {
  const statusColor = STATUS_COLORS[status] ?? CYAN;

  return (
    <View style={styles.card}>
      <LinearGradient colors={["#01040A", "#030B17"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <AppText variant="bold" style={styles.title}>
          {title}
        </AppText>
        <View style={[styles.statusPill, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}10` }]}>
          <AppText variant="bold" style={[styles.statusText, { color: statusColor }]}>
            {status}
          </AppText>
        </View>
      </View>
      <AppText style={styles.body}>{body}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    padding: Space.lg,
    gap: Space.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    color: WHITE,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: WHITE75,
  },
});
