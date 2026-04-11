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
import YoutubePlayer from "react-native-youtube-iframe";
import { AppText } from "../../../components/AppText";
import { HackathonJellyfishLoader } from "../../../components/Hackathon/HackathonJellyfishLoader";
import { HackathonSwipeDonut } from "../../../components/Hackathon/HackathonSwipeDonut";
import { WaterFlowHint } from "../../../components/Hackathon/WaterFlowHint";
import { ActivityCommentsPreview } from "../../../components/Hackathon/ActivityCommentsPreview";
import HackathonEvidenceComic from "../../../components/Hackathon/HackathonEvidenceComic";
import HackathonWebtoon from "../../../components/Hackathon/HackathonWebtoon";
import { getHackathonActivityHref } from "../../../lib/hackathonActivityRoute";
import { parseHackathonComicContent } from "../../../lib/hackathonComic";
import {
  getCachedHackathonActivityBundle,
  invalidateHackathonProgressCache,
  loadHackathonActivityBundle,
  preloadHackathonActivityBundle,
} from "../../../lib/hackathonScreenData";
import { parseHackathonWebtoonContent } from "../../../lib/hackathonWebtoon";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import type { HackathonParticipant } from "../../../lib/hackathon-mode";
import {
  submitTextAnswer,
  submitFile,
  fetchActivitySubmissions,
  fetchTeammateActivitySubmissions,
  type SubmissionRecord,
  type TeammateSubmissionRecord,
} from "../../../lib/hackathon-submit";
import { supabase } from "../../../lib/supabase";
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

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
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
  const { width: windowWidth } = useWindowDimensions();
  const videoId = extractYouTubeId(item.content_url || "");
  const isYouTube = !!videoId;
  const playerHeight = windowWidth * (9 / 16);
  const [isReady, setIsReady] = useState(false);

  if (!isYouTube && !item.content_url) {
    return (
      <View style={styles.contentBlock}>
        <AppText style={[styles.bodyText, { color: WHITE28 }]}>ไม่มีลิงก์วิดีโอ</AppText>
      </View>
    );
  }

  return (
    <View style={styles.fullWidthVideo}>
      {item.content_title ? (
        <AppText variant="bold" style={styles.videoTitleOverlay}>{item.content_title}</AppText>
      ) : null}
      {isYouTube ? (
        <View style={styles.videoContainer}>
          {!isReady && (
            <View style={styles.videoLoader}>
              <HackathonJellyfishLoader />
            </View>
          )}
          <YoutubePlayer
            height={playerHeight}
            width={windowWidth}
            videoId={videoId}
            play={false}
            webViewStyle={{ opacity: 0.99 }}
            webViewProps={{ androidLayerType: "hardware" }}
            onReady={() => setIsReady(true)}
          />
        </View>
      ) : item.content_url ? (
        <View style={styles.videoPlaceholder}>
          <AppText style={styles.videoIcon}>▶</AppText>
          <AppText style={[styles.bodyText, { color: CYAN, marginTop: 8 }]} numberOfLines={1}>
            {item.content_url}
          </AppText>
        </View>
      ) : null}
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
        scrollY={scrollY}
        viewportHeight={viewportHeight}
        contentSectionY={contentSectionY}
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
type UploadState = "idle" | "picked" | "uploading" | "done" | "error";

type PickedFile = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function ImageUploadBlock({
  assessment,
  onPicked,
  onClear,
  pickedFile,
  submittedImageUrl,
}: {
  assessment: HackathonPhaseActivityAssessment;
  onPicked: (file: PickedFile) => void;
  onClear: () => void;
  pickedFile: PickedFile | null;
  submittedImageUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    onPicked({
      uri: asset.uri,
      fileName: asset.uri.split("/").pop() ?? "photo.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  }

  // Already submitted — show the submitted image with option to replace
  if (submittedImageUrl && !pickedFile) {
    return (
      <View style={styles.uploadBlock}>
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri: submittedImageUrl }} style={styles.imagePreview} resizeMode="cover" />
          <View style={styles.uploadBadge}>
            <AppText style={styles.uploadBadgeText}>✓</AppText>
          </View>
          <Pressable style={styles.changeBtn} onPress={pick}>
            <AppText style={styles.changeBtnText}>เปลี่ยนรูปภาพ</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.uploadBlock}>
      {pickedFile ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri: pickedFile.uri }} style={styles.imagePreview} resizeMode="cover" />
          <Pressable style={styles.changeBtn} onPress={onClear}>
            <AppText style={styles.changeBtnText}>เปลี่ยนรูปภาพ</AppText>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📷</AppText>
          <AppText style={styles.uploadEmptyLabel}>แตะเพื่อเพิ่มรูปภาพ</AppText>
        </Pressable>
      )}
      {error ? (
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
  onPicked,
  onClear,
  pickedFile,
  submittedFileUrl,
}: {
  assessment: HackathonPhaseActivityAssessment;
  onPicked: (file: PickedFile) => void;
  onClear: () => void;
  pickedFile: PickedFile | null;
  submittedFileUrl: string | null;
}) {
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
    setError(null);
    onPicked({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
    });
  }

  // Already submitted — show the submitted file
  if (submittedFileUrl && !pickedFile) {
    return (
      <View style={styles.uploadBlock}>
        <View style={styles.fileRow}>
          <AppText style={styles.fileIcon}>📄</AppText>
          <AppText style={styles.fileName} numberOfLines={1}>{submittedFileUrl.split("/").pop()}</AppText>
          <AppText style={styles.fileDone}>✓</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.uploadBlock}>
      {pickedFile ? (
        <View style={styles.fileRow}>
          <AppText style={styles.fileIcon}>📄</AppText>
          <AppText style={styles.fileName} numberOfLines={1}>{pickedFile.fileName}</AppText>
          <Pressable onPress={onClear}>
            <AppText style={styles.changeBtnText}>เปลี่ยนไฟล์</AppText>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📎</AppText>
          <AppText style={styles.uploadEmptyLabel}>แตะเพื่อแนบไฟล์</AppText>
        </Pressable>
      )}
      {error ? (
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
  value,
  onChange,
  pickedFile,
  onPicked,
  onClear,
  submittedImageUrl,
  submittedFileUrl,
}: {
  assessment: HackathonPhaseActivityAssessment;
  value: string;
  onChange: (v: string) => void;
  pickedFile: PickedFile | null;
  onPicked: (file: PickedFile) => void;
  onClear: () => void;
  submittedImageUrl: string | null;
  submittedFileUrl: string | null;
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
          onPicked={onPicked}
          onClear={onClear}
          pickedFile={pickedFile}
          submittedImageUrl={submittedImageUrl}
        />
      ) : (
        <FileUploadBlock
          assessment={assessment}
          onPicked={onPicked}
          onClear={onClear}
          pickedFile={pickedFile}
          submittedFileUrl={submittedFileUrl}
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
  const cachedBundle = nodeId ? getCachedHackathonActivityBundle(nodeId) : null;

  const [siblings, setSiblings] = useState<{id: string, title: string}[]>(
    cachedBundle?.siblings ?? [],
  );
  const [blockedMessage, setBlockedMessage] = useState<string | null>(
    cachedBundle?.blockedMessage ?? null,
  );

  const SWIPE_NEXT_THRESHOLD = 120;
  const PULL_HINT_SLIDE_PX = 104;

  const lastPrevNavAtRef = useRef(0);
  const [swipePrevEnabled, setSwipePrevEnabled] = useState(false);
  const [swipeNextEnabled, setSwipeNextEnabled] = useState(false);
  const swipePrevEnabledSV = useSharedValue(0);
  const swipeNextEnabledSV = useSharedValue(0);
  const isSubmittedSV = useSharedValue(0);
  const isAllSubmittedSV = useSharedValue(0); // true when ALL assessments are submitted
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
  const [activity, setActivity] = useState<HackathonPhaseActivityDetail | null>(
    cachedBundle?.activity ?? null,
  );
  const [participant, setParticipant] = useState<HackathonParticipant | null>(
    cachedBundle?.participant ?? null,
  );
  const [pastSubmissions, setPastSubmissions] = useState<SubmissionRecord[]>(
    cachedBundle?.pastSubmissions ?? [],
  );
  const [teammateSubmissions, setTeammateSubmissions] = useState<TeammateSubmissionRecord[]>(
    cachedBundle?.teammateSubmissions ?? [],
  );
  const [loading, setLoading] = useState(!cachedBundle);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pickedFiles, setPickedFiles] = useState<Record<string, PickedFile | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contentSectionY, setContentSectionY] = useState(0);

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    const anySubmitted = pastSubmissions.length > 0;
    isSubmittedSV.value = anySubmitted ? 1 : 0;

    // Check if ALL assessments have been submitted (for multi-assessment activities)
    const allSubmitted = activity?.assessments.every((a) =>
      pastSubmissions.some((s) => (s as any).assessment_id === a.id)
    ) ?? false;
    isAllSubmittedSV.value = allSubmitted ? 1 : 0;
  }, [pastSubmissions, activity]);

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
      if (isAllSubmittedSV.value === 1) {
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
    const isSubmitted = allAssessmentsSubmitted;
    console.log(`[SwipeNext] activity="${activity?.title}" index=${currentIndex} submissions=${pastSubmissions.length} isSubmitted=${isSubmitted}`);

    if (!isSubmitted) {
      console.log(`[SwipeNext] BLOCKED — current activity not submitted yet`);
      return;
    }

    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      const nextId = siblings[currentIndex + 1].id;
      void preloadHackathonActivityBundle(nextId);
      router.replace(getHackathonActivityHref(nextId));
    } else if (currentIndex === siblings.length - 1) {
      // Navigate to phase activities list instead of generic back
      if (activity?.phase_id) {
        router.replace(`/(hackathon)/phase/${activity.phase_id}`);
      } else {
        router.back();
      }
    }
  };

  const handleSwipeToPrevious = () => {
    const now = Date.now();
    if (now - lastPrevNavAtRef.current < 450) return;
    lastPrevNavAtRef.current = now;

    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex > 0) {
      const previousId = siblings[currentIndex - 1].id;
      void preloadHackathonActivityBundle(previousId);
      router.replace(getHackathonActivityHref(previousId));
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const cached = nodeId ? getCachedHackathonActivityBundle(nodeId) : null;
      if (cached) {
        setActivity(cached.activity);
        setParticipant(cached.participant);
        setPastSubmissions(cached.pastSubmissions);
        setTeammateSubmissions(cached.teammateSubmissions);
        setSiblings(cached.siblings);
        setBlockedMessage(cached.blockedMessage);
        setLoading(false);
      } else {
        setLoading(true);
      }

      (async () => {
        try {
          // The shared bundle still covers fetchTeammateActivitySubmissions(nodeId!).
          const [bundle] = await Promise.all([
            loadHackathonActivityBundle(nodeId!),
          ]);
          if (!cancelled) {
            setActivity(bundle.activity);
            setParticipant(bundle.participant);
            setPastSubmissions(bundle.pastSubmissions);
            setTeammateSubmissions(bundle.teammateSubmissions);
            setBlockedMessage(bundle.blockedMessage);
            setSiblings(bundle.siblings);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [nodeId])
  );

  useEffect(() => {
    const currentAccessibleIndex = siblings.findIndex(
      (sibling) => sibling.id === nodeId,
    );
    const prevEnabled = currentAccessibleIndex > 0;
    const nextEnabled = currentAccessibleIndex >= 0;
    setSwipePrevEnabled(prevEnabled);
    setSwipeNextEnabled(nextEnabled);
    swipePrevEnabledSV.value = prevEnabled ? 1 : 0;
    swipeNextEnabledSV.value = nextEnabled ? 1 : 0;

    if (currentAccessibleIndex > 0) {
      void preloadHackathonActivityBundle(siblings[currentAccessibleIndex - 1]!.id);
    }
    if (
      currentAccessibleIndex >= 0 &&
      currentAccessibleIndex < siblings.length - 1
    ) {
      void preloadHackathonActivityBundle(siblings[currentAccessibleIndex + 1]!.id);
    }
  }, [nodeId, siblings, swipeNextEnabledSV, swipePrevEnabledSV]);

  const canSubmit = activity
    ? activity.assessments.length === 0
      ? true
      : activity.assessments.every((a) =>
          a.assessment_type === "text_answer"
            ? (answers[a.id] ?? "").trim().length > 0
            : pickedFiles[a.id] != null
        )
    : false;
  // Check if all assessments have been submitted (not just any submission)
  const allAssessmentsSubmitted = activity?.assessments.every((a) =>
    pastSubmissions.some((s) => (s as any).assessment_id === a.id)
  ) ?? false;
  const hasAnySubmission = pastSubmissions.length > 0;
  const showTeammateSubmissions = hasAnySubmission;

  async function handleSubmit() {
    if (!activity) return;
    if (activity.assessments.length === 0) { router.back(); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Submit sequentially: text first, then files. If file upload fails,
      // we roll back the text submission to avoid orphan rows.
      const createdSubmissionIds: string[] = [];

      for (const a of activity.assessments) {
        if (a.assessment_type === "text_answer") {
          const result = await submitTextAnswer(activity.id, a.id, answers[a.id] ?? "");
          createdSubmissionIds.push(result.submissionId);
        } else {
          const file = pickedFiles[a.id];
          if (file) {
            await submitFile(activity.id, a.id, file.uri, file.fileName, file.mimeType);
          }
        }
      }

      const newSubmissions = await fetchActivitySubmissions(activity.id);
      setPastSubmissions(newSubmissions);
      setAnswers({});
      setPickedFiles({});
      invalidateHackathonProgressCache();

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("[submit] error:", e?.message, e?.stack ?? e);
      // Rollback: delete any text submissions created before the file upload failed
      if (createdSubmissionIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from("hackathon_phase_activity_submissions")
          .delete()
          .in("id", createdSubmissionIds);
        if (deleteErr) {
          console.warn("[submit] rollback failed", deleteErr.message);
        }
      }
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

  if (blockedMessage) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={[styles.bodyText, { color: WHITE55, textAlign: "center", paddingHorizontal: Space.xl }]}>
          {blockedMessage}
        </AppText>
        <Pressable
          style={styles.uploadEmptyBtn}
          onPress={() => {
            // Navigate back to the phase activities list instead of generic back
            if (activity?.phase_id) {
              router.replace(`/(hackathon)/phase/${activity.phase_id}`);
            } else {
              router.back();
            }
          }}
        >
          <AppText style={styles.uploadEmptyLabel}>Go back</AppText>
        </Pressable>
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
            // Navigate back to the phase activities list instead of generic back
            if (activity?.phase_id) {
              router.replace(`/(hackathon)/phase/${activity.phase_id}`);
            } else {
              router.back();
            }
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
        {swipePrevEnabled ? (
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
          allAssessmentsSubmitted ? nextPullOverlayStyle : undefined,
        ]}
      >
        {allAssessmentsSubmitted ? (
          swipeNextEnabled ? (
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
        removeClippedSubviews
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const scrollY_val = contentOffset.y;
          if (swipePrevEnabled && scrollY_val < -SWIPE_NEXT_THRESHOLD * 0.6) {
            handleSwipeToPrevious();
          }
          const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height);
          const overscrollY = scrollY_val - maxScrollY;
          if (swipeNextEnabled && overscrollY > SWIPE_NEXT_THRESHOLD * 0.6) {
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

        {/* Assessments + Submit button */}
        {activity.assessments.length > 0 && (
          <>
            {activity.assessments.map((a) => {
              // Find latest submission for this assessment to show preview
              const latestSub = pastSubmissions.find(
                (s) => (s as any).assessment_id === a.id
              );
              const submittedImageUrl =
                a.assessment_type === "image_upload" ? (latestSub?.image_url ?? null) : null;
              const submittedFileUrl =
                a.assessment_type === "file_upload" ? (latestSub?.file_urls?.[0] ?? null) : null;

              return (
                <AssessmentBlock
                  key={a.id}
                  assessment={a}
                  value={answers[a.id] ?? ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [a.id]: v }))}
                  pickedFile={pickedFiles[a.id] ?? null}
                  onPicked={(file) => setPickedFiles((prev) => ({ ...prev, [a.id]: file }))}
                  onClear={() => setPickedFiles((prev) => ({ ...prev, [a.id]: null }))}
                  submittedImageUrl={submittedImageUrl}
                  submittedFileUrl={submittedFileUrl}
                />
              );
            })}

            {/* Submit error */}
            {submitError ? (
              <AppText style={{ color: "#F87171", fontSize: 13, textAlign: "center" }}>
                {submitError}
              </AppText>
            ) : null}

            {/* Submit button — always shown to allow resubmission */}
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
                        {submitted ? "ส่งแล้ว ✓" : "ส่งคำตอบ →"}
                      </AppText>
                    )}
                  </>
                )}
              </Pressable>
            </Animated.View>
          </>
        )}

        {/* Global submit error (visible regardless of assessment type) */}
        {submitError && activity.assessments.length === 0 ? (
          <AppText style={{ color: "#F87171", fontSize: 13, textAlign: "center", paddingHorizontal: 16, marginBottom: 8 }}>
            {submitError}
          </AppText>
        ) : null}

        {/* No-assessment "mark complete" button */}
        {activity.assessments.length === 0 ? (
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              style={styles.button41}
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
                      pressed ? { backgroundColor: "rgba(255, 255, 255, 0.05)" } : null,
                    ]}
                  />
                  {submitting ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <AppText variant="bold" style={styles.button41Text}>
                      ทำเครื่องหมายว่าเสร็จสิ้น →
                    </AppText>
                  )}
                </>
              )}
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Past Submissions */}
        <PastSubmissionsList submissions={pastSubmissions} />

        {/* Teammate Submissions */}
        {showTeammateSubmissions ? (
          <TeammateSubmissionsList submissions={teammateSubmissions} />
        ) : null}

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

        {/* Static Swipe Hint — only show when ALL assessments submitted */}
        {siblings.length > 0 && allAssessmentsSubmitted && (
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

  fullWidthVideo: {
    width: "100%",
    marginHorizontal: -Space.lg,
    marginBottom: Space.xl,
  },
  videoTitleOverlay: {
    fontSize: 14,
    color: WHITE,
    marginBottom: 8,
    marginHorizontal: Space.lg,
  },
  videoContainer: {
    position: "relative",
    width: "100%",
    backgroundColor: "#000",
  },
  videoLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
