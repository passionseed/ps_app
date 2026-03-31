import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { AnimatedSplash } from "../../components/AnimatedSplash";
import {
  getEnrollmentDayBundle,
  updateActivityProgress,
  type EnrollmentWithPath,
} from "../../lib/pathlab";
import type { PathDay } from "../../types/pathlab";
import type { PathActivityWithContent } from "../../types/pathlab-content";
import { warmPathDayBundle } from "../../lib/pathlabSession";
import { formatPathDayLabel } from "../../lib/pathlab-day-label";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  StepThemes,
  Type,
  Space,
} from "../../lib/theme";
import { AppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";

export default function DailyPathScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentWithPath | null>(null);
  const [pathDay, setPathDay] = useState<PathDay | null>(null);
  const [activities, setActivities] = useState<PathActivityWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!enrollmentId) {
      setError("No enrollment ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dayBundle = await getEnrollmentDayBundle(enrollmentId);

      if (!dayBundle) {
        console.error("❌ No enrollment/day bundle found for ID:", enrollmentId);
        setError("Enrollment not found");
        return;
      }

      const { enrollment: enrollmentData, pathDay: dayData, activities: activitiesData } = dayBundle;

      console.log("✅ Enrollment loaded:", {
        id: enrollmentData.id,
        path_id: enrollmentData.path_id,
        current_day: enrollmentData.current_day,
        status: enrollmentData.status,
      });

      setEnrollment(enrollmentData as EnrollmentWithPath);
      console.log("📦 Path day data received:", JSON.stringify(dayData, null, 2));
      setPathDay(dayData);
      console.log("📚 Fetching activities for path_day_id:", dayData.id);
      console.log("✅ Activities received:", activitiesData.length, "activities");

      if (activitiesData.length === 0) {
        console.warn("⚠️ No activities found for this day");
      }

      setActivities(activitiesData);
      warmPathDayBundle(enrollmentId, {
        enrollment: enrollmentData,
        pathDay: dayData,
        activities: activitiesData,
      });

      // Removed auto-navigation so users can explore the list freely
    } catch (error) {
      console.error("❌ Failed to load path data:", error);
      setError(error instanceof Error ? error.message : "Failed to load path data");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleActivityComplete = async (activityId: string) => {
    try {
      await updateActivityProgress({
        enrollmentId: enrollmentId!,
        activityId,
        status: "completed",
      });

      // Update local state
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                progress: {
                  ...activity.progress!,
                  status: "completed" as const,
                  completed_at: new Date().toISOString(),
                },
              }
            : activity
        )
      );
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const allActivitiesCompleted =
    activities.length > 0 &&
    activities
      .filter((a) => a.is_required)
      .every((activity) => activity.progress?.status === "completed");

  const completedCount = activities.filter(
    (a) => a.progress?.status === "completed"
  ).length;

  const handleStartDay = () => {
    const firstIncomplete = activities.find(
      (a) => a.progress?.status !== "completed"
    );

    if (firstIncomplete) {
      const activityIndex = activities.findIndex(a => a.id === firstIncomplete.id);
      router.push(`/activity/${firstIncomplete.id}?enrollmentId=${enrollmentId}&pageIndex=${activityIndex}&totalPages=${activities.length}`);
    } else {
      router.push(`/reflection/${enrollmentId}`);
    }
  };

  const handleFinishDay = () => {
    router.push(`/reflection/${enrollmentId}`);
  };

  if (loading) {
    return <AnimatedSplash />;
  }

  if (!enrollment || !pathDay) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorIcon}>🎉</AppText>
        <AppText variant="bold" style={styles.errorTitle}>
          {error ? "Unable to Load Path" : "Path Completed!"}
        </AppText>
        <AppText style={styles.errorText}>
          {error || "You've finished exploring this path"}
        </AppText>
        <GlassButton variant="primary" onPress={() => router.back()}>
          Go Back
        </GlassButton>
      </View>
    );
  }

  const progressPercentage = activities.length > 0 ? (completedCount / activities.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <AppText variant="bold" style={styles.dayLabel}>Day {enrollment.current_day}</AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Vertical ScrollView with all activities */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <AppText variant="bold" style={styles.mainTitle}>
            {pathDay.title
              ? formatPathDayLabel(enrollment.current_day, pathDay.title)
              : enrollment.path.seed.title}
          </AppText>
          {pathDay?.context_text && (
            <AppText style={styles.contextText}>{pathDay.context_text}</AppText>
          )}
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <AppText variant="bold" style={styles.progressTitle}>ความคืบหน้าของวันนี้</AppText>
            <AppText style={styles.progressCount}>{completedCount}/{activities.length} สำเร็จ</AppText>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* Timeline Activities */}
        <View style={styles.timelineContainer}>
          {activities.map((activity, index) => {
            const isLast = index === activities.length - 1;
            const completed = activity.progress?.status === "completed";
            const isNext = !completed && (index === 0 || activities[index - 1].progress?.status === "completed");

            return (
              <ActivityTimelineCard
                key={activity.id}
                activity={activity}
                index={index + 1}
                completed={completed}
                isNext={isNext}
                isLast={isLast}
                enrollmentId={enrollmentId!}
                totalActivities={activities.length}
              />
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Button area */}
      <View style={styles.ctaContainer}>
        {allActivitiesCompleted ? (
          <GlassButton
            variant="primary"
            onPress={handleFinishDay}
            fullWidth
          >
            ทบทวนบทเรียนวันนี้
          </GlassButton>
        ) : (
          <GlassButton
            variant="primary"
            onPress={handleStartDay}
            fullWidth
          >
            {completedCount > 0 ? "เรียนต่อ" : "เริ่มเรียนของวันนี้"}
          </GlassButton>
        )}
      </View>
    </View>
  );
}

function ActivityTimelineCard({
  activity,
  index,
  completed,
  isNext,
  isLast,
  enrollmentId,
  totalActivities,
}: {
  activity: PathActivityWithContent;
  index: number;
  completed: boolean;
  isNext: boolean;
  isLast: boolean;
  enrollmentId: string;
  totalActivities: number;
}) {
  // Determine activity type from content or assessment
  const activityType = activity.path_content?.[0]?.content_type ||
                      activity.path_assessment?.assessment_type ||
                      'unknown';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "npc_chat": return "💬";
      case "ai_chat": return "🤖";
      case "video":
      case "short_video": return "🎬";
      case "text": return "📖";
      case "daily_prompt": return "💡";
      case "quiz": return "❓";
      case "daily_reflection": return "💭";
      case "text_answer": return "✍️";
      case "checklist": return "✓";
      default: return "📋";
    }
  };

  const handlePress = () => {
    // Navigate even if completed
    const url = `/activity/${activity.id}?enrollmentId=${enrollmentId}&pageIndex=${index - 1}&totalPages=${totalActivities}`;
    router.push(url);
  };

  return (
    <View style={styles.timelineRow}>
      {/* Connector Line & Dot */}
      <View style={styles.timelineGraphic}>
        <View style={[
          styles.timelineDot,
          completed ? styles.dotCompleted : isNext ? styles.dotNext : styles.dotPending
        ]}>
          {completed ? (
            <AppText style={styles.checkmark}>✓</AppText>
          ) : (
            <AppText style={[styles.dotNumber, isNext && styles.dotNumberNext]}>{index}</AppText>
          )}
        </View>
        {!isLast && (
          <View style={[styles.timelineLine, completed && styles.lineCompleted]} />
        )}
      </View>

      {/* Content Card */}
      <Pressable
        style={({ pressed }) => [
          styles.cardWrapper,
          pressed && { opacity: 0.8 }
        ]}
        onPress={handlePress}
      >
        <GlassCard variant={completed ? "neutral" : "experience"} style={[
          styles.activityCard,
          completed && styles.activityCardCompleted
        ]}>
          <View style={styles.cardHeader}>
            <View style={styles.typeTag}>
              <AppText style={styles.typeIcon}>{getTypeIcon(activityType)}</AppText>
            </View>
            {activity.estimated_minutes && (
              <AppText style={styles.durationTag}>{activity.estimated_minutes} นาที</AppText>
            )}
          </View>
          <AppText variant="bold" style={styles.activityTitle}>{activity.title}</AppText>
          {activity.instructions && (
            <AppText style={styles.activityDesc} numberOfLines={2}>
              {activity.instructions}
            </AppText>
          )}
        </GlassCard>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: Type.title.fontSize,
    fontWeight: Type.title.fontWeight,
    color: ThemeText.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Space["5xl"],
    paddingHorizontal: Space.xl,
    paddingBottom: Space.lg,
  },
  backText: {
    fontSize: 24,
    color: ThemeText.primary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.xl,
    paddingTop: 8,
  },
  titleBlock: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    color: "#111",
    marginBottom: 8,
  },
  contextText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    color: "#111",
  },
  progressCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineGraphic: {
    alignItems: "center",
    marginRight: 16,
    width: 32,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    zIndex: 2,
    backgroundColor: "#fff",
  },
  dotCompleted: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  dotNext: {
    borderColor: "#3B82F6",
  },
  dotPending: {
    borderColor: "#E5E7EB",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  dotNumber: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  dotNumberNext: {
    color: "#3B82F6",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: -4,
    marginBottom: -16, // extends into the next row
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: "#10B981",
  },
  cardWrapper: {
    flex: 1,
    paddingBottom: 8,
  },
  activityCard: {
    padding: 16,
    borderRadius: 20,
  },
  activityCardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeTag: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  typeIcon: {
    fontSize: 16,
  },
  durationTag: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  activityTitle: {
    fontSize: 18,
    color: "#111",
    marginBottom: 6,
  },
  activityDesc: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: "rgba(248, 249, 250, 0.9)",
  },
});
