import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { submitDailyReflection } from "../../lib/pathlab";
import { VoiceAIReflection } from "../../components/Reflection";
import type { PathReflectionDecision } from "../../types/pathlab";
import { Radius, Border, Shadow, Text as ThemeText, Space, Type, Accent } from "../../lib/theme";
import { AppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";

type EnrollmentData = {
  id: string;
  current_day: number;
  path: {
    id: string;
    total_days: number;
    seed: {
      title: string;
    };
  };
};

export default function ReflectionScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // Reflection state
  const [energyLevel, setEnergyLevel] = useState(5);
  const [confusionLevel, setConfusionLevel] = useState(5);
  const [interestLevel, setInterestLevel] = useState(5);
  const [openResponse, setOpenResponse] = useState("");
  const [showVoiceAI, setShowVoiceAI] = useState(false);

  useEffect(() => {
    async function load() {
      if (!enrollmentId) return;

      const { data, error } = await supabase
        .from("path_enrollments")
        .select(
          `
          id,
          current_day,
          path:paths(
            id,
            total_days,
            seed:seeds(title)
          )
        `,
        )
        .eq("id", enrollmentId)
        .single();

      console.log('[Reflection] Enrollment data:', JSON.stringify(data, null, 2));
      console.log('[Reflection] Error:', error);

      setEnrollment(data as unknown as EnrollmentData);
      setLoading(false);
    }
    load();
  }, [enrollmentId]);

  const handleSubmit = async (decision: PathReflectionDecision) => {
    if (!enrollment) return;

    console.log('[Reflection] Starting submission with:', {
      enrollmentId: enrollment.id,
      dayNumber: enrollment.current_day,
      energyLevel,
      confusionLevel,
      interestLevel,
      openResponse,
      decision,
    });

    setSubmitting(true);
    setScoreError(null);
    try {
      const result = await submitDailyReflection({
        enrollmentId: enrollment.id,
        dayNumber: enrollment.current_day,
        energyLevel,
        confusionLevel,
        interestLevel,
        openResponse: openResponse || undefined,
        decision,
      });

      console.log('[Reflection] Submission result:', result);
      console.log('[Reflection] Submission successful!');

      // Trigger Score Engine after reflection submission succeeds
      setScoring(true);
      try {
        console.log('[Reflection] Triggering Score Engine for reflection:', result.id);
        const { data: scoreData, error: scoreError } = await supabase.functions.invoke(
          "score-engine/ingest",
          {
            body: {
              reflectionId: result.id,
              enrollmentId: enrollment.id,
              reflectionData: {
                energyLevel,
                confusionLevel,
                interestLevel,
                openResponse: openResponse || undefined,
                dayNumber: enrollment.current_day,
              },
            },
          }
        );

        if (scoreError) {
          console.error('[Reflection] Score Engine error:', scoreError);
          setScoreError('Failed to update scores, but your reflection was saved.');
        } else {
          console.log('[Reflection] Score Engine response:', scoreData);
        }
      } catch (err) {
        console.error('[Reflection] Score Engine exception:', err);
        setScoreError('Failed to update scores, but your reflection was saved.');
      } finally {
        setScoring(false);
      }

      console.log('[Reflection] Navigating based on decision:', decision);

      // Navigate based on decision
      if (decision === "continue_now") {
        router.replace(`/path/${enrollment.id}`);
      } else if (decision === "final_reflection") {
        router.replace("/(tabs)/my-paths");
      } else {
        router.replace("/(tabs)/my-paths");
      }
    } catch (error) {
      console.error("[Reflection] Failed to submit reflection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!enrollment || !enrollment.path || !enrollment.path.seed) {
    console.log('[Reflection] Validation failed:', {
      hasEnrollment: !!enrollment,
      hasPath: !!enrollment?.path,
      hasSeed: !!enrollment?.path?.seed,
      fullData: JSON.stringify(enrollment, null, 2)
    });
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorText}>Something went wrong</AppText>
        <GlassButton variant="secondary" onPress={() => router.back()}>
          Go Back
        </GlassButton>
      </View>
    );
  }

  const isLastDay = enrollment.current_day >= (enrollment.path.total_days ?? Infinity);
  const seedTitle = enrollment.path.seed.title || "Unknown Path";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <AppText style={styles.closeText}>✕</AppText>
        </Pressable>
        <AppText variant="bold" style={styles.headerTitle}>Daily Reflection</AppText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day info */}
        <View style={styles.dayInfo}>
          <AppText variant="bold" style={styles.dayBadge}>
            Day {enrollment.current_day} Complete! 🎉
          </AppText>
          <AppText style={styles.seedName}>
            {seedTitle}
          </AppText>
        </View>

        {/* Prompts intro */}
        <AppText style={styles.intro}>
          Take a moment to reflect on today's experience
        </AppText>

        {/* Energy Level */}
        <GlassCard style={styles.sliderSection}>
          <AppText variant="bold" style={styles.sliderLabel}>How energized do you feel?</AppText>
          <View style={styles.sliderRow}>
            <AppText style={styles.sliderEmoji}>😴</AppText>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    energyLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setEnergyLevel(val)}
                />
              ))}
            </View>
            <AppText style={styles.sliderEmoji}>⚡</AppText>
          </View>
        </GlassCard>

        {/* Confusion Level */}
        <GlassCard style={styles.sliderSection}>
          <AppText variant="bold" style={styles.sliderLabel}>How clear was everything?</AppText>
          <View style={styles.sliderRow}>
            <AppText style={styles.sliderEmoji}>😕</AppText>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    confusionLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setConfusionLevel(val)}
                />
              ))}
            </View>
            <AppText style={styles.sliderEmoji}>💡</AppText>
          </View>
          <AppText style={styles.sliderHint}>
            (Low = confusing, High = crystal clear)
          </AppText>
        </GlassCard>

        {/* Interest Level */}
        <GlassCard style={styles.sliderSection}>
          <AppText variant="bold" style={styles.sliderLabel}>
            How interested are you in this path?
          </AppText>
          <View style={styles.sliderRow}>
            <AppText style={styles.sliderEmoji}>😐</AppText>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    interestLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setInterestLevel(val)}
                />
              ))}
            </View>
            <AppText style={styles.sliderEmoji}>🤩</AppText>
          </View>
        </GlassCard>

        {/* Open response */}
        {showVoiceAI ? (
          <View style={{ marginBottom: 32 }}>
            <VoiceAIReflection
              onSave={(transcript) => {
                setOpenResponse(transcript);
                setShowVoiceAI(false);
              }}
              onDismiss={() => setShowVoiceAI(false)}
            />
          </View>
        ) : (
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable
              style={{
                backgroundColor: "#F3F4F6",
                padding: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
              onPress={() => setShowVoiceAI(true)}
            >
              <AppText style={{ fontSize: 16 }}>🎙️</AppText>
              <AppText
                style={{
                  fontSize: 14,
                  color: "#4B5563",
                }}
              >
                Reflect with Voice AI
              </AppText>
            </Pressable>
          </View>
        )}

        <GlassCard style={styles.textSection}>
          <AppText variant="bold" style={styles.sliderLabel}>Any thoughts or insights?</AppText>
          <TextInput
            style={styles.textInput}
            placeholder="What stood out today? What surprised you?"
            placeholderTextColor="#999"
            value={openResponse}
            onChangeText={setOpenResponse}
            multiline
            numberOfLines={4}
          />
        </GlassCard>

        {/* Decision buttons */}
        <View style={styles.decisionSection}>
          <AppText variant="bold" style={styles.decisionTitle}>What's next?</AppText>

          {isLastDay ? (
            // Last day - show final reflection option
            <>
              <GlassButton
                variant="primary"
                fullWidth
                onPress={() => handleSubmit("final_reflection")}
                disabled={submitting || scoring}
              >
                🎓 Complete Path & See Report
              </GlassButton>
            </>
          ) : (
            // Not last day - show continue/pause/quit options
            <>
              <GlassButton
                variant="primary"
                fullWidth
                onPress={() => handleSubmit("continue_tomorrow")}
                disabled={submitting || scoring}
              >
                ✓ Done for today, continue tomorrow
              </GlassButton>

              <GlassButton
                variant="secondary"
                fullWidth
                onPress={() => handleSubmit("continue_now")}
                disabled={submitting || scoring}
              >
                {`🚀 I'm on fire! Start Day ${enrollment.current_day + 1}`}
              </GlassButton>

              <GlassButton
                variant="ghost"
                fullWidth
                onPress={() => handleSubmit("pause")}
                disabled={submitting || scoring}
              >
                ⏸️ Pause for now
              </GlassButton>

              <GlassButton
                variant="danger"
                fullWidth
                onPress={() => handleSubmit("quit")}
                disabled={submitting || scoring}
              >
                This isn't for me
              </GlassButton>
            </>
          )}
        </View>

        {submitting && (
          <View style={styles.submittingOverlay}>
            <ActivityIndicator size="small" color="#BFFF00" />
            <AppText style={styles.submittingText}>Saving reflection...</AppText>
          </View>
        )}

        {scoring && (
          <View style={styles.scoringOverlay}>
            <ActivityIndicator size="small" color="#BFFF00" />
            <AppText style={styles.scoringText}>Calculating your scores...</AppText>
          </View>
        )}

        {scoreError && (
          <View style={styles.scoreErrorContainer}>
            <AppText style={styles.scoreErrorText}>⚠️ {scoreError}</AppText>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: Type.body.fontSize,
    color: "#666",
  },
  backText: {
    fontSize: Type.body.fontSize,
    color: Accent.yellow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Space["5xl"],
    paddingHorizontal: Space.xl,
    paddingBottom: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Border.light,
  },
  closeText: {
    fontSize: 20,
    color: "#666",
  },
  headerTitle: {
    fontSize: Type.subtitle.fontSize,
    fontWeight: Type.subtitle.fontWeight,
    color: ThemeText.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space["2xl"],
  },
  dayInfo: {
    alignItems: "center",
    marginBottom: Space["2xl"],
  },
  dayBadge: {
    fontSize: Type.title.fontSize,
    fontWeight: Type.title.fontWeight,
    color: ThemeText.primary,
    marginBottom: 4,
  },
  seedName: {
    fontSize: Type.body.fontSize,
    color: ThemeText.secondary,
  },
  intro: {
    fontSize: Type.body.fontSize,
    color: ThemeText.secondary,
    textAlign: "center",
    marginBottom: Space["3xl"],
  },
  sliderSection: {
    marginBottom: Space.xl,
    padding: Space.xl,
  },
  sliderLabel: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    marginBottom: Space.md,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  sliderEmoji: {
    fontSize: 20,
  },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: "#eee",
  },
  sliderDotActive: {
    backgroundColor: Accent.yellow,
    ...Shadow.ctaGlow,
  },
  sliderHint: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.muted,
    marginTop: 6,
    textAlign: "center",
  },
  textSection: {
    marginBottom: Space["3xl"],
    padding: Space.xl,
  },
  textInput: {
    backgroundColor: "transparent",
    fontSize: Type.body.fontSize,
    fontFamily: "LibreFranklin_Regular",
    color: ThemeText.primary,
    minHeight: 100,
    marginTop: Space.md,
    textAlignVertical: "top",
  },
  decisionSection: {
    gap: Space.lg,
  },
  decisionTitle: {
    fontSize: Type.subtitle.fontSize,
    fontWeight: Type.subtitle.fontWeight,
    color: ThemeText.primary,
    marginBottom: 4,
    textAlign: "center",
  },
  submittingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.lg,
  },
  submittingText: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.secondary,
  },
  scoringOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.md,
    paddingVertical: 8,
    paddingHorizontal: Space.lg,
    backgroundColor: "#F0F9FF",
    borderRadius: Radius.md,
  },
  scoringText: {
    fontSize: Type.caption.fontSize,
    color: "#0369A1",
  },
  scoreErrorContainer: {
    marginTop: Space.md,
    paddingVertical: 8,
    paddingHorizontal: Space.lg,
    backgroundColor: "#FEF3C7",
    borderRadius: Radius.md,
  },
  scoreErrorText: {
    fontSize: Type.caption.fontSize,
    color: "#92400E",
    textAlign: "center",
  },
});
