import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
import { WrappedButton } from "./WrappedButton";
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
import {
  getTeammateWrappedReflections,
  getCurrentHackathonTeamMembership,
  getCurrentHackathonProgramHome,
} from "../../lib/hackathonProgram";
import { fetchParticipantSubmissionsDashboard } from "../../lib/hackathonParticipantSubmissions";
import { saveWrappedReflection, loadSavedWrappedReflection } from "../../lib/wrapped/saveReflection";
import type { TeammateWrappedReflection } from "../../lib/hackathonProgram";
import type { WrappedReflection } from "../../lib/wrapped/archetypes";
import { readHackathonParticipant } from "../../lib/hackathon-mode";
import { WrappedSliderCard } from "./WrappedSliderCard";
import { WrappedMultiSelectCard } from "./WrappedMultiSelectCard";
import { WrappedDragRankCard } from "./WrappedDragRankCard";
import { WrappedTextCard } from "./WrappedTextCard";
import { WrappedTitleCard } from "./WrappedTitleCard";
import { ArchetypeReveal } from "./ArchetypeReveal";
import { BestAllyLine } from "./BestAllyLine";
import { SquadConstellation, type ConstellationTeammate } from "./SquadConstellation";
import { SummaryCard } from "./SummaryCard";
import { IdeaGraveyardCard } from "./IdeaGraveyardCard";
import { TestingMethodCard } from "./TestingMethodCard";

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

  // Saved reflection state — if user already completed Wrapped
  const [savedReflection, setSavedReflection] = useState<WrappedReflection | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);

  // Team data for constellation
  const [teammates, setTeammates] = useState<ConstellationTeammate[]>([]);
  const [totalSquadSize, setTotalSquadSize] = useState(1);
  const [teamDataLoading, setTeamDataLoading] = useState(false);

  // Phase 2 data
  const [phase2IdeasKilled, setPhase2IdeasKilled] = useState<number>(3);
  const [phase2PrimaryMethod, setPhase2PrimaryMethod] = useState<string>("Figma Mockup");
  const [phase2Surprise, setPhase2Surprise] = useState<string>("Users didn't care about the main feature, they just wanted the shortcut.");

  const totalSteps = 14; // intro + 6 prompts + reveal + calibration + bestAlly + constellation + graveyard + method + summary

  // Check for saved reflection when modal opens
  useEffect(() => {
    if (visible) {
      setCheckingSaved(true);
      setSavedReflection(null);
      (async () => {
        try {
          const [participant, home] = await Promise.all([
            readHackathonParticipant(),
            getCurrentHackathonProgramHome(),
          ]);
          const teamId = home.team?.id;
          const participantId = participant?.id;

          console.log("[WrappedModal] Checking saved reflection:", { teamId, participantId });

          if (participantId) {
            const saved = await loadSavedWrappedReflection(teamId, participantId);
            console.log("[WrappedModal] Loaded saved reflection:", saved ? "FOUND" : "NOT FOUND", saved?.archetype);
            if (saved) {
              setSavedReflection(saved);
            }
          } else {
            console.log("[WrappedModal] Missing participantId, skipping load");
          }
        } catch (e) {
          console.error("[WrappedModal] Failed to check saved reflection:", e);
        } finally {
          setCheckingSaved(false);
        }
      })();

      // Also fetch Phase 2 data
      fetchParticipantSubmissionsDashboard().then((subs) => {
        let killed = 0;
        let method = "Figma Mockup";
        let surprise = "";

        subs.forEach(s => {
          const text = JSON.stringify(s.answers).toLowerCase();
          if (s.activityTitle.toLowerCase().includes("gate") || s.activityTitle.toLowerCase().includes("synthesize")) {
             killed += (text.match(/kill|pivot/gi) || []).length;
          }
          if (s.activityTitle.toLowerCase().includes("method") || s.activityTitle.toLowerCase().includes("prototype")) {
             if (text.includes("wizard")) method = "Wizard of Oz";
             else if (text.includes("paper")) method = "Paper Prototype";
             else if (text.includes("concierge")) method = "Concierge MVP";
          }
          if (s.activityTitle.toLowerCase().includes("test") || s.activityTitle.toLowerCase().includes("surprise")) {
             const ansText = s.answers?.[0]?.fullText || s.answers?.[0]?.textPreview;
             if (ansText && ansText.length > 10 && !surprise) surprise = ansText;
          }
        });

        if (killed > 0) setPhase2IdeasKilled(killed);
        if (method !== "Figma Mockup") setPhase2PrimaryMethod(method);
        if (surprise.length > 5) setPhase2Surprise(surprise);
      }).catch(console.error);
    }
  }, [visible]);

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
    setTeammates([]);
    setTotalSquadSize(1);
    setTeamDataLoading(false);
    setSavedReflection(null);
    onClose();
  }, [onClose, progress]);

  const handleViewSavedResults = useCallback(() => {
    if (!savedReflection) return;

    // Restore all state from saved reflection
    const saved = savedReflection;
    const scores: AxisScores = {
      mm: saved.axes.MM,
      sb: saved.axes.SB,
      pr: saved.axes.PR,
      sq: saved.axes.SQ,
    };
    const archetype = classifyArchetype(scores);
    const secondary = getSecondaryArchetype(scores);

    setAxisScores(scores);
    setRevealedArchetype(archetype);
    setSecondaryArchetype(secondary);
    setArchetypeFit(saved.archetype_fit);
    setP5Text(saved.surprise_evidence);
    setP6Title(saved.phase1_title);
    if (saved.phase2_ideas_killed) setPhase2IdeasKilled(saved.phase2_ideas_killed);
    if (saved.phase2_primary_method) setPhase2PrimaryMethod(saved.phase2_primary_method);
    if (saved.phase2_surprise) setPhase2Surprise(saved.phase2_surprise);

    // Jump directly to summary
    setShowSummary(true);
    setCurrentStep(13);
    progress.value = withTiming(13, { duration: 300 });
  }, [savedReflection, progress]);

  const handleRetake = useCallback(() => {
    setSavedReflection(null);
    setCurrentStep(0);
    progress.value = 0;
  }, [progress]);

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
    setCurrentStep(8);
    progress.value = withTiming(8, { duration: 300 });
  }, [progress]);

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

    // Fetch teammate data when entering constellation
    setTeamDataLoading(true);
    (async () => {
      try {
        const [participant, home] = await Promise.all([
          readHackathonParticipant(),
          getCurrentHackathonProgramHome(),
        ]);
        const teamId = home.team?.id;
        const participantId = participant?.id;
        const teamMembers = home.team?.members ?? [];
        setTotalSquadSize(Math.max(teamMembers.length, 1));

        if (participantId) {
          const teammateIds = teamMembers
            .map((m: any) => m.participant_id)
            .filter((id: string) => id && id !== participantId);
          const reflections = await getTeammateWrappedReflections(
            teamId,
            participantId,
            teammateIds.length > 0 ? teammateIds : undefined,
          );
          const mapped: ConstellationTeammate[] = reflections.map((r) => ({
            participantId: r.participantId,
            name: r.name,
            archetypeId: r.archetypeId,
            archetypeDisplay: undefined, // Will fallback to archetypeId in component
            phase1Title: r.phase1Title || r.name,
            mm: r.mm,
            sb: r.sb,
          }));
          setTeammates(mapped);
        }
      } catch (e) {
        console.error("[WrappedModal] Failed to load teammate reflections:", e);
      } finally {
        setTeamDataLoading(false);
      }
    })();
  }, [currentStep, progress]);

  const handleConstellationNext = useCallback(async () => {
    setShowConstellation(false);
    // Show graveyard card
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });
  }, [currentStep, progress]);

  const handleGraveyardNext = useCallback(() => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });
  }, [currentStep, progress]);

  const handleMethodNext = useCallback(async () => {
    setShowSummary(true);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    progress.value = withTiming(nextStep, { duration: 300 });

    // Save reflection to Supabase when reaching SummaryCard
    if (revealedArchetype && secondaryArchetype && axisScores) {
      try {
        const [participant, home] = await Promise.all([
          readHackathonParticipant(),
          getCurrentHackathonProgramHome(),
        ]);
        const teamId = home.team?.id;
        const participantId = participant?.id;

        if (participantId) {
          await saveWrappedReflection({
            enrollment_id: teamId ?? "",
            participant_id: participantId,
            archetype: revealedArchetype.id,
            archetype_secondary: secondaryArchetype.id,
            axes: {
              MM: axisScores.mm,
              SB: axisScores.sb,
              PR: axisScores.pr,
              SQ: axisScores.sq,
            },
            surprise_evidence: p5Text,
            phase1_title: p6Title,
            archetype_fit: archetypeFit ?? "nailed",
            phase2_cycles_run: 0,
            phase2_primary_method: phase2PrimaryMethod,
            phase2_ideas_killed: phase2IdeasKilled,
            phase2_surprise: phase2Surprise,
          });
        }
      } catch (e) {
        console.error("[WrappedModal] Failed to save wrapped reflection:", e);
      }
    }
  }, [currentStep, progress, revealedArchetype, secondaryArchetype, axisScores, p5Text, p6Title, archetypeFit, phase2PrimaryMethod, phase2IdeasKilled, phase2Surprise]);

  const progressWidth = useAnimatedStyle(() => ({
    width: `${((progress.value + 1) / totalSteps) * 100}%`,
  }));

  // Memoize prompt lookups with safe fallbacks
  const p1Prompt = useMemo(() => prompts.find((p) => p.id === "p1"), []);
  const p2Prompt = useMemo(() => prompts.find((p) => p.id === "p2"), []);
  const p3Prompt = useMemo(() => prompts.find((p) => p.id === "p3"), []);
  const p4Prompt = useMemo(() => prompts.find((p) => p.id === "p4"), []);
  const p5Prompt = useMemo(() => prompts.find((p) => p.id === "p5"), []);
  const p6Prompt = useMemo(() => prompts.find((p) => p.id === "p6"), []);

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
          <Pressable
            onPress={handleBack}
            disabled={currentStep === 0}
            style={[styles.backButton, currentStep === 0 && styles.backButtonDisabled]}
          >
            <AppText style={styles.backText}>←</AppText>
          </Pressable>
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
            {checkingSaved && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={CYAN} />
                <AppText style={styles.loadingText}>Loading your results...</AppText>
              </View>
            )}

            {!checkingSaved && currentStep === 0 && savedReflection && (
              <ViewResultsCard
                archetypeId={savedReflection.archetype}
                onViewResults={handleViewSavedResults}
                onRetake={handleRetake}
              />
            )}
            {!checkingSaved && currentStep === 0 && !savedReflection && <IntroCard onNext={handleNext} />}

            {currentStep === 1 && p1Prompt && (
              <WrappedSliderCard
                prompt={p1Prompt}
                value={p1Value}
                onChange={setP1Value}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && p2Prompt && (
              <WrappedSliderCard
                prompt={p2Prompt}
                value={p2Value}
                onChange={setP2Value}
                onNext={handleNext}
              />
            )}

            {currentStep === 3 && p3Prompt && (
              <WrappedMultiSelectCard
                prompt={p3Prompt}
                selectedIndices={p3Selected}
                onToggle={handleP3Toggle}
                onNext={handleNext}
              />
            )}

            {currentStep === 4 && p4Prompt && (
              <WrappedDragRankCard
                prompt={p4Prompt}
                rankedIndices={p4Ranked}
                onReorder={setP4Ranked}
                onNext={handleNext}
              />
            )}

            {currentStep === 5 && p5Prompt && (
              <WrappedTextCard
                prompt={p5Prompt}
                value={p5Text}
                onChange={setP5Text}
                onNext={handleNext}
              />
            )}

            {currentStep === 6 && p6Prompt && (
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
                scores={axisScores}
                onComplete={handleRevealComplete}
              />
            )}

            {currentStep === 8 && revealedArchetype && secondaryArchetype && (
              <CalibrationCard
                archetype={revealedArchetype}
                secondaryArchetype={secondaryArchetype}
                onSelect={handleCalibrationSelect}
              />
            )}

            {currentStep === 9 && revealedArchetype && (
              <BestAllyLine
                archetype={revealedArchetype}
                onNext={handleBestAllyNext}
              />
            )}

            {currentStep === 10 && revealedArchetype && axisScores && (
              <SquadConstellation
                userArchetype={revealedArchetype}
                userPhase1Title={p6Title || revealedArchetype.display.en}
                userScores={{ mm: axisScores.mm, sb: axisScores.sb }}
                teammates={teammates}
                totalSquadSize={totalSquadSize}
                onNext={handleConstellationNext}
              />
            )}

            {currentStep === 11 && (
              <IdeaGraveyardCard
                ideasKilled={phase2IdeasKilled}
                onNext={handleGraveyardNext}
              />
            )}

            {currentStep === 12 && (
              <TestingMethodCard
                primaryMethod={phase2PrimaryMethod}
                onNext={handleMethodNext}
              />
            )}

            {currentStep === 13 && revealedArchetype && axisScores && (
              <SummaryCard
                archetype={revealedArchetype}
                secondaryArchetype={archetypeFit === "not_me" ? secondaryArchetype : undefined}
                scores={axisScores}
                phase1Title={p6Title}
                archetypeFit={archetypeFit}
                phase2Surprise={phase2Surprise}
                onDone={handleClose}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Archetype accent colors (matches ArchetypeReveal.tsx)
const archetypeAccentColors: Record<string, string> = {
  "the-empath": "#F472B6",
  "the-advocate": "#4ADE80",
  "the-interrogator": "#60A5FA",
  "the-mythbuster": "#FB923C",
  "the-architect": "#A78BFA",
  "the-synthesizer": "#2DD4BF",
  "the-auditor": "#94A3B8",
  "the-pivot-forcer": "#F87171",
  wanderer: "#D1D5DB",
};

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
  const accentColor = archetypeAccentColors[archetype.id] ?? CYAN;

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
          <WrappedButton onPress={() => handleSecondarySelect("not_me")}>
            This is me →
          </WrappedButton>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.stepIndicator}>Archetype Reveal</AppText>
      </Animated.View>

      {/* Archetype identity card */}
      <Animated.View
        entering={FadeIn.delay(300).duration(800).springify()}
        style={styles.calibrationIdentityCard}
      >
        <View style={[styles.calibrationAccentBar, { backgroundColor: accentColor }]} />
        <AppText variant="bold" style={styles.calibrationArchetypeName}>
          {archetype.display.en}
        </AppText>
        <AppText style={styles.calibrationArchetypeTh}>
          {archetype.display.th}
        </AppText>
        <AppText style={styles.calibrationCaption}>
          {archetype.caption.en}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600).duration(600)}>
        <AppText variant="bold" style={styles.calibrationQuestion}>
          Did we get you right?
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.calibrationButtons}>
        <WrappedButton onPress={() => onSelect("nailed")}>
          🎯 Nailed it
        </WrappedButton>

        <Pressable
          style={styles.calibrationSecondaryButton}
          onPress={() => onSelect("sort_of")}
        >
          <AppText variant="bold" style={styles.calibrationSecondaryText}>
            🤔 Sort of
          </AppText>
        </Pressable>

        <Pressable
          style={styles.calibrationTertiaryButton}
          onPress={handleNotMe}
        >
          <AppText style={styles.calibrationTertiaryText}>
            Not me — show alternative
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
        <WrappedButton onPress={onNext}>
          Let's Go →
        </WrappedButton>
      </Animated.View>
    </View>
  );
}

function ViewResultsCard({
  archetypeId,
  onViewResults,
  onRetake,
}: {
  archetypeId: string;
  onViewResults: () => void;
  onRetake: () => void;
}) {
  // Format archetype ID for display (e.g., "the-empath" → "The Empath")
  const displayName = archetypeId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.stepIndicator}>Welcome Back</AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(600)}>
        <AppText style={styles.introEmoji}>✨</AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <AppText variant="bold" style={styles.introTitle}>
          You already have your results
        </AppText>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(400).duration(800).springify()}
        style={styles.viewResultsIdentityCard}
      >
        <View style={[styles.viewResultsAccentBar, { backgroundColor: CYAN }]} />
        <AppText variant="bold" style={styles.viewResultsArchetypeName}>
          {displayName}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600).duration(600)}>
        <AppText style={styles.introText}>
          Your Hackathon Wrapped is ready. View your full results or retake to update them.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.viewResultsButtons}>
        <WrappedButton onPress={onViewResults}>
          View My Results →
        </WrappedButton>

        <Pressable style={styles.viewResultsRetakeButton} onPress={onRetake}>
          <AppText style={styles.viewResultsRetakeText}>
            Retake Quiz
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonDisabled: {
    opacity: 0,
  },
  backText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 22,
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
  // --- Calibration Card (Did we get you right?) ---
  calibrationIdentityCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: Space.xl,
    alignItems: "center",
    width: "100%",
    gap: Space.sm,
    overflow: "hidden",
  },
  calibrationAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  calibrationEmoji: {
    fontSize: 56,
    textAlign: "center",
    marginTop: Space.sm,
  },
  calibrationArchetypeName: {
    fontSize: 24,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 32,
  },
  calibrationArchetypeTh: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  calibrationCaption: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.md,
    marginTop: Space.xs,
  },
  calibrationQuestion: {
    fontSize: 20,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.md,
  },
  calibrationSecondaryButton: {
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  calibrationSecondaryText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_700Bold",
  },
  calibrationTertiaryButton: {
    paddingVertical: Space.sm,
    alignItems: "center",
  },
  calibrationTertiaryText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "BaiJamjuree_400Regular",
    textDecorationLine: "underline",
  },
  // --- View Results Card ---
  viewResultsIdentityCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: Space.xl,
    alignItems: "center",
    width: "100%",
    gap: Space.sm,
    overflow: "hidden",
  },
  viewResultsAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  viewResultsEmoji: {
    fontSize: 48,
    textAlign: "center",
    marginTop: Space.sm,
  },
  viewResultsArchetypeName: {
    fontSize: 22,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 30,
  },
  viewResultsArchetypeTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  viewResultsButtons: {
    gap: Space.md,
    width: "100%",
    paddingHorizontal: Space.lg,
    marginTop: Space.lg,
  },
  viewResultsRetakeButton: {
    paddingVertical: Space.sm,
    alignItems: "center",
  },
  viewResultsRetakeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Space.md,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
  },
});
