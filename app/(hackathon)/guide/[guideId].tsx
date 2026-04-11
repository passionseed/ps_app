import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../components/AppText";
import { HackathonBackground } from "../../../components/Hackathon/HackathonBackground";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import {
  fetchGuideWithCompletion,
  fetchGuideDays,
  completeDay,
  type DayProgress,
  type GuideWithCompletion,
} from "../../../lib/mentorGuides";

const BG = "#03050a";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const CYAN20 = "rgba(145,196,227,0.20)";
const CYAN45 = "rgba(145,196,227,0.45)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";
const GREEN = "#4ADE80";
const GOLD = "#FBBF24";
const LOCK_GRAY = "rgba(255,255,255,0.15)";

type PromptType = "text" | "prompt" | "affirmation";

function getPromptStyle(type: PromptType) {
  switch (type) {
    case "prompt":
      return {
        borderColor: CYAN + "50",
        backgroundColor: "rgba(145,196,227,0.06)",
        icon: "👁️",
        label: "Notice This",
      };
    case "affirmation":
      return {
        borderColor: GOLD + "50",
        backgroundColor: "rgba(251,191,36,0.06)",
        icon: "✨",
        label: "Say This Today",
      };
    default:
      return {
        borderColor: BORDER,
        backgroundColor: "rgba(13,18,25,0.6)",
        icon: "📖",
        label: "",
      };
  }
}

function DayCard({
  day,
  onPress,
  isLastCompletedDay,
}: {
  day: DayProgress;
  onPress: () => void;
  isLastCompletedDay: boolean;
}) {
  if (day.is_completed) {
    return (
      <Pressable style={styles.dayCard} onPress={onPress}>
        <LinearGradient
          colors={["rgba(74,222,128,0.06)", "rgba(13,18,25,0.4)"]}
          style={[styles.dayCardGradient, { borderColor: "rgba(74,222,128,0.25)" }]}
        >
          <View style={styles.dayCardHeader}>
            <View style={styles.dayNumberCompleted}>
              <AppText variant="bold" style={styles.dayNumberText}>
                {day.day_number}
              </AppText>
            </View>
            <AppText variant="bold" style={styles.dayTitle}>
              Day {day.day_number} — Done
            </AppText>
            <AppText style={{ fontSize: 18 }}>✓</AppText>
          </View>
          {day.prompt_content && (
            <AppText style={styles.dayPreview} numberOfLines={1}>
              {day.prompt_content.substring(0, 60)}...
            </AppText>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (!day.is_unlocked) {
    return (
      <View style={[styles.dayCard, { opacity: 0.4 }]}>
        <View
          style={[
            styles.dayCardGradient,
            { borderColor: LOCK_GRAY, backgroundColor: "rgba(13,18,25,0.3)" },
          ]}
        >
          <View style={styles.dayCardHeader}>
            <View style={[styles.dayNumberLocked, { borderColor: LOCK_GRAY }]}>
              <AppText style={{ fontSize: 14, color: LOCK_GRAY }}>🔒</AppText>
            </View>
            <AppText style={[styles.dayTitle, { color: LOCK_GRAY }]}>
              Day {day.day_number} — Locked
            </AppText>
            <AppText style={{ fontSize: 16 }}>🔒</AppText>
          </View>
          <AppText style={{ fontSize: 12, color: LOCK_GRAY }}>
            Complete Day {day.day_number - 1} to unlock
          </AppText>
        </View>
      </View>
    );
  }

  // Current active day
  return (
    <Pressable style={styles.dayCard} onPress={onPress}>
      <LinearGradient
        colors={["rgba(145,196,227,0.1)", "rgba(13,18,25,0.6)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.dayCardGradient, { borderColor: CYAN45 }]}
      >
        <View style={styles.dayCardHeader}>
          <View style={[styles.dayNumberActive, { borderColor: CYAN }]}>
            <AppText variant="bold" style={[styles.dayNumberText, { color: CYAN }]}>
              {day.day_number}
            </AppText>
          </View>
          <AppText variant="bold" style={styles.dayTitle}>
            Day {day.day_number}
          </AppText>
          <AppText style={{ fontSize: 14, color: CYAN, fontFamily: "BaiJamjuree_700Bold" }}>
            READ →
          </AppText>
        </View>
        {day.prompt_content && (
          <AppText style={styles.dayPreview} numberOfLines={2}>
            {day.prompt_content.substring(0, 80)}...
          </AppText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// Day detail view
function DayDetailView({
  day,
  guide,
  onComplete,
  onBack,
}: {
  day: DayProgress;
  guide: GuideWithCompletion;
  onComplete: () => void;
  onBack: () => void;
}) {
  const promptStyle = getPromptStyle("prompt");
  const affirmStyle = getPromptStyle("affirmation");

  return (
    <ScrollView style={styles.dayDetailContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.dayDetailHeader}>
        <Pressable style={styles.backArrow} onPress={onBack}>
          <AppText style={{ fontSize: 20, color: CYAN }}>←</AppText>
        </Pressable>
        <AppText variant="bold" style={styles.dayDetailTitle}>
          Day {day.day_number}
        </AppText>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress indicator */}
      <View style={styles.dayProgressRow}>
        {Array.from({ length: guide.total_days }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dayProgressDot,
              {
                backgroundColor:
                  i + 1 < day.day_number
                    ? GREEN
                    : i + 1 === day.day_number
                    ? CYAN
                    : "rgba(145,196,227,0.15)",
                width: i + 1 === day.day_number ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Prompt card */}
      {day.prompt_content && (
        <View
          style={[
            styles.contentCard,
            { borderColor: promptStyle.borderColor, backgroundColor: promptStyle.backgroundColor },
          ]}
        >
          <View style={styles.contentHeader}>
            <AppText style={styles.contentIcon}>{promptStyle.icon}</AppText>
            <AppText variant="bold" style={styles.contentLabel}>
              {promptStyle.label}
            </AppText>
          </View>
          {day.prompt_content.split("\n").map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <View key={i} style={{ height: 12 }} />;
            return (
              <AppText key={i} style={styles.contentText}>
                {trimmed}
              </AppText>
            );
          })}
        </View>
      )}

      {/* Affirmation card */}
      {day.affirmation_content && (
        <View
          style={[
            styles.contentCard,
            { borderColor: affirmStyle.borderColor, backgroundColor: affirmStyle.backgroundColor },
          ]}
        >
          <View style={styles.contentHeader}>
            <AppText style={styles.contentIcon}>{affirmStyle.icon}</AppText>
            <AppText variant="bold" style={styles.contentLabel}>
              {affirmStyle.label}
            </AppText>
          </View>
          {day.affirmation_content.split("\n").map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <View key={i} style={{ height: 12 }} />;
            return (
              <AppText key={i} style={styles.affirmationText}>
                {trimmed}
              </AppText>
            );
          })}
        </View>
      )}

      {/* Complete button */}
      <View style={styles.completeDaySection}>
        <AppText style={styles.completeHint}>
          Put your phone down. Pick up a pen. Write it by hand.
        </AppText>
        <Pressable style={styles.completeDayButton} onPress={onComplete}>
          <LinearGradient
            colors={[GREEN, "#22C55E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeDayGradient}
          >
            <AppText variant="bold" style={styles.completeDayButtonText}>
              Day {day.day_number} Complete ✓
            </AppText>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Completion celebration
function CompletionCelebration({
  guide,
  onDone,
}: {
  guide: GuideWithCompletion;
  onDone: () => void;
}) {
  return (
    <View style={styles.completionContainer}>
      <AppText style={styles.completionEmoji}>🎉</AppText>
      <AppText variant="bold" style={styles.completionTitle}>
        Guide Complete!
      </AppText>
      <View style={styles.pointsRow}>
        <AppText variant="bold" style={styles.pointsAwarded}>
          +{guide.points_on_completion}
        </AppText>
        <AppText style={styles.pointsLabel}>points awarded</AppText>
      </View>
      <AppText style={styles.completionSubtext}>
        Your team earned points for completing this guide.
      </AppText>
      <Pressable style={styles.doneButton} onPress={onDone}>
        <LinearGradient
          colors={[CYAN, BLUE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.doneButtonGradient}
        >
          <AppText variant="bold" style={styles.doneButtonText}>
            Done
          </AppText>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function GuideReaderScreen() {
  const { guideId } = useLocalSearchParams<{ guideId: string }>();
  const insets = useSafeAreaInsets();
  const [guide, setGuide] = useState<GuideWithCompletion | null>(null);
  const [days, setDays] = useState<DayProgress[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    if (!guideId) return;
    setLoading(true);
    const [guideData, daysData] = await Promise.all([
      fetchGuideWithCompletion(guideId),
      fetchGuideDays(guideId),
    ]);
    setGuide(guideData);
    setDays(daysData);
    setLoading(false);

    // Auto-select the current active day
    if (guideData?.uses_daily_unlock) {
      const activeDay = daysData.find((d) => d.is_unlocked && !d.is_completed);
      setSelectedDay(activeDay ?? null);
    }
  }, [guideId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteDay = useCallback(async () => {
    if (!guideId || !selectedDay || completing) return;
    setCompleting(true);
    try {
      const result = await completeDay(guideId, selectedDay.day_number);
      // Refresh data
      await loadData();

      if (result.awarded > 0) {
        setShowCompletion(true);
      } else {
        // Move to next day or back to list
        const nextDay = days.find(
          (d) => d.day_number === selectedDay.day_number + 1 && d.is_unlocked
        );
        if (nextDay) {
          setSelectedDay(nextDay);
        } else {
          setSelectedDay(null);
        }
      }
    } catch (e: any) {
      console.warn("[guide] day completion failed:", e.message);
      setSelectedDay(null);
    }
    setCompleting(false);
  }, [guideId, selectedDay, completing, days, loadData]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HackathonBackground />
        <View style={styles.header}>
          <SkiaBackButton onPress={() => router.back()} />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <AppText style={{ color: WHITE55, fontSize: 14 }}>Loading guide...</AppText>
        </View>
      </View>
    );
  }

  // Completion celebration
  if (showCompletion && guide) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HackathonBackground />
        <CompletionCelebration
          guide={guide}
          onDone={() => {
            router.back();
            setTimeout(() => router.back(), 100);
          }}
        />
      </View>
    );
  }

  const isDayView = !!selectedDay && guide?.uses_daily_unlock;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <HackathonBackground />

      {/* Header */}
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <AppText variant="bold" style={styles.headerTitle} numberOfLines={1}>
          {guide?.title ?? "Mentor Guide"}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {isDayView && selectedDay && guide ? (
        <DayDetailView
          day={selectedDay}
          guide={guide}
          onComplete={handleCompleteDay}
          onBack={() => setSelectedDay(null)}
        />
      ) : (
        <>
          {/* Guide subtitle */}
          {guide?.subtitle && (
            <View style={styles.subtitleRow}>
              <AppText style={styles.subtitleText}>{guide.subtitle}</AppText>
            </View>
          )}

          {/* Day list */}
          <View style={styles.dayListContainer}>
            <AppText variant="bold" style={styles.dayListTitle}>
              {guide?.uses_daily_unlock
                ? `${guide.days_completed}/${guide.total_days} Days Completed`
                : "Guide Content"}
            </AppText>

            {guide?.uses_daily_unlock ? (
              days.map((day) => (
                <DayCard
                  key={day.day_number}
                  day={day}
                  onPress={() => {
                    if (day.is_unlocked) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDay(day);
                    }
                  }}
                  isLastCompletedDay={day.is_completed}
                />
              ))
            ) : (
              <Pressable
                style={styles.startButton}
                onPress={() => {
                  router.push(`/(hackathon)/guide/${guideId}?mode=legacy`);
                }}
              >
                <LinearGradient
                  colors={[CYAN, BLUE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButtonGradient}
                >
                  <AppText variant="bold" style={styles.startButtonText}>
                    Start Guide
                  </AppText>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    color: WHITE,
    flex: 1,
    textAlign: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitleRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subtitleText: {
    fontSize: 14,
    color: WHITE55,
    lineHeight: 20,
  },
  dayListContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  dayListTitle: {
    fontSize: 16,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: 4,
  },
  dayCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  dayCardGradient: {
    padding: 14,
    gap: 6,
    borderRadius: 14,
  },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayNumberCompleted: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(74,222,128,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  dayNumberActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CYAN20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayNumberLocked: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayNumberText: {
    fontSize: 14,
  },
  dayTitle: {
    fontSize: 15,
    color: WHITE,
    flex: 1,
  },
  dayPreview: {
    fontSize: 12,
    color: WHITE55,
    marginLeft: 40,
  },
  // Day detail
  dayDetailContainer: {
    flex: 1,
  },
  dayDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backArrow: {
    padding: 8,
  },
  dayDetailTitle: {
    fontSize: 20,
    color: WHITE,
  },
  dayProgressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dayProgressDot: {
    height: 8,
    borderRadius: 4,
  },
  contentCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 8,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  contentIcon: {
    fontSize: 18,
  },
  contentLabel: {
    fontSize: 13,
    color: CYAN,
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  contentText: {
    fontSize: 15,
    color: WHITE75,
    lineHeight: 23,
  },
  affirmationText: {
    fontSize: 18,
    color: GOLD,
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 28,
    textAlign: "center",
  },
  completeDaySection: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  completeHint: {
    fontSize: 13,
    color: WHITE55,
    textAlign: "center",
    lineHeight: 20,
  },
  completeDayButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  completeDayGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
  },
  completeDayButtonText: {
    fontSize: 15,
    color: "#03050a",
  },
  // Completion
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  completionEmoji: {
    fontSize: 64,
  },
  completionTitle: {
    fontSize: 24,
    color: WHITE,
  },
  pointsRow: {
    alignItems: "center",
    gap: 4,
  },
  pointsAwarded: {
    fontSize: 48,
    color: GOLD,
  },
  pointsLabel: {
    fontSize: 16,
    color: WHITE55,
  },
  completionSubtext: {
    fontSize: 14,
    color: WHITE55,
    textAlign: "center",
    lineHeight: 20,
  },
  doneButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  doneButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#03050a",
  },
  startButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 12,
  },
  startButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
  },
  startButtonText: {
    fontSize: 15,
    color: "#03050a",
    fontFamily: "BaiJamjuree_700Bold",
  },
});
