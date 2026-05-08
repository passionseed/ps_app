import React, { useState, useCallback, useMemo } from "react";
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
import { prompts } from "../../lib/wrapped/prompts";
import {
  classifyArchetype,
  getSecondaryArchetype,
  computeMMAxis,
  computeSBAxis,
  computeSQAxis,
  computePRAxis,
} from "../../lib/wrapped/archetypes";
import type { AxisScores, ArchetypeResult, ArchetypeFit } from "../../lib/wrapped/archetypes";
import { WrappedSliderCard } from "./WrappedSliderCard";
import { WrappedMultiSelectCard } from "./WrappedMultiSelectCard";
import { WrappedDragRankCard } from "./WrappedDragRankCard";
import { WrappedTextCard } from "./WrappedTextCard";
import { WrappedTitleCard } from "./WrappedTitleCard";
import { ArchetypeReveal } from "./ArchetypeReveal";
import { BestAllyLine } from "./BestAllyLine";
import { SquadConstellation } from "./SquadConstellation";
import { SummaryCard } from "./SummaryCard";

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

  // Responses state
  const [p1Value, setP1Value] = useState(2);
  const [p2Value, setP2Value] = useState(2);
  const [p3Selected, setP3Selected] = useState<number[]>([]);
  const [p4Ranked, setP4Ranked] = useState<number[]>([]);
  const [p5Text, setP5Text] = useState("");
  const [p6Title, setP6Title] = useState("");

  // Reveal state
  const [revealedArchetype, setRevealedArchetype] = useState<ArchetypeResult | null>(null);
  const [secondaryArchetype, setSecondaryArchetype] = useState<ArchetypeResult | null>(null);
  const [axisScores, setAxisScores] = useState<AxisScores | null>(null);
  const [archetypeFit, setArchetypeFit] = useState<ArchetypeFit | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showBestAlly, setShowBestAlly] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const totalSteps = 11; // intro + 6 prompts + reveal + calibration + bestAlly + constellation + summary

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    progress.value = 0;
    setP1Value(2);
    setP2Value(2);
    setP3Selected([]);
    setP4Ranked([]);
    setP5Text("");
    setP6Title("");
    setRevealedArchetype(null);
    setSecondaryArchetype(null);
    setAxisScores(null);
    setArchetypeFit(null);
    setShowCalibration(false);
    setShowBestAlly(false);
    setShowConstellation(false);
    setShowSummary(false);
    onClose();
  }, [onClose, progress]);

  const computeAndReveal = useCallback(() => {
    const scores: AxisScores = {
      mm: computeMMAxis(p1Value, p3Selected),
      sb: computeSBAxis(p2Value),
      sq: computeSQAxis(p3Selected),
      pr: computePRAxis(p4Ranked),
    };
    const archetype = classifyArchetype(scores);
    const secondary = getSecondaryArchetype(scores);
    setAxisScores(scores);
    setRevealedArchetype(archetype);
    setSecondaryArchetype(secondary);
  }, [p1Value, p2Value, p3Selected, p4Ranked]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      progress.value = withTiming(nextStep, { duration: 300 });

      // Trigger reveal computation when moving from prompt 6 to reveal
      if (currentStep === 6) {
        computeAndReveal();
      }
    }
  }, [currentStep, totalSteps, progress, computeAndReveal]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      progress.value = withTiming(prevStep, { duration: 300 });
    } else {
      handleClose();
    }
  }, [currentStep, progress, handleClose]);

  const handleRevealComplete = useCallback(() => {
    setShowCalibration(true);
  }, []);

  const handleCalibrationSelect = useCallback((fit: ArchetypeFit) => {
    setArchetypeFit(fit);
    setShowCalibration(false);
    setShowBestAlly(true);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });
  }, [currentStep, progress]);

  const handleBestAllyNext = useCallback(() => {
    setShowBestAlly(false);
    setShowConstellation(true);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });
  }, [currentStep, progress]);

  const handleConstellationNext = useCallback(() => {
    setShowConstellation(false);
    setShowSummary(true);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });
  }, [currentStep, progress]);

  const progressWidth = useAnimatedStyle(() => ({
    width: `${((progress.value + 1) / totalSteps) * 100}%`,
  }));

  // Memoize prompt lookups
  const p1Prompt = useMemo(() => prompts.find((p) => p.id === "p1")!, []);
  const p2Prompt = useMemo(() => prompts.find((p) => p.id === "p2")!, []);
  const p3Prompt = useMemo(() => prompts.find((p) => p.id === "p3")!, []);
  const p4Prompt = useMemo(() => prompts.find((p) => p.id === "p4")!, []);
  const p5Prompt = useMemo(() => prompts.find((p) => p.id === "p5")!, []);
  const p6Prompt = useMemo(() => prompts.find((p) => p.id === "p6")!, []);

  const handleP3Toggle = useCallback((index: number) => {
    setP3Selected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

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

            {currentStep === 1 && (
              <WrappedSliderCard
                prompt={p1Prompt}
                value={p1Value}
                onChange={setP1Value}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <WrappedSliderCard
                prompt={p2Prompt}
                value={p2Value}
                onChange={setP2Value}
                onNext={handleNext}
              />
            )}

            {currentStep === 3 && (
              <WrappedMultiSelectCard
                prompt={p3Prompt}
                selectedIndices={p3Selected}
                onToggle={handleP3Toggle}
                onNext={handleNext}
              />
            )}

            {currentStep === 4 && (
              <WrappedDragRankCard
                prompt={p4Prompt}
                rankedIndices={p4Ranked}
                onReorder={setP4Ranked}
                onNext={handleNext}
              />
            )}

            {currentStep === 5 && (
              <WrappedTextCard
                prompt={p5Prompt}
                value={p5Text}
                onChange={setP5Text}
                onNext={handleNext}
              />
            )}

            {currentStep === 6 && (
              <WrappedTitleCard
                prompt={p6Prompt}
                value={p6Title}
                onChange={setP6Title}
                onNext={handleNext}
              />
            )}

            {currentStep === 7 && revealedArchetype && (
              <ArchetypeReveal
                archetype={revealedArchetype}
                onComplete={handleRevealComplete}
              />
            )}

            {currentStep === 8 && showCalibration && revealedArchetype && secondaryArchetype && (
              <CalibrationCard
                archetype={revealedArchetype}
                secondaryArchetype={secondaryArchetype}
                onSelect={handleCalibrationSelect}
              />
            )}

            {currentStep === 9 && showBestAlly && revealedArchetype && (
              <BestAllyLine
                archetype={revealedArchetype}
                onNext={handleBestAllyNext}
              />
            )}

            {currentStep === 10 && showConstellation && revealedArchetype && axisScores && (
              <SquadConstellation
                userArchetype={revealedArchetype}
                userPhase1Title={p6Title || revealedArchetype.display.en}
                userScores={{ mm: axisScores.mm, sb: axisScores.sb }}
                teammates={[]} // TODO: wire real team data from hackathon program enrollment
                totalSquadSize={1}
                onNext={handleConstellationNext}
              />
            )}

            {currentStep === 11 && showSummary && revealedArchetype && axisScores && (
              <SummaryCard
                archetype={revealedArchetype}
                secondaryArchetype={archetypeFit === "not_me" ? secondaryArchetype : undefined}
                scores={axisScores}
                phase1Title={p6Title}
                archetypeFit={archetypeFit}
                onDone={handleClose}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CalibrationCard({
  archetype,
  secondaryArchetype,
  onSelect,
}: {
  archetype: ArchetypeResult;
  secondaryArchetype: ArchetypeResult;
  onSelect: (fit: ArchetypeFit) => void;
}) {
  const [showSecondary, setShowSecondary] = React.useState(false);

  const handleNotMe = () => {
    setShowSecondary(true);
  };

  const handleSecondarySelect = (fit: ArchetypeFit) => {
    onSelect(fit);
  };

  if (showSecondary) {
    return (
      <View style={styles.card}>
        <Animated.View entering={FadeIn.delay(100).duration(600)}>
          <AppText style={styles.introEmoji}>🤔</AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(300).duration(600)}>
          <AppText variant="bold" style={styles.introTitle}>
            Alternative Archetype
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(500).duration(600)}>
          <AppText style={styles.introText}>
            You might also be...
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(600).duration(600)}>
          <AppText variant="bold" style={styles.revealName}>
            {secondaryArchetype.display.en}
          </AppText>
          <AppText style={styles.revealNameTh}>
            {secondaryArchetype.display.th}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(700).duration(600)}>
          <AppText style={styles.introText}>
            {secondaryArchetype.caption.en}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(900).duration(600)}>
          <Pressable
            style={styles.ctaButton}
            onPress={() => handleSecondarySelect("not_me")}
          >
            <AppText variant="bold" style={styles.ctaText}>
              This is me →
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.introEmoji}>🎯</AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <AppText variant="bold" style={styles.introTitle}>
          Did we get you right?
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500).duration(600)}>
        <AppText style={styles.introText}>
          You were identified as{" "}
          <AppText variant="bold" style={{ color: CYAN }}>
            {archetype.display.en}
          </AppText>
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(700).duration(600)} style={styles.calibrationButtons}>
        <Pressable
          style={[styles.calibrationButton, { backgroundColor: "#4ADE80" }]}
          onPress={() => onSelect("nailed")}
        >
          <AppText variant="bold" style={styles.calibrationButtonText}>
            🎯 Nailed it
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.calibrationButton, { backgroundColor: "#FB923C" }]}
          onPress={() => onSelect("sort_of")}
        >
          <AppText variant="bold" style={styles.calibrationButtonText}>
            🤔 Sort of
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.calibrationButton, { backgroundColor: PURPLE }]}
          onPress={handleNotMe}
        >
          <AppText variant="bold" style={styles.calibrationButtonText}>
            ❌ Not me
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
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
          Answer 6 quick questions to discover your archetype and unlock Phase 2
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
  revealName: {
    fontSize: 32,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 40,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  revealNameTh: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.xs,
  },
  calibrationButtons: {
    gap: Space.md,
    width: "100%",
    paddingHorizontal: Space.lg,
    marginTop: Space.lg,
  },
  calibrationButton: {
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  calibrationButtonText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
