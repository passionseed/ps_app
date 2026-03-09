import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
// MOCK: In a real app, use @react-native-community/slider or similar
// For this scaffold, we'll use simple buttons to simulate slider values 1-5

interface PostQuestSliderProps {
  onComplete: (data: {
    engagement: number;
    energy: number;
    wouldRevisit: number;
  }) => void;
  onDismiss: () => void;
}

export function PostQuestSlider({
  onComplete,
  onDismiss,
}: PostQuestSliderProps) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({
    engagement: 0,
    energy: 0,
    wouldRevisit: 0,
  });

  const questions = [
    { key: "engagement", label: "How engaged were you with this task?" },
    { key: "energy", label: "How is your energy level right now?" },
    { key: "wouldRevisit", label: "Would you like to explore more like this?" },
  ] as const;

  const handleScore = (value: number) => {
    const currentKey = questions[step].key;
    const newScores = { ...scores, [currentKey]: value };
    setScores(newScores);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(newScores);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Check-in</Text>

      <Text style={styles.questionText}>{questions[step].label}</Text>

      <View style={styles.sliderMockContainer}>
        {[1, 2, 3, 4, 5].map((val) => (
          <Pressable
            key={val}
            style={styles.ratingCircle}
            onPress={() => handleScore(val)}
          >
            <Text style={styles.ratingText}>{val}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.stepIndicator}>Step {step + 1} of 3</Text>
        <Pressable onPress={onDismiss}>
          <Text style={styles.dismissText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    fontFamily: "Orbit_400Regular",
    textAlign: "center",
  },
  questionText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
    fontFamily: "Orbit_400Regular",
  },
  sliderMockContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  ratingCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepIndicator: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "Orbit_400Regular",
  },
  dismissText: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "underline",
    fontFamily: "Orbit_400Regular",
  },
});
