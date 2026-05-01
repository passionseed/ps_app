import { View, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "./AppText";

const ITEMS = [
  { emoji: "📦", text: "Package what you know into a 3–5 day project" },
  { emoji: "🌱", text: "High schoolers get a real head start" },
  { emoji: "🤝", text: "Build connections that come from doing, not networking" },
] as const;

export function SeedCreatorPitch({ onPress }: { onPress: () => void }) {
  return (
    <View style={s.card}>
      <LinearGradient
        colors={["#ECFDF5", "#F0FDF4", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Text style={s.eyebrow}>FOR UNIVERSITY STUDENTS & PROS</Text>
      <Text variant="bold" style={s.title}>
        Turn your experience{"\n"}into a Seed 🌱
      </Text>
      <Text style={s.subtitle}>
        You already have the knowledge — now give a high schooler their first
        real project in your field.
      </Text>

      <View style={s.items}>
        {ITEMS.map((item, i) => (
          <View key={i} style={s.item}>
            <Text style={s.itemEmoji}>{item.emoji}</Text>
            <Text style={s.itemText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <Text style={s.proof}>
        Your Seed becomes a portfolio piece with real usage — students who
        complete it, what they built, and their feedback.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create a Seed"
        style={({ pressed }) => [s.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
        onPress={onPress}
      >
        <Text variant="bold" style={s.ctaText}>Create a Seed</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  items: { gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemEmoji: { fontSize: 16, lineHeight: 22 },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#374151",
  },
  proof: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
    fontStyle: "italic",
  },
  cta: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
