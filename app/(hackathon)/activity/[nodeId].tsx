// app/(hackathon)/activity/[nodeId].tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../../components/AppText";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { completeActivityNode } from "../../../lib/hackathonProgram";
import { Radius, Space } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import type { MapNode, QuizQuestion } from "../../../types/map";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";

function nodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case "video": return "VIDEO";
    case "quiz": return "QUIZ";
    case "text": return "TEXT";
    case "file_upload": return "FILE UPLOAD";
    case "project": return "PROJECT";
    case "npc_conversation": return "NPC CONVERSATION";
    case "assessment": return "ASSESSMENT";
    default: return nodeType.toUpperCase();
  }
}

function TextContent({ node }: { node: MapNode }) {
  const body = node.content?.body ?? node.instructions ?? "No content available.";
  return (
    <View style={styles.contentCard}>
      <AppText style={styles.bodyText}>{body}</AppText>
    </View>
  );
}

function VideoContent({ node }: { node: MapNode }) {
  const url = node.content?.video_url;
  return (
    <View style={styles.contentCard}>
      {url ? (
        <AppText style={styles.bodyText}>Video: {url}</AppText>
      ) : (
        <AppText style={[styles.bodyText, { color: WHITE40 }]}>No video URL configured.</AppText>
      )}
    </View>
  );
}

function QuizContent({ node }: { node: MapNode }) {
  const questions: QuizQuestion[] = node.content?.questions ?? [];
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  return (
    <View style={styles.contentCard}>
      {questions.length === 0 ? (
        <AppText style={{ color: WHITE40 }}>No questions configured.</AppText>
      ) : (
        questions.map((q) => (
          <View key={q.id} style={{ marginBottom: Space.lg }}>
            <AppText variant="bold" style={styles.questionText}>{q.question}</AppText>
            {(q.options ?? []).map((opt) => {
              const isSelected = selected[q.id] === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => !submitted && setSelected((prev) => ({ ...prev, [q.id]: opt.id }))}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                >
                  <AppText style={[styles.optionText, isSelected && { color: CYAN }]}>{opt.text}</AppText>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
      {!submitted && questions.length > 0 && (
        <Pressable style={styles.submitBtn} onPress={() => setSubmitted(true)}>
          <AppText variant="bold" style={styles.submitBtnText}>Submit answers</AppText>
        </Pressable>
      )}
      {submitted && (
        <AppText style={{ color: CYAN, marginTop: Space.sm }}>Submitted! Tap "Mark complete" below.</AppText>
      )}
    </View>
  );
}

function ProjectContent({
  node,
  onTextChange,
}: {
  node: MapNode;
  onTextChange: (text: string) => void;
}) {
  const deliverables = node.content?.deliverables ?? [];
  return (
    <View style={styles.contentCard}>
      {deliverables.length > 0 && (
        <View style={{ marginBottom: Space.md }}>
          <AppText variant="bold" style={{ color: WHITE, marginBottom: Space.xs }}>Deliverables</AppText>
          {deliverables.map((d, i) => (
            <AppText key={i} style={styles.bodyText}>• {d}</AppText>
          ))}
        </View>
      )}
      <AppText variant="bold" style={{ color: WHITE, marginBottom: Space.xs }}>Your submission</AppText>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="Write your response here..."
        placeholderTextColor={WHITE40}
        onChangeText={onTextChange}
      />
    </View>
  );
}

function NpcContent() {
  return (
    <View style={styles.contentCard}>
      <AppText style={[styles.bodyText, { color: WHITE40 }]}>
        NPC conversation coming soon. Mark complete to proceed.
      </AppText>
    </View>
  );
}

function GenericContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      <AppText style={styles.bodyText}>
        {node.content?.description ?? node.instructions ?? "Complete this activity and mark it done."}
      </AppText>
    </View>
  );
}

export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const [node, setNode] = useState<MapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: nodeData }, { data: { user } }] = await Promise.all([
          supabase
            .from("map_nodes")
            .select("*, node_content(*), node_assessments(id, assessment_type, quiz_questions(*))")
            .eq("id", nodeId!)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);
        if (!cancelled) {
          setNode(nodeData as MapNode | null);
          setUserId(user?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  async function handleComplete() {
    if (!nodeId || !userId || completing) return;
    setCompleting(true);
    try {
      await completeActivityNode(nodeId, userId);
      router.back();
    } catch {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  if (!node) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: WHITE40 }}>Activity not found.</AppText>
      </View>
    );
  }

  function renderContent() {
    if (!node) return null;
    const type = node.node_type as string;
    switch (type) {
      case "text": return <TextContent node={node} />;
      case "video": return <VideoContent node={node} />;
      case "quiz": return <QuizContent node={node} />;
      case "project": return <ProjectContent node={node} onTextChange={setSubmissionText} />;
      case "npc_conversation": return <NpcContent />;
      default: return <GenericContent node={node} />;
    }
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText variant="bold" style={styles.eyebrow}>{nodeTypeLabel(node.node_type)}</AppText>
          <AppText variant="bold" style={styles.title}>{node.title}</AppText>
        </View>

        {renderContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaButton, completing && { opacity: 0.5 }]}
          onPress={handleComplete}
          disabled={completing}
        >
          <AppText variant="bold" style={styles.ctaText}>
            {completing ? "Saving..." : "Mark complete →"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  headerActions: {
    position: "absolute",
    left: Space["2xl"],
    zIndex: 10,
  },
  scrollContent: { padding: Space["2xl"], paddingBottom: 120, gap: Space.xl },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 28, color: WHITE },
  contentCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(0,240,255,0.03)",
    padding: Space.lg,
    gap: Space.sm,
  },
  bodyText: { fontSize: 14, lineHeight: 22, color: WHITE75 },
  questionText: { fontSize: 15, color: WHITE, marginBottom: Space.sm },
  optionRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: Space.md,
    marginBottom: Space.xs,
  },
  optionRowSelected: { borderColor: CYAN_BORDER, backgroundColor: CYAN_BG },
  optionText: { fontSize: 14, color: WHITE75 },
  submitBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    padding: Space.md,
    alignItems: "center",
    marginTop: Space.sm,
  },
  submitBtnText: { color: CYAN, fontSize: 14 },
  textArea: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    color: WHITE,
    padding: Space.md,
    minHeight: 120,
    fontSize: 14,
    textAlignVertical: "top",
  },
  footer: {
    padding: Space.xl,
    paddingBottom: Space["2xl"],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  ctaButton: {
    borderRadius: Radius.full,
    backgroundColor: CYAN,
    padding: Space.lg,
    alignItems: "center",
  },
  ctaText: { fontSize: 15, color: BG, letterSpacing: 0.5 },
});
