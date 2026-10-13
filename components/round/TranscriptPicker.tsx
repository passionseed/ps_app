import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

/**
 * Transcript as tappable segments (spec 5.6). Selected segments are highlighted with a
 * violet-50 fill AND an underline, so the selection reads without colour.
 */
export function TranscriptPicker({
  segments,
  selected,
  onToggle,
  hint,
}: {
  segments: { id: number; text: string }[];
  selected: number[];
  onToggle: (index: number) => void;
  hint: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.segments}>
        {segments.map((segment, index) => {
          const on = selected.includes(index);
          return (
            <Pressable
              key={`${segment.id}-${index}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={segment.text}
              onPress={() => onToggle(index)}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <RText variant="body" color={on ? Violet[700] : Ink.primary} weight={on ? "700" : "400"} style={on ? styles.underline : undefined}>
                {segment.text}
              </RText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.hint}>
        <Icon name="pencil" size={15} color={Violet[700]} />
        <RText variant="meta" color={Violet[700]}>
          {hint}
        </RText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 14, gap: 10 },
  segments: { gap: 4 },
  segment: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, minHeight: 44, justifyContent: "center" },
  segmentOn: { backgroundColor: Violet[50] },
  underline: { textDecorationLine: "underline" },
  hint: { flexDirection: "row", gap: 6, alignItems: "center" },
});
