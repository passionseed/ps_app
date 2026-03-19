import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Text as ThemeText, Border, Radius, Shadow } from "../../lib/theme";

interface PivotCardProps {
  currentJobTitle: string;
  alternatives: Array<{ id: string; title: string }>;
  onDismiss: () => void;
  onSelectAlternative: (jobId: string) => void;
}

export function PivotCard({
  currentJobTitle,
  alternatives,
  onDismiss,
  onSelectAlternative,
}: PivotCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.title}>Time for a pivot?</Text>
      </View>
      <Text style={styles.description}>
        Your energy for {currentJobTitle} has dropped. That's useful data — not
        failure. Here are 2 careers that use the same skills but might suit you
        better:
      </Text>

      <View style={styles.alternativesContainer}>
        {alternatives.map((job) => (
          <Pressable
            key={job.id}
            style={({ pressed }) => [
              styles.alternativeButton,
              pressed && styles.alternativeButtonPressed,
            ]}
            onPress={() => onSelectAlternative(job.id)}
          >
            <Text style={styles.alternativeText}>Explore {job.title}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissText}>Not right now (Snooze 7d)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Border.default,
    ...Shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: ThemeText.primary,
    fontFamily: "Orbit_400Regular",
  },
  description: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: "Orbit_400Regular",
  },
  alternativesContainer: {
    gap: 8,
    marginBottom: 16,
  },
  alternativeButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Border.default,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  alternativeButtonPressed: {
    backgroundColor: "#F9FAFB",
  },
  alternativeText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
    fontFamily: "Orbit_400Regular",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 12,
    color: ThemeText.tertiary,
    fontFamily: "Orbit_400Regular",
    textDecorationLine: "underline",
  },
});
