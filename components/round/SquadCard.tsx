import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

const AVATAR_TONES = [
  { bg: "#E4DEF7", fg: "#3D2A8A" },
  { bg: "#D3C7FF", fg: "#3D2A8A" },
  { bg: "#C3B5F7", fg: "#2E1F70" },
];

export function Avatar({ label, index = 0, mentor, size = 34 }: { label: string; index?: number; mentor?: boolean; size?: number }) {
  const tone = mentor ? { bg: Ink.primary, fg: "#FFFFFF" } : AVATAR_TONES[index % AVATAR_TONES.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg }]}>
      <RText variant="meta" color={tone.fg} weight="700" style={{ fontSize: 13 }}>
        {label.slice(0, mentor ? 3 : 1)}
      </RText>
    </View>
  );
}

/** Home squad card: avatars, title, latest generated line, opens the squad tab. */
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.avatars}>
        {initials.map((i, idx) => (
          <View key={`${i}-${idx}`} style={idx ? { marginLeft: -8 } : null}>
            <Avatar label={i} index={idx} />
          </View>
        ))}
        {mentorLabel ? (
          <View style={{ marginLeft: -8 }}>
            <Avatar label={mentorLabel} mentor />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <RText variant="label">{title}</RText>
        <RText variant="small" numberOfLines={2}>
          {line}
        </RText>
      </View>
      <Icon name="chevron" size={20} color={Violet[700]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  avatars: { flexDirection: "row" },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
});
