import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileAccordionSectionProps = {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ProfileAccordionSection({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: ProfileAccordionSectionProps) {
  return (
    <HackathonGlassCard compact gradient="subtle" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.headerText}>
          <AppText variant="bold" style={styles.title}>
            {title}
          </AppText>
          <AppText style={styles.summary} numberOfLines={1}>
            {summary}
          </AppText>
        </View>
        <AppText style={styles.chevron}>{expanded ? "▾" : "▸"}</AppText>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  summary: {
    fontSize: 12,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  chevron: {
    fontSize: 14,
    color: HACK_COLORS.cyan,
    fontFamily: "BaiJamjuree_700Bold",
    paddingHorizontal: 4,
  },
  body: {
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: HACK_ALPHA.divider,
    gap: Space.sm,
  },
});
