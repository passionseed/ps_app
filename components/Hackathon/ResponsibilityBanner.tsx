import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../AppText";
import { Radius, Space } from "../../lib/theme";

const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";

export function ResponsibilityBanner({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={["#01040A", "#030B17"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowLeft} pointerEvents="none" />
      <AppText variant="bold" style={styles.kicker}>
        Responsibility
      </AppText>
      <AppText variant="bold" style={styles.label}>
        {label}
      </AppText>
      <AppText style={styles.detail}>{detail}</AppText>
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
    gap: 8,
  },
  glowLeft: {
    position: "absolute",
    left: -30,
    top: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,240,255,0.08)",
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: CYAN,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 17,
    color: WHITE,
  },
  detail: {
    fontSize: 13,
    lineHeight: 20,
    color: WHITE75,
  },
});
