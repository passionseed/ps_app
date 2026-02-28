import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  callOnboardingChat,
  upsertOnboardingState,
} from "../../lib/onboarding";
import type { ChatMessage } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  chatHistory: ChatMessage[];
  onChatHistoryUpdate: (history: ChatMessage[]) => void;
  onComplete: () => void;
};

type BubbleMessage = {
  role: "user" | "model";
  text: string;
};

export default function StepChat({
  userId,
  userName,
  educationLevel,
  chatHistory,
  onChatHistoryUpdate,
  onComplete,
}: Props) {
  const [bubbles, setBubbles] = useState<BubbleMessage[]>(() =>
    chatHistory.map((m) => ({ role: m.role, text: m.parts[0].text })),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Send initial greeting if no history
  useEffect(() => {
    if (chatHistory.length === 0) {
      sendToAI([]);
    }
  }, []);

  const sendToAI = async (history: ChatMessage[], userText?: string) => {
    setLoading(true);
    const newHistory: ChatMessage[] = userText
      ? [...history, { role: "user", parts: [{ text: userText }] }]
      : history;

    try {
      const res = await callOnboardingChat({
        mode: "chat",
        chat_history: newHistory,
        user_context: { name: userName, education_level: educationLevel },
      });

      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: "model", parts: [{ text: res.message }] },
      ];

      onChatHistoryUpdate(updatedHistory);
      await upsertOnboardingState(userId, { chat_history: updatedHistory });

      setBubbles(
        updatedHistory.map((m) => ({ role: m.role, text: m.parts[0].text })),
      );

      if (res.action === "transition_to_interests") {
        setTimeout(() => onComplete(), 1200);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setBubbles((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, I had trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const currentHistory = bubbles.map((b) => ({
      role: b.role,
      parts: [{ text: b.text }] as [{ text: string }],
    }));
    setBubbles((prev) => [...prev, { role: "user", text }]);
    sendToAI(currentHistory, text);
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [bubbles]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Tell me about yourself</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {bubbles.map((b, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              b.role === "user" ? styles.bubbleUser : styles.bubbleAI,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                b.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAI,
              ]}
            >
              {b.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <ActivityIndicator color="#BFFF00" size="small" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!input.trim() || loading) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 12 },
  headerText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  bubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bubbleAI: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#BFFF00",
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontFamily: "Orbit_400Regular", fontSize: 16, lineHeight: 24 },
  bubbleTextAI: { color: "#fff" },
  bubbleTextUser: { color: "#0a0514", fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 12,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: "#BFFF00",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: "#0a0514", fontWeight: "700" },
});
