// app/(hackathon)/activity/[nodeId].tsx
// Hackathon phase activity screen — fetches from hackathon_phase_activities
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { AppText } from "../../../components/AppText";
import HackathonEvidenceComic from "../../../components/Hackathon/HackathonEvidenceComic";
import { parseHackathonComicContent } from "../../../lib/hackathonComic";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { supabase } from "../../../lib/supabase";
import { submitTextAnswer, submitFile } from "../../../lib/hackathon-submit";
import { Space } from "../../../lib/theme";
import type {
  HackathonPhaseActivityDetail,
  HackathonPhaseActivityContent,
  HackathonPhaseActivityAssessment,
} from "../../../types/hackathon-phase-activity";

// ── Bioluminescent tokens ─────────────────────────────────────────
const BG      = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN    = "#91C4E3";
const BLUE    = "#65ABFC";
const CYAN45  = "rgba(145,196,227,0.45)";
const CYAN20  = "rgba(145,196,227,0.20)";
const BORDER  = "rgba(74,107,130,0.35)";
const WHITE   = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";

// ── Fetch ─────────────────────────────────────────────────────────
async function fetchActivity(id: string): Promise<HackathonPhaseActivityDetail | null> {
  const { data, error } = await supabase
    .from("hackathon_phase_activities")
    .select(`
      id, phase_id, title, instructions, display_order,
      estimated_minutes, is_required, is_draft, created_at, updated_at,
      hackathon_phase_activity_content (
        id, activity_id, content_type, content_title,
        content_url, content_body, display_order, metadata, created_at
      ),
      hackathon_phase_activity_assessments (
        id, activity_id, assessment_type, points_possible,
        is_graded, metadata, created_at, updated_at
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    ...(data as any),
    content: ((data as any).hackathon_phase_activity_content ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    ),
    assessment: (data as any).hackathon_phase_activity_assessments ?? null,
  };
}

// ── Content type label ────────────────────────────────────────────
function contentTypeLabel(type: string): string {
  switch (type) {
    case "npc_chat":    return "NPC CONVERSATION";
    case "ai_chat":     return "AI CHAT";
    case "video":       return "VIDEO";
    case "short_video": return "VIDEO";
    case "text":        return "READING";
    case "image":       return "IMAGE";
    case "infographic_comic": return "COMIC";
    case "pdf":         return "DOCUMENT";
    case "canva_slide": return "SLIDES";
    default:            return type.toUpperCase().replace(/_/g, " ");
  }
}

function getComicContent(item: HackathonPhaseActivityContent) {
  if (item.content_type !== "infographic_comic" && item.content_type !== "text") {
    return null;
  }

  return parseHackathonComicContent(
    item.metadata,
    item.content_title,
    item.content_body,
  );
}

function isComicContent(item: HackathonPhaseActivityContent): boolean {
  return getComicContent(item) !== null;
}

function primaryContentType(content: HackathonPhaseActivityContent[]): string {
  if (content.length === 0) return "activity";
  return isComicContent(content[0]) ? "COMIC" : contentTypeLabel(content[0].content_type);
}

// ── Content renderers ─────────────────────────────────────────────
function TextBlock({ item }: { item: HackathonPhaseActivityContent }) {
  return (
    <View style={styles.contentBlock}>
      {item.content_title ? (
        <AppText variant="bold" style={styles.contentBlockTitle}>{item.content_title}</AppText>
      ) : null}
      {item.content_body ? (
        <AppText style={styles.bodyText}>{item.content_body}</AppText>
      ) : (
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>No content.</AppText>
      )}
    </View>
  );
}

function ImageBlock({ item }: { item: HackathonPhaseActivityContent }) {
  return (
    <View style={styles.contentBlock}>
      {item.content_title ? (
        <AppText variant="bold" style={styles.contentBlockTitle}>{item.content_title}</AppText>
      ) : null}
      {item.content_url ? (
        <Image
          source={{ uri: item.content_url }}
          style={styles.imageBlock}
          resizeMode="contain"
        />
      ) : (
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>No image URL.</AppText>
      )}
    </View>
  );
}

function VideoBlock({ item }: { item: HackathonPhaseActivityContent }) {
  return (
    <View style={styles.contentBlock}>
      {item.content_title ? (
        <AppText variant="bold" style={styles.contentBlockTitle}>{item.content_title}</AppText>
      ) : null}
      {item.content_url ? (
        <View style={styles.videoPlaceholder}>
          <AppText style={styles.videoIcon}>▶</AppText>
          <AppText style={[styles.bodyText, { color: CYAN, marginTop: 8 }]} numberOfLines={1}>
            {item.content_url}
          </AppText>
        </View>
      ) : (
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>No video URL.</AppText>
      )}
    </View>
  );
}

function ChatBlock({ item, type }: { item: HackathonPhaseActivityContent; type: "npc_chat" | "ai_chat" }) {
  const label = type === "npc_chat" ? "NPC Conversation" : "AI Chat";
  const icon  = type === "npc_chat" ? "🤖" : "✨";
  return (
    <View style={[styles.contentBlock, styles.chatBlock]}>
      <AppText style={styles.chatIcon}>{icon}</AppText>
      <AppText variant="bold" style={[styles.contentBlockTitle, { textAlign: "center" }]}>
        {item.content_title ?? label}
      </AppText>
      <AppText style={[styles.bodyText, { textAlign: "center", color: WHITE55 }]}>
        {type === "npc_chat"
          ? "An interactive conversation experience."
          : "Chat with AI to explore this topic."}
      </AppText>
      <View style={styles.chatComingSoon}>
        <AppText style={styles.chatComingSoonText}>Coming soon</AppText>
      </View>
    </View>
  );
}

function ContentBlock({ item }: { item: HackathonPhaseActivityContent }) {
  const comic = getComicContent(item);
  if (comic) {
    return (
      <HackathonEvidenceComic
        comic={comic}
        title={item.content_title}
        description={item.content_body}
        fallbackUrl={item.content_url}
      />
    );
  }

  switch (item.content_type) {
    case "text":        return <TextBlock item={item} />;
    case "image":       return <ImageBlock item={item} />;
    case "video":
    case "short_video": return <VideoBlock item={item} />;
    case "npc_chat":    return <ChatBlock item={item} type="npc_chat" />;
    case "ai_chat":     return <ChatBlock item={item} type="ai_chat" />;
    default:
      return (
        <View style={styles.contentBlock}>
          {item.content_title ? (
            <AppText variant="bold" style={styles.contentBlockTitle}>{item.content_title}</AppText>
          ) : null}
          <AppText style={[styles.bodyText, { color: WHITE28 }]}>
            Content type "{item.content_type}" — coming soon.
          </AppText>
        </View>
      );
  }
}

// ── Assessment upload blocks ───────────────────────────────────────
type UploadState = "idle" | "uploading" | "done" | "error";

function ImageUploadBlock({
  assessment,
  activityId,
  onUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  onUploaded: (url: string) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUri(asset.uri);
    setError(null);
    setUploadState("uploading");
    try {
      const fileName = asset.uri.split("/").pop() ?? "photo.jpg";
      const mimeType = asset.mimeType ?? "image/jpeg";
      const res = await submitFile(activityId, assessment.id, asset.uri, fileName, mimeType);
      setUploadState("done");
      onUploaded(res.url ?? asset.uri);
    } catch (e: any) {
      setUploadState("error");
      setError(e.message ?? "Upload failed");
    }
  }

  return (
    <View style={styles.uploadBlock}>
      {uri ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
          {uploadState === "uploading" && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={CYAN} />
            </View>
          )}
          {uploadState === "done" && (
            <View style={styles.uploadBadge}>
              <AppText style={styles.uploadBadgeText}>✓</AppText>
            </View>
          )}
          {uploadState !== "uploading" && (
            <Pressable style={styles.changeBtn} onPress={pick}>
              <AppText style={styles.changeBtnText}>Change</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📷</AppText>
          <AppText style={styles.uploadEmptyLabel}>Tap to add photo</AppText>
        </Pressable>
      )}
      {uploadState === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>Retry</AppText></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function FileUploadBlock({
  assessment,
  activityId,
  onUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  onUploaded: (url: string) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFileName(asset.name);
    setError(null);
    setUploadState("uploading");
    try {
      const mimeType = asset.mimeType ?? "application/octet-stream";
      const res = await submitFile(activityId, assessment.id, asset.uri, asset.name, mimeType);
      setUploadState("done");
      onUploaded(res.url ?? asset.uri);
    } catch (e: any) {
      setUploadState("error");
      setError(e.message ?? "Upload failed");
    }
  }

  return (
    <View style={styles.uploadBlock}>
      {fileName ? (
        <View style={styles.fileRow}>
          <AppText style={styles.fileIcon}>📄</AppText>
          <AppText style={styles.fileName} numberOfLines={1}>{fileName}</AppText>
          {uploadState === "uploading" && <ActivityIndicator color={CYAN} size="small" />}
          {uploadState === "done" && <AppText style={styles.fileDone}>✓</AppText>}
          {uploadState !== "uploading" && (
            <Pressable onPress={pick}>
              <AppText style={styles.changeBtnText}>Change</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📎</AppText>
          <AppText style={styles.uploadEmptyLabel}>Tap to attach file</AppText>
        </Pressable>
      )}
      {uploadState === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>Retry</AppText></Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ── Assessment block ───────────────────────────────────────────────
function AssessmentBlock({
  assessment,
  activityId,
  value,
  onChange,
  onFileUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  value: string;
  onChange: (v: string) => void;
  onFileUploaded: (url: string) => void;
}) {
  const label = assessment.assessment_type === "text_answer"
    ? "Your answer"
    : assessment.assessment_type === "image_upload"
    ? "Your photo"
    : "Your file";

  return (
    <View style={styles.assessmentBlock}>
      <AppText style={styles.assessmentLabel}>
        {label}{assessment.points_possible ? ` · ${assessment.points_possible} pts` : ""}
      </AppText>
      {assessment.assessment_type === "text_answer" ? (
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Write your response here..."
          placeholderTextColor={WHITE28}
          value={value}
          onChangeText={onChange}
        />
      ) : assessment.assessment_type === "image_upload" ? (
        <ImageUploadBlock
          assessment={assessment}
          activityId={activityId}
          onUploaded={onFileUploaded}
        />
      ) : (
        <FileUploadBlock
          assessment={assessment}
          activityId={activityId}
          onUploaded={onFileUploaded}
        />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const insets = useSafeAreaInsets();
  const [activity, setActivity] = useState<HackathonPhaseActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const dbData = await fetchActivity(nodeId!);
          if (!cancelled) setActivity(dbData);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [nodeId])
  );

  const canSubmit = activity?.assessment
    ? activity.assessment.assessment_type === "text_answer"
      ? answer.trim().length > 0
      : uploadedUrl !== null
    : true;

  async function handleSubmit() {
    if (!activity) return;
    if (!activity.assessment) { router.back(); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (activity.assessment.assessment_type === "text_answer") {
        await submitTextAnswer(activity.id, activity.assessment.id, answer);
      }
      // image/file already uploaded on pick — just mark done
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setSubmitError(e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>Loading...</AppText>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: WHITE28 }}>Activity not found.</AppText>
      </View>
    );
  }

  const typeLabel = primaryContentType(activity.content);

  return (
    <View style={styles.root}>
      {/* Glow orb */}
      <View style={styles.glowCyan} pointerEvents="none" />

      {/* Back button */}
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
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>{typeLabel}</AppText>
          <AppText variant="bold" style={styles.title}>{activity.title}</AppText>
          {activity.instructions ? (
            <AppText style={styles.instructions}>{activity.instructions}</AppText>
          ) : null}
          <View style={styles.metaRow}>
            {activity.estimated_minutes ? (
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>~{activity.estimated_minutes} min</AppText>
              </View>
            ) : null}
            {activity.is_required ? (
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>Required</AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content blocks */}
        {activity.content.length > 0 ? (
          <View style={styles.contentSection}>
            {activity.content.map((item) => (
              <ContentBlock key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <View style={[styles.contentBlock, { borderColor: BORDER }]}>
            <AppText style={[styles.bodyText, { color: WHITE28 }]}>
              No content yet for this activity.
            </AppText>
          </View>
        )}

        {/* Assessment */}
        {activity.assessment ? (
          <AssessmentBlock
            assessment={activity.assessment}
            activityId={activity.id}
            value={answer}
            onChange={setAnswer}
            onFileUploaded={(url) => setUploadedUrl(url)}
          />
        ) : null}

        {/* Submit error */}
        {submitError ? (
          <AppText style={{ color: "#F87171", fontSize: 13, textAlign: "center" }}>
            {submitError}
          </AppText>
        ) : null}

        {/* Submit button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            (!canSubmit || submitting) && { opacity: 0.5 },
            pressed && canSubmit && !submitting && { opacity: 0.8 },
          ]}
          disabled={!canSubmit || submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={BG} />
          ) : (
            <AppText variant="bold" style={styles.submitBtnText}>
              {submitted ? "Submitted ✓" : activity.assessment ? "Submit →" : "Mark complete →"}
            </AppText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Space.lg, paddingBottom: 96, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  glowCyan: {
    position: "absolute", top: -40, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: CYAN, opacity: 0.04,
  },
  headerActions: {
    position: "absolute",
    left: Space.lg,
    zIndex: 10,
  },

  // Header
  header: { gap: Space.sm },
  eyebrow: {
    fontSize: 10, color: CYAN45,
    textTransform: "uppercase", letterSpacing: 2.5,
  },
  title: {
    fontSize: 26, lineHeight: 32, color: WHITE,
    textShadowColor: "rgba(145,196,227,0.15)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  instructions: { fontSize: 14, lineHeight: 21, color: WHITE55 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Space.xs },
  metaChip: {
    borderWidth: 1,
    borderColor: CYAN20,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  metaChipText: { fontSize: 11, color: CYAN45 },

  // Content
  contentSection: { gap: Space.md },
  contentBlock: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: Space.lg,
    gap: Space.sm,
  },
  contentBlockTitle: { fontSize: 14, color: WHITE, marginBottom: 2 },
  bodyText: { fontSize: 14, lineHeight: 22, color: WHITE75 },

  imageBlock: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 4,
  },

  videoPlaceholder: {
    alignItems: "center",
    paddingVertical: Space.xl,
    gap: 4,
  },
  videoIcon: { fontSize: 36, color: BLUE },

  chatBlock: { alignItems: "center", paddingVertical: Space.xl, gap: Space.sm },
  chatIcon: { fontSize: 40 },
  chatComingSoon: {
    borderWidth: 1,
    borderColor: CYAN20,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: Space.sm,
  },
  chatComingSoonText: { fontSize: 11, color: CYAN45 },

  // Assessment
  assessmentBlock: { gap: Space.sm },
  assessmentLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CYAN45,
  },
  textArea: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: Space.lg,
    color: WHITE,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 140,
    textAlignVertical: "top",
  },

  // Upload blocks
  uploadBlock: { gap: Space.sm },
  uploadEmptyBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: Space.xl,
    alignItems: "center",
    gap: Space.sm,
  },
  uploadEmptyIcon: { fontSize: 32 },
  uploadEmptyLabel: { fontSize: 14, color: WHITE55 },
  imagePreviewWrap: { borderRadius: 16, overflow: "hidden" },
  imagePreview: { width: "100%", height: 220, borderRadius: 16 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#4ADE80",
    borderRadius: 99,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBadgeText: { color: "#000", fontSize: 14 },
  changeBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  changeBtnText: { fontSize: 12, color: CYAN },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: Space.md,
    gap: Space.sm,
  },
  fileIcon: { fontSize: 20 },
  fileName: { flex: 1, fontSize: 13, color: WHITE55 },
  fileDone: { fontSize: 16, color: "#4ADE80" },
  uploadError: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginTop: 4 },
  uploadErrorText: { fontSize: 12, color: "#F87171", flex: 1 },
  retryText: { fontSize: 12, color: CYAN },

  // Submit
  submitBtn: {
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  submitBtnText: { fontSize: 15, color: BG, letterSpacing: 0.5 },
});
