import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
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

  const glowAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0.2)).current;
  const dot2Anim = useRef(new Animated.Value(0.2)).current;
  const dot3Anim = useRef(new Animated.Value(0.2)).current;

  const currentNpcText =
    [...bubbles].reverse().find((b) => b.role === "model")?.text ?? "";

  // Send initial greeting if no history
  useEffect(() => {
    if (chatHistory.length === 0) {
      sendToAI([]);
    }
  }, []);

  // Animations while loading
  useEffect(() => {
    if (loading) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
      glowLoop.start();

      const makeDotLoop = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        );

      const d1 = makeDotLoop(dot1Anim, 0);
      const d2 = makeDotLoop(dot2Anim, 200);
      const d3 = makeDotLoop(dot3Anim, 400);
      d1.start();
      d2.start();
      d3.start();

      return () => {
        glowLoop.stop();
        glowAnim.setValue(0);
        d1.stop();
        d2.stop();
        d3.stop();
        dot1Anim.setValue(0.2);
        dot2Anim.setValue(0.2);
        dot3Anim.setValue(0.2);
      };
    }
  }, [loading]);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* NPC portrait area */}
        <View style={styles.portraitArea}>
          <Animated.View
            style={[
              styles.portrait,
              {
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
                borderColor: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["#BFFF00", "#9FE800"],
                }),
              },
            ]}
          >
            <Text style={styles.portraitLabel}>NPC</Text>
          </Animated.View>
        </View>

        {/* Dialog box */}
        <View style={styles.dialogBox}>
          <Text style={styles.npcName}>PIP — CAREER GUIDE</Text>

          {loading ? (
            <View style={styles.dotsRow}>
              <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
            </View>
          ) : (
            <Text style={styles.npcText}>{currentNpcText}</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, loading && { opacity: 0.5 }]}
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer..."
              placeholderTextColor="rgba(0,0,0,0.35)"
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!loading}
            />
            <Pressable
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={loading || !input.trim()}
            >
              <Text style={styles.sendBtnText}>→</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  portraitArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  portrait: {
    width: 110,
    height: 140,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    borderWidth: 2,
    borderColor: "#BFFF00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
  },
  portraitLabel: {
    fontFamily: "Orbit_400Regular",
    fontSize: 12,
    color: "#aaa",
  },
  dialogBox: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    minHeight: 170,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  npcName: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#9FE800",
    textTransform: "uppercase",
  },
  npcText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 13,
    color: "#111",
    lineHeight: 20,
    minHeight: 42,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 42,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#BFFF00",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: "#BFFF00",
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0514",
  },
});
