import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

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
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: "#1F2937",
    fontFamily: "Orbit_400Regular",
  },
  description: {
    fontSize: 14,
    color: "#4B5563",
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
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  alternativeButtonPressed: {
    backgroundColor: "#F9FAFB",
  },
  alternativeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Orbit_400Regular",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Orbit_400Regular",
    textDecorationLine: "underline",
  },
});
