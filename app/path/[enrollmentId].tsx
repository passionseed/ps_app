import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DailyPathScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentWithPath | null>(null);
  const [pathDay, setPathDay] = useState<PathDay | null>(null);
  const [activities, setActivities] = useState<PathActivityWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const hasNavigatedRef = useRef<Set<string>>(new Set());

  const onViewableItemsChangedRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPageIndex(viewableItems[0].index || 0);
    }
  });
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
  });

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
        console.warn("⚠️ No activities found for this day. Path day has activity_count:", dayData.activity_count);
      }

      setActivities(activitiesData);

      // Scroll to first incomplete activity
      setTimeout(() => {
        const firstIncompleteIndex = activitiesData.findIndex(
          (a) => a.progress?.status !== "completed"
        );
        if (firstIncompleteIndex >= 0 && flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: firstIncompleteIndex,
            animated: false,
          });
          setCurrentPageIndex(firstIncompleteIndex);
        }
      }, 100);
    } catch (error) {
      console.error("❌ Failed to load path data:", error);
      setError(error instanceof Error ? error.message : "Failed to load path data");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      // Clear navigation tracking when screen comes into focus
      hasNavigatedRef.current.clear();
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

      {/* Page Indicator Dots */}
      <View style={styles.dotsContainer}>
        {activities.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentPageIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Horizontal Paging Activities */}
      <FlatList
        ref={flatListRef}
        data={activities}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        viewabilityConfig={viewabilityConfigRef.current}
        renderItem={({ item: activity, index }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <ActivityPage
              activity={activity}
              index={index}
              enrollmentId={enrollmentId!}
              pathDay={pathDay}
              isLast={index === activities.length - 1}
              allCompleted={allActivitiesCompleted}
              onFinishDay={handleFinishDay}
              hasNavigatedRef={hasNavigatedRef}
              currentPageIndex={currentPageIndex}
              totalPages={activities.length}
            />
          </View>
        )}
      />
    </View>
  );
}

function ActivityCard({
  activity,
  index,
  completed,
  onComplete,
  enrollmentId,
}: {
  activity: PathActivityWithContent;
  index: number;
  completed: boolean;
  onComplete: () => void;
  enrollmentId: string;
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
    router.push(`/activity/${activity.id}?enrollmentId=${enrollmentId}`);
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

function ActivityPage({
  activity,
  index,
  enrollmentId,
  pathDay,
  isLast,
  allCompleted,
  onFinishDay,
  hasNavigatedRef,
  currentPageIndex,
  totalPages,
}: {
  activity: PathActivityWithContent;
  index: number;
  enrollmentId: string;
  pathDay: PathDay | null;
  isLast: boolean;
  allCompleted: boolean;
  onFinishDay: () => void;
  hasNavigatedRef: React.MutableRefObject<Set<string>>;
  currentPageIndex: number;
  totalPages: number;
}) {
  const completed = activity.progress?.status === "completed";

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "npc_chat": return "Conversation";
      case "ai_chat": return "AI Chat";
      case "video":
      case "short_video": return "Video";
      case "text": return "Reading";
      case "daily_prompt": return "Prompt";
      case "quiz": return "Quiz";
      case "daily_reflection": return "Reflection";
      case "text_answer": return "Writing";
      case "checklist": return "Checklist";
      default: return "Activity";
    }
  };

  return (
    <ScrollView
      style={styles.activityPageScroll}
      contentContainerStyle={styles.activityPageContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Context (show on first page only) */}
      {index === 0 && pathDay?.context_text && (
        <View style={styles.contextCard}>
          <Text style={styles.contextText}>{pathDay.context_text}</Text>
        </View>
      )}

      {/* Activity Card */}
      <View style={styles.activityPageCard}>
        <View style={styles.activityPageHeader}>
          <View style={styles.activityTypeRow}>
            <Text style={styles.activityPageIcon}>{getTypeIcon(activityType)}</Text>
            <Text style={styles.activityPageType}>{getTypeLabel(activityType)}</Text>
          </View>
          {activity.estimated_minutes && (
            <Text style={styles.activityPageDuration}>{activity.estimated_minutes} min</Text>
          )}
        </View>

        <Text style={styles.activityPageTitle}>{activity.title}</Text>

        {activity.instructions && (
          <Text style={styles.activityPageInstructions}>{activity.instructions}</Text>
        )}

        {completed ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeIcon}>✓</Text>
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
            onPress={() => {
              router.push(
                `/activity/${activity.id}?enrollmentId=${enrollmentId}&pageIndex=${index}&totalPages=${totalPages}`
              );
            }}
          >
            <Text style={styles.startButtonText}>Start Activity</Text>
          </Pressable>
        )}
      </View>

      {/* Finish Day Button (show on last page when all completed) */}
      {isLast && allCompleted && (
        <Pressable
          style={({ pressed }) => [
            styles.finishDayButton,
            pressed && styles.finishDayButtonPressed,
          ]}
          onPress={onFinishDay}
        >
          <Text style={styles.finishDayButtonText}>Complete Day & Reflect</Text>
        </Pressable>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
  progressText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#eee",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Accent.yellow,
    borderRadius: 2,
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
  emptyTasks: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.muted,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: PageBg.default,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ctaButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    ...Shadow.card,
  },
  ctaButtonPressed: {
    backgroundColor: Accent.yellowDark,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  // Page Indicator Dots
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
  },
  dotActive: {
    backgroundColor: "#BFFF00",
    width: 24,
  },
  // Activity Page Styles
  activityPageScroll: {
    flex: 1,
  },
  activityPageContent: {
    padding: 20,
  },
  activityPageCard: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    padding: 24,
    ...Shadow.card,
  },
  activityPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activityTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityPageIcon: {
    fontSize: 24,
  },
  activityPageType: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
  },
  activityPageDuration: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.muted,
  },
  activityPageTitle: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: ThemeText.primary,
    marginBottom: 16,
    lineHeight: 32,
  },
  activityPageInstructions: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.secondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    ...Shadow.card,
  },
  startButtonPressed: {
    backgroundColor: Accent.yellowDark,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d1fae5",
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  completedBadgeIcon: {
    fontSize: 20,
    color: "#10b981",
  },
  completedBadgeText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#065f46",
  },
  finishDayButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: 24,
    ...Shadow.card,
  },
  finishDayButtonPressed: {
    backgroundColor: "#9FE800",
  },
  finishDayButtonText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: ThemeText.primary,
  },
});
