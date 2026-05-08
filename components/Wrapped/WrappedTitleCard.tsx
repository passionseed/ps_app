import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { WrappedPrompt } from "../../lib/wrapped/prompts";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface WrappedTitleCardProps {
  prompt: WrappedPrompt;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function WrappedTitleCard({
  prompt,
  value,
  onChange,
  onNext,
}: WrappedTitleCardProps) {
  const maxLength = prompt.maxLength ?? 80;

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <AppText style={styles.stepIndicator}>Question 6 of 6</AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)}>
        <AppText variant="bold" style={styles.question}>
          {prompt.question.en}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <AppText style={styles.questionTh}>{prompt.question.th}</AppText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(500).delay(400)}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={(text) => {
            if (text.length <= maxLength) {
              onChange(text);
            }
          }}
          placeholder="Your one-line title..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          maxLength={maxLength}
          autoCapitalize="sentences"
          autoCorrect
        />
        <AppText style={styles.charCount}>
          {value.length}/{maxLength}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(500)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            See My Results →
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
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
  inputContainer: {
    width: "100%",
    marginTop: Space.md,
    gap: Space.xs,
  },
  textInput: {
    width: "100%",
    height: 56,
    backgroundColor: "rgba(26,37,48,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.3)",
    padding: Space.lg,
    color: WHITE,
    fontSize: 15,
    fontFamily: "BaiJamjuree_400Regular",
  },
  charCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    fontFamily: "BaiJamjuree_400Regular",
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
    minWidth: 200,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
