import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { getPathDay, submitDailyReflection } from "../../lib/pathlab";
import { formatPathDayCompletionLabel } from "../../lib/pathlab-day-label";
import { VoiceAIReflection } from "../../components/Reflection";
import type { PathReflectionDecision } from "../../types/pathlab";
import { Radius, PageBg, Text as ThemeText, Space, Type, Accent } from "../../lib/theme";
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

function EmojiRatingBar({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: { value: number; emoji: string; label: string }[];
}) {
  return (
    <View style={ratingStyles.container}>
      <View style={ratingStyles.emojiRow}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                ratingStyles.emojiButton,
                selected && ratingStyles.emojiButtonSelected,
              ]}
              onPress={() => onChange(opt.value)}
            >
              <AppText style={[ratingStyles.emoji, selected && ratingStyles.emojiSelected]}>
                {opt.emoji}
              </AppText>
              <AppText style={[ratingStyles.emojiLabel, selected && ratingStyles.emojiLabelSelected]} numberOfLines={1}>
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  container: {
    marginTop: Space.md,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  emojiButton: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: Radius.md,
    flex: 1,
  },
  emojiButtonSelected: {
    backgroundColor: "rgba(191, 255, 0, 0.15)", // Light lime tint
  },
  emoji: {
    fontSize: 28,
    opacity: 0.4,
  },
  emojiSelected: {
    opacity: 1,
  },
  emojiLabel: {
    fontSize: 11,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  emojiLabelSelected: {
    color: ThemeText.primary,
  },
});

export default function ReflectionScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [dayTitle, setDayTitle] = useState<string | null>(null);

  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [confusionLevel, setConfusionLevel] = useState<number | null>(null);
  const [interestLevel, setInterestLevel] = useState<number | null>(null);
  const [openResponse, setOpenResponse] = useState("");
  const [showVoiceAI, setShowVoiceAI] = useState(false);

  const allRatingsSet = energyLevel !== null && confusionLevel !== null && interestLevel !== null;

  useEffect(() => {
    async function load() {
      if (!enrollmentId) return;
      try {
        const { data, error } = await supabase
          .from("path_enrollments")
          .select(
            `id, current_day, path:paths(id, total_days, seed:seeds(title))`,
          )
          .eq("id", enrollmentId)
          .single();

        if (error) throw error;

        const normalizedPath = Array.isArray(data?.path) ? data.path[0] : data?.path;
        const normalizedSeed = Array.isArray(normalizedPath?.seed)
          ? normalizedPath.seed[0]
          : normalizedPath?.seed;
        const normalizedEnrollment = data && normalizedPath
          ? { ...data, path: { ...normalizedPath, seed: normalizedSeed } }
          : null;

        setEnrollment(normalizedEnrollment as EnrollmentData | null);

        if (normalizedPath?.id && data.current_day) {
          const currentDay = await getPathDay(normalizedPath.id, data.current_day);
          setDayTitle(currentDay?.title ?? null);
        }
      } catch (error) {
        console.error("[Reflection] Failed to load:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enrollmentId]);

  const handleSubmit = async (decision: PathReflectionDecision) => {
    if (!enrollment || !allRatingsSet) return;

    setSubmitting(true);
    setScoreError(null);
    try {
      const result = await submitDailyReflection({
        enrollmentId: enrollment.id,
        dayNumber: enrollment.current_day,
        energyLevel: energyLevel!,
        confusionLevel: confusionLevel!,
        interestLevel: interestLevel!,
        openResponse: openResponse || undefined,
        decision,
      });

      setScoring(true);
      try {
        await supabase.functions.invoke("score-engine/ingest", {
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
        });
      } catch {
        setScoreError("Scores couldn't be updated, but your reflection was saved.");
      } finally {
        setScoring(false);
      }

      if (decision === "continue_now") {
        router.replace(`/path/${enrollment.id}`);
      } else {
        router.replace("/(tabs)/my-paths");
      }
    } catch (error) {
      console.error("[Reflection] Failed to submit:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: PageBg.default }]}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  if (!enrollment?.path?.seed) {
    return (
      <View style={[styles.center, { backgroundColor: PageBg.default }]}>
        <AppText style={{ color: ThemeText.secondary, marginBottom: 16 }}>Something went wrong</AppText>
        <GlassButton variant="secondary" onPress={() => router.back()}>
          Go Back
        </GlassButton>
      </View>
    );
  }

  const isLastDay = enrollment.current_day >= (enrollment.path.total_days ?? Infinity);
  const seedTitle = enrollment.path.seed.title || "Unknown Path";
  const dayLabel = formatPathDayCompletionLabel(enrollment.current_day, dayTitle);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <View style={[styles.root, { backgroundColor: PageBg.default }]}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Space.lg }]}>
          <View style={styles.headerMeta}>
            <View style={styles.dayPill}>
              <AppText variant="bold" style={styles.dayPillText}>{dayLabel}</AppText>
            </View>
            <AppText style={styles.seedTitle} numberOfLines={1}>{seedTitle}</AppText>
          </View>
          <AppText variant="bold" style={styles.pageTitle}>How did it go?</AppText>
          <AppText style={styles.pageSubtitle}>
            Rate all three areas to unlock your next step
          </AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rating cards */}
          <GlassCard style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <AppText variant="bold" style={styles.ratingTitle}>Energy</AppText>
              {energyLevel !== null ? (
                <View style={styles.valueBadge}>
                  <AppText variant="bold" style={styles.valueBadgeText}>{energyLevel}</AppText>
                </View>
              ) : (
                <AppText style={styles.requiredLabel}>Required</AppText>
              )}
            </View>
            <EmojiRatingBar
              value={energyLevel}
              onChange={setEnergyLevel}
              options={[
                { value: 2, emoji: "😫", label: "Drained" },
                { value: 4, emoji: "🥱", label: "Low" },
                { value: 6, emoji: "😐", label: "Okay" },
                { value: 8, emoji: "🙂", label: "Good" },
                { value: 10, emoji: "⚡", label: "High" },
              ]}
            />
          </GlassCard>

          <GlassCard style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <AppText variant="bold" style={styles.ratingTitle}>Clarity</AppText>
              {confusionLevel !== null ? (
                <View style={styles.valueBadge}>
                  <AppText variant="bold" style={styles.valueBadgeText}>{confusionLevel}</AppText>
                </View>
              ) : (
                <AppText style={styles.requiredLabel}>Required</AppText>
              )}
            </View>
            <EmojiRatingBar
              value={confusionLevel}
              onChange={setConfusionLevel}
              options={[
                { value: 2, emoji: "😵", label: "Lost" },
                { value: 4, emoji: "😕", label: "Hazy" },
                { value: 6, emoji: "😐", label: "Okay" },
                { value: 8, emoji: "💡", label: "Clear" },
                { value: 10, emoji: "🔮", label: "Aha!" },
              ]}
            />
          </GlassCard>

          <GlassCard style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <AppText variant="bold" style={styles.ratingTitle}>Interest</AppText>
              {interestLevel !== null ? (
                <View style={styles.valueBadge}>
                  <AppText variant="bold" style={styles.valueBadgeText}>{interestLevel}</AppText>
                </View>
              ) : (
                <AppText style={styles.requiredLabel}>Required</AppText>
              )}
            </View>
            <EmojiRatingBar
              value={interestLevel}
              onChange={setInterestLevel}
              options={[
                { value: 2, emoji: "😴", label: "Boring" },
                { value: 4, emoji: "🥱", label: "Meh" },
                { value: 6, emoji: "😐", label: "Okay" },
                { value: 8, emoji: "🙂", label: "Fun" },
                { value: 10, emoji: "🤩", label: "Love" },
              ]}
            />
          </GlassCard>

          {/* Thoughts */}
          <View style={styles.thoughtsSection}>
            <View style={styles.thoughtsLabelRow}>
              <AppText variant="bold" style={styles.ratingTitle}>Thoughts</AppText>
              <AppText style={styles.optionalLabel}>optional</AppText>
            </View>

            {showVoiceAI ? (
              <VoiceAIReflection
                onSave={(transcript) => {
                  setOpenResponse(transcript);
                  setShowVoiceAI(false);
                }}
                onDismiss={() => setShowVoiceAI(false)}
              />
            ) : (
              <GlassCard style={styles.textCard}>
                <TextInput
                  style={styles.textInput}
                  placeholder="What stood out today? Any surprises?"
                  placeholderTextColor="#9CA3AF"
                  value={openResponse}
                  onChangeText={setOpenResponse}
                  multiline
                  numberOfLines={4}
                />
                {!openResponse && (
                  <Pressable style={styles.voiceButton} onPress={() => setShowVoiceAI(true)}>
                    <AppText style={styles.voiceIcon}>🎙️</AppText>
                    <AppText style={styles.voiceText}>Reflect with Voice AI</AppText>
                  </Pressable>
                )}
              </GlassCard>
            )}
          </View>

          {/* Decision section */}
          <View style={styles.decisionSection}>
            <AppText variant="bold" style={styles.decisionTitle}>What's next?</AppText>

            {!allRatingsSet && (
              <View style={styles.nudge}>
                <AppText style={styles.nudgeText}>
                  Complete all three ratings above to continue
                </AppText>
              </View>
            )}

            <View style={{ opacity: allRatingsSet ? 1 : 0.35 }}>
              {isLastDay ? (
                <GlassButton
                  variant="primary"
                  fullWidth
                  size="large"
                  onPress={() => handleSubmit("final_reflection")}
                  disabled={submitting || scoring || !allRatingsSet}
                >
                  Complete Path & See Report
                </GlassButton>
              ) : (
                <>
                  <GlassButton
                    variant="primary"
                    fullWidth
                    size="large"
                    onPress={() => handleSubmit("continue_tomorrow")}
                    disabled={submitting || scoring || !allRatingsSet}
                  >
                    Done for Today
                  </GlassButton>

                  <View style={{ height: Space.md }} />

                  <GlassButton
                    variant="secondary"
                    fullWidth
                    size="large"
                    onPress={() => handleSubmit("continue_now")}
                    disabled={submitting || scoring || !allRatingsSet}
                  >
                    {`Continue to Day ${enrollment.current_day + 1}`}
                  </GlassButton>

                  <View style={styles.secondaryRow}>
                    <GlassButton
                      variant="ghost"
                      fullWidth
                      onPress={() => handleSubmit("pause")}
                      disabled={submitting || scoring || !allRatingsSet}
                    >
                      Pause
                    </GlassButton>
                    <GlassButton
                      variant="danger"
                      fullWidth
                      onPress={() => handleSubmit("quit")}
                      disabled={submitting || scoring || !allRatingsSet}
                    >
                      Quit Path
                    </GlassButton>
                  </View>
                </>
              )}
            </View>

            {(submitting || scoring) && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={Accent.yellow} />
                <AppText style={styles.statusText}>
                  {scoring ? "Calculating scores..." : "Saving reflection..."}
                </AppText>
              </View>
            )}

            {scoreError && (
              <View style={styles.scoreError}>
                <AppText style={styles.scoreErrorText}>{scoreError}</AppText>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.xl,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: PageBg.default,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginBottom: Space.md,
  },
  dayPill: {
    backgroundColor: Accent.yellow,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dayPillText: {
    fontSize: 12,
    color: "#111",
  },
  seedTitle: {
    fontSize: 13,
    color: ThemeText.secondary,
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: ThemeText.primary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: Type.body.fontSize,
    color: ThemeText.secondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space["2xl"],
    gap: Space.md,
  },
  ratingCard: {
    padding: Space.xl,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  ratingTitle: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
  },
  valueBadge: {
    backgroundColor: Accent.yellow,
    borderRadius: Radius.full,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  valueBadgeText: {
    fontSize: 14,
    color: "#111",
  },
  requiredLabel: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  thoughtsSection: {
    gap: Space.md,
    marginTop: Space.sm,
  },
  thoughtsLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  optionalLabel: {
    fontSize: 12,
    color: ThemeText.tertiary,
    fontStyle: "italic",
  },
  textCard: {
    padding: Space.xl,
  },
  textInput: {
    backgroundColor: "transparent",
    fontSize: Type.body.fontSize,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.primary,
    minHeight: 90,
    textAlignVertical: "top",
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  voiceIcon: {
    fontSize: 18,
  },
  voiceText: {
    fontSize: 14,
    color: ThemeText.secondary,
  },
  decisionSection: {
    gap: Space.md,
    marginTop: Space.lg,
  },
  decisionTitle: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
    textAlign: "center",
  },
  nudge: {
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.md,
    padding: Space.md,
    alignItems: "center",
  },
  nudgeText: {
    fontSize: 13,
    color: "#92400E",
    textAlign: "center",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: Space.md,
    marginTop: Space.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: Space.sm,
  },
  statusText: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.secondary,
  },
  scoreError: {
    backgroundColor: "#FEF3C7",
    borderRadius: Radius.md,
    padding: Space.md,
  },
  scoreErrorText: {
    fontSize: 13,
    color: "#92400E",
    textAlign: "center",
  },
});
