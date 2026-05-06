import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface WrappedModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WrappedModal({ visible, onClose }: WrappedModalProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const progress = useSharedValue(0);

  const totalSteps = 7; // intro + 5 prompts + reveal + summary

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    progress.value = 0;
    onClose();
  }, [onClose, progress]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      progress.value = withTiming(currentStep + 1, { duration: 300 });
    }
  }, [currentStep, totalSteps, progress]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      progress.value = withTiming(currentStep - 1, { duration: 300 });
    } else {
      handleClose();
    }
  }, [currentStep, progress, handleClose]);

  const progressWidth = useAnimatedStyle(() => ({
    width: `${((progress.value + 1) / totalSteps) * 100}%`,
  }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleBack}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressWidth]} />
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <AppText style={styles.closeText}>✕</AppText>
          </Pressable>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <Animated.View
            key={currentStep}
            entering={FadeInUp.duration(400).springify()}
            style={styles.cardContainer}
          >
            {currentStep === 0 && <IntroCard onNext={handleNext} />}
            {currentStep >= 1 && currentStep <= 5 && (
              <PlaceholderPromptCard
                step={currentStep}
                onNext={handleNext}
              />
            )}
            {currentStep === 6 && <RevealCard onDone={handleClose} />}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function IntroCard({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.introEmoji}>🌊</AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <AppText variant="bold" style={styles.introTitle}>
          Your Hackathon Wrapped
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500).duration(600)}>
        <AppText style={styles.introText}>
          Answer 5 quick questions to discover your archetype and unlock Phase 2
          hints tailored to your style.
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(700).duration(600)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            Let's Go →
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function PlaceholderPromptCard({
  step,
  onNext,
}: {
  step: number;
  onNext: () => void;
}) {
  return (
    <View style={styles.card}>
      <AppText style={styles.stepIndicator}>
        Question {step} of 5
      </AppText>
      <AppText variant="bold" style={styles.promptTitle}>
        Prompt {step}
      </AppText>
      <AppText style={styles.promptText}>
        This is a placeholder for the actual prompt content. The full prompt
        cards will be implemented in the next feature.
      </AppText>
      <Pressable style={styles.ctaButton} onPress={onNext}>
        <AppText variant="bold" style={styles.ctaText}>
          Next →
        </AppText>
      </Pressable>
    </View>
  );
}

function RevealCard({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.card}>
      <AppText style={styles.revealEmoji}>🎉</AppText>
      <AppText variant="bold" style={styles.revealTitle}>
        Your Archetype
      </AppText>
      <AppText style={styles.revealText}>
        The archetype reveal will be implemented in the next feature with
        dramatic animations and celebration effects.
      </AppText>
      <Pressable style={styles.ctaButton} onPress={onDone}>
        <AppText variant="bold" style={styles.ctaText}>
          Done
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#03050a",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    gap: Space.md,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: CYAN,
    borderRadius: 2,
  },
  closeButton: {
    padding: Space.sm,
  },
  closeText: {
    fontSize: 20,
    color: "rgba(255,255,255,0.4)",
  },
  content: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Space.xl,
  },
  card: {
    gap: Space.lg,
    alignItems: "center",
  },
  introEmoji: {
    fontSize: 48,
    textAlign: "center",
  },
  introTitle: {
    fontSize: 28,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  introText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },
  stepIndicator: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  promptTitle: {
    fontSize: 22,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  promptText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
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
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  revealEmoji: {
    fontSize: 48,
    textAlign: "center",
  },
  revealTitle: {
    fontSize: 28,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  revealText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
