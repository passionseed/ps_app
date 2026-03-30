import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ScoreWidget } from "./ScoreWidget";
import { PivotCard } from "./PivotCard";
import { StepThemes, Radius } from "../../lib/theme";

// Temporary mock interfaces
interface PathLabData {
  id: string;
  title: string;
  completed: boolean;
  passionScore?: number;
  aptitudeScore?: number;
}

interface UniversityData {
  id: string;
  name: string;
  programs: string[];
  duration: string;
}

interface JobData {
  id: string;
  title: string;
  viabilityScore: number;
  trend: "growing" | "stable" | "declining";
}

interface JourneySimulation {
  id: string;
  label: string;
  passion_score: number | null;
  aptitude_score: number | null;
  journey_score: number | null;
  passion_confidence: "low" | "medium" | "high";
  pivot_triggered: boolean;
  job: JobData;
  universities: UniversityData[];
  pathlabs: PathLabData[];
}

export function JourneySimulationCard({
  simulation,
}: {
  simulation: JourneySimulation;
}) {
  const [showPivot, setShowPivot] = useState(simulation.pivot_triggered);

  return (
    <View style={styles.container}>
      <Text style={styles.simulationLabel}>{simulation.label}</Text>

      {/* 1. Score Widget floats at the top */}
      <ScoreWidget
        passion={simulation.passion_score}
        aptitude={simulation.aptitude_score}
        viability={simulation.job.viabilityScore}
        confidence={simulation.passion_confidence}
      />

      {/* 2. Pivot Card (conditional) */}
      {showPivot && (
        <PivotCard
          currentJobTitle={simulation.job.title}
          alternatives={[
            { id: "mock-1", title: "Product Manager" },
            { id: "mock-2", title: "Data Analyst" },
          ]}
          onDismiss={() => setShowPivot(false)}
          onSelectAlternative={(id) => console.log("Selected alternative:", id)}
        />
      )}

      {/* 3. The Stacked Cards (Destination -> Pathway -> Foundation) */}
      <View style={styles.stackContainer}>
        {/* Destination: Job */}
        <View style={[styles.card, styles.jobCard]}>
          <Text style={styles.cardHeader}>📈 Destination</Text>
          <Text style={styles.cardTitle}>{simulation.job.title}</Text>
          <Text style={styles.cardSubtitle}>
            Viability: {simulation.job.viabilityScore} • Trend:{" "}
            {simulation.job.trend}
          </Text>
        </View>

        {/* Pathway: University */}
        {simulation.universities.map((uni, i) => (
          <View
            key={uni.id}
            style={[
              styles.card,
              styles.uniCard,
              { marginTop: -10, zIndex: 2 - i },
            ]}
          >
            <Text style={styles.cardHeader}>🎓 Pathway</Text>
            <Text style={styles.cardTitle}>{uni.name}</Text>
            <Text style={styles.cardSubtitle}>
              {uni.programs[0]} • {uni.duration}
            </Text>
          </View>
        ))}

        {/* Foundation: PathLab */}
        {simulation.pathlabs.map((path, i) => (
          <View
            key={path.id}
            style={[
              styles.card,
              styles.pathCard,
              { marginTop: -10, zIndex: 1 - i },
            ]}
          >
            <Text style={styles.cardHeader}>⚡ Foundation</Text>
            <Text style={styles.cardTitle}>{path.title}</Text>
            <Text style={styles.cardSubtitle}>
              {path.completed ? "✓ Completed" : "In Progress"} • 🔥{" "}
              {path.passionScore || "--"} • 🧠 {path.aptitudeScore || "--"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    marginRight: 24,
  },
  simulationLabel: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "LibreFranklin_400Regular",
    color: "#111",
    marginBottom: 12,
  },
  stackContainer: {
    marginTop: 8,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    fontFamily: "LibreFranklin_400Regular",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
    fontFamily: "LibreFranklin_400Regular",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    fontFamily: "LibreFranklin_400Regular",
  },
  jobCard: {
    backgroundColor: StepThemes.job.bgEnd,
    borderColor: StepThemes.job.border,
    zIndex: 3,
    shadowColor: StepThemes.job.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  uniCard: {
    backgroundColor: StepThemes.university.bgEnd,
    borderColor: StepThemes.university.border,
    shadowColor: StepThemes.university.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  pathCard: {
    backgroundColor: StepThemes.internship.bgEnd,
    borderColor: StepThemes.internship.border,
    shadowColor: StepThemes.internship.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
});
