import { useEffect, useState, useCallback, useRef, type ComponentProps } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  useWindowDimensions,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { Image as ExpoImage } from "expo-image";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { ensureActivityHasProgress } from "../../lib/activityProgress";
import { supabase } from "../../lib/supabase";
import {
  ensureActivityProgress,
  updateActivityProgress,
  submitAssessment,
} from "../../lib/pathlab";
import {
  getCachedActivityPayload,
  getCachedPathDayBundle,
  updateCachedActivityProgress,
  type DayActivityListItem,
} from "../../lib/pathlabSession";
import {
  getPathlabActivityRoute,
  getPathlabReflectionRoute,
} from "../../lib/pathlabNavigation";
import {
  initializeSounds,
  playActivityCompleteSound,
  cleanupSounds,
} from "../../lib/sounds";
import type {
  PathActivity,
  PathContent,
  PathAssessment,
  PathQuizQuestion,
  PathActivityProgress,
  PathAssessmentSubmission,
} from "../../types/pathlab-content";
import {
  PageBg,
  Text as ThemeText,
  Shadow,
  Radius,
  Accent,
  Space,
} from "../../lib/theme";
import { AppText as BaseAppText } from "../../components/AppText";
import { SwipeProgressDonut } from "../../components/activity/SwipeProgressDonut";

// Glass components
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";

// Sub-components
import ActivityHeader from "../../components/activity/ActivityHeader";
import ActivityPagination from "../../components/activity/ActivityPagination";
import ActivityCompleteButton from "../../components/activity/ActivityCompleteButton";
import TextActivity from "../../components/activity/TextActivity";
import ImageActivity from "../../components/activity/ImageActivity";
import VideoActivity from "../../components/activity/VideoActivity";
import QuizActivity from "../../components/activity/QuizActivity";
import TextAnswerActivity from "../../components/activity/TextAnswerActivity";
import FileUploadActivity from "../../components/activity/FileUploadActivity";
import AIChatActivity from "../../components/activity/AIChatActivity";
import NPCDialogueActivity from "../../components/activity/NPCDialogueActivity";

// --- Types ---

interface ActivityWithContent extends PathActivity {
  path_content: PathContent[];
  path_assessment: (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null;
  progress?: PathActivityProgress;
  submission?: PathAssessmentSubmission | null;
}

// --- Text wrapper ---

type ActivityTextProps = ComponentProps<typeof BaseAppText>;

function AppText({ style, variant = "regular", ...props }: ActivityTextProps) {
  return (
    <BaseAppText
      {...props}
      variant={variant}
      style={[variant === "bold" ? styles.baiBoldText : styles.baiRegularText, style]}
    />
  );
}

// --- Helpers ---

function getActivityType(activity: ActivityWithContent): string {
  if (activity.path_content && activity.path_content.length > 0) {
    return activity.path_content[0].content_type;
  }
  if (activity.path_assessment) {
    return activity.path_assessment.assessment_type;
  }
  return "unknown";
}

function getActivityTypeLabel(activityType: string) {
  switch (activityType) {
    case "video":
    case "short_video":
      return "Video lesson";
    case "text":
      return "Reading activity";
    case "image":
      return "Visual walkthrough";
    case "resource_link":
      return "Resource link";
    case "reflection_prompt":
      return "Reflection prompt";
    case "ai_chat":
      return "Interactive chat";
    case "npc_chat":
      return "Conversation simulation";
    default:
      return "Activity";
  }
}

// --- Constants ---

const HEADER_COLLAPSE_DISTANCE = 96;
const SWIPE_NEXT_THRESHOLD = 220;
const PULL_HINT_SLIDE_PX = 104;

// --- Main Component ---

export default function ActivityDetailScreen() {
  const { activityId, enrollmentId, pageIndex, totalPages } = useLocalSearchParams<{
    activityId: string;
    enrollmentId: string;
    pageIndex?: string;
    totalPages?: string;
  }>();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // --- Core state ---
  const [activity, setActivity] = useState<ActivityWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Granular loading states for skeleton UI
  const [, setLoadingActivity] = useState(true);
  const [, setLoadingContent] = useState(true);
  const [, setLoadingAssessment] = useState(true);
  const [, setLoadingProgress] = useState(true);

  // Pagination
  const [autoCurrentPage, setAutoCurrentPage] = useState(0);
  const [autoTotalPages, setAutoTotalPages] = useState(0);
  const [dayActivitiesCount, setDayActivitiesCount] = useState(0);
  const [dayActivitiesList, setDayActivitiesList] = useState<DayActivityListItem[]>([]);

  // Sub-component completion flags
  const [aiObjectiveMet, setAiObjectiveMet] = useState(false);
  const [npcCompleted, setNpcCompleted] = useState(false);

  // --- Reanimated shared values ---
  const scrollViewRef = useRef<ScrollView>(null);
  const headerScrollY = useSharedValue(0);
  const swipePrevEnabledSV = useSharedValue(0);
  const swipeNextEnabledSV = useSharedValue(0);
  const lastPrevHapticMilestoneSV = useSharedValue(0);
  const lastNextHapticMilestoneSV = useSharedValue(0);
  const prevSwipeThresholdSV = useSharedValue(0);
  const nextSwipeThresholdSV = useSharedValue(0);
  const nextSwipeProgress = useSharedValue(0);
  const bottomReadyProgress = useSharedValue(0);
  const nextSwipePulse = useSharedValue(1);
  const prevSwipeProgress = useSharedValue(0);
  const prevReadyProgress = useSharedValue(0);
  const prevSwipePulse = useSharedValue(1);
  const lastPrevNavAtRef = useRef(0);

  // --- Computed values ---
  const currentPage = pageIndex !== undefined ? parseInt(pageIndex) : autoCurrentPage;
  const total = totalPages !== undefined ? parseInt(totalPages) : autoTotalPages;
  const showPagination = total > 0;
  const activityType = activity ? getActivityType(activity) : "unknown";
  const isNpcChat = activityType === "npc_chat";

  // --- Animated styles ---
  const prevPullOverlayStyle = useAnimatedStyle(() => {
    const p = prevSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 1], [-PULL_HINT_SLIDE_PX, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const nextPullOverlayStyle = useAnimatedStyle(() => {
    const p = nextSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 1], [PULL_HINT_SLIDE_PX, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  // --- Haptic ---
  const triggerSwipeHaptic = useCallback((milestone: number) => {
    if (milestone <= 0) return;
    void Haptics.impactAsync(
      milestone >= 4 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  // --- Swipe gate update ---
  useEffect(() => {
    if (loading || !activity) {
      swipePrevEnabledSV.value = 0;
      swipeNextEnabledSV.value = 0;
      return;
    }
    const idx = pageIndex !== undefined ? parseInt(pageIndex, 10) : autoCurrentPage;
    swipePrevEnabledSV.value = idx > 0 && dayActivitiesList.length > 0 ? 1 : 0;

    const at = getActivityType(activity);
    const hasAssessment = !!activity.path_assessment;
    const nextOk =
      activity.progress?.status === "completed" ||
      npcCompleted ||
      ((at === "short_video" || at === "video" || at === "text" || at === "image") && !hasAssessment);
    swipeNextEnabledSV.value = nextOk ? 1 : 0;
  }, [loading, activity, pageIndex, autoCurrentPage, dayActivitiesList.length, npcCompleted]);

  // --- Scroll handler ---
  const onActivityScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const contentH = event.contentSize.height;
      const viewportH = event.layoutMeasurement.height;
      headerScrollY.value = scrollY;

      const maxScrollY = Math.max(0, contentH - viewportH);

      // Previous pull
      if (swipePrevEnabledSV.value === 1) {
        const overscrollTop = scrollY < 0 ? -scrollY : 0;
        if (overscrollTop > 0) {
          prevReadyProgress.value = 1;
          const p = Math.min(overscrollTop / SWIPE_NEXT_THRESHOLD, 1);
          prevSwipeProgress.value = p;
          const milestone = p >= 1 ? 4 : Math.min(3, Math.floor(p * 4));
          if (milestone > lastPrevHapticMilestoneSV.value && milestone > 0) {
            lastPrevHapticMilestoneSV.value = milestone;
            runOnJS(triggerSwipeHaptic)(milestone);
          }
          if (p >= 1 && prevSwipeThresholdSV.value === 0) {
            prevSwipeThresholdSV.value = 1;
            prevSwipePulse.value = withSequence(
              withSpring(1.06, { damping: 12, stiffness: 260 }),
              withSpring(1, { damping: 14, stiffness: 200 }),
            );
          } else if (p < 1 && prevSwipeThresholdSV.value === 1) {
            prevSwipeThresholdSV.value = 0;
            prevSwipePulse.value = withSpring(1, { damping: 15, stiffness: 200 });
          }
        } else {
          prevReadyProgress.value = 0;
          lastPrevHapticMilestoneSV.value = 0;
          prevSwipeThresholdSV.value = 0;
          if (prevSwipeProgress.value > 0) {
            prevSwipeProgress.value = 0;
            prevSwipePulse.value = 1;
          }
        }
      } else {
        prevReadyProgress.value = 0;
        lastPrevHapticMilestoneSV.value = 0;
        prevSwipeThresholdSV.value = 0;
        prevSwipeProgress.value = 0;
      }

      // Next pull
      if (swipeNextEnabledSV.value === 1) {
        const overscrollY = scrollY - maxScrollY;
        if (overscrollY > 0) {
          bottomReadyProgress.value = 1;
          const p = Math.min(overscrollY / SWIPE_NEXT_THRESHOLD, 1);
          nextSwipeProgress.value = p;
          const milestone = p >= 1 ? 4 : Math.min(3, Math.floor(p * 4));
          if (milestone > lastNextHapticMilestoneSV.value && milestone > 0) {
            lastNextHapticMilestoneSV.value = milestone;
            runOnJS(triggerSwipeHaptic)(milestone);
          }
          if (p >= 1 && nextSwipeThresholdSV.value === 0) {
            nextSwipeThresholdSV.value = 1;
            nextSwipePulse.value = withSequence(
              withSpring(1.06, { damping: 12, stiffness: 260 }),
              withSpring(1, { damping: 14, stiffness: 200 }),
            );
          } else if (p < 1 && nextSwipeThresholdSV.value === 1) {
            nextSwipeThresholdSV.value = 0;
            nextSwipePulse.value = withSpring(1, { damping: 15, stiffness: 200 });
          }
        } else {
          bottomReadyProgress.value = 0;
          lastNextHapticMilestoneSV.value = 0;
          nextSwipeThresholdSV.value = 0;
          if (nextSwipeProgress.value > 0) {
            nextSwipeProgress.value = 0;
            nextSwipePulse.value = 1;
          }
        }
      } else {
        bottomReadyProgress.value = 0;
        lastNextHapticMilestoneSV.value = 0;
        nextSwipeThresholdSV.value = 0;
        nextSwipeProgress.value = 0;
      }
    },
  });

  // --- Init ---
  useFocusEffect(
    useCallback(() => {
      loadActivity();
      initializeSounds();
      return () => {
        cleanupSounds();
      };
    }, [activityId]),
  );

  // --- Data loading ---
  const loadActivity = async () => {
    if (!activityId) return;

    console.log("[Activity] Loading activity:", activityId);

    setLoadingActivity(true);
    setLoadingContent(true);
    setLoadingAssessment(true);
    setLoadingProgress(true);

    try {
      const cachedActivity = enrollmentId
        ? getCachedActivityPayload(enrollmentId, activityId)
        : null;

      if (cachedActivity) {
        console.log("[Activity] Using cached activity payload");
        const resolvedCachedActivity = await ensureActivityHasProgress(
          cachedActivity.activity as ActivityWithContent,
          { enrollmentId, activityId, ensureProgress: ensureActivityProgress },
        );
        setLoadingActivity(false);
        setLoadingContent(false);
        setLoadingAssessment(false);
        setLoadingProgress(!resolvedCachedActivity.progress);

        setActivity(resolvedCachedActivity);
        setAutoCurrentPage(cachedActivity.currentPage);
        setAutoTotalPages(cachedActivity.totalPages);
        setDayActivitiesCount(cachedActivity.totalPages);
        setDayActivitiesList(cachedActivity.dayActivitiesList);
        setLoading(false);

        if (enrollmentId && resolvedCachedActivity.progress && !cachedActivity.activity.progress) {
          updateCachedActivityProgress(enrollmentId, activityId, (a) => ({
            ...a,
            progress: resolvedCachedActivity.progress,
          }));
        }
        setLoadingProgress(false);
        return;
      }

      // Parallel fetch
      const [activityResult, contentResult, assessmentsResult] = await Promise.all([
        supabase.from("path_activities").select("*").eq("id", activityId).single(),
        supabase
          .from("path_content")
          .select("*")
          .eq("activity_id", activityId)
          .order("display_order", { ascending: true }),
        supabase.from("path_assessments").select("*").eq("activity_id", activityId),
      ]);

      const { data: activityData, error: activityError } = activityResult;
      const { data: contentData } = contentResult;
      const { data: assessmentsData } = assessmentsResult;

      setLoadingActivity(false);
      setLoadingContent(false);
      setLoadingAssessment(false);
      setLoadingProgress(!!enrollmentId);

      if (activityError) throw activityError;

      // Fetch quiz questions
      let quizQuestions: PathQuizQuestion[] = [];
      const quizAssessments = (assessmentsData || []).filter((a) => a.assessment_type === "quiz");
      if (quizAssessments.length > 0) {
        const { data: questions } = await supabase
          .from("path_quiz_questions")
          .select("*")
          .in(
            "assessment_id",
            quizAssessments.map((a) => a.id),
          );
        quizQuestions = questions || [];
      }

      let pathAssessment: (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null = null;
      if (assessmentsData && assessmentsData.length > 0) {
        pathAssessment = {
          ...assessmentsData[0],
          quiz_questions: quizQuestions.filter((q) => q.assessment_id === assessmentsData[0].id),
        };
      }

      const fullActivity: ActivityWithContent = {
        ...activityData,
        path_content: contentData || [],
        path_assessment: pathAssessment,
      };

      // Siblings for pagination
      if (activityData.path_day_id) {
        const { data: siblings } = await supabase
          .from("path_activities")
          .select("id, display_order, title")
          .eq("path_day_id", activityData.path_day_id)
          .order("display_order", { ascending: true });

        if (siblings) {
          setDayActivitiesList(siblings);
          setDayActivitiesCount(siblings.length);
          if (totalPages === undefined) setAutoTotalPages(siblings.length);
          if (pageIndex === undefined) {
            const myIndex = siblings.findIndex((s) => s.id === activityId);
            if (myIndex >= 0) setAutoCurrentPage(myIndex);
          }
        }
      }

      const resolvedActivity = await ensureActivityHasProgress(fullActivity, {
        enrollmentId,
        activityId,
        ensureProgress: ensureActivityProgress,
      });

      setActivity(resolvedActivity);
      setLoading(false);

      // Pagination from session cache
      if (enrollmentId) {
        const bundle = getCachedPathDayBundle(enrollmentId);
        if (bundle && bundle.activities.length > 0) {
          const dayActivities = bundle.activities.map((a) => ({
            id: a.id,
            display_order: a.display_order,
            title: a.title ?? "",
          }));
          const currentIndex = dayActivities.findIndex((a) => a.id === activityId);
          setAutoCurrentPage(currentIndex >= 0 ? currentIndex : 0);
          setAutoTotalPages(dayActivities.length);
          setDayActivitiesCount(dayActivities.length);
          setDayActivitiesList(dayActivities);
        } else if (resolvedActivity.path_day_id) {
          try {
            const { data: dayActivities, error: activitiesError } = await supabase
              .from("path_activities")
              .select("id, display_order, title")
              .eq("path_day_id", resolvedActivity.path_day_id)
              .eq("is_draft", false)
              .order("display_order", { ascending: true });
            if (activitiesError) console.error("[Activity] Error fetching day activities:", activitiesError);
            if (dayActivities && dayActivities.length > 0) {
              const currentIndex = dayActivities.findIndex((a) => a.id === activityId);
              setAutoCurrentPage(currentIndex >= 0 ? currentIndex : 0);
              setAutoTotalPages(dayActivities.length);
              setDayActivitiesCount(dayActivities.length);
              setDayActivitiesList(
                dayActivities.map((a) => ({ id: a.id, display_order: a.display_order, title: a.title ?? "" })),
              );
            }
          } catch (err) {
            console.error("[Activity] Error fetching pagination:", err);
          }
        }
      }

      // Reset sub-component flags
      setAiObjectiveMet(false);
      setNpcCompleted(false);

      if (enrollmentId && resolvedActivity.progress && !fullActivity.progress) {
        updateCachedActivityProgress(enrollmentId, activityId, (a) => ({
          ...a,
          progress: resolvedActivity.progress,
        }));
      }
      setLoadingProgress(false);
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Completion helpers ---
  const canComplete = (): boolean => {
    if (!activity) return false;
    const at = getActivityType(activity);
    if (at === "ai_chat") return aiObjectiveMet;
    if (at === "npc_chat") return npcCompleted;
    const hasAssessment = !!activity.path_assessment;
    if (
      (at === "short_video" || at === "video" || at === "text" || at === "image") &&
      !hasAssessment
    ) {
      return false;
    }
    return true;
  };

  const canSwipe = (): boolean => {
    if (!activity) return false;
    if (activity.progress?.status === "completed") return true;
    const at = getActivityType(activity);
    const hasAssessment = !!activity.path_assessment;
    return (
      npcCompleted ||
      ((at === "short_video" || at === "video" || at === "text" || at === "image") && !hasAssessment)
    );
  };

  const canSwipeUp = (): boolean => {
    return currentPage > 0 && dayActivitiesList.length > 0;
  };

  const markActivityCompletedInCache = () => {
    if (!enrollmentId || !activityId) return;
    const completedAt = new Date().toISOString();
    updateCachedActivityProgress(enrollmentId, activityId, (cachedActivity) => ({
      ...cachedActivity,
      progress: cachedActivity.progress
        ? { ...cachedActivity.progress, status: "completed" as const, completed_at: completedAt, updated_at: completedAt }
        : {
            id: `local-${activityId}`,
            enrollment_id: enrollmentId,
            activity_id: activityId,
            status: "completed" as const,
            started_at: completedAt,
            completed_at: completedAt,
            time_spent_seconds: null,
            created_at: completedAt,
            updated_at: completedAt,
          },
    }));
  };

  const navigateToNext = () => {
    const nextIndex = currentPage + 1;
    if (nextIndex < dayActivitiesList.length) {
      const nextActivity = dayActivitiesList[nextIndex];
      router.replace(
        getPathlabActivityRoute({
          enrollmentId: enrollmentId!,
          activityId: nextActivity.id,
          pageIndex: nextIndex,
          totalPages: dayActivitiesList.length,
        }),
      );
    } else {
      router.replace(getPathlabReflectionRoute(enrollmentId!));
    }
  };

  const handleComplete = async (assessmentData?: {
    textAnswer?: string;
    imageUrl?: string;
    fileUrl?: string;
  }) => {
    if (!enrollmentId || !activityId || !canComplete()) return;

    setCompleting(true);
    try {
      playActivityCompleteSound();
      await updateActivityProgress({ enrollmentId, activityId, status: "completed" });
      markActivityCompletedInCache();

      const progressId = activity?.progress?.id;
      if (assessmentData && activity?.path_assessment && progressId) {
        await submitAssessment({
          progressId,
          assessmentId: activity.path_assessment.id,
          textAnswer: assessmentData.textAnswer,
          imageUrl: assessmentData.imageUrl,
          fileUrls: assessmentData.fileUrl ? [assessmentData.fileUrl] : undefined,
        });
      }
      navigateToNext();
    } catch (error: any) {
      console.error("Error completing activity:", error);
      if (!error?.__sentryCaptured) {
        Sentry.captureException(error, {
          tags: { component: "PathLabActivityScreen", action: "handleComplete", activityId, enrollmentId },
          extra: { hasAssessmentData: !!assessmentData, errorMessage: error?.message },
        });
      }
      Alert.alert("Error", "Failed to complete activity. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handleSwipeToNext = async () => {
    if (!enrollmentId || !activityId) return;
    const at = getActivityType(activity!);
    const hasAssessment = !!activity!.path_assessment;
    if (
      (at === "short_video" || at === "video" || at === "text" || at === "image") &&
      !hasAssessment
    ) {
      try {
        await updateActivityProgress({ enrollmentId, activityId, status: "completed" });
        markActivityCompletedInCache();
      } catch (error) {
        console.error("Error completing activity:", error);
      }
    }
    navigateToNext();
  };

  const handleSwipeToPrevious = () => {
    if (!enrollmentId) return;
    const now = Date.now();
    if (now - lastPrevNavAtRef.current < 450) return;
    lastPrevNavAtRef.current = now;

    const prevIndex = currentPage - 1;
    if (prevIndex >= 0 && dayActivitiesList.length > 0) {
      const prevActivity = dayActivitiesList[prevIndex];
      router.replace(
        getPathlabActivityRoute({
          enrollmentId,
          activityId: prevActivity.id,
          pageIndex: prevIndex,
          totalPages: dayActivitiesList.length,
        }),
      );
    }
  };

  // --- Labels ---
  const activityPosition = total > 0 ? Math.min(currentPage + 1, total) : 1;
  const activityCount = dayActivitiesCount || total;
  const headerChipLabel =
    activityCount > 0 ? `Activity ${activityPosition} of ${activityCount}` : "Activity";
  const headerSubtitle =
    activityCount > 1
      ? `${getActivityTypeLabel(activityType)} in a ${activityCount}-step day`
      : getActivityTypeLabel(activityType);
  const nextSwipeLabel =
    currentPage < dayActivitiesList.length - 1
      ? "Swipe up for next activity"
      : "Swipe up to reflect on your day";
  const previousActivityTitle =
    currentPage > 0 && dayActivitiesList[currentPage - 1]
      ? (dayActivitiesList[currentPage - 1].title ?? "").trim()
      : "";
  const nextDestinationTitle =
    dayActivitiesList.length === 0
      ? ""
      : currentPage < dayActivitiesList.length - 1
        ? (dayActivitiesList[currentPage + 1].title ?? "").trim()
        : "Reflect on your day";

  // --- Loading skeleton ---
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SkeletonBlock width={60} height={20} />
            <SkeletonBlock width="60%" height={20} />
            <View style={{ width: 60 }} />
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <SkeletonBlock width="80%" height={28} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <SkeletonBlock width="100%" height={16} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="90%" height={16} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="70%" height={16} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <SkeletonBlock width="100%" height={200} borderRadius={12} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <SkeletonBlock width="100%" height={120} borderRadius={12} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Error state ---
  if (!activity) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorText}>Activity not found</AppText>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <AppText style={styles.backBtnText}>Go Back</AppText>
        </Pressable>
      </View>
    );
  }

  // --- Content renderer ---
  const renderContent = () => {
    return activity.path_content.map((item) => {
      switch (item.content_type) {
        case "text":
          return (
            <TextActivity
              key={item.id}
              content={item}
              onComplete={() => {}}
            />
          );
        case "video":
        case "short_video":
          return (
            <VideoActivity
              key={item.id}
              content={item}
              onComplete={() => {}}
            />
          );
        case "image":
          return (
            <ImageActivity
              key={item.id}
              content={item}
              onComplete={() => {}}
            />
          );
        case "resource_link":
          return (
            <View key={item.id} style={styles.fallbackCard}>
              <AppText style={{ fontSize: 24, marginBottom: 8 }}>🔗</AppText>
              {item.content_title && (
                <AppText variant="bold" style={{ fontSize: 16, color: ThemeText.primary, marginBottom: 8 }}>
                  {item.content_title}
                </AppText>
              )}
              {item.content_url && (
                <AppText style={{ fontSize: 12, color: Accent.yellowDark }}>{item.content_url}</AppText>
              )}
            </View>
          );
        case "daily_prompt":
          return (
            <View key={item.id} style={[styles.fallbackCard, styles.promptCard]}>
              <AppText style={{ fontSize: 24, marginBottom: 8 }}>💡</AppText>
              {item.content_body && (
                <AppText style={styles.promptText}>{item.content_body}</AppText>
              )}
            </View>
          );
        default:
          return null;
      }
    });
  };

  const renderAssessment = () => {
    if (!activity.path_assessment) return null;

    const assessment = activity.path_assessment;
    const assessmentType = assessment.assessment_type;
    const isCompleted = activity.progress?.status === "completed";

    switch (assessmentType) {
      case "quiz":
        return (
          <QuizActivity
            activity={activity}
            onComplete={() => handleComplete()}
            isSubmitting={completing}
          />
        );
      case "text_answer":
        return (
          <TextAnswerActivity
            activity={activity}
            onComplete={(answer) => handleComplete({ textAnswer: answer })}
          />
        );
      case "file_upload":
        return (
          <FileUploadActivity
            activity={activity}
            onComplete={(fileUrl) => handleComplete({ fileUrl })}
          />
        );
      case "image_upload":
        return <ImageUploadAssessment activity={activity} isCompleted={isCompleted} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  // --- Render ---
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* NPC Chat - Full Screen (no header, no scroll wrapper) */}
      {isNpcChat ? (
        <NPCDialogueActivity
          activity={activity}
          enrollmentId={enrollmentId!}
          activityId={activityId!}
          onComplete={() => setNpcCompleted(true)}
          onSwipePrev={handleSwipeToPrevious}
          onSwipeNext={handleSwipeToNext}
          currentPage={currentPage}
          totalPages={total}
          dayActivitiesList={dayActivitiesList}
        />
      ) : activityType === "ai_chat" ? (
        /* AI Chat - replaces ScrollView entirely */
        <View style={{ flex: 1 }}>
          <ActivityHeader
            title={activity.title}
            scrollY={headerScrollY}
            onBack={() => router.back()}
            headerChipLabel={headerChipLabel}
            headerSubtitle={headerSubtitle}
            showPagination={showPagination}
            insetsTop={insets.top}
          />
          {showPagination && (
            <ActivityPagination
              currentIndex={currentPage}
              total={total}
              onPrev={handleSwipeToPrevious}
              onNext={handleSwipeToNext}
              scrollY={headerScrollY}
            />
          )}
          <AIChatActivity
            activity={activity}
            enrollmentId={enrollmentId!}
            onComplete={() => setAiObjectiveMet(true)}
          />
          <ActivityCompleteButton
            canComplete={canComplete()}
            isSubmitting={completing}
            onPress={() => handleComplete()}
          />
        </View>
      ) : (
        /* Standard content activities */
        <>
          {/* Header bar */}
          <ActivityHeader
            title={activity.title}
            scrollY={headerScrollY}
            onBack={() => router.back()}
            headerChipLabel={headerChipLabel}
            headerSubtitle={headerSubtitle}
            showPagination={showPagination}
            insetsTop={insets.top}
          />

          {/* Page dots */}
          {showPagination && (
            <ActivityPagination
              currentIndex={currentPage}
              total={total}
              onPrev={handleSwipeToPrevious}
              onNext={handleSwipeToNext}
              scrollY={headerScrollY}
            />
          )}

          {/* Scroll content */}
          <View style={styles.scrollWrapper}>
            <Reanimated.ScrollView
              ref={scrollViewRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              onScroll={onActivityScroll}
              scrollEventThrottle={16}
              onScrollEndDrag={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const scrollY = contentOffset.y;
                if (canSwipeUp() && scrollY < 0 && -scrollY > SWIPE_NEXT_THRESHOLD * 0.6) {
                  handleSwipeToPrevious();
                }
                if (!canSwipe()) return;
                const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height);
                const overscrollY = scrollY - maxScrollY;
                if (overscrollY > SWIPE_NEXT_THRESHOLD * 0.6) {
                  handleSwipeToNext();
                }
              }}
              onMomentumScrollEnd={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const scrollY = contentOffset.y;
                const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height);
                if (canSwipeUp() && scrollY < 0 && scrollY > -SWIPE_NEXT_THRESHOLD * 0.6) {
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }
                if (!canSwipe()) return;
                const overscrollY = scrollY - maxScrollY;
                if (overscrollY > 0 && overscrollY < SWIPE_NEXT_THRESHOLD * 0.6) {
                  scrollViewRef.current?.scrollTo({ y: maxScrollY, animated: true });
                }
              }}
              decelerationRate="normal"
            >
              {/* Hero section */}
              <Reanimated.View
                style={[
                  styles.headerHero,
                  useAnimatedStyle(() => ({
                    opacity: interpolate(
                      headerScrollY.value,
                      [0, HEADER_COLLAPSE_DISTANCE * 0.62],
                      [1, 0],
                      Extrapolation.CLAMP,
                    ),
                    transform: [
                      {
                        translateY: interpolate(
                          headerScrollY.value,
                          [0, HEADER_COLLAPSE_DISTANCE * 0.72],
                          [0, -10],
                          Extrapolation.CLAMP,
                        ),
                      },
                    ],
                  })),
                  { marginBottom: 16, marginTop: -10 },
                ]}
              >
                <View style={styles.headerChipRow}>
                  <View style={styles.headerChip}>
                    <AppText style={styles.headerChipText}>{headerChipLabel}</AppText>
                  </View>
                </View>
                <AppText variant="bold" style={styles.headerTitle}>
                  {activity.title}
                </AppText>
                <AppText style={styles.headerSubtitle}>{headerSubtitle}</AppText>
              </Reanimated.View>

              {/* Instructions */}
              {activity.instructions && (
                <View style={styles.instructionsCard}>
                  <AppText style={styles.instructionsText}>{activity.instructions}</AppText>
                </View>
              )}

              {/* Content */}
              {activityType !== "ai_chat" &&
                activityType !== "npc_chat" &&
                activityType !== "unknown" &&
                renderContent()}

              {/* Unknown fallback */}
              {activityType === "unknown" && (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <AppText style={[styles.instructionsText, { textAlign: "center", color: ThemeText.tertiary }]}>
                    This activity's content isn't available yet.
                  </AppText>
                </View>
              )}

              {/* Assessment */}
              {renderAssessment()}

              {!canSwipe() ? <View style={{ height: 120 }} /> : null}
            </Reanimated.ScrollView>

            {/* Previous pull overlay */}
            <Reanimated.View
              pointerEvents="none"
              style={[styles.pullOverlayTop, { paddingTop: 2 }, prevPullOverlayStyle]}
            >
              {canSwipeUp() ? (
                <SwipeProgressDonut
                  direction="previous"
                  progress={prevSwipeProgress}
                  readyProgress={prevReadyProgress}
                  pulseScale={prevSwipePulse}
                  label="Previous activity"
                  titleHint={previousActivityTitle}
                />
              ) : null}
            </Reanimated.View>

            {/* Next pull overlay */}
            <Reanimated.View
              pointerEvents="none"
              style={[
                styles.pullOverlayBottom,
                { paddingBottom: Math.max(insets.bottom, 4) + 12 },
                nextPullOverlayStyle,
              ]}
            >
              {canSwipe() ? (
                <SwipeProgressDonut
                  direction="next"
                  progress={nextSwipeProgress}
                  readyProgress={bottomReadyProgress}
                  label={nextSwipeLabel}
                  pulseScale={nextSwipePulse}
                  titleHint={nextDestinationTitle}
                />
              ) : null}
            </Reanimated.View>
          </View>

          {/* Complete button */}
          {canComplete() && !activity?.path_assessment && (
            <ActivityCompleteButton
              canComplete={canComplete()}
              isSubmitting={completing}
              onPress={() => handleComplete()}
            />
          )}
        </>
      )}
    </View>
  );
}

// --- Image Upload Assessment (kept inline for complexity) ---

function ImageUploadAssessment({
  activity,
  isCompleted,
  onComplete,
}: {
  activity: ActivityWithContent;
  isCompleted: boolean;
  onComplete: (data: { imageUrl?: string }) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState<number>(300);
  const [submitted, setSubmitted] = useState(false);
  const submission = activity.submission;

  const alreadyCompleted = isCompleted || submitted;

  if (alreadyCompleted) {
    return (
      <View style={[styles.fallbackCard, { marginBottom: Space.lg }]}>
        <AppText variant="bold" style={{ fontSize: 11, color: ThemeText.muted, marginBottom: 12 }}>
          IMAGE UPLOAD
        </AppText>
        {submission?.image_url && (
          <ExpoImage
            source={{ uri: submission.image_url, headers: { Referer: "https://ibb.co" } }}
            style={{ width: "100%", height: screenWidth * 0.75, borderRadius: 8 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        <AppText style={{ fontSize: 13, color: "#9FE800", fontWeight: "600", marginTop: 12 }}>
          ✓ Completed
        </AppText>
      </View>
    );
  }

  const handleTakePhoto = async () => {
    try {
      const { ImagePicker } = require("expo-image-picker");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take photos");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        if (asset.width && asset.height) setImageHeight(screenWidth * (asset.height / asset.width));
        setSubmitted(true);
        onComplete({ imageUrl: asset.uri });
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to take photo");
    }
  };

  const handlePickImage = async () => {
    const { ImagePicker } = require("expo-image-picker");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library permission is required");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        if (asset.width && asset.height) setImageHeight(screenWidth * (asset.height / asset.width));
        setSubmitted(true);
        onComplete({ imageUrl: asset.uri });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  return (
    <>
      <GlassCard style={{ marginBottom: Space.lg }}>
        <AppText variant="bold" style={{ fontSize: 11, color: ThemeText.muted, marginBottom: 12 }}>
          IMAGE UPLOAD
        </AppText>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <GlassButton
            variant="secondary"
            style={{ flex: 1 }}
            textStyle={{ fontFamily: "BaiJamjuree_700Bold" }}
            onPress={handleTakePhoto}
          >
            📷 Take Photo
          </GlassButton>
          <GlassButton
            variant="secondary"
            style={{ flex: 1 }}
            textStyle={{ fontFamily: "BaiJamjuree_700Bold" }}
            onPress={handlePickImage}
          >
            🖼️ Choose Photo
          </GlassButton>
        </View>
      </GlassCard>
      {selectedImage && (
        <View style={[styles.fullWidthImageContainer, { width: screenWidth }]}>
          <ExpoImage source={selectedImage} style={{ height: imageHeight, width: screenWidth }} contentFit="contain" />
          <Pressable
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <AppText style={{ fontSize: 18, color: ThemeText.muted }}>✕</AppText>
          </Pressable>
        </View>
      )}
    </>
  );
}

// --- Skeleton ---

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}) {
  return (
    <View style={{ width: width as any, height, borderRadius, backgroundColor: "#E0E0E0", overflow: "hidden" }}>
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }} />
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  baiRegularText: { fontFamily: "BaiJamjuree_400Regular" },
  baiBoldText: { fontFamily: "BaiJamjuree_700Bold" },
  container: { flex: 1, backgroundColor: PageBg.default },
  errorContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: ThemeText.tertiary, marginBottom: 24 },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Accent.yellow,
    borderRadius: Radius.full,
    ...Shadow.card,
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: ThemeText.primary },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: PageBg.default,
  },
  scrollWrapper: { flex: 1, overflow: "visible" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, overflow: "visible" },
  headerHero: { alignItems: "center", gap: 8, width: "100%", overflow: "hidden" },
  headerChipRow: { alignItems: "center", justifyContent: "center" },
  headerChip: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  headerChipText: {
    fontSize: 12,
    color: "#3B82F6",
    textAlign: "center",
    includeFontPadding: false,
  },
  headerTitle: {
    width: "100%",
    fontSize: 30,
    lineHeight: 36,
    color: ThemeText.primary,
    textAlign: "center",
  },
  headerSubtitle: {
    width: "100%",
    fontSize: 14,
    lineHeight: 21,
    color: ThemeText.secondary,
    textAlign: "center",
  },
  instructionsCard: {
    backgroundColor: PageBg.offWhite,
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadow.card,
  },
  instructionsText: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  fallbackCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: Radius.md,
    marginBottom: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadow.card,
  },
  promptCard: {
    backgroundColor: "rgba(191, 255, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.3)",
  },
  promptText: {
    fontSize: 15,
    fontWeight: "500",
    color: ThemeText.primary,
    lineHeight: 24,
  },
  pullOverlayTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 25,
    alignItems: "center",
    overflow: "visible",
  },
  pullOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  fullWidthImageContainer: {
    marginTop: 12,
    position: "relative",
    maxHeight: 500,
    backgroundColor: "#000000",
    alignSelf: "center",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
