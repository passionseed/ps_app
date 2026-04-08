// app/(hackathon)/activity/[nodeId].tsx
// Hackathon phase activity screen — fetches from hackathon_phase_activities
import { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../components/AppText";
import { HackathonSwipeDonut } from "../../../components/Hackathon/HackathonSwipeDonut";
import { WaterFlowHint } from "../../../components/Hackathon/WaterFlowHint";
import { ActivityCommentsPreview } from "../../../components/Hackathon/ActivityCommentsPreview";
import HackathonEvidenceComic from "../../../components/Hackathon/HackathonEvidenceComic";
import HackathonWebtoon from "../../../components/Hackathon/HackathonWebtoon";
import { parseHackathonComicContent } from "../../../lib/hackathonComic";
import { parseHackathonWebtoonContent } from "../../../lib/hackathonWebtoon";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { supabase } from "../../../lib/supabase";
import { readHackathonParticipant, type HackathonParticipant } from "../../../lib/hackathon-mode";
import {
  submitTextAnswer,
  submitFile,
  fetchActivitySubmissions,
  fetchTeammateActivitySubmissions,
  type SubmissionRecord,
  type TeammateSubmissionRecord,
} from "../../../lib/hackathon-submit";
import { Space } from "../../../lib/theme";
import Animated, {
  type SharedValue,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  Extrapolation,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
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
        id, activity_id, assessment_type, display_order, points_possible,
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
    assessments: ((data as any).hackathon_phase_activity_assessments ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    ),
  };
}

// ── Content type label ────────────────────────────────────────────
function contentTypeLabel(type: string): string {
  switch (type) {
    case "npc_chat":    return "พูดคุยกับ NPC";
    case "ai_chat":     return "พูดคุยกับ AI";
    case "video":       return "วิดีโอ";
    case "short_video": return "วิดีโอ";
    case "text":        return "บทความ";
    case "image":       return "รูปภาพ";
    case "infographic_comic": return "การ์ตูน";
    case "webtoon":     return "เว็บตูน";
    case "pdf":         return "เอกสาร";
    case "canva_slide": return "สไลด์";
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

function getWebtoonContent(item: HackathonPhaseActivityContent) {
  if (item.content_type !== "webtoon") {
    return null;
  }

  return parseHackathonWebtoonContent(item.metadata);
}

function isWebtoonContent(item: HackathonPhaseActivityContent): boolean {
  return getWebtoonContent(item) !== null;
}

function primaryContentType(content: HackathonPhaseActivityContent[]): string {
  if (content.length === 0) return "กิจกรรม";
  if (isComicContent(content[0])) return "การ์ตูน";
  if (isWebtoonContent(content[0])) return "เว็บตูน";
  return contentTypeLabel(content[0].content_type);
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
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>ไม่มีเนื้อหา</AppText>
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
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>ไม่มีลิงก์รูปภาพ</AppText>
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
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>ไม่มีลิงก์วิดีโอ</AppText>
      )}
    </View>
  );
}

function ChatBlock({ item, type }: { item: HackathonPhaseActivityContent; type: "npc_chat" | "ai_chat" }) {
  const label = type === "npc_chat" ? "พูดคุยกับ NPC" : "พูดคุยกับ AI";
  const icon  = type === "npc_chat" ? "🤖" : "✨";
  return (
    <View style={[styles.contentBlock, styles.chatBlock]}>
      <AppText style={styles.chatIcon}>{icon}</AppText>
      <AppText variant="bold" style={[styles.contentBlockTitle, { textAlign: "center" }]}>
        {item.content_title ?? label}
      </AppText>
      <AppText style={[styles.bodyText, { textAlign: "center", color: WHITE55 }]}>
        {type === "npc_chat"
          ? "ประสบการณ์การสนทนาโต้ตอบ"
          : "พูดคุยกับ AI เพื่อสำรวจหัวข้อนี้"}
      </AppText>
      <View style={styles.chatComingSoon}>
        <AppText style={styles.chatComingSoonText}>เร็วๆ นี้</AppText>
      </View>
    </View>
  );
}

function ContentBlock({
  item,
  scrollY,
  viewportHeight,
  contentSectionY,
}: {
  item: HackathonPhaseActivityContent;
  scrollY: SharedValue<number>;
  viewportHeight: number;
  contentSectionY: number;
}) {
  const comic = getComicContent(item);
  if (comic) {
    return (
      <HackathonEvidenceComic
        comic={comic}
        fallbackUrl={item.content_url}
        scrollY={scrollY}
        viewportHeight={viewportHeight}
        contentSectionY={contentSectionY}
      />
    );
  }

  const webtoon = getWebtoonContent(item);
  if (webtoon) {
    return (
      <HackathonWebtoon
        webtoon={webtoon}
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
            เนื้อหาประเภท "{item.content_type}" — กำลังจะมาเร็วๆ นี้
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
      mediaTypes: "images",
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
      setError(e.message ?? "การอัปโหลดล้มเหลว");
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
              <AppText style={styles.changeBtnText}>เปลี่ยนรูปภาพ</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📷</AppText>
          <AppText style={styles.uploadEmptyLabel}>แตะเพื่อเพิ่มรูปภาพ</AppText>
        </Pressable>
      )}
      {uploadState === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>ลองใหม่</AppText></Pressable>
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
      setError(e.message ?? "การอัปโหลดล้มเหลว");
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
              <AppText style={styles.changeBtnText}>เปลี่ยนไฟล์</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📎</AppText>
          <AppText style={styles.uploadEmptyLabel}>แตะเพื่อแนบไฟล์</AppText>
        </Pressable>
      )}
      {uploadState === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>ลองใหม่</AppText></Pressable>
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
  const metadata = assessment.metadata as any;
  const defaultLabel = assessment.assessment_type === "text_answer"
    ? "คำตอบของคุณ"
    : assessment.assessment_type === "image_upload"
    ? "รูปภาพของคุณ"
    : "ไฟล์ของคุณ";

  const label = metadata?.submission_label || defaultLabel;
  const prompt = metadata?.prompt;
  const placeholder = metadata?.placeholder || "พิมพ์คำตอบของคุณที่นี่...";

  return (
    <View style={styles.assessmentBlock}>
      <AppText style={styles.assessmentLabel}>
        {label}{assessment.points_possible ? ` · ${assessment.points_possible} pts` : ""}
      </AppText>
      {prompt ? (
        <AppText style={{ fontSize: 15, color: WHITE, marginBottom: 8, lineHeight: 22 }}>
          {prompt}
        </AppText>
      ) : null}
      {assessment.assessment_type === "text_answer" ? (
        <TextInput
          style={styles.textArea}
          multiline
          placeholder={placeholder}
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

function PastSubmissionsList({ submissions }: { submissions: SubmissionRecord[] }) {
  if (submissions.length === 0) return null;
  return (
    <View style={styles.pastSubmissionsBlock}>
      <AppText style={styles.assessmentLabel}>ประวัติการส่ง</AppText>
      {submissions.map((sub) => (
        <SubmissionCard key={sub.id} submission={sub} />
      ))}
    </View>
  );
}

function SubmissionCard({
  submission,
}: {
  submission: SubmissionRecord | TeammateSubmissionRecord;
}) {
  const participantName =
    "participant_name" in submission ? submission.participant_name : null;

  return (
    <View style={styles.pastSubmissionCard}>
      {participantName ? (
        <AppText variant="bold" style={styles.teammateName}>
          {participantName}
        </AppText>
      ) : null}
      <AppText style={styles.pastSubmissionTime}>
        {new Date(submission.submitted_at).toLocaleString("th-TH")}
      </AppText>
      {submission.text_answer ? (
        <AppText style={styles.bodyText}>{submission.text_answer}</AppText>
      ) : null}
      {submission.image_url ? (
        <Image
          source={{ uri: submission.image_url }}
          style={styles.pastSubmissionImage}
          resizeMode="contain"
        />
      ) : null}
      {submission.file_urls?.[0] ? (
        <AppText style={styles.pastSubmissionFile}>
          📁 {submission.file_urls[0].split("/").pop()}
        </AppText>
      ) : null}
    </View>
  );
}

function TeammateSubmissionsList({
  submissions,
}: {
  submissions: TeammateSubmissionRecord[];
}) {
  return (
    <View style={styles.pastSubmissionsBlock}>
      <AppText style={styles.assessmentLabel}>ผลงานของเพื่อนร่วมทีม</AppText>
      {submissions.length === 0 ? (
        <AppText style={styles.teammateEmptyText}>
          ยังไม่มีการส่งจากเพื่อนร่วมทีม
        </AppText>
      ) : (
        submissions.map((sub) => (
          <SubmissionCard key={sub.id} submission={sub} />
        ))
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();

  const [siblings, setSiblings] = useState<{id: string, title: string}[]>([]);

  const SWIPE_NEXT_THRESHOLD = 120;
  const PULL_HINT_SLIDE_PX = 104;

  const lastPrevNavAtRef = useRef(0);
  const swipePrevEnabledSV = useSharedValue(0);
  const swipeNextEnabledSV = useSharedValue(0);
  const isSubmittedSV = useSharedValue(0);
  const lastPrevHapticMilestoneSV = useSharedValue(0);
  const lastNextHapticMilestoneSV = useSharedValue(0);
  const prevSwipeThresholdSV = useSharedValue(0);
  const nextSwipeThresholdSV = useSharedValue(0);
  const nextSwipeProgress = useSharedValue(0);
  const bottomReadyProgress = useSharedValue(0);
  const nextSwipePulse = useSharedValue(1);

  const prevSwipeProgress = useSharedValue(0);
  const prevReadyProgress = useSharedValue(0);
  const prevSwipePulse = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const [activity, setActivity] = useState<HackathonPhaseActivityDetail | null>(null);
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);
  const [pastSubmissions, setPastSubmissions] = useState<SubmissionRecord[]>([]);
  const [teammateSubmissions, setTeammateSubmissions] = useState<TeammateSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contentSectionY, setContentSectionY] = useState(0);

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    isSubmittedSV.value = pastSubmissions.length > 0 ? 1 : 0;
  }, [pastSubmissions]);

  const triggerSwipeHaptic = useCallback((milestone: number) => {
    if (milestone <= 0) return;
    void Haptics.impactAsync(
      milestone >= 4
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;

    const scrollY_val = event.contentOffset.y;
    const contentH = event.contentSize.height;
    const viewportH = event.layoutMeasurement.height;

    const maxScrollY = Math.max(0, contentH - viewportH);

    if (swipePrevEnabledSV.value === 1) {
      const overscrollTop = scrollY_val < 0 ? -scrollY_val : 0;
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
    }

    if (swipeNextEnabledSV.value === 1) {
      if (isSubmittedSV.value === 1) {
        const overscrollY = scrollY_val - maxScrollY;
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
        // not submitted — always keep next progress zeroed
        bottomReadyProgress.value = 0;
        nextSwipeProgress.value = 0;
        nextSwipeThresholdSV.value = 0;
        lastNextHapticMilestoneSV.value = 0;
        nextSwipePulse.value = 1;
      }
    }
  });

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

  const handleSwipeToNext = () => {
    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    const isSubmitted = pastSubmissions.length > 0;
    console.log(`[SwipeNext] activity="${activity?.title}" index=${currentIndex} submissions=${pastSubmissions.length} isSubmitted=${isSubmitted}`);

    if (!isSubmitted) {
      console.log(`[SwipeNext] BLOCKED — current activity not submitted yet`);
      return;
    }

    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      router.replace(`/activity/${siblings[currentIndex + 1].id}`);
    } else if (currentIndex === siblings.length - 1) {
      router.back(); // Go back to activities list
    }
  };

  const handleSwipeToPrevious = () => {
    const now = Date.now();
    if (now - lastPrevNavAtRef.current < 450) return;
    lastPrevNavAtRef.current = now;

    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex > 0) {
      router.replace(`/activity/${siblings[currentIndex - 1].id}`);
    }
  };

  async function refreshSubmissionState(activityId: string) {
    const [submissions, teammateSubmissions] = await Promise.all([
      fetchActivitySubmissions(activityId),
      fetchTeammateActivitySubmissions(activityId),
    ]);
    setPastSubmissions(submissions);
    setTeammateSubmissions(teammateSubmissions);
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const [dbData, submissions, teammateSubmissions, participantData] = await Promise.all([
            fetchActivity(nodeId!),
            fetchActivitySubmissions(nodeId!),
            fetchTeammateActivitySubmissions(nodeId!),
            readHackathonParticipant(),
          ]);
          if (!cancelled) {
            setActivity(dbData);
            setParticipant(participantData);
            setPastSubmissions(submissions);
            setTeammateSubmissions(teammateSubmissions);

            if (dbData && dbData.phase_id) {
              const { data: sibs } = await supabase
                .from("hackathon_phase_activities")
                .select("id, title")
                .eq("phase_id", dbData.phase_id)
                .order("display_order", { ascending: true });
              if (sibs && !cancelled) {
                setSiblings(sibs);
                const currentIndex = sibs.findIndex(s => s.id === nodeId);
                swipePrevEnabledSV.value = currentIndex > 0 ? 1 : 0;
                swipeNextEnabledSV.value = 1; // allow swipe next to go back if last
              }
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [nodeId])
  );

  const canSubmit = activity
    ? activity.assessments.length === 0
      ? true
      : activity.assessments.every((a) =>
          a.assessment_type === "text_answer"
            ? (answers[a.id] ?? "").trim().length > 0
            : uploadedUrls[a.id] != null
        )
    : false;
  const showTeammateSubmissions = pastSubmissions.length > 0;

  async function handleSubmit() {
    if (!activity) return;
    if (activity.assessments.length === 0) { router.back(); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await Promise.all(
        activity.assessments.map((a) => {
          if (a.assessment_type === "text_answer") {
            return submitTextAnswer(activity.id, a.id, answers[a.id] ?? "");
          }
          // file/image already uploaded via AssessmentBlock — nothing to do here
          return Promise.resolve();
        })
      );

      const newSubmissions = await fetchActivitySubmissions(activity.id);
      setPastSubmissions(newSubmissions);
      setAnswers({});
      setUploadedUrls({});

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setSubmitError(e.message ?? "การส่งคำตอบล้มเหลว");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>กำลังโหลด...</AppText>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: WHITE28 }}>ไม่พบกิจกรรมนี้</AppText>
      </View>
    );
  }

  const typeLabel = primaryContentType(activity.content);

  const currentIndex = siblings.findIndex(s => s.id === nodeId);
  const previousTitle = currentIndex > 0 ? siblings[currentIndex - 1].title : "";
  const nextTitle = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].title : "กลับสู่แผนที่";

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

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pullOverlayTop,
          { paddingTop: insets.top + 16 },
          prevPullOverlayStyle,
        ]}
      >
        {swipePrevEnabledSV.value === 1 ? (
          <HackathonSwipeDonut
            direction="previous"
            progress={prevSwipeProgress}
            readyProgress={prevReadyProgress}
            pulseScale={prevSwipePulse}
            label="ก่อนหน้า"
            titleHint={previousTitle}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pullOverlayBottom,
          { paddingBottom: Math.max(insets.bottom, 4) + 12 },
          pastSubmissions.length > 0 ? nextPullOverlayStyle : undefined,
        ]}
      >
        {pastSubmissions.length > 0 ? (
          swipeNextEnabledSV.value === 1 ? (
            <HackathonSwipeDonut
              direction="next"
              progress={nextSwipeProgress}
              readyProgress={bottomReadyProgress}
              pulseScale={nextSwipePulse}
              label="ถัดไป"
              titleHint={nextTitle}
            />
          ) : null
        ) : (
          <AppText style={styles.lockedNextHint}>จบภารกิจนี้ก่อนไปต่อ</AppText>
        )}
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const scrollY_val = contentOffset.y;
          if (swipePrevEnabledSV.value === 1 && scrollY_val < -SWIPE_NEXT_THRESHOLD * 0.6) {
            handleSwipeToPrevious();
          }
          const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height);
          const overscrollY = scrollY_val - maxScrollY;
          if (swipeNextEnabledSV.value === 1 && overscrollY > SWIPE_NEXT_THRESHOLD * 0.6) {
            handleSwipeToNext();
          }
          // Reset all progress values so overlays don't get stuck
          prevSwipeProgress.value = 0;
          prevReadyProgress.value = 0;
          prevSwipeThresholdSV.value = 0;
          prevSwipePulse.value = 1;
          nextSwipeProgress.value = 0;
          bottomReadyProgress.value = 0;
          nextSwipeThresholdSV.value = 0;
          nextSwipePulse.value = 1;
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="bold" style={styles.title}>{activity.title}</AppText>
          {activity.instructions ? (
            <AppText style={styles.instructions}>{activity.instructions}</AppText>
          ) : null}
          <View style={styles.metaRow}>
            {activity.estimated_minutes ? (
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>~{activity.estimated_minutes} นาที</AppText>
              </View>
            ) : null}
            {activity.is_required ? (
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>บังคับ</AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content blocks */}
        {activity.content.length > 0 ? (
          <View
            style={styles.contentSection}
            onLayout={(event) => setContentSectionY(event.nativeEvent.layout.y)}
          >
            {activity.content.map((item) => (
              <ContentBlock
                key={item.id}
                item={item}
                scrollY={scrollY}
                viewportHeight={viewportHeight}
                contentSectionY={contentSectionY}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.contentBlock, { borderColor: BORDER }]}>
            <AppText style={[styles.bodyText, { color: WHITE28 }]}>
              No content yet for this activity.
            </AppText>
          </View>
        )}

        {/* Assessments */}
        {activity.assessments.map((a) => (
          <AssessmentBlock
            key={a.id}
            assessment={a}
            activityId={activity.id}
            value={answers[a.id] ?? ""}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [a.id]: v }))}
            onFileUploaded={(url) => {
              setUploadedUrls((prev) => ({ ...prev, [a.id]: url }));
              fetchActivitySubmissions(activity.id).then(setPastSubmissions);
            }}
          />
        ))}

        {/* Past Submissions */}
        <PastSubmissionsList submissions={pastSubmissions} />

        {/* Teammate Submissions */}
        {showTeammateSubmissions ? (
          <TeammateSubmissionsList submissions={teammateSubmissions} />
        ) : null}

        {/* Submit error */}
        {submitError ? (
          <AppText style={{ color: "#F87171", fontSize: 13, textAlign: "center" }}>
            {submitError}
          </AppText>
        ) : null}

        {/* Submit button */}
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            style={[
              styles.button41,
              (!canSubmit || submitting) && { opacity: 0.5 },
            ]}
            disabled={!canSubmit || submitting}
            onPressIn={() => {
              if (canSubmit && !submitting) buttonScale.value = withSpring(0.95);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1);
            }}
            onPress={handleSubmit}
          >
            {({ pressed }) => (
              <>
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.11)", "transparent"]}
                  start={{ x: 0.5, y: -0.05 }}
                  end={{ x: 0.5, y: 1.15 }}
                  style={styles.button41Gradient}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    pressed && canSubmit && !submitting ? { backgroundColor: "rgba(255, 255, 255, 0.05)" } : null,
                  ]}
                />
                {submitting ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <AppText variant="bold" style={styles.button41Text}>
                    {submitted ? "ส่งแล้ว ✓" : activity.assessments.length > 0 ? "ส่งคำตอบ →" : "ทำเครื่องหมายว่าเสร็จสิ้น →"}
                  </AppText>
                )}
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Comments Preview */}
        {activity && participant && (
          <>
            <View style={styles.commentsDivider} />
            <ActivityCommentsPreview
              activityId={activity.id}
              participantId={participant.id}
              onSeeAll={() => router.push(`/activity/${activity.id}/comments`)}
            />
          </>
        )}

        {/* Static Swipe Hint — only show when submitted */}
        {siblings.length > 0 && pastSubmissions.length > 0 && (
          <WaterFlowHint
            label={currentIndex < siblings.length - 1 ? "ปัดขึ้นเพื่อไปกิจกรรมถัดไป" : "ปัดขึ้นเพื่อกลับสู่แผนที่"}
          />
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
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
  lockedNextHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "BaiJamjuree_500Medium",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Space.lg, paddingBottom: 160, gap: Space.xl },
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

  // Past Submissions
  pastSubmissionsBlock: { gap: Space.sm, marginTop: Space.md },
  pastSubmissionCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: Space.md,
    gap: 4,
  },
  pastSubmissionTime: { fontSize: 11, color: WHITE55, marginBottom: 4 },
  pastSubmissionImage: { width: "100%", height: 150, borderRadius: 8, marginTop: 4 },
  pastSubmissionFile: { fontSize: 13, color: CYAN },
  teammateName: { fontSize: 14, color: WHITE, marginBottom: 2 },
  teammateEmptyText: { fontSize: 13, color: WHITE55, lineHeight: 20 },

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
    fontFamily: "BaiJamjuree_400Regular",
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
  button41: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderTopColor: "rgba(255, 255, 255, 0.4)",
    borderBottomColor: "rgba(255, 255, 255, 0.11)",
  },
  button41Gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  button41Text: {
    fontSize: 16,
    color: WHITE,
    letterSpacing: 0.5,
  },
  staticSwipeHint: {
    alignItems: "center",
    marginTop: Space.xl,
    opacity: 0.6,
  },
  staticSwipeHintArrow: {
    fontSize: 24,
    color: CYAN45,
    marginBottom: 4,
  },
  staticSwipeHintText: {
    fontSize: 13,
    color: WHITE55,
  },

  // Comments section
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(145, 196, 227, 0.3)",
    marginVertical: 8,
  },
});
