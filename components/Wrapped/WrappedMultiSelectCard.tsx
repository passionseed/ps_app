import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { WrappedPrompt } from "../../lib/wrapped/prompts";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface WrappedMultiSelectCardProps {
  prompt: WrappedPrompt;
  selectedIndices: number[];
  onToggle: (index: number) => void;
  onNext: () => void;
}

export function WrappedMultiSelectCard({
  prompt,
  selectedIndices,
  onToggle,
  onNext,
}: WrappedMultiSelectCardProps) {
  const options = prompt?.options ?? [];
  const questionEn = prompt?.question?.en ?? "";
  const questionTh = prompt?.question?.th ?? "";

  const handleToggle = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(index);
  };

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <AppText style={styles.stepIndicator}>Question 3 of 6</AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)}>
        <AppText variant="bold" style={styles.question}>
          {questionEn}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <AppText style={styles.questionTh}>{questionTh}</AppText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(500).delay(400)}
        style={styles.chipsContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {options.map((option, index) => (
            <Chip
              key={index}
              option={option}
              selected={selectedIndices.includes(index)}
              onToggle={() => handleToggle(index)}
              delay={index * 50}
            />
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(600)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            Next →
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Chip({
  option,
  selected,
  onToggle,
  delay,
}: {
  option: { en: string; th: string };
  selected: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const scale = useSharedValue(1);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: selected ? PURPLE : "rgba(26,37,48,0.8)",
    borderColor: selected ? PURPLE : "rgba(90,122,148,0.4)",
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 25, stiffness: 200 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 25, stiffness: 200 });
    }, 80);
    onToggle();
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(delay)}
      style={styles.chipWrapper}
    >
      <Pressable onPress={handlePress} style={styles.chipPressable}>
        <Animated.View style={[styles.chipInner, chipStyle]}>
          <AppText
            variant="bold"
            style={[
              styles.chipText,
              selected && styles.chipTextSelected,
            ]}
          >
            {option.en}
          </AppText>
          <AppText
            style={[
              styles.chipTextTh,
              selected && styles.chipTextSelectedTh,
            ]}
          >
            {option.th}
          </AppText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  stepIndicator: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  question: {
    fontSize: 22,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 30,
  },
  questionTh: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 24,
  },
  chipsContainer: {
    width: "100%",
    flex: 1,
    marginTop: Space.md,
  },
  chipsScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    paddingVertical: Space.sm,
    justifyContent: "center",
    width: "100%",
  },
  chipWrapper: {
    width: "100%",
  },
  chipPressable: {
    width: "100%",
  },
  chipInner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
    width: "100%",
  },
  chipText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  chipTextTh: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
  },
  chipTextSelected: {
    color: WHITE,
  },
  chipTextSelectedTh: {
    color: "rgba(255,255,255,0.85)",
  },
  ctaButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: Space.lg,
    shadowColor: PURPLE,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
    minWidth: 160,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
