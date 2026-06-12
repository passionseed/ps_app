import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Animated as RNAnimated,
  PanResponder,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import { updateActivityProgress } from "../../lib/pathlab";
import { playNPCSpeakSound } from "../../lib/sounds";
import { PathLabSkiaLoader } from "../PathLabSkiaLoader";
import { AppText } from "../AppText";
import {
  PageBg,
  Text as ThemeText,
  Accent,
  Radius,
  Shadow,
} from "../../lib/theme";
import type { PathActivityWithContent, PathContent } from "../../types/pathlab-content";
import type { DayActivityListItem } from "../../lib/pathlabSession";

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

interface NpcAvatar {
  id: string;
  name: string;
  svg_data: string;
}

interface ConversationTree {
  root_node_id: string;
  nodes: Record<string, NPCNode>;
  choices: Record<string, NPCChoice[]>;
  npc_name?: string;
  npc_svg_data?: string;
  summary?: string;
  conversation_id?: string;
}

interface Props {
  activity: PathActivityWithContent;
  onComplete: () => void;
  enrollmentId: string;
  activityId: string;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  currentPage: number;
  totalPages: number;
  dayActivitiesList: DayActivityListItem[];
}

export default function NPCDialogueActivity({
  activity,
  onComplete,
  enrollmentId,
  activityId,
  onSwipePrev,
  onSwipeNext,
  currentPage,
  totalPages,
  dayActivitiesList,
}: Props) {
  // NPC Dialogue state
  const [npcCurrentNode, setNpcCurrentNode] = useState<NPCNode | null>(null);
  const [npcChoices, setNpcChoices] = useState<NPCChoice[]>([]);
  const [npcCompleted, setNpcCompleted] = useState(false);
  const [npcConversationId, setNpcConversationId] = useState<string | null>(null);
  const [npcProgressId, setNpcProgressId] = useState<string | null>(null);
  const [npcError, setNpcError] = useState<string | null>(null);
  const [npcSeedAvatar, setNpcSeedAvatar] = useState<NpcAvatar | null>(null);
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

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeRemainingPrecise, setTimeRemainingPrecise] = useState<number | null>(null);
  const [showTimeoutRestart, setShowTimeoutRestart] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const totalTimeRef = useRef<number>(30);

  const [initialized, setInitialized] = useState(false);

  // Initialize NPC dialogue
  useEffect(() => {
    if (!initialized && activity) {
      setInitialized(true);
      initNPCDialogue(activity);
    }
  }, [activity, initialized]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const initNPCDialogue = async (act: typeof activity) => {
    try {
      console.log("[NPC] Initializing NPC dialogue...");

      const npcContent = act.path_content.find((c: PathContent) => c.content_type === "npc_chat");
      if (!npcContent) {
        const errorMsg = "No NPC content found in activity";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      console.log("[NPC DEBUG] content_body type:", typeof npcContent.content_body);
      console.log("[NPC DEBUG] content_body length:", npcContent.content_body?.length);

      if (!npcContent.content_body) {
        const errorMsg = "NPC content not yet available — check back soon";
        console.error("[NPC]", errorMsg);
        setNpcError(errorMsg);
        return;
      }

      let tree: ConversationTree | null = null;

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

      npcTreeRef.current = { nodes: tree.nodes, choices: tree.choices || {} };

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
      if (act.progress?.id) {
        console.log("[NPC] Checking existing progress for:", act.progress.id);
        const { data: npcProgress, error: progressError } = await supabase
          .from("path_npc_conversation_progress")
          .select("*")
          .eq("progress_id", act.progress.id)
          .maybeSingle();

        console.log("[NPC] Existing progress:", npcProgress, "Error:", progressError);

        if (npcProgress) {
          setNpcProgressId(npcProgress.id);

          if (npcProgress.is_completed) {
            console.log("[NPC] Conversation already completed");
            setNpcCompleted(true);
            onComplete();
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
      if (act.progress?.id) {
        const { data: user } = await supabase.auth.getUser();
        const { data: newProgress, error: progressError } = await supabase
          .from("path_npc_conversation_progress")
          .insert({
            progress_id: act.progress.id,
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
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error loading NPC dialogue";
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

  // Typing animation effect
  useEffect(() => {
    if (!npcCurrentNode?.text_content) return;

    const fullText = npcCurrentNode.text_content;
    setDisplayedText("");
    setIsTyping(true);
    setNpcChoices([]);

    playNPCSpeakSound();

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
    const typingSpeed = 30;

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        bounceAnimation.stop();

        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();

        setIsTyping(false);

        loadNPCChoices(npcCurrentNode.id).then((choices) => {
          setNpcChoices(choices);

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

  const startChoiceTimer = useCallback((seconds: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeRemaining(seconds);
    setTimeRemainingPrecise(seconds);
    setShowTimeoutRestart(false);

    startTimeRef.current = Date.now();
    totalTimeRef.current = seconds;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
      const remaining = totalTimeRef.current - elapsed;

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setTimeRemainingPrecise(0);
        setTimeRemaining(0);
        handleTimeout();
      } else {
        setTimeRemainingPrecise(remaining);
        setTimeRemaining(Math.ceil(remaining));
      }
    }, 25);
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
      setInitialized(false);
      // Reset state and re-init
      setNpcCurrentNode(null);
      setNpcCompleted(false);
    }
  };

  // Re-trigger init when npcCurrentNode is cleared for restart
  useEffect(() => {
    if (!initialized && !npcCurrentNode && !npcCompleted && !showTimeoutRestart && !npcError) {
      setInitialized(true);
      initNPCDialogue(activity);
    }
  }, [initialized, npcCurrentNode, npcCompleted, showTimeoutRestart, npcError]);

  const handleNPCChoice = async (choice: NPCChoice) => {
    console.log("[NPC] Choice clicked:", choice.choice_text);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeRemaining(null);

    if (!npcProgressId || !npcCurrentNode) {
      console.error("[NPC] Missing npcProgressId or npcCurrentNode!");
      return;
    }

    try {
      const { data: currentProgress, error: fetchError } = await supabase
        .from("path_npc_conversation_progress")
        .select("visited_node_ids, choice_history")
        .eq("id", npcProgressId)
        .single();

      if (fetchError) {
        console.error("[NPC] Error fetching progress:", fetchError);
        throw fetchError;
      }

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

      const { error: updateError } = await supabase
        .from("path_npc_conversation_progress")
        .update({
          current_node_id: choice.to_node_id,
          visited_node_ids: updatedVisitedNodes,
          choice_history: updatedChoiceHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", npcProgressId);

      if (updateError) {
        console.error("[NPC] Error updating progress:", updateError);
        throw updateError;
      }

      // If terminal choice or no next node, conversation is complete
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
        onComplete();

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

      // Load next node from in-memory tree
      const nextNode = choice.to_node_id
        ? npcTreeRef.current?.nodes[choice.to_node_id]
        : null;

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
          onComplete();

          if (enrollmentId && activityId) {
            await updateActivityProgress({
              enrollmentId,
              activityId,
              status: "completed",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error handling NPC choice:", error);
      Alert.alert("Error", "Failed to process choice. Please try again.");
    }
  };

  // PanResponder for swipe gestures
  const npcPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      return isVerticalSwipe && Math.abs(gestureState.dy) > 30;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 && currentPage > 0) {
        onSwipePrev();
      } else if (gestureState.dy < -100 && npcCompleted) {
        onSwipeNext();
      }
    },
  });

  const showPagination = totalPages > 0;

  return (
    <View style={styles.npcFullscreenWrapper}>
      {/* Back button overlay */}
      <Pressable style={styles.backButtonOverlay} onPress={onSwipePrev}>
        <AppText style={styles.backButtonOverlayText}>✕</AppText>
      </Pressable>

      {/* NPC Dialogue - Full Screen Cinematic */}
      <View style={styles.npcFullscreenContainer}>
        {/* Progress dots */}
        {showPagination && (
          <View style={styles.npcProgressDotsVertical}>
            {Array.from({ length: totalPages }).map((_, i) => (
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
                setInitialized(false);
              }}
            >
              <AppText style={styles.npcRetryText}>Retry</AppText>
            </Pressable>
          </View>
        ) : !npcCurrentNode && !npcCompleted ? (
          <View style={styles.npcLoadingCard}>
            <PathLabSkiaLoader size="large" />
            <AppText style={styles.npcLoadingText}>Connecting...</AppText>
          </View>
        ) : showTimeoutRestart ? (
          <View style={styles.timeoutOverlay}>
            <AppText style={styles.timeoutTitle}>Time's Up!</AppText>
            <AppText style={styles.timeoutMessage}>
              You didn't respond in time. Let's try again.
            </AppText>
            <Pressable style={styles.restartButton} onPress={restartConversation}>
              <AppText style={styles.restartButtonText}>Restart Conversation</AppText>
            </Pressable>
          </View>
        ) : npcCompleted ? (
          <View style={styles.npcSummaryOverlay} {...npcPanResponder.panHandlers}>
            <View style={styles.npcSummaryBox}>
              <AppText style={styles.npcSummaryTitle}>Conversation Summary</AppText>
              <AppText style={styles.npcSummaryText}>
                {npcSummary ||
                  activity.instructions ||
                  "You have completed this conversation."}
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
                { transform: [{ translateY: bounceAnim }] },
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

              {/* Timer Bar */}
              {timeRemainingPrecise !== null &&
                timeRemainingPrecise > 0 &&
                npcCurrentNode && (
                  <View style={styles.timerBarBelowBubble}>
                    <View
                      style={[
                        styles.timerBarGreyFull,
                        timeRemaining !== null &&
                          timeRemaining <= 5 &&
                          styles.timerBarGreyUrgent,
                      ]}
                    />
                    <View
                      style={[
                        styles.timerBarGreenRemaining,
                        {
                          width: `${
                            (timeRemainingPrecise /
                              (npcCurrentNode.metadata?.timeout_seconds || 30)) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                )}
            </View>

            {/* Floating name tag */}
            {npcSeedAvatar?.name && (
              <View style={styles.npcNameTag}>
                <View style={styles.npcOnlineIndicator} />
                <AppText style={styles.npcNameTagText}>{npcSeedAvatar.name}</AppText>
              </View>
            )}

            {/* Player choices */}
            {!npcCompleted && npcChoices.length > 0 && (
              <View style={styles.choicesOverlay}>
                <View style={styles.choicesGradient} />
                {npcChoices.map((choice, index) => (
                  <Pressable
                    key={choice.id}
                    style={({ pressed }) => [
                      styles.choiceOptionButton,
                      pressed && styles.choiceOptionButtonPressed,
                      timeRemaining !== null &&
                        timeRemaining <= 5 &&
                        styles.choiceOptionButtonUrgent,
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
  );
}

const styles = StyleSheet.create({
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
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -50 }],
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  npcDotVertical: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
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
  speechBubbleContainer: {
    position: "absolute",
    top: 520,
    left: 20,
    right: 20,
    zIndex: 2,
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
});
