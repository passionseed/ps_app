import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  useWindowDimensions,
  Animated,
  PanResponder,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SvgXml } from "react-native-svg";
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from "../../lib/supabase";
import { updateActivityProgress } from "../../lib/pathlab";
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
} from "../../types/pathlab-content";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
} from "../../lib/theme";

interface ActivityWithContent extends PathActivity {
  path_content: PathContent[];
  path_assessment: (PathAssessment & { quiz_questions?: PathQuizQuestion[] }) | null;
  progress?: PathActivityProgress;
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

export default function ActivityDetailScreen() {
  const { activityId, enrollmentId, pageIndex, totalPages } = useLocalSearchParams<{
    activityId: string;
    enrollmentId: string;
    pageIndex?: string;
    totalPages?: string;
  }>();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
  const [dayActivitiesList, setDayActivitiesList] = useState<{ id: string; display_order: number }[]>([]);

  // Track scroll position for swipe detection
  const scrollViewRef = useRef<ScrollView>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

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

  // Typing animation state
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // NPC bounce animation
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeRemainingPrecise, setTimeRemainingPrecise] = useState<number | null>(null);
  const [showTimeoutRestart, setShowTimeoutRestart] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
      // PARALLEL: Fetch activity, content, assessments, and progress simultaneously
      const [
        activityResult,
        contentResult,
        assessmentsResult,
        progressResult,
      ] = await Promise.all([
        supabase.from("path_activities").select("*").eq("id", activityId).single(),
        supabase.from("path_content").select("*").eq("activity_id", activityId).order("display_order", { ascending: true }),
        supabase.from("path_assessments").select("*").eq("activity_id", activityId),
        enrollmentId
          ? supabase.from("path_activity_progress").select("*").eq("enrollment_id", enrollmentId).eq("activity_id", activityId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const { data: activityData, error: activityError } = activityResult;
      const { data: contentData } = contentResult;
      const { data: assessmentsData } = assessmentsResult;
      const { data: progressData } = progressResult;

      // Update granular loading states as data arrives
      setLoadingActivity(false);
      setLoadingContent(false);
      setLoadingAssessment(false);
      setLoadingProgress(!enrollmentId ? false : !progressData);

      console.log("[Activity] Activity data:", activityData);
      console.log("[Activity] Content data:", contentData);
      console.log("[Activity] Assessments data:", assessmentsData);

      if (activityError) throw activityError;

      // PARALLEL: Fetch quiz questions and create progress if needed
      let quizQuestions: PathQuizQuestion[] = [];
      let progress: PathActivityProgress | undefined = progressData || undefined;

      const [questionsResult, newProgressResult] = await Promise.all([
        // Fetch quiz questions if assessments exist
        assessmentsData && assessmentsData.length > 0
          ? supabase.from("path_quiz_questions").select("*").in("assessment_id", assessmentsData.map((a) => a.id))
          : Promise.resolve({ data: null, error: null }),
        // Create progress if not found and enrollmentId exists
        !progressData && enrollmentId
          ? supabase.from("path_activity_progress").insert({
              enrollment_id: enrollmentId,
              activity_id: activityId,
              status: "in_progress",
              started_at: new Date().toISOString(),
            }).select().single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      quizQuestions = questionsResult.data || [];
      if (newProgressResult.data) {
        console.log("[Activity] Created new progress:", newProgressResult.data.id);
        progress = newProgressResult.data;
      } else if (progress) {
        console.log("[Activity] Found existing progress:", progress.id);
      }
      setLoadingProgress(false);

      // Build path_assessment object (single assessment or null)
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
        progress,
      };

      const activityType = getActivityType(fullActivity);

      console.log("[Activity] Full activity loaded:", {
        id: fullActivity.id,
        title: fullActivity.title,
        activityType,
        content_count: fullActivity.path_content.length,
        content_types: fullActivity.path_content.map(c => c.content_type),
        has_assessment: !!fullActivity.path_assessment,
        assessment_type: fullActivity.path_assessment?.assessment_type,
        has_progress: !!fullActivity.progress,
        full_activity: JSON.stringify(fullActivity, null, 2),
      });

      // Debug image content/assessment specifically
      if (activityType === 'image' || fullActivity.path_assessment?.assessment_type === 'image_upload') {
        console.log('[IMAGE ACTIVITY] Image activity detected!');
        console.log('[IMAGE ACTIVITY] Screen width:', screenWidth);
        console.log('[IMAGE ACTIVITY] Activity type:', activityType);
        console.log('[IMAGE ACTIVITY] Assessment type:', fullActivity.path_assessment?.assessment_type);
      }

      setActivity(fullActivity);

      // Fetch pagination info - use path_day_id from already-fetched activityData
      console.log('[Activity] Checking pagination - path_day_id:', activityData.path_day_id, 'enrollmentId:', enrollmentId);

      if (enrollmentId && activityData.path_day_id) {
        try {
          // Use path_day_id from already-fetched activityData (no extra query needed)
          const { data: dayActivities, error: activitiesError } = await supabase
            .from("path_activities")
            .select("id, display_order")
            .eq("path_day_id", activityData.path_day_id)
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
            setDayActivitiesList(dayActivities);
          } else {
            console.warn('[Activity] No activities found for path_day_id:', activityData.path_day_id);
          }
        } catch (err) {
          console.error('[Activity] Error fetching pagination:', err);
        }
      }

      // Initialize activity-specific state based on content/assessment type
      if (activityType === "ai_chat") {
        console.log("[Activity] Initializing AI chat...");
        await initAIChat(fullActivity);
      } else if (activityType === "npc_chat") {
        console.log("[Activity] Initializing NPC dialogue...");
        await initNPCDialogue(fullActivity);
      } else {
        console.log("[Activity] Regular activity type:", activityType);
      }
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
      console.log("[NPC] Activity content:", activity.path_content);

      const npcContent = activity.path_content.find(c => c.content_type === "npc_chat");
      if (!npcContent) {
        const errorMsg = "No NPC content found in activity";
        console.error("[NPC]", errorMsg);
        console.error("[NPC] Content types available:", activity.path_content.map(c => c.content_type));
        setNpcError(errorMsg);
        return;
      }

      console.log("[NPC] NPC content found:", npcContent);
      const metadata = npcContent.metadata as NPCChatMetadata;
      console.log("[NPC] Metadata:", metadata);

      if (!metadata?.conversation_id) {
        const errorMsg = "No conversation_id in metadata";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      setNpcConversationId(metadata.conversation_id);

      // Load summary from metadata
      if (metadata.summary) {
        console.log("[NPC] Summary loaded from metadata:", metadata.summary);
        setNpcSummary(metadata.summary);
      }

      // Check if there's existing progress
      if (activity.progress?.id) {
        console.log("[NPC] Checking existing progress for:", activity.progress.id);
        const { data: npcProgress, error: progressError } = await supabase
          .from("path_npc_conversation_progress")
          .select("*, current_node:path_npc_conversation_nodes(*)")
          .eq("progress_id", activity.progress.id)
          .maybeSingle();

        console.log("[NPC] Existing progress:", npcProgress, "Error:", progressError);

        if (npcProgress) {
          setNpcProgressId(npcProgress.id);
          setNpcConversationId(npcProgress.conversation_id);

          // Fetch the NPC avatar for this conversation's seed
          const { data: conv } = await supabase
            .from("path_npc_conversations")
            .select("seed_id")
            .eq("id", npcProgress.conversation_id)
            .single();

          if (conv?.seed_id) {
            const { data: avatarData } = await supabase
              .from("seed_npc_avatars")
              .select("id, name, svg_data")
              .eq("seed_id", conv.seed_id)
              .maybeSingle();

            if (avatarData) {
              setNpcSeedAvatar(avatarData);
              console.log("[NPC] Loaded seed avatar for resume:", { name: avatarData.name, has_svg: !!avatarData.svg_data });
            }
          }

          if (npcProgress.is_completed) {
            console.log("[NPC] Conversation already completed");
            setNpcCompleted(true);
            return;
          }
          if (npcProgress.current_node) {
            console.log("[NPC] Resuming from current node:", npcProgress.current_node.id);
            setNpcCurrentNode(npcProgress.current_node);
            // Choices will be loaded after typing animation completes
            // Timer will start after typing completes
            return;
          }
        }
      }

      // Start new conversation - get root node and seed's NPC avatar
      console.log("[NPC] Fetching conversation:", metadata.conversation_id);
      const { data: conversation, error: convError } = await supabase
        .from("path_npc_conversations")
        .select("root_node_id, seed_id")
        .eq("id", metadata.conversation_id)
        .maybeSingle();

      console.log("[NPC] Conversation data:", JSON.stringify(conversation, null, 2));
      console.log("[NPC] Conversation error:", convError);

      if (convError) {
        const errorMsg = `Failed to load conversation: ${convError.message}`;
        console.error("[NPC]", errorMsg, "- Details:", convError);
        setNpcError(errorMsg);
        return;
      }

      if (!conversation) {
        const errorMsg = `No conversation found with ID: ${metadata.conversation_id}`;
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      if (!conversation.root_node_id) {
        const errorMsg = `Conversation ${metadata.conversation_id} has no root_node_id. Data: ${JSON.stringify(conversation)}`;
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      // Fetch the NPC avatar for this seed
      if (conversation.seed_id) {
        const { data: avatarData } = await supabase
          .from("seed_npc_avatars")
          .select("id, name, svg_data")
          .eq("seed_id", conversation.seed_id)
          .maybeSingle();

        if (avatarData) {
          setNpcSeedAvatar(avatarData);
          console.log("[NPC] Seed NPC avatar loaded:", { name: avatarData.name, has_svg: !!avatarData.svg_data });
        } else {
          console.log("[NPC] No NPC avatar found for this seed");
        }
      }

      console.log("[NPC] Fetching root node:", conversation.root_node_id);
      const { data: rootNode, error: nodeError } = await supabase
        .from("path_npc_conversation_nodes")
        .select("*")
        .eq("id", conversation.root_node_id)
        .single();

      console.log("[NPC] Root node data:", JSON.stringify(rootNode, null, 2));
      console.log("[NPC] Root node error:", nodeError);

      if (nodeError) {
        const errorMsg = `Failed to load root node: ${nodeError.message}`;
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      if (rootNode) {
        console.log("[NPC] Setting current node:", rootNode);
        console.log("[NPC] About to load choices for node ID:", rootNode.id);

        setNpcCurrentNode(rootNode);
        // Choices will be loaded after typing animation completes
        // Timer will start after typing completes

        // Create progress record if we have activity progress
        if (activity.progress?.id) {
          console.log("[NPC] Creating NPC conversation progress record...");
          console.log("[NPC] Activity progress ID:", activity.progress.id);

          const { data: user } = await supabase.auth.getUser();
          console.log("[NPC] User ID:", user?.user?.id);

          const { data: newProgress, error: progressError } = await supabase
            .from("path_npc_conversation_progress")
            .insert({
              progress_id: activity.progress.id,
              conversation_id: metadata.conversation_id,
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
            console.error("[NPC] Progress error details:", JSON.stringify(progressError, null, 2));
          } else if (newProgress) {
            console.log("[NPC] Progress record created:", newProgress.id);
            setNpcProgressId(newProgress.id);
          } else {
            console.error("[NPC] No progress record returned and no error!");
          }
        } else {
          console.warn("[NPC] No activity.progress.id - cannot create NPC progress record");
        }
      } else {
        const errorMsg = "Root node not found in database";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error loading NPC dialogue";
      console.error("[NPC] Error in initNPCDialogue:", error);
      setNpcError(errorMsg);
    }
  };

  const loadNPCChoices = async (nodeId: string) => {
    console.log("[NPC] Loading choices for node:", nodeId);
    const { data: choices, error: choicesError } = await supabase
      .from("path_npc_conversation_choices")
      .select("*")
      .eq("from_node_id", nodeId)
      .order("display_order", { ascending: true });

    console.log("[NPC] Choices loaded:", choices, "Error:", choicesError);
    console.log("[NPC] Number of choices:", choices?.length || 0);
    if (choices && choices.length > 0) {
      console.log("[NPC] First choice:", JSON.stringify(choices[0], null, 2));
    }

    // Don't show choices immediately - wait for typing animation to complete
    return choices || [];
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
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
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
        Animated.timing(bounceAnim, {
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
        }
        return;
      }

      // Load next node
      const { data: nextNode } = await supabase
        .from("path_npc_conversation_nodes")
        .select("*")
        .eq("id", choice.to_node_id)
        .single();

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

  const handleComplete = async () => {
    if (!enrollmentId || !activityId || !canComplete()) return;

    setCompleting(true);
    try {
      // Play completion sound
      playActivityCompleteSound();

      await updateActivityProgress({
        enrollmentId,
        activityId,
        status: "completed",
      });

      // Navigate to the next activity or back to path screen
      router.replace(`/path/${enrollmentId}`);
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
      } catch (error) {
        console.error("Error completing activity:", error);
      }
    }

    const nextIndex = currentPage + 1;
    if (nextIndex < dayActivitiesList.length) {
      const nextActivity = dayActivitiesList[nextIndex];
      router.replace(`/activity/${nextActivity.id}?enrollmentId=${enrollmentId}&pageIndex=${nextIndex}&totalPages=${dayActivitiesList.length}`);
    } else {
      // No more activities, go back to path screen
      router.replace(`/path/${enrollmentId}`);
    }
  };

  const handleSwipeToPrevious = () => {
    if (!enrollmentId) return;

    const prevIndex = currentPage - 1;
    if (prevIndex >= 0 && dayActivitiesList.length > 0) {
      const prevActivity = dayActivitiesList[prevIndex];
      router.replace(`/activity/${prevActivity.id}?enrollmentId=${enrollmentId}&pageIndex=${prevIndex}&totalPages=${dayActivitiesList.length}`);
    }
  };

  // Pan responder for swipe gestures (up = previous, down = next)
  const canSwipe = () => {
    if (!activity) return false;
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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      const isSignificant = Math.abs(gestureState.dy) > 30;
      return isVerticalSwipe && isSignificant && (canSwipe() || canSwipeUp());
    },
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      const isSignificant = Math.abs(gestureState.dy) > 30;

      const activityType = getActivityType(activity!);
      const isNpcChat = activityType === "npc_chat";

      // For NPC chat, allow swipe anytime (no scroll involved)
      if (isNpcChat) {
        if (gestureState.dy > 30 && canSwipeUp()) {
          return true;
        }
        if (gestureState.dy < -30 && npcCompleted) {
          return true;
        }
        return false;
      }

      // For regular content, only swipe at scroll edges
      // Swipe DOWN (positive dy) = go to previous (only if at top of scroll)
      if (gestureState.dy > 30 && canSwipeUp() && isAtTop) {
        return true;
      }

      // Swipe UP (negative dy) = go to next (only if at bottom of scroll)
      if (gestureState.dy < -30 && canSwipe() && isAtBottom) {
        return true;
      }

      return false;
    },
    onPanResponderRelease: (_, gestureState) => {
      const activityType = getActivityType(activity!);
      const isNpcChat = activityType === "npc_chat";

      if (isNpcChat) {
        // NPC: swipe anytime
        if (gestureState.dy > 100 && canSwipeUp()) {
          handleSwipeToPrevious();
        } else if (gestureState.dy < -100 && npcCompleted) {
          handleSwipeToNext();
        }
      } else {
        // Regular content: only at scroll edges
        if (gestureState.dy > 100 && canSwipeUp() && isAtTop) {
          handleSwipeToPrevious();
        } else if (gestureState.dy < -100 && canSwipe() && isAtBottom) {
          handleSwipeToNext();
        }
      }
    },
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
        <Text style={styles.errorText}>Activity not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const activityType = getActivityType(activity);
  const isInteractive = activityType === "ai_chat" || activityType === "npc_chat";
  const isNpcChat = activityType === "npc_chat";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header - Hidden for NPC chat full screen */}
      {!isNpcChat && (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activity.title}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Page Indicator Dots - Vertical on right side */}
          {showPagination && (
            <View style={styles.dotsContainerVertical}>
              {Array.from({ length: total }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dotVertical,
                    index === currentPage && styles.dotVerticalActive,
                  ]}
                />
              ))}
            </View>
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
            <Text style={styles.backButtonOverlayText}>✕</Text>
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
                <Text style={styles.npcErrorIcon}>⚠️</Text>
                <Text style={styles.npcErrorTitle}>Failed to load conversation</Text>
                <Text style={styles.npcErrorText}>{npcError}</Text>
                <Pressable
                  style={styles.npcRetryButton}
                  onPress={() => {
                    setNpcError(null);
                    if (activity) initNPCDialogue(activity);
                  }}
                >
                  <Text style={styles.npcRetryText}>Retry</Text>
                </Pressable>
              </View>
            ) : !npcCurrentNode && !npcCompleted ? (
              <View style={styles.npcLoadingCard}>
                <ActivityIndicator size="large" color={Accent.yellow} />
                <Text style={styles.npcLoadingText}>
                  Connecting...
                </Text>
              </View>
            ) : showTimeoutRestart ? (
              <View style={styles.timeoutOverlay}>
                <Text style={styles.timeoutTitle}>Time's Up!</Text>
                <Text style={styles.timeoutMessage}>
                  You didn't respond in time. Let's try again.
                </Text>
                <Pressable
                  style={styles.restartButton}
                  onPress={restartConversation}
                >
                  <Text style={styles.restartButtonText}>Restart Conversation</Text>
                </Pressable>
              </View>
            ) : npcCompleted ? (
              // Show summary overlay when conversation is completed
              <View style={styles.npcSummaryOverlay} {...panResponder.panHandlers}>
                <View style={styles.npcSummaryBox}>
                  <Text style={styles.npcSummaryTitle}>Conversation Summary</Text>
                  <Text style={styles.npcSummaryText}>
                    {npcSummary || activity.instructions || "You have completed this conversation."}
                  </Text>
                </View>
                {currentPage < dayActivitiesList.length - 1 ? (
                  <>
                    <Text style={styles.swipeHint}>↓</Text>
                    <Text style={styles.swipeText}>Swipe down for next activity</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.swipeHint}>↓</Text>
                    <Text style={styles.swipeText}>Swipe down to finish day</Text>
                  </>
                )}
              </View>
            ) : npcCurrentNode ? (
              <>
                {/* Full-body NPC Character */}
                <Animated.View
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
                      <Text style={styles.npcAvatarEmojiLarge}>👤</Text>
                    </View>
                  )}
                </Animated.View>

                {/* Speech Bubble and Timer Bar */}
                <View style={styles.speechBubbleContainer}>
                  <View style={styles.speechBubble}>
                    <Text style={styles.speechBubbleText}>
                      {displayedText}
                      {isTyping && <Text style={styles.typingCursor}>|</Text>}
                    </Text>
                  </View>

                  {/* Timer Bar - Below speech bubble */}
                  {timeRemainingPrecise !== null && timeRemainingPrecise > 0 && npcCurrentNode && (
                    <View style={styles.timerBarBelowBubble}>
                      {/* Grey background (consumed) */}
                      <View style={[
                        styles.timerBarGreyFull,
                        timeRemaining !== null && timeRemaining <= 5 && styles.timerBarGreyUrgent,
                      ]} />
                      {/* Green bar (remaining time) - shrinks from right to left */}
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
                    <Text style={styles.npcNameTagText}>
                      {npcSeedAvatar.name}
                    </Text>
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
                          <Text style={styles.choiceOptionLabel}>
                            {String.fromCharCode(65 + index)}
                          </Text>
                          <Text style={styles.choiceOptionText}>
                            {choice.choice_text}
                          </Text>
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
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          {...panResponder.panHandlers}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const scrollY = contentOffset.y;
            const scrollViewHeight = layoutMeasurement.height;
            const contentHeight = contentSize.height;

            // Check if at top (with 5px threshold)
            setIsAtTop(scrollY <= 5);

            // Check if at bottom (with 5px threshold)
            const isBottom = scrollY + scrollViewHeight >= contentHeight - 5;
            setIsAtBottom(isBottom);
          }}
          scrollEventThrottle={16}
        >
          {/* Instructions */}
          {activity.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsText}>{activity.instructions}</Text>
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
                    <Text style={styles.messengerAvatarText}>AI</Text>
                    <View style={styles.messengerOnlineDot} />
                  </View>
                )}
                <View style={styles.messengerHeaderInfo}>
                  <Text style={styles.messengerHeaderName}>
                    {npcSeedAvatar?.name || "AI Assistant"}
                  </Text>
                  <Text style={styles.messengerHeaderStatus}>Online</Text>
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
                  <Text style={styles.aiProgressText}>
                    {Math.min(Math.round((aiMessages.length / aiMaxMessages) * 100), 100)}%
                  </Text>
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
                        <Text style={[
                          styles.messengerBubbleText,
                          msg.role === "user" && styles.messengerBubbleTextUser
                        ]}>
                          {msg.content}
                        </Text>
                        <Text style={[
                          styles.messengerTime,
                          msg.role === "user" && styles.messengerTimeUser
                        ]}>
                          {new Date(msg.timestamp).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {aiSending && (
                  <View style={styles.messengerBubbleContainerAI}>
                    <View style={styles.messengerBubbleAI}>
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingDot} />
                        <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                        <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                      </View>
                    </View>
                  </View>
                )}

                {aiObjectiveMet && (
                  <View style={styles.messengerCompletedCard}>
                    <Text style={styles.messengerCompletedIcon}>✓</Text>
                    <Text style={styles.messengerCompletedText}>
                      Conversation objective completed!
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Regular Content Items */}
          {activityType !== "ai_chat" &&
            activityType !== "npc_chat" &&
            activity.path_content.map((item) => (
              <ContentItem key={item.id} content={item} />
            ))}

        {/* Assessment */}
        {activity.path_assessment && (
          <AssessmentItem assessment={activity.path_assessment} />
        )}

          {/* Swipe hint for swipeable content */}
          {canSwipe() && (
            <View style={styles.swipeHintContainer}>
              <Text style={styles.swipeHintArrow}>↓</Text>
              <Text style={styles.swipeHintText}>
                {currentPage < dayActivitiesList.length - 1
                  ? "Swipe down for next activity"
                  : "Swipe down to finish day"}
              </Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
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
              <Text style={styles.messengerSendIcon}>
                {aiSending ? "⋯" : "➤"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Complete Button - Only show when can complete */}
      {canComplete() && (
        <View style={styles.ctaContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
              completing && styles.ctaButtonDisabled,
            ]}
            onPress={handleComplete}
            disabled={completing}
          >
            <Text style={styles.ctaText}>
              {completing ? "Completing..." : "Mark as Complete"}
            </Text>
          </Pressable>
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

function ContentItem({ content }: { content: PathContent }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // containerWidth = windowWidth - scrollPadding(40) - cardPadding(32)
  const containerWidth = windowWidth - 72;
  const [imageHeight, setImageHeight] = useState<number>(500);

  // Calculate image height for full-width display
  useEffect(() => {
    if (content.content_type === 'image' && content.content_url) {
      Image.getSize(
        content.content_url,
        (width, height) => {
          const aspectRatio = height / width;
          const calculatedHeight = windowWidth * aspectRatio;
          console.log('[Image] Dimensions:', { width, height, aspectRatio, calculatedHeight, windowWidth });
          setImageHeight(calculatedHeight);
        },
        (error) => {
          console.error('[Image] Failed to get size:', error);
        }
      );
    }
  }, [content.content_url, content.content_type, windowWidth]);

  const renderContent = () => {
    switch (content.content_type) {
      case "text":
        return (
          <View style={styles.contentCard}>
            {content.content_title && (
              <Text style={styles.contentTitle}>{content.content_title}</Text>
            )}
            {content.content_body && (
              <Text style={styles.contentBody}>{content.content_body}</Text>
            )}
          </View>
        );

      case "video":
      case "short_video":
        const videoId = extractYouTubeId(content.content_url || "");
        const isYouTube = !!videoId;

        // Treat as short if URL contains /shorts/ or type is short_video
        const isShort = content.content_url?.includes("/shorts/") || content.content_type === "short_video";

        // Calculate player dimensions for YouTube
        let playerWidth = containerWidth;
        let playerHeight = containerWidth * (9 / 16);

        if (isShort) {
          // For short videos, make them much larger - fill most of the screen height
          playerHeight = windowHeight * 0.7; // 70% of screen height
          playerWidth = playerHeight * (9 / 16); // Maintain 9:16 aspect ratio for vertical video
        }

        return (
          <View style={isShort ? styles.shortVideoWrapper : styles.contentCard}>
            {content.content_title && !isShort && (
              <Text style={styles.contentTitle}>{content.content_title}</Text>
            )}
            {isYouTube ? (
              <View style={isShort ? styles.videoContainerShort : styles.videoContainer}>
                <YoutubePlayer
                  height={playerHeight}
                  videoId={videoId}
                  play={false}
                  webViewStyle={{ opacity: 0.99 }}
                  webViewProps={{
                    androidLayerType: "hardware",
                  }}
                />
                <Pressable
                  style={styles.openInYouTubeButton}
                  onPress={() => Linking.openURL(content.content_url || "")}
                >
                  <Text style={styles.openInYouTubeText}>🎬 Open in YouTube</Text>
                </Pressable>
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
            {content.content_body && !isShort && (
              <Text style={styles.contentBody}>{content.content_body}</Text>
            )}
          </View>
        );

      case "image":
        console.log('[Image] Rendering image:', { url: content.content_url, title: content.content_title, screenWidth: windowWidth });
        return (
          <>
            {/* Title and description in card */}
            {(content.content_title || content.content_body) && (
              <View style={styles.contentCard}>
                {content.content_title && (
                  <Text style={styles.contentTitle}>{content.content_title}</Text>
                )}
                {content.content_body && (
                  <Text style={styles.contentBody}>{content.content_body}</Text>
                )}
              </View>
            )}

            {/* Full-width image outside card */}
            {content.content_url ? (
              <View style={[styles.fullWidthContentImageContainer, { width: windowWidth, height: imageHeight }]}>
                <Image
                  source={{ uri: content.content_url }}
                  style={[styles.fullWidthContentImage, { width: windowWidth, height: imageHeight }]}
                  resizeMode="contain"
                  onError={(error) => console.error('[Image] Failed to load:', error.nativeEvent.error)}
                  onLoad={() => console.log('[Image] Loaded successfully')}
                />
              </View>
            ) : (
              <View style={styles.contentCard}>
                <Text style={styles.contentBody}>No image URL provided</Text>
              </View>
            )}
          </>
        );

      case "resource_link":
        return (
          <View style={styles.contentCard}>
            <Text style={styles.contentIcon}>🔗</Text>
            {content.content_title && (
              <Text style={styles.contentTitle}>{content.content_title}</Text>
            )}
            {content.content_url && (
              <Text style={styles.contentUrl}>{content.content_url}</Text>
            )}
          </View>
        );

      case "daily_prompt":
        return (
          <View style={[styles.contentCard, styles.promptCard]}>
            <Text style={styles.contentIcon}>💡</Text>
            {content.content_body && (
              <Text style={styles.promptText}>{content.content_body}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return renderContent();
}

function AssessmentItem({
  assessment,
}: {
  assessment: PathAssessment & { quiz_questions?: PathQuizQuestion[] };
}) {
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState<number>(300);
  const { width: screenWidth } = useWindowDimensions();

  // Calculate image dimensions when image is selected
  useEffect(() => {
    if (selectedImage) {
      console.log('[IMAGE DEBUG] Screen width:', screenWidth);
      Image.getSize(
        selectedImage,
        (width, height) => {
          // Calculate height to maintain aspect ratio with full screen width
          const aspectRatio = height / width;
          const calculatedHeight = screenWidth * aspectRatio;
          console.log('[IMAGE DEBUG] Original image dimensions:', { width, height });
          console.log('[IMAGE DEBUG] Aspect ratio:', aspectRatio);
          console.log('[IMAGE DEBUG] Calculated height:', calculatedHeight);
          setImageHeight(calculatedHeight);
        },
        (error) => {
          console.error('[IMAGE DEBUG] Error getting image size:', error);
        }
      );
    }
  }, [selectedImage, screenWidth]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({ name: file.name, uri: file.uri });
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
        setSelectedImage(result.assets[0].uri);
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
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  return (
    <>
      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentType}>
          {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
        </Text>

        {assessment.quiz_questions && assessment.quiz_questions.length > 0 && (
          <View style={styles.quizContainer}>
            {assessment.quiz_questions.map((question, index) => (
              <View key={question.id} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {index + 1}. {question.question_text}
                </Text>
                {question.options &&
                  Array.isArray(question.options) &&
                  question.options.map((opt: any, optIndex: number) => (
                    <View key={optIndex} style={styles.optionRow}>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>
                        {typeof opt === "string" ? opt : opt.text || opt.option}
                      </Text>
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
            <Text style={styles.characterCount}>{textAnswer.length} characters</Text>
          </View>
        )}

        {assessment.assessment_type === "file_upload" && (
          <View style={styles.uploadContainer}>
            <Pressable style={styles.uploadButton} onPress={handlePickFile}>
              <Text style={styles.uploadButtonIcon}>📎</Text>
              <Text style={styles.uploadButtonText}>Choose File</Text>
            </Pressable>
            {selectedFile && (
              <View style={styles.selectedFileCard}>
                <Text style={styles.selectedFileName}>📄 {selectedFile.name}</Text>
                <Pressable onPress={() => setSelectedFile(null)}>
                  <Text style={styles.removeFileText}>✕</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {assessment.assessment_type === "image_upload" && (
          <View style={styles.uploadContainer}>
            <View style={styles.imageUploadButtons}>
              <Pressable style={styles.cameraButton} onPress={handleTakePhoto}>
                <Text style={styles.uploadButtonIcon}>📷</Text>
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.uploadButton} onPress={handlePickImage}>
                <Text style={styles.uploadButtonIcon}>🖼️</Text>
                <Text style={styles.uploadButtonText}>Choose Photo</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Full-width image display OUTSIDE of assessmentCard */}
      {assessment.assessment_type === "image_upload" && selectedImage && (() => {
        console.log('[IMAGE DEBUG] Rendering image with:', {
          screenWidth,
          imageHeight,
          containerWidth: screenWidth,
          imageWidth: screenWidth
        });
        return (
          <View style={[styles.fullWidthImageContainer, { width: screenWidth }]}>
            <ScrollView
              style={styles.imageScrollContainer}
              contentContainerStyle={styles.imageScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Image
                source={{ uri: selectedImage }}
                style={[styles.selectedImage, { height: imageHeight, width: screenWidth }]}
                resizeMode="contain"
              />
            </ScrollView>
            <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.removeFileText}>✕</Text>
            </Pressable>
          </View>
        );
      })()}
    </>
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
  errorText: {
    fontSize: 16,
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
    width: 60,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingHorizontal: 0,
    overflow: "visible", // Allow children to break out
  },
  instructionsCard: {
    backgroundColor: "#e8f5e0",
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    lineHeight: 22,
  },

  // AI Chat - Messenger Style
  messengerContainer: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  messengerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    gap: 12,
  },
  messengerAvatarContainer: {
    position: "relative",
  },
  messengerAvatarSvg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  messengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  messengerAvatarText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  messengerHeaderInfo: {
    flex: 1,
  },
  messengerHeaderName: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  messengerHeaderStatus: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#10b981",
  },

  // AI Chat Progress
  aiProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Border.light,
  },
  aiProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(191, 255, 0, 0.2)",
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
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    ...Shadow.card,
  },
  messengerBubbleUser: {
    backgroundColor: "#667eea",
    borderBottomRightRadius: 4,
  },
  messengerBubbleText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#1a1a1a",
    lineHeight: 22,
    marginBottom: 4,
  },
  messengerBubbleTextUser: {
    color: "#fff",
  },
  messengerTime: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "rgba(0, 0, 0, 0.4)",
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
    backgroundColor: "#cbd5e0",
  },
  messengerCompletedCard: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
  },
  messengerCompletedIcon: {
    fontSize: 18,
    color: "#10b981",
  },
  messengerCompletedText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#065f46",
  },
  messengerInputContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  messengerInputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f7fafc",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  messengerInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#1a1a1a",
    maxHeight: 100,
    paddingVertical: 10,
    lineHeight: 22,
  },
  messengerSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
  },
  messengerSendButtonDisabled: {
    backgroundColor: "#cbd5e0",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // NPC Dialogue styles - Cinematic Full Screen
  npcFullscreenWrapper: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  backButtonOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.2)",
  },
  backButtonOverlayText: {
    fontSize: 24,
    color: "#111",
    fontWeight: "600",
  },
  npcFullscreenContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
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
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 1,
  },
  npcErrorCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#f5c6cb",
    alignItems: "center",
    gap: 12,
  },
  npcErrorIcon: {
    fontSize: 48,
  },
  npcErrorTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#721c24",
  },
  npcErrorText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#721c24",
    textAlign: "center",
  },
  npcRetryButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  npcRetryText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },

  // Full-body Character Display
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
    width: 280,
    height: 420,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.3)",
  },
  npcAvatarEmojiLarge: {
    fontSize: 120,
  },
  npcNameTag: {
    position: "absolute",
    top: 495,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.8)",
    ...Shadow.card,
    zIndex: 3,
  },
  npcOnlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00ff88",
  },
  npcNameTagText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
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
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.8)",
    ...Shadow.card,
  },
  speechBubbleText: {
    fontSize: 17,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
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
    backgroundColor: "#3a3a45",
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
    backgroundColor: "#8a1a1a",
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
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: Accent.yellow,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Accent.yellow,
    overflow: "hidden",
  },
  timerNumberBelowUrgent: {
    color: "#ff3333",
    borderColor: "#ff3333",
    backgroundColor: "rgba(138, 26, 26, 0.7)",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.8)",
    overflow: "hidden",
    ...Shadow.card,
  },
  choiceOptionButtonPressed: {
    backgroundColor: "rgba(191, 255, 0, 0.3)",
    borderColor: Accent.yellow,
    transform: [{ scale: 0.98 }],
  },
  choiceOptionButtonUrgent: {
    borderColor: "#ff3333",
    backgroundColor: "rgba(255, 50, 50, 0.05)",
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
    borderWidth: 2,
    borderColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    lineHeight: 32,
  },
  choiceOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
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
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#ff3333",
    textAlign: "center",
  },
  timeoutMessage: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
    textAlign: "center",
    lineHeight: 28,
  },
  restartButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 16,
  },
  restartButtonText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#000",
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
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    padding: 24,
    borderWidth: 2,
    borderColor: Accent.yellow,
    maxWidth: 400,
    ...Shadow.card,
  },
  npcSummaryTitle: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: ThemeText.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  npcSummaryText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
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
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.secondary,
    marginTop: 8,
  },
  swipeHintContainer: {
    alignItems: "center",
    paddingVertical: 32,
    marginTop: 24,
  },
  swipeHintArrow: {
    fontSize: 32,
    color: Accent.yellow,
  },
  swipeHintText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.secondary,
    marginTop: 8,
  },

  objectiveMetCard: {
    backgroundColor: "#d4edda",
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#c3e6cb",
  },
  objectiveMetText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#155724",
  },

  contentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  shortVideoWrapper: {
    marginBottom: 12,
  },
  contentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 8,
    position: "relative",
  },
  videoContainerShort: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 700,
    alignSelf: "center",
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 16,
    marginTop: 8,
    position: "relative",
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
  openInYouTubeButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(191, 255, 0, 0.5)",
  },
  openInYouTubeText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#fff",
  },
  uploadedVideo: {
    width: "100%",
    height: "100%",
  },
  contentType: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
  contentBody: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  contentImage: {
    width: "100%",
    height: 300,
    borderRadius: Radius.md,
    marginVertical: 12,
    backgroundColor: "#f5f5f5",
  },
  fullWidthContentImageContainer: {
    backgroundColor: "#000",
    marginVertical: 12,
  },
  fullWidthContentImage: {
    backgroundColor: "#000",
  },
  contentUrl: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: Accent.yellowDark,
    marginBottom: 8,
  },
  promptCard: {
    backgroundColor: "#fff8e1",
    borderColor: Accent.yellow,
  },
  promptText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.primary,
    lineHeight: 24,
  },
  assessmentCard: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  assessmentType: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.muted,
    marginBottom: 12,
  },
  quizContainer: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: Radius.sm,
  },
  questionText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
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
    borderColor: "#ddd",
    marginRight: 12,
  },
  optionText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.secondary,
  },
  textAnswerContainer: {
    marginTop: 12,
  },
  textAnswerInput: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: Radius.md,
    minHeight: 120,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.primary,
    borderWidth: 1,
    borderColor: Border.default,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.muted,
    textAlign: "right",
    marginTop: 8,
  },
  uploadContainer: {
    marginTop: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Accent.yellow,
    borderStyle: "dashed",
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radius.md,
    flex: 1,
  },
  uploadButtonIcon: {
    fontSize: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: Radius.md,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Border.default,
  },
  selectedFileName: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "#000",
    alignSelf: "center",
  },
  selectedImageCard: {
    marginTop: 12,
    borderRadius: Radius.md,
    overflow: "hidden",
    position: "relative",
    maxHeight: 500, // Maximum height before scrolling
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
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
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
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  dotVerticalActive: {
    backgroundColor: "#BFFF00",
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
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  npcDotActive: {
    backgroundColor: "#BFFF00",
    width: 24,
  },
});
