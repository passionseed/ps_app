import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Text as ThemeText, Border, Radius, Shadow } from "../../lib/theme";

interface ScoreWidgetProps {
  passion: number | null;
  aptitude: number | null;
  viability: number | null;
  confidence: "low" | "medium" | "high";
}

export function ScoreWidget({
  passion,
  aptitude,
  viability,
  confidence,
}: ScoreWidgetProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Journey Score</Text>
      {passion === null ? (
        <Text style={styles.emptyText}>Still getting to know you...</Text>
      ) : (
        <View style={styles.scoresRow}>
          <ScoreItem label="Passion" value={passion} icon="🔥" />
          <ScoreItem label="Aptitude" value={aptitude} icon="🧠" />
          <ScoreItem label="Viability" value={viability} icon="📈" />
        </View>
      )}
      <Text style={styles.confidenceText}>Confidence: {confidence}</Text>
    </View>
  );
}

function ScoreItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: string;
}) {
  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreIcon}>{icon}</Text>
      <Text style={styles.scoreValue}>{value ?? "--"}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
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
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.primary,
  },
  emptyText: {
    fontSize: 14,
    color: ThemeText.secondary,
    fontStyle: "italic",
  },
  scoresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  scoreLabel: {
    fontSize: 12,
    color: ThemeText.secondary,
    textTransform: "uppercase",
  },
  confidenceText: {
    fontSize: 12,
    color: ThemeText.tertiary,
    marginTop: 12,
    textAlign: "right",
  },
});
