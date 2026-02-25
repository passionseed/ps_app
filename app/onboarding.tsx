import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { useAuth, UserProfile } from "../lib/auth";
import { onboardingFollowUp, onboardingExtract, ExtractedProfile, OnboardingMessage } from "../lib/ai";

const TOPICS = [
  {
    id: "life_areas",
    prompt: "What areas of life do you most want to improve right now?",
  },
  {
    id: "direction",
    prompt: "What does success look like for you in the next 6–12 months?",
  },
  {
    id: "values",
    prompt: "What matters most to you — your core values?",
  },
  {
    id: "blockers",
    prompt: "What's getting in your way right now?",
  },
  {
    id: "availability",
    prompt: "How much time can you realistically commit to new habits per week?",
  },
];

type ChatMessage = {
  role: "app" | "user";
  text: string;
};

type TopicState = {
  answer: string;
  followUp: string | null;
  followUpAnswer: string;
  phase: "answer" | "followup" | "done";
};

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [topicIndex, setTopicIndex] = useState(0);
  const [topicStates, setTopicStates] = useState<TopicState[]>(
    TOPICS.map(() => ({ answer: "", followUp: null, followUpAnswer: "", phase: "answer" }))
  );
  const [inputText, setInputText] = useState("");
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);

  // Summary phase
  const [phase, setPhase] = useState<"chat" | "summary">("chat");
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const [editField, setEditField] = useState<keyof ExtractedProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const current = topicStates[topicIndex];
  const topic = TOPICS[topicIndex];

  // Build chat messages for display
  const chatMessages: ChatMessage[] = [];
  for (let i = 0; i <= topicIndex; i++) {
    chatMessages.push({ role: "app", text: TOPICS[i].prompt });
    if (topicStates[i].answer) {
      chatMessages.push({ role: "user", text: topicStates[i].answer });
    }
    if (topicStates[i].followUp) {
      chatMessages.push({ role: "app", text: topicStates[i].followUp! });
    }
    if (topicStates[i].followUpAnswer) {
      chatMessages.push({ role: "user", text: topicStates[i].followUpAnswer });
    }
  }

  const updateCurrent = (patch: Partial<TopicState>) => {
    setTopicStates((prev) => {
      const next = [...prev];
      next[topicIndex] = { ...next[topicIndex], ...patch };
      return next;
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");

    if (current.phase === "answer") {
      updateCurrent({ answer: text, phase: "followup" });
      setLoadingFollowUp(true);
      try {
        const followUp = await onboardingFollowUp(topic.id, text);
        updateCurrent({ followUp, phase: "followup" });
      } catch {
        updateCurrent({ followUp: "Tell me more about that?", phase: "followup" });
      } finally {
        setLoadingFollowUp(false);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } else if (current.phase === "followup") {
      updateCurrent({ followUpAnswer: text, phase: "done" });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleNext = async () => {
    if (topicIndex < TOPICS.length - 1) {
      setTopicIndex((i) => i + 1);
      inputRef.current?.focus();
    } else {
      // All done — extract profile
      setLoadingExtract(true);
      try {
        const messages: OnboardingMessage[] = topicStates.map((s, i) => ({
          topic: TOPICS[i].id,
          answer: s.answer,
          followUpAnswer: s.followUpAnswer,
        }));
        const result = await onboardingExtract(messages);
        setExtracted(result);
        setPhase("summary");
      } catch (err) {
        console.error("[onboarding extract error]", err);
      } finally {
        setLoadingExtract(false);
      }
    }
  };

  const handleSave = async () => {
    if (!extracted || !user) return;
    setSaving(true);
    try {
      await supabase.from("user_profiles").upsert({
        user_id: user.id,
        onboarding_done: true,
        life_areas: extracted.lifeAreas,
        direction: extracted.direction,
        values: extracted.values,
        blockers: extracted.blockers,
        weekly_hours: extracted.weeklyHours,
      }, { onConflict: "user_id" });
      await refreshProfile();
      router.replace("/(tabs)/goals");
    } catch (err) {
      console.error("[onboarding save error]", err);
    } finally {
      setSaving(false);
    }
  };

  const isCurrentDone = current.phase === "done";
  const isLastTopic = topicIndex === TOPICS.length - 1;

  if (phase === "summary" && extracted) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar style="dark" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.summaryTitle}>Here's what I got</Text>
          <Text style={styles.summarySubtitle}>Tap any field to edit</Text>

          <View style={styles.summaryCard}>
            <SummaryRow
              icon="🎯"
              label="Focus areas"
              value={extracted.lifeAreas.join(" · ")}
              editing={editField === "lifeAreas"}
              onTap={() => setEditField(editField === "lifeAreas" ? null : "lifeAreas")}
              onChangeText={(v) => setExtracted({ ...extracted, lifeAreas: v.split("·").map((s) => s.trim()).filter(Boolean) })}
            />
            <SummaryRow
              icon="✨"
              label="Direction"
              value={extracted.direction}
              editing={editField === "direction"}
              onTap={() => setEditField(editField === "direction" ? null : "direction")}
              onChangeText={(v) => setExtracted({ ...extracted, direction: v })}
            />
            <SummaryRow
              icon="💡"
              label="Values"
              value={extracted.values}
              editing={editField === "values"}
              onTap={() => setEditField(editField === "values" ? null : "values")}
              onChangeText={(v) => setExtracted({ ...extracted, values: v })}
            />
            <SummaryRow
              icon="⚡"
              label="Blockers"
              value={extracted.blockers}
              editing={editField === "blockers"}
              onTap={() => setEditField(editField === "blockers" ? null : "blockers")}
              onChangeText={(v) => setExtracted({ ...extracted, blockers: v })}
            />
            <SummaryRow
              icon="⏱"
              label="Weekly time"
              value={`~${extracted.weeklyHours} hrs / week`}
              editing={editField === "weeklyHours"}
              onTap={() => setEditField(editField === "weeklyHours" ? null : "weeklyHours")}
              onChangeText={(v) => {
                const n = parseInt(v);
                if (!isNaN(n)) setExtracted({ ...extracted, weeklyHours: n });
              }}
              inputProps={{ keyboardType: "number-pad" }}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={styles.saveBtnText}>Looks good →</Text>
            )}
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {TOPICS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= topicIndex && styles.dotActive,
              topicStates[i].phase === "done" && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.bubbleUser : styles.bubbleApp,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                msg.role === "user" ? styles.bubbleTextUser : styles.bubbleTextApp,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {loadingFollowUp && (
          <View style={styles.bubbleApp}>
            <ActivityIndicator size="small" color="#111" />
          </View>
        )}

        {loadingExtract && (
          <View style={styles.bubbleApp}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.bubbleTextApp}>  Building your profile...</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {isCurrentDone ? (
        <View style={styles.inputRow}>
          <Pressable
            style={styles.nextBtn}
            onPress={handleNext}
            disabled={loadingExtract}
          >
            <Text style={styles.nextBtnText}>
              {isLastTopic ? "See my profile →" : "Next →"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.chatInput}
            placeholder={current.phase === "answer" ? "Your answer..." : "Tell me more..."}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!loadingFollowUp}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || loadingFollowUp) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loadingFollowUp}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function SummaryRow({
  icon, label, value, editing, onTap, onChangeText, inputProps,
}: {
  icon: string;
  label: string;
  value: string;
  editing: boolean;
  onTap: () => void;
  onChangeText: (v: string) => void;
  inputProps?: object;
}) {
  return (
    <Pressable style={styles.summaryRow} onPress={onTap}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.summaryEditInput}
            value={value}
            onChangeText={onChangeText}
            autoFocus
            multiline
            {...inputProps}
          />
        ) : (
          <Text style={styles.summaryValue}>{value}</Text>
        )}
      </View>
      <Text style={styles.editHint}>{editing ? "✓" : "›"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 64,
    paddingBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  dotActive: { backgroundColor: "#111" },
  dotDone: { backgroundColor: "#BFFF00" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  bubbleApp: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: "#111",
    alignSelf: "flex-end",
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    lineHeight: 20,
  },
  bubbleTextApp: { color: "#111" },
  bubbleTextUser: { color: "#BFFF00" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FDFFF5",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    maxHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: {
    fontSize: 18,
    color: "#BFFF00",
    fontFamily: "Orbit_400Regular",
  },
  nextBtn: {
    flex: 1,
    backgroundColor: "#BFFF00",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  // Summary styles
  summaryTitle: {
    fontSize: 26,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginTop: 40,
    marginBottom: 6,
  },
  summarySubtitle: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
  },
  summaryIcon: { fontSize: 18, marginTop: 2 },
  summaryContent: { flex: 1 },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 20,
  },
  summaryEditInput: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#BFFF00",
    paddingVertical: 2,
  },
  editHint: {
    fontSize: 18,
    color: "#CCC",
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.5,
  },
});
