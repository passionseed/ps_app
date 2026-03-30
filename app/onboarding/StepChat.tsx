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
import { SvgXml, Svg, Circle } from "react-native-svg";
import trumpSvg from "../../assets/npc/trump-svg";
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
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0.2)).current;
  const dot2Anim = useRef(new Animated.Value(0.2)).current;
  const dot3Anim = useRef(new Animated.Value(0.2)).current;

  const currentNpcText =
    [...bubbles].reverse().find((b) => b.role === "model")?.text ?? "";

  const userReplies = bubbles.filter((b) => b.role === "user").length;
  const EXPECTED_TURNS = 5;
  const progressPercent = Math.min(Math.round((userReplies / EXPECTED_TURNS) * 100), 95);
  const ringSize = 48;
  const strokeWidth = 5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPercent / 100);

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
    setInputKey((k) => k + 1);
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
        {/* Progress ring — top left of screen */}
        <View style={styles.progressRingWrap}>
          <Svg width={ringSize} height={ringSize} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="#BFFF00"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>

        {/* NPC portrait */}
        <View style={styles.npcAnchor}>
          <View style={styles.npcNamePill}>
            <Text style={styles.npcName}>P.Trump — Noble Peace Winner</Text>
          </View>
          <Animated.View
            style={[
              styles.portrait,
              {
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.8],
                }),
              },
            ]}
          >
            <SvgXml xml={trumpSvg} width="100%" height="100%" />
          </Animated.View>
        </View>

        {/* Dialog box */}
        <View style={styles.dialogBox}>
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
              key={inputKey}
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
    overflow: "visible",
  },
  npcAnchor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
    zIndex: 1,
  },
  portrait: {
    width: 560,
    height: 720,
    marginBottom: -220,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 24,
    elevation: 0,
  },
  progressRingWrap: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  progressText: {
    position: "absolute",
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 10,
    fontWeight: "700",
    color: "#111",
  },
  dialogBox: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
    zIndex: 10,
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
  npcNamePill: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 10,
    zIndex: 1,
  },
  npcName: {
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#BFFF00",
    textTransform: "uppercase",
    textAlign: "center",
  },
  npcText: {
    fontFamily: "LibreFranklin_400Regular",
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
    fontFamily: "LibreFranklin_400Regular",
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
