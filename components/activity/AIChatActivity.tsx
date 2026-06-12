import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import { getSupabaseRuntimeConfig } from "../../lib/runtime-config";
import { AppText } from "../AppText";
import {
  PageBg,
  Text as ThemeText,
  Accent,
  Shadow,
} from "../../lib/theme";
import type {
  PathActivityWithContent,
  AIChatMetadata,
} from "../../types/pathlab-content";

// AI Chat Message type
interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface NpcAvatar {
  id: string;
  name: string;
  svg_data: string;
}

interface Props {
  activity: PathActivityWithContent;
  onComplete: () => void;
  enrollmentId: string;
}

export default function AIChatActivity({ activity, onComplete, enrollmentId: _enrollmentId }: Props) {
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiObjectiveMet, setAiObjectiveMet] = useState(false);
  const [aiMaxMessages, setAiMaxMessages] = useState(0);
  const [npcSeedAvatar, setNpcSeedAvatar] = useState<NpcAvatar | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize AI chat when activity changes
  useEffect(() => {
    if (!initialized && activity) {
      setInitialized(true);
      initAIChat(activity);
    }
  }, [activity, initialized]);

  const initAIChat = async (act: typeof activity) => {
    const aiContent = act.path_content[0];
    if (!aiContent || aiContent.content_type !== "ai_chat") {
      console.error("[AI] No AI chat content found!");
      return;
    }

    const metadata = aiContent.metadata as AIChatMetadata;

    if (metadata.max_messages) {
      setAiMaxMessages(metadata.max_messages);
    }

    // Load NPC avatar for AI chat
    try {
      const { data: pathDay } = await supabase
        .from("path_days")
        .select("path_id")
        .eq("id", act.path_day_id)
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

    setAiMessages([]);
    await sendInitialGreeting(metadata);
  };

  const sendInitialGreeting = async (metadata: AIChatMetadata) => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const { publishableKey } = getSupabaseRuntimeConfig();
      if (!supabaseUrl) return;

      const systemPrompt = metadata.system_prompt || "You are a helpful assistant.";

      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          messages: [],
          mode: "greeting",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const greeting = data.reply || "สวัสดีค่ะ! มีอะไรให้ช่วยไหม?";

        setAiMessages([{
          role: "assistant",
          content: greeting,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error("[AI] Error getting initial greeting:", error);
      setAiMessages([{
        role: "assistant",
        content: "สวัสดีค่ะ! 😊 มีอะไรให้ช่วยไหม?",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

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

      const messages = [
        ...aiMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage.content },
      ];

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const { publishableKey } = getSupabaseRuntimeConfig();

      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          system_prompt: metadata.system_prompt || "You are a helpful assistant.",
          messages,
        }),
      });

      console.log("[AI] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[AI] Error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `AI service error (${response.status}): ${errorText || response.statusText || "Unknown error"}`
        );
      }

      const data = await response.json();
      const assistantContent = data.reply || "I couldn't generate a response.";

      const assistantMessage: AIChatMessage = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, assistantMessage]);

      // Check if we've reached the max messages goal
      const newMessageCount = aiMessages.length + 2;
      if (aiMaxMessages > 0 && newMessageCount >= aiMaxMessages) {
        console.log("[AI] Reached max messages - marking as complete");
        setAiObjectiveMet(true);
        onComplete();
        return;
      }

      // Check objective
      if (metadata.objective) {
        const messageCount = aiMessages.length + 2;
        const maxMessages = metadata.max_messages || 10;

        if (messageCount >= maxMessages) {
          console.log("[AI] Objective met - max messages reached");
          setAiObjectiveMet(true);
          onComplete();
        } else if (metadata.completion_criteria) {
          const conversationText = [...aiMessages, userMessage, assistantMessage]
            .map((m) => m.content)
            .join(" ")
            .toLowerCase();

          if (conversationText.includes(metadata.completion_criteria.toLowerCase())) {
            console.log("[AI] Objective met - completion criteria found");
            setAiObjectiveMet(true);
            onComplete();
          }
        }
      }
    } catch (error) {
      console.error("[AI] Error sending message:", error);

      const errorMessage: AIChatMessage = {
        role: "assistant",
        content: `Sorry, I'm having trouble connecting to the AI service right now. ${error instanceof Error ? error.message : "Unknown error"}. Please try again in a moment.`,
        timestamp: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, errorMessage]);

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

  return (
    <View style={styles.messengerContainer}>
      {/* Chat Header */}
      <View style={styles.messengerHeader}>
        {npcSeedAvatar?.svg_data ? (
          <View style={styles.messengerAvatarContainer}>
            <View style={styles.messengerAvatarSvg}>
              <SvgXml xml={npcSeedAvatar.svg_data} width="48" height="48" />
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
                {
                  width: `${Math.min((aiMessages.length / aiMaxMessages) * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <AppText style={styles.aiProgressText}>
            {Math.min(Math.round((aiMessages.length / aiMaxMessages) * 100), 100)}%
          </AppText>
        </View>
      )}

      {/* Messages */}
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
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              {msg.role === "assistant" && npcSeedAvatar?.svg_data && (
                <View style={styles.messengerMessageAvatar}>
                  <SvgXml xml={npcSeedAvatar.svg_data} width="32" height="32" />
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
                <AppText
                  style={[
                    styles.messengerBubbleText,
                    msg.role === "user" && styles.messengerBubbleTextUser,
                  ]}
                >
                  {msg.content}
                </AppText>
                <AppText
                  style={[
                    styles.messengerTime,
                    msg.role === "user" && styles.messengerTimeUser,
                  ]}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
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

      {/* AI Chat Input */}
      {!aiObjectiveMet && (
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
                (!aiInput.trim() || aiSending) && styles.messengerSendButtonDisabled,
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  messengerMessagesScroll: {
    flex: 1,
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
});
