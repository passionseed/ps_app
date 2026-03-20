import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  getPathDay,
  getPathDayActivities,
  updateActivityProgress,
} from "../../lib/pathlab";
import type { PathDay, PathEnrollment } from "../../types/pathlab";
import type { PathActivityWithContent } from "../../types/pathlab-content";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  StepThemes,
} from "../../lib/theme";

type EnrollmentWithPath = PathEnrollment & {
  path: {
    id: string;
    total_days: number;
    seed: {
      id: string;
      title: string;
    };
  };
};

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
      // Get enrollment with path info
      const { data: enrollmentData, error: enrollError } = await supabase
        .from("path_enrollments")
        .select(`
          *,
          path:paths(
            id,
            total_days,
            seed:seeds(id, title)
          )
        `)
        .eq("id", enrollmentId)
        .single();

      if (enrollError) {
        console.error("❌ Error loading enrollment:", enrollError);
        setError(`Failed to load enrollment: ${enrollError.message}`);
        return;
      }

      if (!enrollmentData) {
        console.error("❌ No enrollment found for ID:", enrollmentId);
        setError("Enrollment not found");
        return;
      }

      console.log("✅ Enrollment loaded:", {
        id: enrollmentData.id,
        path_id: enrollmentData.path_id,
        current_day: enrollmentData.current_day,
        status: enrollmentData.status,
      });

      setEnrollment(enrollmentData as EnrollmentWithPath);

      // Validate required fields for path day lookup
      if (!enrollmentData.path_id) {
        console.error("❌ Enrollment missing path_id:", enrollmentData);
        setError("Enrollment is missing path information");
        return;
      }

      if (!enrollmentData.current_day || enrollmentData.current_day < 1) {
        console.error("❌ Enrollment has invalid current_day:", enrollmentData.current_day);
        setError("Invalid day number in enrollment");
        return;
      }

      // Get today's path day
      console.log("📅 Fetching path day for:", {
        path_id: enrollmentData.path_id,
        current_day: enrollmentData.current_day,
      });

      const dayData = await getPathDay(
        enrollmentData.path_id,
        enrollmentData.current_day
      );

      console.log("📦 Path day data received:", JSON.stringify(dayData, null, 2));

      if (!dayData) {
        console.error("❌ NO PATH DAY FOUND for path_id:", enrollmentData.path_id, "day:", enrollmentData.current_day);
        setError(`No path day found for day ${enrollmentData.current_day}`);
        setPathDay(null);
        return;
      }

      setPathDay(dayData);

      // Get activities for today's path day
      console.log("📚 Fetching activities for path_day_id:", dayData.id);
      const activitiesData = await getPathDayActivities(dayData.id, enrollmentId);
      console.log("✅ Activities received:", activitiesData.length, "activities");

      if (activitiesData.length === 0) {
        console.warn("⚠️ No activities found for this day");
      }

      setActivities(activitiesData);

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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!enrollment || !pathDay) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎉</Text>
        <Text style={styles.errorTitle}>
          {error ? "Unable to Load Path" : "Path Completed!"}
        </Text>
        <Text style={styles.errorText}>
          {error || "You've finished exploring this path"}
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
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
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.dayLabel}>Day {enrollment.current_day}</Text>
          <Text style={styles.seedTitle} numberOfLines={1}>
            {enrollment.path.seed.title}
          </Text>
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
          <View style={styles.contextCard}>
            <Text style={styles.contextText}>{pathDay.context_text}</Text>
          </View>
        )}

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Today's Activities</Text>

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
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleFinishDay}
          >
            <Text style={styles.ctaText}>Complete Day & Reflect</Text>
          </Pressable>
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
        styles.taskCard,
        completed && styles.taskCardCompleted,
        pressed && styles.taskCardPressed,
      ]}
      onPress={handlePress}
      disabled={completed}
    >
      <View style={styles.taskIndex}>
        {completed ? (
          <Text style={styles.taskCheckmark}>✓</Text>
        ) : (
          <Text style={styles.taskNumber}>{index}</Text>
        )}
      </View>

      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskIcon}>{getTypeIcon(activityType)}</Text>
          <Text style={styles.taskType}>{getTypeLabel(activityType)}</Text>
          {activity.estimated_minutes && (
            <Text style={styles.taskDuration}>• {activity.estimated_minutes}m</Text>
          )}
        </View>
        <Text style={[styles.taskTitle, completed && styles.taskTitleCompleted]}>
          {activity.title}
        </Text>
        {activity.instructions && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {activity.instructions}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.tertiary,
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Accent.yellow,
    borderRadius: Radius.md,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.tertiary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: Accent.yellow,
    backgroundColor: ThemeText.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  seedTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: ThemeText.tertiary,
    marginTop: 4,
  },
  contextCard: {
    margin: 20,
    padding: 16,
    backgroundColor: StepThemes.job.accentLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: StepThemes.job.border,
    ...Shadow.neutral,
  },
  contextText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#333",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Border.default,
    ...Shadow.neutral,
  },
  taskCardCompleted: {
    backgroundColor: "#f8f8f8",
    borderColor: "#ddd",
  },
  taskCardPressed: {
    opacity: 0.9,
  },
  taskIndex: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  taskNumber: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  taskCheckmark: {
    fontSize: 16,
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
    fontSize: 14,
  },
  taskType: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.muted,
    textTransform: "uppercase",
  },
  taskDuration: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: ThemeText.muted,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.primary,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    color: ThemeText.muted,
    textDecorationLine: "line-through",
  },
  taskDescription: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: ThemeText.secondary,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: 24,
    ...Shadow.card,
  },
  ctaButtonPressed: {
    backgroundColor: Accent.yellowDark,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: ThemeText.primary,
  },
});
