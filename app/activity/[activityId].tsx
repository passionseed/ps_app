import { useEffect, useState, useCallback, useRef, type ComponentProps } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  useWindowDimensions,
  Animated as RNAnimated,
  PanResponder,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { WebView } from "react-native-webview";
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, SvgXml } from "react-native-svg";
import YoutubePlayer from "react-native-youtube-iframe";
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
import { ensureActivityProgress, updateActivityProgress, submitAssessment } from "../../lib/pathlab";
import {
  getCachedActivityPayload,
  getCachedPathDayBundle,
  updateCachedActivityProgress,
  type DayActivityListItem,
} from "../../lib/pathlabSession";
import {
  initializeSounds,
  playNPCSpeakSound,
  playActivityCompleteSound,
  cleanupSounds,
} from "../../lib/sounds";
import type {
  PathActivity,
  PathContent,
  PathAssessment,
  PathQuizQuestion,
  AIChatMetadata,
  NPCChatMetadata,
  PathActivityProgress,
  PathAssessmentSubmission,
} from "../../types/pathlab-content";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Type,
  StepThemes,
} from "../../lib/theme";
import { AppText as BaseAppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";
import { SwipeProgressDonut } from "../../components/activity/SwipeProgressDonut";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";

interface ActivityWithContent extends PathActivity {
  path_content: PathContent[];
  path_assessment: (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null;
  progress?: PathActivityProgress;
  submission?: PathAssessmentSubmission | null;
}

// Helper to get activity type from content or assessment
function getActivityType(activity: ActivityWithContent): string {
  if (activity.path_content && activity.path_content.length > 0) {
    return activity.path_content[0].content_type;
  }
  if (activity.path_assessment) {
    return activity.path_assessment.assessment_type;
  }
  return 'unknown';
}

// AI Chat Message type
interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// NPC Conversation types
interface NPCNode {
  id: string;
  text_content: string;
  node_type: "question" | "statement" | "end";
  npc_avatar?: { name: string; svg_data?: string };
  metadata?: {
    emotion?: string;
    timeout_seconds?: number;
  };
}

interface NPCChoice {
  id: string;
  choice_text: string;
  to_node_id: string | null;
}

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

/** Scroll distance over which the header transitions to the compact bar. */
const HEADER_COLLAPSE_DISTANCE = 96;
/** Max height for the expanded hero block (chip + large title + subtitle). */
const HEADER_HERO_MAX_EXPANDED = 520;
const SWIPE_NEXT_THRESHOLD = 220;
/** Pull hints start fully off-screen above/below, then slide in with progress. */
const PULL_HINT_SLIDE_PX = 104;

export default function ActivityDetailScreen() {
  const { activityId, enrollmentId, pageIndex, totalPages } = useLocalSearchParams<{
    activityId: string;
    enrollmentId: string;
    pageIndex?: string;
    totalPages?: string;
  }>();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [activity, setActivity] = useState<ActivityWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Granular loading states for skeleton UI
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Debug screen dimensions on mount and when they change
  useEffect(() => {
    console.log('[SCREEN DEBUG] Screen dimensions:', { width: screenWidth, height: screenHeight });
  }, [screenWidth, screenHeight]);

  // Auto-detected pagination
  const [autoCurrentPage, setAutoCurrentPage] = useState(0);
  const [autoTotalPages, setAutoTotalPages] = useState(0);
  const [dayActivitiesCount, setDayActivitiesCount] = useState(0);
  const [dayActivitiesList, setDayActivitiesList] = useState<DayActivityListItem[]>([]);

  // Track scroll position for swipe detection
  const scrollViewRef = useRef<ScrollView>(null);
  const headerScrollY = useSharedValue(0);
  /** UI-thread gates for overscroll swipe (synced from activity state). */
  const swipePrevEnabledSV = useSharedValue(0);
  const swipeNextEnabledSV = useSharedValue(0);
  const lastPrevHapticMilestoneSV = useSharedValue(0);
  const lastNextHapticMilestoneSV = useSharedValue(0);
  const prevSwipeThresholdSV = useSharedValue(0);
  const nextSwipeThresholdSV = useSharedValue(0);
  const nextSwipeProgress = useSharedValue(0);
  const bottomReadyProgress = useSharedValue(0);
  const nextSwipePulse = useSharedValue(1);

  /** Previous-activity pull (top overscroll). */
  const prevSwipeProgress = useSharedValue(0);
  const prevReadyProgress = useSharedValue(0);
  const prevSwipePulse = useSharedValue(1);
  const lastPrevNavAtRef = useRef(0);

  /** Slide in from past the top/bottom edge + fade (UI-thread; translateY only, no scale). */
  const prevPullOverlayStyle = useAnimatedStyle(() => {
    const p = prevSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0, 1],
            [-PULL_HINT_SLIDE_PX, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
  const nextPullOverlayStyle = useAnimatedStyle(() => {
    const p = nextSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0, 1],
            [PULL_HINT_SLIDE_PX, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const heroHeaderAnimatedStyle = useAnimatedStyle(() => ({
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
  }));

  const collapsedInlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      headerScrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.22, HEADER_COLLAPSE_DISTANCE * 0.62],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const pageDotsAnimatedStyle = useAnimatedStyle(() => {
    const collapse = interpolate(
      headerScrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: interpolate(collapse, [0, 1], [0.68, 1], Extrapolation.CLAMP),
    };
  });

  // Use auto-detected pagination if URL params not provided
  const currentPage = pageIndex !== undefined ? parseInt(pageIndex) : autoCurrentPage;
  const total = totalPages !== undefined ? parseInt(totalPages) : autoTotalPages;
  const showPagination = total > 0;

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiObjectiveMet, setAiObjectiveMet] = useState(false);
  const [aiMaxMessages, setAiMaxMessages] = useState(0);

  // NPC Dialogue state
  const [npcCurrentNode, setNpcCurrentNode] = useState<NPCNode | null>(null);
  const [npcChoices, setNpcChoices] = useState<NPCChoice[]>([]);
  const [npcCompleted, setNpcCompleted] = useState(false);
  const [npcConversationId, setNpcConversationId] = useState<string | null>(null);
  const [npcProgressId, setNpcProgressId] = useState<string | null>(null);
  const [npcError, setNpcError] = useState<string | null>(null);
  const [npcSeedAvatar, setNpcSeedAvatar] = useState<{ id: string; name: string; svg_data: string } | null>(null);
  const [npcSummary, setNpcSummary] = useState<string | null>(null);
  const npcTreeRef = useRef<{
    nodes: Record<string, NPCNode>;
    choices: Record<string, NPCChoice[]>;
  } | null>(null);

  // Typing animation state
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // NPC bounce animation
  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  const triggerSwipeHaptic = useCallback((milestone: number) => {
    if (milestone <= 0) return;
    void Haptics.impactAsync(
      milestone >= 4
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading || !activity) {
      swipePrevEnabledSV.value = 0;
      swipeNextEnabledSV.value = 0;
      return;
    }
    const idx = pageIndex !== undefined ? parseInt(pageIndex, 10) : autoCurrentPage;
    swipePrevEnabledSV.value = idx > 0 && dayActivitiesList.length > 0 ? 1 : 0;

    const activityType = getActivityType(activity);
    const hasAssessment = !!activity.path_assessment;
    const nextOk =
      activity.progress?.status === "completed" ||
      npcCompleted ||
      ((activityType === "short_video" ||
        activityType === "video" ||
        activityType === "text" ||
        activityType === "image") &&
        !hasAssessment);
    swipeNextEnabledSV.value = nextOk ? 1 : 0;
  }, [
    loading,
    activity,
    pageIndex,
    autoCurrentPage,
    dayActivitiesList.length,
    npcCompleted,
  ]);

  const onActivityScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const contentH = event.contentSize.height;
      const viewportH = event.layoutMeasurement.height;
      headerScrollY.value = scrollY;

      const maxScrollY = Math.max(0, contentH - viewportH);

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

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeRemainingPrecise, setTimeRemainingPrecise] = useState<number | null>(null);
  const [showTimeoutRestart, setShowTimeoutRestart] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const totalTimeRef = useRef<number>(30);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
      initializeSounds();

      return () => {
        cleanupSounds();
      };
    }, [activityId])
  );

  const loadActivity = async () => {
    if (!activityId) return;

    console.log("[Activity] Loading activity:", activityId);
    console.log("[Activity] Enrollment ID:", enrollmentId);

    // Reset granular loading states
    setLoadingActivity(true);
    setLoadingContent(true);
    setLoadingAssessment(true);
    setLoadingProgress(true);

    try {
      const cachedActivity =
        enrollmentId ? getCachedActivityPayload(enrollmentId, activityId) : null;

      if (cachedActivity) {
        console.log("[Activity] Using cached activity payload");

        const resolvedCachedActivity = await ensureActivityHasProgress(
          cachedActivity.activity as ActivityWithContent,
          {
            enrollmentId,
            activityId,
            ensureProgress: ensureActivityProgress,
          },
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

        const activityType = getActivityType(resolvedCachedActivity);
        if (activityType === "ai_chat") {
          console.log("[Activity] Initializing AI chat from cache...");
          await initAIChat(resolvedCachedActivity);
        } else if (activityType === "npc_chat") {
          console.log("[Activity] Initializing NPC dialogue from cache...");
          await initNPCDialogue(resolvedCachedActivity);
        } else {
          console.log("[Activity] Regular activity type:", activityType);
        }

        if (
          enrollmentId &&
          resolvedCachedActivity.progress &&
          !cachedActivity.activity.progress
        ) {
          updateCachedActivityProgress(enrollmentId, activityId, (activity) => ({
            ...activity,
            progress: resolvedCachedActivity.progress,
          }));
        }

        setLoadingProgress(false);
        return;
      }

      // PARALLEL: Fetch activity, content, assessments, and progress simultaneously
      const [
        activityResult,
        contentResult,
        assessmentsResult,
      ] = await Promise.all([
        supabase.from("path_activities").select("*").eq("id", activityId).single(),
        supabase.from("path_content").select("*").eq("activity_id", activityId).order("display_order", { ascending: true }),
        supabase.from("path_assessments").select("*").eq("activity_id", activityId),
      ]);

      const { data: activityData, error: activityError } = activityResult;
      const { data: contentData } = contentResult;
      const { data: assessmentsData } = assessmentsResult;

      // Update granular loading states as data arrives
      setLoadingActivity(false);
      setLoadingContent(false);
      setLoadingAssessment(false);
      setLoadingProgress(!!enrollmentId);

      console.log("[Activity] Activity data:", activityData);
      console.log("[Activity] Content data:", contentData);
      console.log("[Activity] Assessments data:", assessmentsData);

      if (activityError) throw activityError;

      // Fetch quiz questions only for quiz-type assessments
      let quizQuestions: PathQuizQuestion[] = [];
      const quizAssessments = (assessmentsData || []).filter((a) => a.assessment_type === 'quiz');

      if (quizAssessments.length > 0) {
        const { data: questions } = await supabase
          .from("path_quiz_questions")
          .select("*")
          .in("assessment_id", quizAssessments.map((a) => a.id));
        quizQuestions = questions || [];
      }

      let pathAssessment: (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null = null;
      if (assessmentsData && assessmentsData.length > 0) {
        pathAssessment = {
          ...assessmentsData[0],
          quiz_questions: quizQuestions.filter(
            (q) => q.assessment_id === assessmentsData[0].id
          ),
        };
      }

      const fullActivity: ActivityWithContent = {
        ...activityData,
        path_content: contentData || [],
        path_assessment: pathAssessment,
      };
      const resolvedActivity = await ensureActivityHasProgress(fullActivity, {
        enrollmentId,
        activityId,
        ensureProgress: ensureActivityProgress,
      });

      const activityType = getActivityType(resolvedActivity);

      console.log("[Activity] Full activity loaded:", {
        id: resolvedActivity.id,
        title: resolvedActivity.title,
        activityType,
        content_count: resolvedActivity.path_content.length,
        content_types: resolvedActivity.path_content.map(c => c.content_type),
        has_assessment: !!resolvedActivity.path_assessment,
        assessment_type: resolvedActivity.path_assessment?.assessment_type,
        has_progress: !!resolvedActivity.progress,
        full_activity: JSON.stringify(resolvedActivity, null, 2),
      });

      // Debug image content/assessment specifically
      if (activityType === 'image' || resolvedActivity.path_assessment?.assessment_type === 'image_upload') {
        console.log('[IMAGE ACTIVITY] Image activity detected!');
        console.log('[IMAGE ACTIVITY] Screen width:', screenWidth);
        console.log('[IMAGE ACTIVITY] Activity type:', activityType);
        console.log('[IMAGE ACTIVITY] Assessment type:', resolvedActivity.path_assessment?.assessment_type);
      }

      setActivity(resolvedActivity);
      setLoading(false);

      // Pagination — use session cache if available, otherwise fetch
      if (enrollmentId) {
        const bundle = getCachedPathDayBundle(enrollmentId);
        if (bundle && bundle.activities.length > 0) {
          console.log('[Activity] Pagination from session cache');
          const dayActivities = bundle.activities.map((a) => ({
            id: a.id,
            display_order: a.display_order,
            title: a.title ?? "",
          }));
          const currentIndex = dayActivities.findIndex(a => a.id === activityId);
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

            if (activitiesError) {
              console.error('[Activity] Error fetching day activities:', activitiesError);
            }

            if (dayActivities && dayActivities.length > 0) {
              const currentIndex = dayActivities.findIndex(a => a.id === activityId);
              setAutoCurrentPage(currentIndex >= 0 ? currentIndex : 0);
              setAutoTotalPages(dayActivities.length);
              setDayActivitiesCount(dayActivities.length);
              setDayActivitiesList(
                dayActivities.map((a) => ({
                  id: a.id,
                  display_order: a.display_order,
                  title: a.title ?? "",
                })),
              );
            }
          } catch (err) {
            console.error('[Activity] Error fetching pagination:', err);
          }
        }
      }

      // Initialize activity-specific state based on content/assessment type
      if (activityType === "ai_chat") {
        console.log("[Activity] Initializing AI chat...");
        await initAIChat(resolvedActivity);
      } else if (activityType === "npc_chat") {
        console.log("[Activity] Initializing NPC dialogue...");
        await initNPCDialogue(resolvedActivity);
      } else {
        console.log("[Activity] Regular activity type:", activityType);
      }

      if (enrollmentId && resolvedActivity.progress && !fullActivity.progress) {
        console.log("[Activity] Ensured progress:", resolvedActivity.progress.id);
        updateCachedActivityProgress(enrollmentId, activityId, (activity) => ({
          ...activity,
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

  const initAIChat = async (activity: ActivityWithContent) => {
    console.log("[AI] Initializing AI chat...");
    const aiContent = activity.path_content[0];
    if (!aiContent || aiContent.content_type !== "ai_chat") {
      console.error("[AI] No AI chat content found!");
      return;
    }

    const metadata = aiContent.metadata as AIChatMetadata;

    // Set max messages for progress tracking
    if (metadata.max_messages) {
      setAiMaxMessages(metadata.max_messages);
    }

    // Load NPC avatar for AI chat
    try {
      // Get seed_id from path_day -> paths
      const { data: pathDay } = await supabase
        .from("path_days")
        .select("path_id")
        .eq("id", activity.path_day_id)
        .single();

      if (pathDay) {
        const { data: path } = await supabase
          .from("paths")
          .select("seed_id")
          .eq("id", pathDay.path_id)
          .single();

        if (path?.seed_id) {
          const { data: avatarData } = await supabase
            .from("seed_npc_avatars")
            .select("id, name, svg_data")
            .eq("seed_id", path.seed_id)
            .maybeSingle();

          if (avatarData) {
            setNpcSeedAvatar(avatarData);
            console.log("[AI] Loaded NPC avatar for AI chat:", { name: avatarData.name, has_svg: !!avatarData.svg_data });
          }
        }
      }
    } catch (err) {
      console.error("[AI] Error loading NPC avatar:", err);
    }

    // Don't show system prompt - let AI greet naturally
    // System prompt will be sent in API call but not displayed
    setAiMessages([]);

    // Trigger initial AI greeting
    await sendInitialGreeting(metadata);
  };

  const sendInitialGreeting = async (metadata: AIChatMetadata) => {
    try {
      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) return;

      const systemPrompt = metadata.system_prompt || "You are a helpful assistant.";

      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nStart the conversation with a friendly greeting in Thai.` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 256,
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiPayload),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const greeting = data.candidates?.[0]?.content?.parts?.[0]?.text || "สวัสดีค่ะ! มีอะไรให้ช่วยไหม?";

        setAiMessages([{
          role: "assistant",
          content: greeting,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error("[AI] Error getting initial greeting:", error);
      // Fallback greeting
      setAiMessages([{
        role: "assistant",
        content: "สวัสดีค่ะ! 😊 มีอะไรให้ช่วยไหม?",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const initNPCDialogue = async (activity: ActivityWithContent) => {
    try {
      console.log("[NPC] Initializing NPC dialogue...");

      const npcContent = activity.path_content.find(c => c.content_type === "npc_chat");
      if (!npcContent) {
        const errorMsg = "No NPC content found in activity";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      // Parse conversation tree from content_body
      console.log("[NPC DEBUG] content_body type:", typeof npcContent.content_body);
      console.log("[NPC DEBUG] content_body length:", npcContent.content_body?.length);
      console.log("[NPC DEBUG] content_body first 200 chars:", npcContent.content_body?.substring(0, 200));
      console.log("[NPC DEBUG] content_body last 100 chars:", npcContent.content_body?.substring((npcContent.content_body?.length || 0) - 100));
      console.log("[NPC DEBUG] metadata:", JSON.stringify(npcContent.metadata));
      console.log("[NPC DEBUG] full npcContent row:", JSON.stringify({ id: npcContent.id, content_type: npcContent.content_type, content_title: npcContent.content_title, display_order: npcContent.display_order }));

      if (!npcContent.content_body) {
        const errorMsg = "NPC content not yet available — check back soon";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      let tree: {
        root_node_id: string;
        nodes: Record<string, NPCNode>;
        choices: Record<string, NPCChoice[]>;
        npc_name?: string;
        npc_svg_data?: string;
        summary?: string;
        conversation_id?: string;
      } | null = null;

      try {
        const parsed = JSON.parse(npcContent.content_body);
        if (parsed && typeof parsed === "object" && parsed.root_node_id && parsed.nodes) {
          tree = parsed;
        }
      } catch (e) {
        console.error("[NPC] Failed to parse content_body:", e);
      }

      if (!tree) {
        const errorMsg = "NPC content not yet available — check back soon";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      // Store tree in ref for use during navigation
      npcTreeRef.current = { nodes: tree.nodes, choices: tree.choices || {} };

      // Load avatar from tree if present
      if (tree.npc_name) {
        setNpcSeedAvatar({
          id: "inline",
          name: tree.npc_name,
          svg_data: tree.npc_svg_data || "",
        });
      }

      if (tree.summary) {
        setNpcSummary(tree.summary);
      }

      const conversationId = tree.conversation_id || npcContent.id;
      setNpcConversationId(conversationId);

      // Check if there's existing progress
      if (activity.progress?.id) {
        console.log("[NPC] Checking existing progress for:", activity.progress.id);
        const { data: npcProgress, error: progressError } = await supabase
          .from("path_npc_conversation_progress")
          .select("*")
          .eq("progress_id", activity.progress.id)
          .maybeSingle();

        console.log("[NPC] Existing progress:", npcProgress, "Error:", progressError);

        if (npcProgress) {
          setNpcProgressId(npcProgress.id);

          if (npcProgress.is_completed) {
            console.log("[NPC] Conversation already completed");
            setNpcCompleted(true);
            return;
          }

          if (npcProgress.current_node_id) {
            const resumeNode = tree.nodes[npcProgress.current_node_id];
            if (resumeNode) {
              console.log("[NPC] Resuming from current node:", resumeNode.id);
              setNpcCurrentNode(resumeNode);
              return;
            }
          }
        }
      }

      // Start new conversation from root node
      const rootNode = tree.nodes[tree.root_node_id];
      if (!rootNode) {
        const errorMsg = `Root node ${tree.root_node_id} not found in tree`;
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      console.log("[NPC] Starting from root node:", rootNode.id);
      setNpcCurrentNode(rootNode);

      // Create progress record if we have activity progress
      if (activity.progress?.id) {
        const { data: user } = await supabase.auth.getUser();
        const { data: newProgress, error: progressError } = await supabase
          .from("path_npc_conversation_progress")
          .insert({
            progress_id: activity.progress.id,
            conversation_id: conversationId,
            user_id: user?.user?.id,
            current_node_id: rootNode.id,
            visited_node_ids: [rootNode.id],
            choice_history: [],
            is_completed: false,
          })
          .select()
          .single();

        if (progressError) {
          console.error("[NPC] Error creating progress record:", progressError);
        } else if (newProgress) {
          console.log("[NPC] Progress record created:", newProgress.id);
          setNpcProgressId(newProgress.id);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error loading NPC dialogue";
      console.error("[NPC] Error in initNPCDialogue:", error);
      setNpcError(errorMsg);
    }
  };

  const loadNPCChoices = async (nodeId: string) => {
    console.log("[NPC] Loading choices for node:", nodeId);
    const choices = npcTreeRef.current?.choices[nodeId] || [];
    console.log("[NPC] Choices from tree:", choices.length);
    return choices;
  };

  // Typing animation effect - triggered when npcCurrentNode changes
  useEffect(() => {
    if (!npcCurrentNode?.text_content) return;

    const fullText = npcCurrentNode.text_content;
    setDisplayedText("");
    setIsTyping(true);
    setNpcChoices([]); // Hide choices during typing

    // Play NPC speak sound when starting to type
    playNPCSpeakSound();

    // Start bounce animation
    const bounceAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();

    let currentIndex = 0;
    const typingSpeed = 30; // milliseconds per character - faster typing

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        // Typing complete
        clearInterval(typingInterval);
        bounceAnimation.stop();

        // Reset bounce position
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();

        setIsTyping(false);

        // Now load and show the choices
        loadNPCChoices(npcCurrentNode.id).then((choices) => {
          setNpcChoices(choices);

          // Start timer AFTER typing is complete and choices are shown
          const timeoutSeconds = npcCurrentNode.metadata?.timeout_seconds || 30;
          if (npcCurrentNode.node_type === "question" && choices.length > 0) {
            startChoiceTimer(timeoutSeconds);
          }
        });
      }
    }, typingSpeed);

    return () => {
      clearInterval(typingInterval);
      bounceAnimation.stop();
    };
  }, [npcCurrentNode]);

  // Start timer for choices with smooth animation
  const startChoiceTimer = useCallback((seconds: number) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeRemaining(seconds);
    setTimeRemainingPrecise(seconds);
    setShowTimeoutRestart(false);

    startTimeRef.current = Date.now();
    totalTimeRef.current = seconds;

    // Update every 25ms for ultra-smooth animation
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
      const remaining = totalTimeRef.current - elapsed;

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setTimeRemainingPrecise(0);
        setTimeRemaining(0);
        // Time's up!
        handleTimeout();
      } else {
        setTimeRemainingPrecise(remaining);
        setTimeRemaining(Math.ceil(remaining)); // For display
      }
    }, 25); // Update 40 times per second for ultra-smooth animation
  }, []);

  const handleTimeout = () => {
    console.log("[NPC] Choice timeout - restarting conversation");
    setShowTimeoutRestart(true);
    setNpcChoices([]);
  };

  const restartConversation = async () => {
    setShowTimeoutRestart(false);
    setTimeRemaining(null);

    if (activity) {
      await initNPCDialogue(activity);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleAISendMessage = async () => {
    if (!aiInput.trim() || !activity) return;

    const aiContent = activity.path_content[0];
    if (!aiContent || aiContent.content_type !== "ai_chat") return;

    const metadata = aiContent.metadata as AIChatMetadata;
    const userMessage: AIChatMessage = {
      role: "user",
      content: aiInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setAiSending(true);

    try {
      console.log("[AI] Sending message to AI service...");
      console.log("[AI] Metadata:", metadata);

      // Build messages array including system prompt
      const messages = [
        { role: "system", content: metadata.system_prompt || "You are a helpful assistant." },
        ...aiMessages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage.content }
      ];

      // Get Gemini API key from environment
      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to .env.local");
      }

      // Convert messages to Gemini format
      const systemPrompt = metadata.system_prompt || "You are a helpful assistant.";
      const conversationParts = aiMessages.map(msg => ({
        text: `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      }));

      // Add current user message
      conversationParts.push({
        text: `User: ${userMessage.content}`
      });

      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${conversationParts.map(p => p.text).join("\n")}\n\nAssistant:` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      };

      console.log("[AI] Using Gemini API");
      console.log("[AI] Request payload:", {
        model: "gemini-2.5-flash",
        messageCount: conversationParts.length,
      });

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiPayload),
        }
      );

      console.log("[AI] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[AI] Error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`AI service error (${response.status}): ${errorText || response.statusText || "Unknown error"}`);
      }

      const data = await response.json();
      console.log("[AI] Response from Gemini:", data);

      // Extract assistant message from Gemini response
      const assistantContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I couldn't generate a response.";

      const assistantMessage: AIChatMessage = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, assistantMessage]);

      // Check if we've reached the max messages goal (100%)
      const newMessageCount = aiMessages.length + 2; // +1 for user, +1 for assistant
      if (aiMaxMessages > 0 && newMessageCount >= aiMaxMessages) {
        console.log("[AI] Reached max messages - marking as complete");
        setAiObjectiveMet(true);

        // Mark activity as completed
        setTimeout(async () => {
          await updateActivityProgress({
            enrollmentId,
            activityId,
            status: "completed",
          });
          markActivityCompletedInCache();
        }, 1000);
      }

      // Check if objective is met
      if (metadata.objective) {
        // Check if the conversation has met the objective
        // For now, use message count or check if completion_criteria is mentioned
        const messageCount = aiMessages.length + 2; // +2 for the new user and assistant messages
        const maxMessages = metadata.max_messages || 10;

        if (messageCount >= maxMessages) {
          console.log("[AI] Objective met - max messages reached");
          setAiObjectiveMet(true);
        } else if (metadata.completion_criteria) {
          // Check if completion criteria keywords are in the conversation
          const conversationText = [...aiMessages, userMessage, assistantMessage]
            .map(m => m.content)
            .join(" ")
            .toLowerCase();

          if (conversationText.includes(metadata.completion_criteria.toLowerCase())) {
            console.log("[AI] Objective met - completion criteria found");
            setAiObjectiveMet(true);
          }
        }
      }
    } catch (error) {
      console.error("[AI] Error sending message:", error);

      // Show error message to user
      const errorMessage: AIChatMessage = {
        role: "assistant",
        content: `Sorry, I'm having trouble connecting to the AI service right now. ${error instanceof Error ? error.message : "Unknown error"}. Please try again in a moment.`,
        timestamp: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, errorMessage]);

      // Also show an alert for critical errors
      if (error instanceof Error && error.message.includes("500")) {
        Alert.alert(
          "Service Error",
          "The AI service is currently unavailable. Please try again later.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setAiSending(false);
    }
  };

  const handleNPCChoice = async (choice: NPCChoice) => {
    console.log("[NPC] Choice clicked:", choice.choice_text);
    console.log("[NPC] npcProgressId:", npcProgressId);
    console.log("[NPC] npcCurrentNode:", npcCurrentNode?.id);

    // Clear timer when choice is made
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeRemaining(null);

    if (!npcProgressId || !npcCurrentNode) {
      console.error("[NPC] Missing npcProgressId or npcCurrentNode!");
      return;
    }

    try {
      // First, get current progress to append to arrays
      console.log("[NPC] Fetching current progress to update arrays...");
      const { data: currentProgress, error: fetchError } = await supabase
        .from("path_npc_conversation_progress")
        .select("visited_node_ids, choice_history")
        .eq("id", npcProgressId)
        .single();

      if (fetchError) {
        console.error("[NPC] Error fetching progress:", fetchError);
        throw fetchError;
      }

      console.log("[NPC] Current progress:", currentProgress);

      // Build updated arrays
      const updatedVisitedNodes = [
        ...(currentProgress?.visited_node_ids || []),
        choice.to_node_id,
      ];

      const newChoiceRecord = {
        from_node_id: npcCurrentNode.id,
        choice_id: choice.id,
        to_node_id: choice.to_node_id,
        timestamp: new Date().toISOString(),
      };

      const updatedChoiceHistory = [
        ...(currentProgress?.choice_history || []),
        newChoiceRecord,
      ];

      console.log("[NPC] Updating progress with new arrays...");
      console.log("[NPC] New visited nodes:", updatedVisitedNodes);
      console.log("[NPC] New choice history:", updatedChoiceHistory);

      // Update progress with appended arrays
      const { data: updatedProgress, error: updateError } = await supabase
        .from("path_npc_conversation_progress")
        .update({
          current_node_id: choice.to_node_id,
          visited_node_ids: updatedVisitedNodes,
          choice_history: updatedChoiceHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", npcProgressId)
        .select()
        .single();

      if (updateError) {
        console.error("[NPC] Error updating progress:", updateError);
        throw updateError;
      }

      console.log("[NPC] Progress updated:", updatedProgress);

      // If terminal choice (to_node_id is null), conversation is complete
      if (!choice.to_node_id) {
        await supabase
          .from("path_npc_conversation_progress")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", npcProgressId);

        setNpcCompleted(true);
        setNpcChoices([]);

        // Auto-complete the activity
        if (enrollmentId && activityId) {
          await updateActivityProgress({
            enrollmentId,
            activityId,
            status: "completed",
          });
          markActivityCompletedInCache();
        }
        return;
      }

      // Load next node from in-memory tree
      const nextNode = choice.to_node_id ? npcTreeRef.current?.nodes[choice.to_node_id] : null;

      console.log("[NPC] Next node loaded:", nextNode?.id);

      if (nextNode) {
        setNpcCurrentNode(nextNode);

        if (nextNode.node_type === "end") {
          await supabase
            .from("path_npc_conversation_progress")
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq("id", npcProgressId);

          setNpcCompleted(true);
          setNpcChoices([]);

          // Auto-complete the activity
          if (enrollmentId && activityId) {
            await updateActivityProgress({
              enrollmentId,
              activityId,
              status: "completed",
            });
            markActivityCompletedInCache();
          }
        }
        // For non-end nodes, typing animation effect will handle loading choices
      }
    } catch (error) {
      console.error("Error handling NPC choice:", error);
      Alert.alert("Error", "Failed to process choice. Please try again.");
    }
  };

  const canComplete = () => {
    if (!activity) return false;

    const activityType = getActivityType(activity);

    // AI chat: must meet objective
    if (activityType === "ai_chat") {
      return aiObjectiveMet;
    }

    // NPC dialogue: must complete conversation
    if (activityType === "npc_chat") {
      return npcCompleted;
    }

    // Short videos, videos, text, and image without assessment: no button, swipe to complete
    const hasAssessment = !!activity.path_assessment;
    if ((activityType === "short_video" || activityType === "video" || activityType === "text" || activityType === "image") && !hasAssessment) {
      return false;
    }

    // Other activities: can complete immediately
    return true;
  };

  const markActivityCompletedInCache = () => {
    if (!enrollmentId || !activityId) return;

    const completedAt = new Date().toISOString();
    updateCachedActivityProgress(enrollmentId, activityId, (cachedActivity) => ({
      ...cachedActivity,
      progress: cachedActivity.progress
        ? {
            ...cachedActivity.progress,
            status: "completed",
            completed_at: completedAt,
            updated_at: completedAt,
          }
        : {
            id: `local-${activityId}`,
            enrollment_id: enrollmentId,
            activity_id: activityId,
            status: "completed",
            started_at: completedAt,
            completed_at: completedAt,
            time_spent_seconds: null,
            created_at: completedAt,
            updated_at: completedAt,
          },
    }));
  };

  const handleComplete = async (assessmentData?: { textAnswer?: string; imageUrl?: string; fileUrl?: string }) => {
    if (!enrollmentId || !activityId || !canComplete()) return;

    setCompleting(true);
    try {
      playActivityCompleteSound();

      await updateActivityProgress({
        enrollmentId,
        activityId,
        status: "completed",
      });
      markActivityCompletedInCache();

      // Save assessment submission if data was provided
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

      // Navigate to the next activity or to reflection when last activity is done
      const nextIndex = currentPage + 1;
      if (nextIndex < dayActivitiesList.length) {
        const nextActivity = dayActivitiesList[nextIndex];
        router.replace(`/activity/${nextActivity.id}?enrollmentId=${enrollmentId}&pageIndex=${nextIndex}&totalPages=${dayActivitiesList.length}`);
      } else {
        router.replace(`/reflection/${enrollmentId}`);
      }
    } catch (error) {
      console.error("Error completing activity:", error);
      Alert.alert("Error", "Failed to complete activity. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handleSwipeToNext = async () => {
    if (!enrollmentId || !activityId) return;

    const activityType = getActivityType(activity!);
    const hasAssessment = !!activity!.path_assessment;

    // For content types that allow swipe, auto-complete the activity
    if ((activityType === "short_video" || activityType === "video" || activityType === "text" || activityType === "image") && !hasAssessment) {
      try {
        await updateActivityProgress({
          enrollmentId,
          activityId,
          status: "completed",
        });
        markActivityCompletedInCache();
      } catch (error) {
        console.error("Error completing activity:", error);
      }
    }

    const nextIndex = currentPage + 1;
    if (nextIndex < dayActivitiesList.length) {
      const nextActivity = dayActivitiesList[nextIndex];
      router.replace(`/activity/${nextActivity.id}?enrollmentId=${enrollmentId}&pageIndex=${nextIndex}&totalPages=${dayActivitiesList.length}`);
    } else {
      // No more activities — go to daily reflection
      router.replace(`/reflection/${enrollmentId}`);
    }
  };

  const handleSwipeToPrevious = () => {
    if (!enrollmentId) return;
    const now = Date.now();
    if (now - lastPrevNavAtRef.current < 450) return;
    lastPrevNavAtRef.current = now;

    const prevIndex = currentPage - 1;
    if (prevIndex >= 0 && dayActivitiesList.length > 0) {
      const prevActivity = dayActivitiesList[prevIndex];
      router.replace(`/activity/${prevActivity.id}?enrollmentId=${enrollmentId}&pageIndex=${prevIndex}&totalPages=${dayActivitiesList.length}`);
    }
  };

  // Pan responder for edge swipe gestures (down at top = previous, up at bottom = next)
  const canSwipe = () => {
    if (!activity) return false;

    // Already completed activities can always swipe
    if (activity.progress?.status === "completed") return true;

    const activityType = getActivityType(activity);
    const hasAssessment = !!activity.path_assessment;

    // Allow swipe for: completed NPC chat, or content without assessment
    return npcCompleted ||
           ((activityType === "short_video" || activityType === "video" || activityType === "text" || activityType === "image") && !hasAssessment);
  };

  const canSwipeUp = () => {
    // Can always swipe up to previous if there is a previous activity
    return currentPage > 0 && dayActivitiesList.length > 0;
  };

  const npcPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      return isVerticalSwipe && Math.abs(gestureState.dy) > 30;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 && canSwipeUp()) {
        handleSwipeToPrevious();
      } else if (gestureState.dy < -100 && npcCompleted) {
        handleSwipeToNext();
      }
    }
  });

  // Skeleton component for loading states
  const SkeletonBlock = ({ width, height, borderRadius = 8 }: { width: number | `${number}%`; height: number; borderRadius?: number }) => (
    <View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: '#E0E0E0',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#F5F5F5',
        }}
      />
    </View>
  );

  // Skeleton screen for initial loading
  const renderSkeleton = () => (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header skeleton */}
      <View style={styles.header}>
        <SkeletonBlock width={60} height={20} />
        <SkeletonBlock width="60%" height={20} />
        <View style={{ width: 60 }} />
      </View>

      {/* Content skeleton */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <SkeletonBlock width="80%" height={28} />
        </View>

        {/* Instructions skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <SkeletonBlock width="100%" height={16} />
          <View style={{ height: 8 }} />
          <SkeletonBlock width="90%" height={16} />
          <View style={{ height: 8 }} />
          <SkeletonBlock width="70%" height={16} />
        </View>

        {/* Content block skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <SkeletonBlock width="100%" height={200} borderRadius={12} />
        </View>

        {/* Assessment skeleton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <SkeletonBlock width="100%" height={120} borderRadius={12} />
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return renderSkeleton();
  }

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

  const activityType = getActivityType(activity);
  const isInteractive = activityType === "ai_chat" || activityType === "npc_chat";
  const isNpcChat = activityType === "npc_chat";
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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header - Hidden for NPC chat full screen */}
      {!isNpcChat && (
        <>
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 8,
                paddingBottom: 10,
                zIndex: 10,
              },
            ]}
          >
            <View style={[styles.headerTopRow, { marginBottom: 4 }]}>
              <SkiaBackButton onPress={() => router.back()} style={styles.headerBackButton} />
              <View
                style={[
                  styles.headerTopRowCenter,
                  showPagination && styles.headerTopRowCenterWithDots,
                ]}
              >
                <Reanimated.View
                  style={[styles.headerCollapsedTitleWrap, collapsedInlineAnimatedStyle]}
                  pointerEvents="none"
                >
                  <AppText variant="bold" numberOfLines={1} style={styles.headerTitleCollapsed}>
                    {activity.title}
                  </AppText>
                </Reanimated.View>
              </View>
              <View style={styles.headerTopSpacer} />
            </View>
          </View>

          {/* Page Indicator Dots - Vertical on right side */}
          {showPagination && (
            <Reanimated.View style={[styles.dotsContainerVertical, pageDotsAnimatedStyle]}>
              {Array.from({ length: total }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dotVertical,
                    index === currentPage && styles.dotVerticalActive,
                  ]}
                />
              ))}
            </Reanimated.View>
          )}
        </>
      )}

      {/* NPC Chat - Full Screen */}
      {isNpcChat ? (
        <View style={styles.npcFullscreenWrapper}>
          {/* Back button overlay */}
          <Pressable
            style={styles.backButtonOverlay}
            onPress={() => router.back()}
          >
            <AppText style={styles.backButtonOverlayText}>✕</AppText>
          </Pressable>

          {/* NPC Dialogue - Full Screen Cinematic */}
          <View style={styles.npcFullscreenContainer}>
            {/* Progress dots - Vertical on right side */}
            {showPagination && (
              <View style={styles.npcProgressDotsVertical}>
                {Array.from({ length: total }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.npcDotVertical,
                      i === currentPage && styles.npcDotVerticalActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {npcError ? (
              <View style={styles.npcErrorCard}>
                <AppText style={styles.npcErrorIcon}>⚠️</AppText>
                <AppText style={styles.npcErrorTitle}>Failed to load conversation</AppText>
                <AppText style={styles.npcErrorText}>{npcError}</AppText>
                <Pressable
                  style={styles.npcRetryButton}
                  onPress={() => {
                    setNpcError(null);
                    if (activity) initNPCDialogue(activity);
                  }}
                >
                  <AppText style={styles.npcRetryText}>Retry</AppText>
                </Pressable>
              </View>
            ) : !npcCurrentNode && !npcCompleted ? (
              <View style={styles.npcLoadingCard}>
                <PathLabSkiaLoader size="large" />
                <AppText style={styles.npcLoadingText}>
                  Connecting...
                </AppText>
              </View>
            ) : showTimeoutRestart ? (
              <View style={styles.timeoutOverlay}>
                <AppText style={styles.timeoutTitle}>Time's Up!</AppText>
                <AppText style={styles.timeoutMessage}>
                  You didn't respond in time. Let's try again.
                </AppText>
                <Pressable
                  style={styles.restartButton}
                  onPress={restartConversation}
                >
                  <AppText style={styles.restartButtonText}>Restart Conversation</AppText>
                </Pressable>
              </View>
            ) : npcCompleted ? (
              // Show summary overlay when conversation is completed
              <View style={styles.npcSummaryOverlay} {...npcPanResponder.panHandlers}>
                <View style={styles.npcSummaryBox}>
                  <AppText style={styles.npcSummaryTitle}>Conversation Summary</AppText>
                  <AppText style={styles.npcSummaryText}>
                    {npcSummary || activity.instructions || "You have completed this conversation."}
                  </AppText>
                </View>
                {currentPage < dayActivitiesList.length - 1 ? (
                  <>
                    <AppText style={styles.swipeHint}>↓</AppText>
                    <AppText style={styles.swipeText}>Swipe up for next activity</AppText>
                  </>
                ) : (
                  <>
                    <AppText style={styles.swipeHint}>↓</AppText>
                    <AppText style={styles.swipeText}>Swipe up to reflect on your day</AppText>
                  </>
                )}
              </View>
            ) : npcCurrentNode ? (
              <>
                {/* Full-body NPC Character */}
                <RNAnimated.View
                  style={[
                    styles.npcFullBodyContainer,
                    { transform: [{ translateY: bounceAnim }] }
                  ]}
                >
                  {npcSeedAvatar?.svg_data ? (
                    <View style={styles.npcFullBodyAvatar}>
                      <SvgXml
                        xml={npcSeedAvatar.svg_data}
                        width="280"
                        height="420"
                        preserveAspectRatio="xMidYMax meet"
                      />
                    </View>
                  ) : (
                    <View style={styles.npcAvatarPlaceholderLarge}>
                      <AppText style={styles.npcAvatarEmojiLarge}>👤</AppText>
                    </View>
                  )}
                </RNAnimated.View>

                {/* Speech Bubble and Timer Bar */}
                <View style={styles.speechBubbleContainer}>
                  <View style={styles.speechBubble}>
                    <AppText style={styles.speechBubbleText}>
                      {displayedText}
                      {isTyping && <AppText style={styles.typingCursor}>|</AppText>}
                    </AppText>
                  </View>

                  {/* Timer Bar - Below speech bubble */}
                  {timeRemainingPrecise !== null && timeRemainingPrecise > 0 && npcCurrentNode && (
                    <View style={styles.timerBarBelowBubble}>
                      <View style={[
                        styles.timerBarGreyFull,
                        timeRemaining !== null && timeRemaining <= 5 && styles.timerBarGreyUrgent,
                      ]} />
                      <View
                        style={[
                          styles.timerBarGreenRemaining,
                          {
                            width: `${(timeRemainingPrecise / (npcCurrentNode.metadata?.timeout_seconds || 30)) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>

                {/* Floating name tag - positioned in front of speech bubble */}
                {npcSeedAvatar?.name && (
                  <View style={styles.npcNameTag}>
                    <View style={styles.npcOnlineIndicator} />
                    <AppText style={styles.npcNameTagText}>
                      {npcSeedAvatar.name}
                    </AppText>
                  </View>
                )}

                {/* Player choices - Bottom overlay */}
                {!npcCompleted && npcChoices.length > 0 && (
                  <View style={styles.choicesOverlay}>
                    <View style={styles.choicesGradient} />
                    {npcChoices.map((choice, index) => (
                      <Pressable
                        key={choice.id}
                        style={({ pressed }) => [
                          styles.choiceOptionButton,
                          pressed && styles.choiceOptionButtonPressed,
                          timeRemaining !== null && timeRemaining <= 5 && styles.choiceOptionButtonUrgent,
                        ]}
                        onPress={() => handleNPCChoice(choice)}
                      >
                        <View style={styles.choiceOptionContent}>
                          <AppText style={styles.choiceOptionLabel}>
                            {String.fromCharCode(65 + index)}
                          </AppText>
                          <AppText style={styles.choiceOptionText}>
                            {choice.choice_text}
                          </AppText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
      ) : (
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

            if (
              canSwipeUp() &&
              scrollY < 0 &&
              -scrollY > SWIPE_NEXT_THRESHOLD * 0.6
            ) {
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

            if (
              canSwipeUp() &&
              scrollY < 0 &&
              scrollY > -SWIPE_NEXT_THRESHOLD * 0.6
            ) {
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
          {/* Moved Header Hero into ScrollView for native scrolling performance */}
          {!isNpcChat && (
            <Reanimated.View
              style={[
                styles.headerHero,
                heroHeaderAnimatedStyle,
                {
                  marginBottom: 16,
                  marginTop: -10, // Adjust for removed padding
                },
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
          )}

          {/* Instructions */}
          {activity.instructions && (
            <View style={styles.instructionsCard}>
              <AppText style={styles.instructionsText}>{activity.instructions}</AppText>
            </View>
          )}

          {/* AI Chat - Messaging Style */}
          {activityType === "ai_chat" && (
            <View style={styles.messengerContainer}>
              {/* Chat Header */}
              <View style={styles.messengerHeader}>
                {/* Use NPC avatar if available from seed */}
                {npcSeedAvatar?.svg_data ? (
                  <View style={styles.messengerAvatarContainer}>
                    <View style={styles.messengerAvatarSvg}>
                      <SvgXml
                        xml={npcSeedAvatar.svg_data}
                        width="48"
                        height="48"
                      />
                    </View>
                    <View style={styles.messengerOnlineDot} />
                  </View>
                ) : (
                  <View style={styles.messengerAvatar}>
                    <AppText style={styles.messengerAvatarText}>AI</AppText>
                    <View style={styles.messengerOnlineDot} />
                  </View>
                )}
                <View style={styles.messengerHeaderInfo}>
                  <AppText style={styles.messengerHeaderName}>
                    {npcSeedAvatar?.name || "AI Assistant"}
                  </AppText>
                  <AppText style={styles.messengerHeaderStatus}>Online</AppText>
                </View>
              </View>

              {/* AI Chat Progress Bar */}
              {aiMaxMessages > 0 && (
                <View style={styles.aiProgressContainer}>
                  <View style={styles.aiProgressBar}>
                    <View
                      style={[
                        styles.aiProgressFill,
                        { width: `${Math.min((aiMessages.length / aiMaxMessages) * 100, 100)}%` }
                      ]}
                    />
                  </View>
                  <AppText style={styles.aiProgressText}>
                    {Math.min(Math.round((aiMessages.length / aiMaxMessages) * 100), 100)}%
                  </AppText>
                </View>
              )}

              {/* Messages - ScrollView */}
              <ScrollView
                style={styles.messengerMessagesScroll}
                contentContainerStyle={styles.messengerMessages}
                showsVerticalScrollIndicator={false}
              >
                {aiMessages.map((msg, i) => (
                  <View
                    key={i}
                    style={[
                      styles.messengerBubbleContainer,
                      msg.role === "user"
                        ? styles.messengerBubbleContainerUser
                        : styles.messengerBubbleContainerAI,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      {/* Show avatar for AI messages */}
                      {msg.role === "assistant" && npcSeedAvatar?.svg_data && (
                        <View style={styles.messengerMessageAvatar}>
                          <SvgXml
                            xml={npcSeedAvatar.svg_data}
                            width="32"
                            height="32"
                          />
                        </View>
                      )}
                      <View
                        style={[
                          styles.messengerBubble,
                          msg.role === "user"
                            ? styles.messengerBubbleUser
                            : styles.messengerBubbleAI,
                        ]}
                      >
                        <AppText style={[
                          styles.messengerBubbleText,
                          msg.role === "user" && styles.messengerBubbleTextUser
                        ]}>
                          {msg.content}
                        </AppText>
                        <AppText style={[
                          styles.messengerTime,
                          msg.role === "user" && styles.messengerTimeUser
                        ]}>
                          {new Date(msg.timestamp).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}

                {aiSending && (
                  <View style={styles.messengerBubbleContainerAI}>
                    <View style={styles.messengerBubbleAI}>
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingDot} />
                        <View style={[styles.typingDot, { opacity: 0.6 }]} />
                        <View style={[styles.typingDot, { opacity: 0.3 }]} />
                      </View>
                    </View>
                  </View>
                )}

                {aiObjectiveMet && (
                  <View style={styles.messengerCompletedCard}>
                    <AppText style={styles.messengerCompletedIcon}>✓</AppText>
                    <AppText style={styles.messengerCompletedText}>
                      Conversation objective completed!
                    </AppText>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Regular Content Items */}
          {activityType !== "ai_chat" &&
            activityType !== "npc_chat" &&
            activityType !== "unknown" &&
            activity.path_content.map((item) => (
              <ContentItem key={item.id} content={item} />
            ))}

          {/* Fallback for activities with no content configured */}
          {activityType === "unknown" && (
            <View style={{ padding: 32, alignItems: "center" }}>
              <AppText style={[styles.instructionsText, { textAlign: "center", color: ThemeText.tertiary }]}>
                This activity's content isn't available yet.
              </AppText>
            </View>
          )}

        {/* Assessment */}
        {activity.path_assessment && (
          <AssessmentItem
            assessment={activity.path_assessment}
            submission={activity.submission}
            isCompleted={activity.progress?.status === "completed"}
            onComplete={(data) => handleComplete(data)}
          />
        )}

          {!canSwipe() ? <View style={{ height: 120 }} /> : null}
        </Reanimated.ScrollView>

          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.pullOverlayTop,
              { paddingTop: 2 },
              prevPullOverlayStyle,
            ]}
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
      )}

      {/* AI Chat Input - Messenger Style */}
      {activityType === "ai_chat" && !aiObjectiveMet && (
        <View style={styles.messengerInputContainer}>
          <View style={styles.messengerInputWrapper}>
            <TextInput
              style={styles.messengerInput}
              placeholder="พิมพ์ข้อความ..."
              placeholderTextColor="rgba(0, 0, 0, 0.3)"
              value={aiInput}
              onChangeText={setAiInput}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[
                styles.messengerSendButton,
                (!aiInput.trim() || aiSending) && styles.messengerSendButtonDisabled
              ]}
              onPress={handleAISendMessage}
              disabled={aiSending || !aiInput.trim()}
            >
              <AppText style={styles.messengerSendIcon}>
                {aiSending ? "⋯" : "➤"}
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Complete Button - Only show when can complete and no assessment */}
      {canComplete() && !activity?.path_assessment && (
        <View style={styles.ctaContainer}>
          <GlassButton
            variant="primary"
            fullWidth
            textStyle={styles.glassButtonText}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? "Completing..." : "Mark as Complete"}
          </GlassButton>
        </View>
      )}
    </View>
  );
}

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/,
    /youtube\.com\/embed\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

const markdownStyles = {
  body: { fontFamily: "BaiJamjuree_400Regular", fontSize: 14, color: ThemeText.secondary, lineHeight: 22 },
  heading1: { fontFamily: "BaiJamjuree_700Bold", fontSize: 20, color: ThemeText.primary, marginTop: 12, marginBottom: 4 },
  heading2: { fontFamily: "BaiJamjuree_700Bold", fontSize: 17, color: ThemeText.primary, marginTop: 10, marginBottom: 4 },
  heading3: { fontFamily: "BaiJamjuree_700Bold", fontSize: 15, color: ThemeText.primary, marginTop: 8, marginBottom: 4 },
  strong: { fontFamily: "BaiJamjuree_700Bold", color: ThemeText.primary },
  em: { fontFamily: "BaiJamjuree_400Regular", fontStyle: "italic" as const },
  code_inline: { fontFamily: "BaiJamjuree_400Regular", backgroundColor: PageBg.offWhite, color: ThemeText.primary, paddingHorizontal: 4, borderRadius: 4 },
  code_block: { fontFamily: "BaiJamjuree_400Regular", backgroundColor: PageBg.offWhite, color: ThemeText.primary, padding: 12, borderRadius: 8 },
  fence: { fontFamily: "BaiJamjuree_400Regular", backgroundColor: PageBg.offWhite, color: ThemeText.primary, padding: 12, borderRadius: 8 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: Accent.yellow, paddingLeft: 12, marginVertical: 8 },
  link: { color: Accent.yellowDark },
  hr: { backgroundColor: "rgba(0,0,0,0.08)", height: 1, marginVertical: 12 },
};

function ContentItem({ content }: { content: PathContent }) {
  const { width: windowWidth } = useWindowDimensions();
  const [imageHeight, setImageHeight] = useState<number>(windowWidth * 0.75);

  const renderContent = () => {
    switch (content.content_type) {
      case "text":
        return (
          <GlassCard style={styles.contentCard}>
            {content.content_title && (
              <AppText variant="bold" style={styles.contentTitle}>{content.content_title}</AppText>
            )}
            {content.content_body && (
              <Markdown style={markdownStyles}>{content.content_body}</Markdown>
            )}
          </GlassCard>
        );

      case "video":
      case "short_video":
        const videoId = extractYouTubeId(content.content_url || "");
        const isYouTube = !!videoId;

        // Treat as short if URL contains /shorts/ or type is short_video
        const isShort = content.content_url?.includes("/shorts/") || content.content_type === "short_video";

        // Full screen width (scroll content has padding: 20; bleed out like fullWidth images)
        const videoWidth = windowWidth;
        let playerHeight = videoWidth * (9 / 16);
        if (isShort) {
          playerHeight = videoWidth * (16 / 9); // 9:16 portrait at full width
        }

        return (
          <>
            {content.content_title && !isShort && (
              <AppText variant="bold" style={styles.contentTitle}>{content.content_title}</AppText>
            )}
            <View style={[styles.fullWidthVideoBleed, { width: videoWidth }]}>
              {isYouTube ? (
                <View style={isShort ? styles.videoContainerShort : styles.videoContainer}>
                  <YoutubePlayer
                    height={playerHeight}
                    width={videoWidth}
                    videoId={videoId}
                    play={false}
                    webViewStyle={{ opacity: 0.99 }}
                    webViewProps={{
                      androidLayerType: "hardware",
                    }}
                  />
                </View>
              ) : content.content_url ? (
                <View style={isShort ? styles.videoContainerShort : styles.videoContainer}>
                  <WebView
                    source={{
                      html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                          <style>
                            body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                            video { width: 100%; height: 100%; object-fit: ${isShort ? 'contain' : 'cover'}; }
                          </style>
                        </head>
                        <body>
                          <video controls playsinline preload="metadata">
                            <source src="${content.content_url}" type="video/mp4">
                            Your browser does not support the video tag.
                          </video>
                        </body>
                      </html>
                    `
                    }}
                    style={styles.uploadedVideo}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled
                    domStorageEnabled
                  />
                </View>
              ) : null}
            </View>
            {content.content_body && !isShort && (
              <GlassCard style={styles.contentCard}>
                <AppText style={styles.contentBody}>{content.content_body}</AppText>
              </GlassCard>
            )}
          </>
        );

      case "image":
        return (
          <>
            {/* Title and description in card */}
            {(content.content_title || content.content_body) && (
              <GlassCard style={styles.contentCard}>
                {content.content_title && (
                  <AppText variant="bold" style={styles.contentTitle}>{content.content_title}</AppText>
                )}
                {content.content_body && (
                  <AppText style={styles.contentBody}>{content.content_body}</AppText>
                )}
              </GlassCard>
            )}

            {/* Full-width image outside card */}
            {content.content_url ? (
              <View style={[styles.fullWidthContentImageContainer, { width: windowWidth, height: imageHeight }]}>
                <ExpoImage
                  source={{ uri: content.content_url, headers: { Referer: 'https://ibb.co' } }}
                  style={[styles.fullWidthContentImage, { width: windowWidth, height: imageHeight }]}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  onLoad={(e) => {
                    const { width, height } = e.source;
                    if (width && height) {
                      setImageHeight(windowWidth * (height / width));
                    }
                  }}
                />
              </View>
            ) : (
              <GlassCard style={styles.contentCard}>
                <AppText style={styles.contentBody}>No image URL provided</AppText>
              </GlassCard>
            )}
          </>
        );

      case "resource_link":
        return (
          <GlassCard style={styles.contentCard}>
            <AppText style={styles.contentIcon}>🔗</AppText>
            {content.content_title && (
              <AppText variant="bold" style={styles.contentTitle}>{content.content_title}</AppText>
            )}
            {content.content_url && (
              <AppText style={styles.contentUrl}>{content.content_url}</AppText>
            )}
          </GlassCard>
        );

      case "daily_prompt":
        return (
          <GlassCard style={[styles.contentCard, styles.promptCard]}>
            <AppText style={styles.contentIcon}>💡</AppText>
            {content.content_body && (
              <AppText style={styles.promptText}>{content.content_body}</AppText>
            )}
          </GlassCard>
        );

      default:
        return null;
    }
  };

  return renderContent();
}

function AssessmentItem({
  assessment,
  submission,
  isCompleted,
  onComplete,
}: {
  assessment: PathAssessment & { quiz_questions?: PathQuizQuestion[] };
  submission?: PathAssessmentSubmission | null;
  isCompleted?: boolean;
  onComplete: (data: { textAnswer?: string; imageUrl?: string; fileUrl?: string }) => void;
}) {
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState<number>(300);
  const [submitted, setSubmitted] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const alreadyCompleted = isCompleted || submitted;

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({ name: file.name, uri: file.uri });
        setSubmitted(true);
        onComplete({ fileUrl: file.uri });
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[Camera] Permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      console.log('[Camera] Result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        if (asset.width && asset.height) {
          setImageHeight(screenWidth * (asset.height / asset.width));
        }
        setSubmitted(true);
        onComplete({ imageUrl: asset.uri });
      }
    } catch (error: any) {
      console.error('[Camera] Error taking photo:', error);
      Alert.alert('Error', error?.message || 'Failed to take photo');
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        if (asset.width && asset.height) {
          setImageHeight(screenWidth * (asset.height / asset.width));
        }
        setSubmitted(true);
        onComplete({ imageUrl: asset.uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  if (alreadyCompleted) {
    console.log('[Assessment] Completed state - submission:', JSON.stringify({
      has_submission: !!submission,
      text_answer: submission?.text_answer ?? null,
      image_url: submission?.image_url ?? null,
      file_urls: submission?.file_urls ?? null,
    }));
    return (
      <GlassCard style={styles.assessmentCard}>
        <AppText variant="bold" style={styles.assessmentType}>
          {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
        </AppText>

        {/* Show what was submitted */}
        {submission?.text_answer && (
          <View style={styles.submittedAnswerContainer}>
            <AppText style={styles.submittedAnswerText}>{submission.text_answer}</AppText>
          </View>
        )}
        {submission?.image_url && (
          <ExpoImage
            source={{ uri: submission.image_url, headers: { Referer: 'https://ibb.co' } }}
            style={[styles.submittedImage, { height: screenWidth * 0.75 }]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        {submission?.file_urls && submission.file_urls.length > 0 && (
          <View style={styles.submittedFileContainer}>
            <AppText style={styles.selectedFileName}>📄 {submission.file_urls[0].split('/').pop()}</AppText>
          </View>
        )}

        <AppText style={styles.assessmentSubmittedLabel}>✓ Completed</AppText>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard style={styles.assessmentCard}>
        <AppText variant="bold" style={styles.assessmentType}>
          {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
        </AppText>

        {assessment.quiz_questions && assessment.quiz_questions.length > 0 && (
          <View style={styles.quizContainer}>
            {assessment.quiz_questions.map((question, index) => (
              <View key={question.id} style={styles.questionCard}>
                <AppText style={styles.questionText}>
                  {index + 1}. {question.question_text}
                </AppText>
                {question.options &&
                  Array.isArray(question.options) &&
                  question.options.map((opt: any, optIndex: number) => (
                    <View key={optIndex} style={styles.optionRow}>
                      <View style={styles.optionCircle} />
                      <AppText style={styles.optionText}>
                        {typeof opt === "string" ? opt : opt.text || opt.option}
                      </AppText>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        )}

        {assessment.assessment_type === "text_answer" && (
          <View style={styles.textAnswerContainer}>
            <TextInput
              style={styles.textAnswerInput}
              placeholder="Write your response..."
              placeholderTextColor="rgba(0, 0, 0, 0.3)"
              value={textAnswer}
              onChangeText={setTextAnswer}
              multiline
              textAlignVertical="top"
            />
            <AppText style={styles.characterCount}>{textAnswer.length} characters</AppText>
            <GlassButton
              variant="primary"
              fullWidth
              textStyle={styles.glassButtonText}
              style={{ marginTop: 12 }}
              disabled={textAnswer.trim().length === 0}
              onPress={() => { setSubmitted(true); onComplete({ textAnswer }); }}
            >
              Submit
            </GlassButton>
          </View>
        )}

        {assessment.assessment_type === "file_upload" && (
          <View style={styles.uploadContainer}>
            <GlassButton
              variant="secondary"
              style={styles.uploadButton}
              textStyle={styles.glassButtonText}
              onPress={handlePickFile}
            >
              📎 Choose File
            </GlassButton>
            {selectedFile && (
              <GlassCard style={styles.selectedFileCard}>
                <AppText style={styles.selectedFileName}>📄 {selectedFile.name}</AppText>
              </GlassCard>
            )}
          </View>
        )}

        {assessment.assessment_type === "image_upload" && (
          <View style={styles.uploadContainer}>
            <View style={styles.imageUploadButtons}>
              <GlassButton
                variant="secondary"
                style={styles.cameraButton}
                textStyle={styles.glassButtonText}
                onPress={handleTakePhoto}
              >
                📷 Take Photo
              </GlassButton>
              <GlassButton
                variant="secondary"
                style={styles.uploadButton}
                textStyle={styles.glassButtonText}
                onPress={handlePickImage}
              >
                🖼️ Choose Photo
              </GlassButton>
            </View>
          </View>
        )}
      </GlassCard>

      {/* Full-width image display OUTSIDE of assessmentCard */}
      {assessment.assessment_type === "image_upload" && selectedImage && (
        <View style={[styles.fullWidthImageContainer, { width: screenWidth }]}>
          <ExpoImage
            source={selectedImage}
            style={[styles.selectedImage, { height: imageHeight, width: screenWidth }]}
            contentFit="contain"
          />
          <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
            <AppText style={styles.removeFileText}>✕</AppText>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  baiRegularText: {
    fontFamily: "BaiJamjuree_400Regular",
  },
  baiBoldText: {
    fontFamily: "BaiJamjuree_700Bold",
  },
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
  errorText: {
    fontSize: 16,
    color: ThemeText.tertiary,
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Accent.yellow,
    borderRadius: Radius.full,
    ...Shadow.card,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  header: {
    paddingHorizontal: 20,
    backgroundColor: PageBg.default,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.card,
  },
  headerBackIcon: {
    fontSize: 20,
    color: "#111827",
    lineHeight: 24,
  },
  headerTopSpacer: {
    width: 38,
    height: 38,
  },
  headerTopRowCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 4,
  },
  headerTopRowCenterWithDots: {
    paddingRight: 10,
  },
  headerCollapsedTitleWrap: {
    width: "100%",
    justifyContent: "center",
  },
  headerTitleCollapsed: {
    fontSize: 17,
    lineHeight: 22,
    color: ThemeText.primary,
    textAlign: "center",
  },
  headerHero: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    overflow: "hidden",
  },
  headerChipRow: {
    alignItems: "center",
    justifyContent: "center",
  },
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
  scrollWrapper: {
    flex: 1,
    overflow: "visible",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    overflow: "visible", // Allow children to break out
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

  // AI Chat - Messenger Style
  messengerContainer: {
    flex: 1,
    backgroundColor: PageBg.offWhite,
  },
  messengerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.04)",
    gap: 12,
    ...Shadow.card,
  },
  messengerAvatarContainer: {
    position: "relative",
  },
  messengerAvatarSvg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.neutral,
  },
  messengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Accent.purple,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    ...Shadow.neutral,
  },
  messengerAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  messengerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Accent.green,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  messengerHeaderInfo: {
    flex: 1,
  },
  messengerHeaderName: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 2,
  },
  messengerHeaderStatus: {
    fontSize: 13,
    color: Accent.green,
  },

  // AI Chat Progress
  aiProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  aiProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Accent.yellowLight,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.4)",
  },
  aiProgressFill: {
    height: "100%",
    backgroundColor: Accent.yellow,
    borderRadius: 4,
  },
  aiProgressText: {
    fontSize: 14,
    fontWeight: "700",
    color: ThemeText.primary,
    minWidth: 40,
    textAlign: "right",
  },

  messengerMessages: {
    padding: 16,
    gap: 12,
  },
  messengerBubbleContainer: {
    marginBottom: 4,
  },
  messengerBubbleContainerAI: {
    alignItems: "flex-start",
  },
  messengerBubbleContainerUser: {
    alignItems: "flex-end",
  },
  messengerBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messengerBubbleAI: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadow.card,
  },
  messengerBubbleUser: {
    backgroundColor: Accent.purple,
    borderBottomRightRadius: 4,
    ...Shadow.card,
  },
  messengerBubbleText: {
    fontSize: 15,
    color: ThemeText.primary,
    lineHeight: 22,
    marginBottom: 4,
  },
  messengerBubbleTextUser: {
    color: "#fff",
  },
  messengerTime: {
    fontSize: 11,
    color: ThemeText.tertiary,
  },
  messengerTimeUser: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  typingIndicator: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ThemeText.muted,
  },
  messengerCompletedCard: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  messengerCompletedIcon: {
    fontSize: 18,
    color: Accent.green,
  },
  messengerCompletedText: {
    fontSize: 14,
    fontWeight: "500",
    color: Accent.green,
  },
  messengerInputContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    ...Shadow.floating,
  },
  messengerInputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: PageBg.offWhite,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  messengerInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "BaiJamjuree_400Regular",
    color: ThemeText.primary,
    maxHeight: 100,
    paddingVertical: 10,
    lineHeight: 22,
  },
  messengerSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Accent.purple,
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.neutral,
  },
  messengerSendButtonDisabled: {
    backgroundColor: ThemeText.muted,
  },
  messengerSendIcon: {
    fontSize: 20,
    color: "#fff",
  },
  messengerMessagesScroll: {
    flex: 1,
  },
  messengerMessageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.neutral,
  },

  // NPC Dialogue styles - Cinematic Full Screen
  npcFullscreenWrapper: {
    flex: 1,
    backgroundColor: PageBg.offWhite,
  },
  backButtonOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Shadow.card,
  },
  backButtonOverlayText: {
    fontSize: 24,
    color: ThemeText.primary,
    fontWeight: "600",
  },
  npcFullscreenContainer: {
    flex: 1,
    backgroundColor: PageBg.offWhite,
    position: "relative",
  },
  npcProgressDotsVertical: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -50 }],
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  npcDotVertical: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  npcDotVerticalActive: {
    backgroundColor: Accent.yellow,
    height: 24,
  },
  npcLoadingCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  npcLoadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: ThemeText.primary,
    letterSpacing: 1,
  },
  npcErrorCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    gap: 12,
    ...Shadow.card,
  },
  npcErrorIcon: {
    fontSize: 48,
  },
  npcErrorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Accent.red,
  },
  npcErrorText: {
    fontSize: 13,
    color: Accent.red,
    textAlign: "center",
  },
  npcRetryButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    marginTop: 8,
    ...Shadow.card,
  },
  npcRetryText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
  },

  // Flex-based NPC layout (replaces absolute positioning)
  npcFlexLayout: {
    flex: 1,
    flexDirection: "column",
  },
  npcAvatarSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 8,
  },
  npcBottomSection: {
    flex: 1,
  },
  npcBottomContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },
  choicesInline: {
    gap: 12,
    marginTop: 4,
  },
  npcNameTagInline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.8)",
    marginTop: 10,
    ...Shadow.card,
  },

  // Legacy / kept for reference — no longer used in NPC layout
  npcFullBodyContainer: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  npcFullBodyAvatar: {
    width: 280,
    height: 420,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  npcAvatarPlaceholderLarge: {
    width: 200,
    height: 200,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: Radius.xl,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.3)",
    ...Shadow.card,
  },
  npcAvatarEmojiLarge: {
    fontSize: 80,
  },
  npcNameTag: {
    position: "absolute",
    top: 495,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.5)",
    ...Shadow.card,
    zIndex: 3,
  },
  npcOnlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Accent.green,
  },
  npcNameTagText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
    letterSpacing: 0.5,
  },

  // Speech Bubble
  speechBubbleContainer: {
    position: "absolute",
    top: 520,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  speechBubbleTail: {
    position: "absolute",
    top: -10,
    left: "50%",
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fff",
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.5)",
    ...Shadow.card,
  },
  speechBubbleText: {
    fontSize: 17,
    fontWeight: "500",
    color: ThemeText.primary,
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  typingCursor: {
    color: "#BFFF00",
    fontWeight: "700",
  },

  // Timer Bar - Below speech bubble, inverted (grey eats green)
  timerBarBelowBubble: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  timerBarGreyFull: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 8,
    backgroundColor: ThemeText.secondary,
    borderRadius: 4,
  },
  timerBarGreenRemaining: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 8,
    backgroundColor: Accent.yellow,
    borderRadius: 4,
  },
  timerBarGreyUrgent: {
    backgroundColor: Accent.red,
  },
  timerNumberBelowContainer: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4,
  },
  timerNumberBelow: {
    fontSize: 18,
    fontWeight: "700",
    color: Accent.yellow,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Accent.yellow,
    overflow: "hidden",
  },
  timerNumberBelowUrgent: {
    color: Accent.red,
    borderColor: Accent.red,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },

  // Choices Overlay
  choicesOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 80,
    zIndex: 2,
  },
  choicesGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "transparent",
  },
  choiceOptionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.5)",
    overflow: "hidden",
    ...Shadow.card,
  },
  choiceOptionButtonPressed: {
    backgroundColor: Accent.yellowLight,
    borderColor: Accent.yellow,
    transform: [{ scale: 0.98 }],
  },
  choiceOptionButtonUrgent: {
    borderColor: Accent.red,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  choiceOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  choiceOptionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Accent.yellow,
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,
    fontWeight: "700",
    color: ThemeText.primary,
    textAlign: "center",
    lineHeight: 32,
  },
  choiceOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: ThemeText.primary,
    lineHeight: 24,
  },

  // Timeout & Restart
  timeoutOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  timeoutTitle: {
    fontSize: 48,
    fontWeight: "700",
    color: Accent.red,
    textAlign: "center",
  },
  timeoutMessage: {
    fontSize: 18,
    fontWeight: "500",
    color: ThemeText.primary,
    textAlign: "center",
    lineHeight: 28,
  },
  restartButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Radius.full,
    marginTop: 16,
    ...Shadow.card,
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
  },

  // Completion
  completionOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  completionIcon: {
    fontSize: 80,
    color: Accent.yellow,
  },
  completionText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111",
    marginBottom: 16,
  },
  npcSummaryOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  npcSummaryBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.5)",
    maxWidth: 400,
    ...Shadow.card,
  },
  npcSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  npcSummaryText: {
    fontSize: 16,
    fontWeight: "400",
    color: ThemeText.secondary,
    lineHeight: 24,
    textAlign: "center",
  },
  swipeHint: {
    fontSize: 48,
    color: Accent.yellow,
    marginTop: 24,
  },
  swipeText: {
    fontSize: 16,
    fontWeight: "500",
    color: ThemeText.secondary,
    marginTop: 8,
  },
  swipeHintArrow: {
    fontSize: 32,
    color: Accent.yellow,
  },
  objectiveMetCard: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  objectiveMetText: {
    fontSize: 14,
    fontWeight: "500",
    color: Accent.green,
  },

  contentCard: {
    marginBottom: Space.lg,
  },
  fullWidthVideoBleed: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
  contentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginBottom: 8,
    position: "relative",
    ...Shadow.card,
  },
  videoContainerShort: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginBottom: 16,
    marginTop: 8,
    position: "relative",
    ...Shadow.card,
  },
  video: {
    flex: 1,
  },
  videoLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  uploadedVideo: {
    width: "100%",
    height: "100%",
  },
  contentType: {
    fontSize: 11,
    fontWeight: "600",
    color: ThemeText.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
  contentBody: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  contentImage: {
    width: "100%",
    height: 300,
    borderRadius: Radius.md,
    marginVertical: 12,
    backgroundColor: PageBg.offWhite,
  },
  fullWidthContentImageContainer: {
    backgroundColor: "#000000",
    marginVertical: 12,
    marginHorizontal: -20,
  },
  fullWidthContentImage: {
    backgroundColor: "#000000",
  },
  contentUrl: {
    fontSize: 12,
    color: Accent.yellowDark,
    marginBottom: 8,
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
  assessmentCard: {
    marginBottom: Space.lg,
  },
  assessmentType: {
    fontSize: 11,
    fontWeight: "600",
    color: ThemeText.muted,
    marginBottom: 12,
  },
  quizContainer: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadow.neutral,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "500",
    color: ThemeText.primary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  optionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ThemeText.muted,
    marginRight: 12,
  },
  optionText: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
  textAnswerContainer: {
    marginTop: 12,
  },
  textAnswerInput: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: Radius.md,
    minHeight: 120,
    fontSize: 14,
    fontFamily: "BaiJamjuree_400Regular",
    color: ThemeText.primary,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Shadow.neutral,
  },
  characterCount: {
    fontSize: 12,
    color: ThemeText.muted,
    textAlign: "right",
    marginTop: 8,
  },
  assessmentSubmittedLabel: {
    fontSize: 13,
    color: "#9FE800",
    fontWeight: "600",
    marginTop: 12,
  },
  submittedAnswerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 8,
  },
  submittedAnswerText: {
    fontSize: 14,
    color: ThemeText.primary,
    lineHeight: 20,
  },
  submittedImage: {
    width: "100%",
    marginTop: 12,
    borderRadius: 8,
  },
  submittedFileContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 8,
  },
  uploadContainer: {
    marginTop: 12,
  },
  uploadButton: {
    flex: 1,
  },
  cameraButton: {
    flex: 1,
  },
  glassButtonText: {
    fontFamily: "BaiJamjuree_700Bold",
  },
  uploadButtonIcon: {
    fontSize: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  imageUploadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  selectedFileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.md,
  },
  selectedFileName: {
    fontSize: 14,
    color: ThemeText.primary,
    flex: 1,
  },
  removeFileText: {
    fontSize: 18,
    color: ThemeText.muted,
    paddingHorizontal: 8,
  },
  fullWidthImageContainer: {
    marginTop: 12,
    position: "relative",
    maxHeight: 500,
    backgroundColor: "#000000",
    alignSelf: "center",
  },
  selectedImageCard: {
    marginTop: 12,
    borderRadius: Radius.md,
    overflow: "hidden",
    position: "relative",
    maxHeight: 500,
    ...Shadow.card,
  },
  imageScrollContainer: {
    maxHeight: 500,
  },
  imageScrollContent: {
    flexGrow: 1,
  },
  selectedImage: {
    width: "100%",
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
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: PageBg.default,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    ...Shadow.floating,
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
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  // Page Indicator Dots - Vertical
  dotsContainerVertical: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -50 }],
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  dotVertical: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ThemeText.tertiary,
  },
  dotVerticalActive: {
    backgroundColor: Accent.yellow,
    height: 24,
  },
  // NPC Dots (for fullscreen NPC chat)
  npcDotsContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
    zIndex: 5,
  },
  npcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ThemeText.tertiary,
  },
  npcDotActive: {
    backgroundColor: Accent.yellow,
    width: 24,
  },
});
