import React from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { WrappedPrompt } from "../../lib/wrapped/prompts";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - Space.xl * 4;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;

interface WrappedSliderCardProps {
  prompt: WrappedPrompt;
  value: number;
  onChange: (value: number) => void;
  onNext: () => void;
}

export function WrappedSliderCard({
  prompt,
  value,
  onChange,
  onNext,
}: WrappedSliderCardProps) {
  const min = prompt.min ?? 0;
  const max = prompt.max ?? 4;
  const range = max - min;

  const progress = useSharedValue((value - min) / range);
  const thumbScale = useSharedValue(1);

  // Sync with external value
  React.useEffect(() => {
    progress.value = withTiming((value - min) / range, { duration: 200 });
  }, [value, min, range, progress]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.3, { damping: 15 });
    })
    .onUpdate((e) => {
      const newProgress = Math.max(
        0,
        Math.min(1, (e.absoluteX - (SCREEN_WIDTH - SLIDER_WIDTH) / 2) / SLIDER_WIDTH)
      );
      progress.value = newProgress;
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1, { damping: 15 });
      const newValue = Math.round(progress.value * range + min);
      runOnJS(onChange)(newValue);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const newProgress = Math.max(
      0,
      Math.min(1, (e.absoluteX - (SCREEN_WIDTH - SLIDER_WIDTH) / 2) / SLIDER_WIDTH)
    );
    progress.value = withSpring(newProgress, { damping: 20 });
    const newValue = Math.round(newProgress * range + min);
    runOnJS(onChange)(newValue);
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
  });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * SLIDER_WIDTH },
      { scale: thumbScale.value },
    ],
    shadowOpacity: 0.3 + progress.value * 0.4,
    shadowRadius: 8 + progress.value * 12,
  }));

  const trackFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ["rgba(90,122,148,0.4)", CYAN, PURPLE]
    ),
  }));

  const labels = prompt.labels;

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <AppText style={styles.stepIndicator}>
          {prompt.id === "p1" ? "Question 1 of 5" : "Question 2 of 5"}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)}>
        <AppText variant="bold" style={styles.question}>
          {prompt.question.en}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <AppText style={styles.questionTh}>{prompt.question.th}</AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.sliderContainer}>
        <GestureDetector gesture={composedGesture}>
          <View style={styles.sliderTrackContainer}>
            <View style={styles.trackBackground} />
            <Animated.View style={[styles.trackFill, trackFillStyle]} />
            <Animated.View style={[styles.thumb, thumbStyle]}>
              <View style={styles.thumbInner} />
            </Animated.View>
          </View>
        </GestureDetector>

        {labels && (
          <View style={styles.labelsRow}>
            <AppText style={styles.labelLeft}>{labels.en.left}</AppText>
            <AppText style={styles.labelRight}>{labels.en.right}</AppText>
          </View>
        )}

        {labels && (
          <View style={styles.labelsRow}>
            <AppText style={styles.labelThLeft}>{labels.th.left}</AppText>
            <AppText style={styles.labelThRight}>{labels.th.right}</AppText>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(500)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            Next →
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
  sliderContainer: {
    width: "100%",
    alignItems: "center",
    gap: Space.md,
    marginTop: Space.xl,
  },
  sliderTrackContainer: {
    width: SLIDER_WIDTH,
    height: THUMB_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  trackBackground: {
    position: "absolute",
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    left: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: WHITE,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CYAN,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: SLIDER_WIDTH,
  },
  labelLeft: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
    textAlign: "left",
  },
  labelRight: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
    textAlign: "right",
  },
  labelThLeft: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
    textAlign: "left",
  },
  labelThRight: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
    textAlign: "right",
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
