import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { AnimatedSplash } from "../components/AnimatedSplash";
import {
  getEnrollmentDayBundle,
  updateActivityProgress,
  type EnrollmentWithPath,
} from "../../lib/pathlab";
import type { PathDay } from "../../types/pathlab";
import type { PathActivityWithContent } from "../../types/pathlab-content";
import { warmPathDayBundle } from "../../lib/pathlabSession";
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

      // Automatically navigate to first incomplete activity
      const firstIncomplete = activitiesData.find(
        (a) => a.progress?.status !== "completed"
      );

      if (firstIncomplete) {
        const activityIndex = activitiesData.findIndex(a => a.id === firstIncomplete.id);
        console.log("🎯 Auto-navigating to first incomplete activity:", {
          id: firstIncomplete.id,
          index: activityIndex,
          totalActivities: activitiesData.length,
        });
        router.replace(`/activity/${firstIncomplete.id}?enrollmentId=${enrollmentId}&pageIndex=${activityIndex}&totalPages=${activitiesData.length}`);
        return;
      }

      // If all activities are complete, stay on this screen to show reflection button
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

  const completedCount = activities.filter(
    (a) => a.progress?.status === "completed"
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <AppText style={styles.backText}>← Back</AppText>
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="bold" style={styles.dayLabel}>Day {enrollment.current_day}</AppText>
          <AppText style={styles.seedTitle} numberOfLines={1}>
            {enrollment.path.seed.title}
          </AppText>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Vertical ScrollView with all activities */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Context Text (show at top) */}
        {pathDay?.context_text && (
          <GlassCard variant="destination" style={styles.contextCard}>
            <AppText style={styles.contextText}>{pathDay.context_text}</AppText>
          </GlassCard>
        )}

        {/* Section Title */}
        <AppText variant="bold" style={styles.sectionTitle}>Today's Activities</AppText>

        {/* All Activities as Cards */}
        {activities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            index={index + 1}
            completed={activity.progress?.status === "completed"}
            onComplete={() => handleActivityComplete(activity.id)}
            enrollmentId={enrollmentId!}
            totalActivities={activities.length}
          />
        ))}

        {/* Finish Day Button */}
        {allActivitiesCompleted && (
          <GlassButton
            variant="primary"
            onPress={handleFinishDay}
            fullWidth
            style={{ marginTop: Space["2xl"] }}
          >
            Complete Day & Reflect
          </GlassButton>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ActivityCard({
  activity,
  index,
  completed,
  onComplete,
  enrollmentId,
  totalActivities,
}: {
  activity: PathActivityWithContent;
  index: number;
  completed: boolean;
  onComplete: () => void;
  enrollmentId: string;
  totalActivities: number;
}) {
  // Determine activity type from content or assessment
  const activityType = activity.path_content?.[0]?.content_type ||
                      activity.path_assessment?.assessment_type ||
                      'unknown';

  const getTypeIcon = (type: string) => {
    switch (type) {
      // Content types
      case "npc_chat":
        return "💬";
      case "ai_chat":
        return "🤖";
      case "video":
      case "short_video":
        return "🎬";
      case "text":
        return "📖";
      case "daily_prompt":
        return "💡";
      // Assessment types
      case "quiz":
        return "❓";
      case "daily_reflection":
        return "💭";
      case "text_answer":
        return "✍️";
      case "checklist":
        return "✓";
      default:
        return "📋";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      // Content types
      case "npc_chat":
        return "Conversation";
      case "ai_chat":
        return "AI Chat";
      case "video":
      case "short_video":
        return "Video";
      case "text":
        return "Reading";
      case "daily_prompt":
        return "Prompt";
      // Assessment types
      case "quiz":
        return "Quiz";
      case "daily_reflection":
        return "Reflection";
      case "text_answer":
        return "Writing";
      case "checklist":
        return "Checklist";
      default:
        return "Activity";
    }
  };

  const handlePress = () => {
    if (completed) return;
    const url = `/activity/${activity.id}?enrollmentId=${enrollmentId}&pageIndex=${index - 1}&totalPages=${totalActivities}`;
    console.log('[ActivityCard] Navigating to:', url, { index, totalActivities });
    router.push(url);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCardWrapper,
        pressed && styles.taskCardPressed,
      ]}
      onPress={handlePress}
      disabled={completed}
    >
      <GlassCard 
        variant="neutral" 
        noPadding 
        style={[styles.taskCardInner, completed && styles.taskCardCompleted]}
      >
        <View style={styles.taskIndex}>
          {completed ? (
            <AppText style={styles.taskCheckmark}>✓</AppText>
          ) : (
            <AppText variant="bold" style={styles.taskNumber}>{index}</AppText>
          )}
        </View>

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <AppText style={styles.taskIcon}>{getTypeIcon(activityType)}</AppText>
            <AppText variant="bold" style={styles.taskType}>{getTypeLabel(activityType)}</AppText>
            {activity.estimated_minutes && (
              <AppText style={styles.taskDuration}>• {activity.estimated_minutes}m</AppText>
            )}
          </View>
          <AppText variant="bold" style={[styles.taskTitle, completed && styles.taskTitleCompleted]}>
            {activity.title}
          </AppText>
          {activity.instructions && (
            <AppText style={styles.taskDescription} numberOfLines={2}>
              {activity.instructions}
            </AppText>
          )}
        </View>
      </GlassCard>
    </Pressable>
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
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: Space.lg,
  },
  dayLabel: {
    fontSize: Type.label.fontSize,
    color: Accent.yellow,
    backgroundColor: ThemeText.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  seedTitle: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
    marginTop: 4,
  },
  contextCard: {
    marginBottom: Space.xl,
  },
  contextText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.xl,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: Type.label.fontSize,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Space.lg,
  },
  taskCardWrapper: {
    marginBottom: Space.md,
  },
  taskCardInner: {
    flexDirection: "row",
    padding: Space.lg,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskCardPressed: {
    opacity: 0.8,
  },
  taskIndex: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Space.md,
  },
  taskNumber: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  taskCheckmark: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  taskIcon: {
    fontSize: Type.body.fontSize,
  },
  taskType: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.muted,
    textTransform: "uppercase",
  },
  taskDuration: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.muted,
  },
  taskTitle: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    color: ThemeText.muted,
    textDecorationLine: "line-through",
  },
  taskDescription: {
    fontSize: Type.caption.fontSize + 2,
    color: ThemeText.secondary,
    lineHeight: 18,
  },
});
