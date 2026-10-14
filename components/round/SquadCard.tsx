import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Violet } from "../../lib/theme";
import { AvatarGem, AvatarStack } from "./AvatarStack";
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icons";
import { RText } from "./RText";

/** Avatar gem (kept for existing callers): violet gradient for students, ink for the mentor. */
export function Avatar({ label, index = 0, mentor, size = 34 }: { label: string; index?: number; mentor?: boolean; size?: number }) {
  return <AvatarGem label={label} tone={mentor ? "ink" : "violet"} index={index} size={size} />;
}

/** Home squad card (DESIGN.md v4): glass row with avatar gems, title and the latest line. */
export function SquadCard({
  title,
  line,
  initials,
  mentorLabel,
  onPress,
}: {
  title: string;
  line: string;
  initials: string[];
  mentorLabel?: string | null;
  onPress: () => void;
}) {
  return (
    <GlassCard onPress={onPress} accessibilityLabel={`${title}. ${line}`} style={styles.row} padding={14}>
      <AvatarStack
        size={32}
        people={[...initials.map((label) => ({ label })), ...(mentorLabel ? [{ label: mentorLabel, tone: "ink" as const }] : [])]}
      />
      <View style={styles.text}>
        <RText variant="label">{title}</RText>
        <RText variant="small" numberOfLines={2}>
          {line}
        </RText>
      </View>
      <View style={[styles.go, Depth.control]}>
        <LinearGradient colors={["#FFFFFF", Violet[50]]} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
        <Icon name="chevron" size={18} color={Violet[700]} strokeWidth={2.2} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  text: { flex: 1, minWidth: 0 },
  go: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    backgroundColor: "#FFFFFF",
  },
});
