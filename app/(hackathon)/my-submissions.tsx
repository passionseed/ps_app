import {
  useCallback,
  useMemo,
  useState,
  Fragment,
  type ComponentProps,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/AppText";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";
import { HackathonBackground } from "../../components/Hackathon/HackathonBackground";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { Space } from "../../lib/theme";
import { formatSubmissionStatusLabel } from "../../lib/hackathonRelease";
import {
  fetchParticipantSubmissionsDashboard,
  type ParticipantSubmissionDashboardRow,
  type LatestFeedback,
} from "../../lib/hackathonParticipantSubmissions";

const BG = "#03050a";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const PURPLE = "#9D81AC";
const CYAN_SOFT = "rgba(145,196,227,0.12)";
const CYAN_20 = "rgba(145,196,227,0.20)";
const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE40 = "rgba(255,255,255,0.4)";
const WHITE12 = "rgba(255,255,255,0.12)";
const WHITE06 = "rgba(255,255,255,0.06)";
const AMBER = "#FBBF24";
const GREEN = "#34D399";
const ROSE = "#FB7185";
const VIOLET = "#A78BFA";
// Design system border tokens
const BORDER_DARK = "rgba(74,107,130,0.35)";
const BORDER_MUTED = "rgba(90,122,148,0.4)";
// Glass card surface
const CARD_GRAD_START = "rgba(13,18,25,0.9)";
const CARD_GRAD_END = "rgba(18,28,41,0.8)";

type FilterTab = "all" | "attention" | "active" | "done";

function hapticLight() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticMedium() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function statusKey(status: string | null): string {
  return (status ?? "").toLowerCase();
}

function rowAccent(status: string | null): string {
  const k = statusKey(status);
  if (k === "revision_required" || k === "draft") return AMBER;
  if (k === "passed" || k === "graded" || k === "completed") return GREEN;
  if (k === "submitted") return CYAN;
  return WHITE40;
}

function statusIcon(status: string | null): ComponentProps<typeof Ionicons>["name"] {
  const k = statusKey(status);
  if (k === "revision_required") return "alert-circle";
  if (k === "draft") return "document-text-outline";
  if (k === "submitted") return "send";
  if (k === "passed" || k === "graded" || k === "completed") return "checkmark-circle";
  return "ellipse-outline";
}

function wantsRevision(status: string | null): boolean {
  return statusKey(status) === "revision_required";
}

function matchesFilter(row: ParticipantSubmissionDashboardRow, f: FilterTab): boolean {
  const k = statusKey(row.status);
  if (f === "all") return true;
  if (f === "attention") return k === "revision_required" || k === "draft";
  if (f === "active") return k === "submitted" || k === "draft";
  if (f === "done") return k === "passed" || k === "graded" || k === "completed";
  return true;
}

function phaseLabel(row: ParticipantSubmissionDashboardRow): string {
  if (row.phaseNumber != null && row.phaseTitle) return `Phase ${row.phaseNumber} · ${row.phaseTitle}`;
  if (row.phaseTitle) return row.phaseTitle;
  return "Program";
}

function getRelativeTime(dateStr: string | Date) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function feedbackIcon(type: LatestFeedback["type"]): ComponentProps<typeof Ionicons>["name"] {
  return type === "assessment_review" ? "ribbon" : "chatbubble-ellipses";
}
function feedbackColor(type: LatestFeedback["type"]): string {
  return type === "assessment_review" ? GREEN : VIOLET;
}

/* ── Animated stat pill ─────────────────────────────────────────── */
function StatPill({
  value,
  label,
  color,
  gradColors,
  delay,
}: {
  value: number;
  label: string;
  color: string;
  gradColors: [string, string];
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
        <AppText style={[styles.statVal, { color }]}>{value}</AppText>
        <AppText style={styles.statLab}>{label}</AppText>
      </LinearGradient>
    </Animated.View>
  );
}

/* ── Score badge (shown when feedback has a score) ──────────────── */
function ScoreBadge({ awarded, possible }: { awarded: number; possible: number }) {
  const pct = possible > 0 ? awarded / possible : 0;
  const color = pct >= 0.8 ? GREEN : pct >= 0.5 ? AMBER : ROSE;
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <AppText style={[styles.scoreBadgeText, { color }]}>
        {awarded}/{possible}
      </AppText>
    </View>
  );
}

/* ── Feedback snippet inside a card ─────────────────────────────── */
function FeedbackSnippet({ feedback }: { feedback: LatestFeedback }) {
  const accent = feedbackColor(feedback.type);
  return (
    <View style={[styles.feedbackWrap, { borderLeftColor: accent }]}>
      <View style={styles.feedbackHeader}>
        <Ionicons name={feedbackIcon(feedback.type)} size={14} color={accent} />
        <AppText style={[styles.feedbackType, { color: accent }]}>
          {feedback.type === "assessment_review" ? "Assessment" : "Mentor"}
        </AppText>
        {feedback.scoreAwarded != null && feedback.pointsPossible != null && (
          <ScoreBadge awarded={feedback.scoreAwarded} possible={feedback.pointsPossible} />
        )}
        <AppText style={styles.feedbackTime}>{getRelativeTime(feedback.createdAt)}</AppText>
      </View>
      <AppText style={styles.feedbackBody}>
        {feedback.body}
      </AppText>
    </View>
  );
}

/* ── Main screen ────────────────────────────────────────────────── */
export default function MySubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ParticipantSubmissionDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setError(null); }
    try { setRows(await fetchParticipantSubmissionsDashboard()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Could not load submissions"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(false); }, [load]));

  const stats = useMemo(() => {
    let attention = 0, done = 0, submitted = 0, feedbackCount = 0;
    for (const r of rows) {
      const k = statusKey(r.status);
      if (k === "revision_required" || k === "draft") attention++;
      if (k === "passed" || k === "graded" || k === "completed") done++;
      if (k === "submitted") submitted++;
      if (r.latestFeedback) feedbackCount++;
    }
    return { total: rows.length, attention, done, submitted, feedbackCount };
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const f = rows.filter((r) => matchesFilter(r, filter));
    if (filter === "all") {
      f.sort((a, b) => {
        const ar = wantsRevision(a.status) ? 0 : 1;
        const br = wantsRevision(b.status) ? 0 : 1;
        if (ar !== br) return ar - br;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
    } else {
      f.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }
    return f;
  }, [rows, filter]);

  const goActivity = (activityId: string) => { hapticLight(); router.push({ pathname: "/(hackathon)/activity/[nodeId]", params: { nodeId: activityId } }); };
  const goActivityRevise = (activityId: string) => { hapticMedium(); router.push({ pathname: "/(hackathon)/activity/[nodeId]", params: { nodeId: activityId, isRevision: 'true' } }); };
  const goComments = (activityId: string) => { hapticLight(); router.push(`/hackathon-program/activity/${activityId}/comments` as const); };

  const filters: { key: FilterTab; label: string; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
    { key: "all", label: "All", icon: "grid-outline" },
    { key: "attention", label: "Attention", icon: "alert-circle-outline" },
    { key: "active", label: "In review", icon: "time-outline" },
    { key: "done", label: "Graded", icon: "checkmark-done-outline" },
  ];

  return (
    <View style={styles.shell}>
      <HackathonBackground />
      <LinearGradient colors={["rgba(3,5,10,0.15)", "rgba(3,5,10,0.88)", BG]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <SkiaBackButton variant="dark" onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <AppText variant="bold" style={styles.headerTitle}>My work</AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <AppText style={styles.headerSubtitle}>Submissions · status · feedback</AppText>
            </Animated.View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <PathLabSkiaLoader size="large" />
            <AppText style={styles.loadingLabel}>Loading your submissions…</AppText>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color={ROSE} />
            <AppText style={styles.errorText}>{error}</AppText>
            <Pressable style={styles.retryBtn} onPress={() => void load(false)}>
              <AppText variant="bold" style={styles.retryBtnText}>Retry</AppText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={CYAN} colors={[CYAN]} />}
          >
            {/* ── Stats row ───────────────────────────────────── */}
            <View style={styles.statsRow}>
              <StatPill value={stats.total} label="Total" color={WHITE} gradColors={["rgba(145,196,227,0.18)", "rgba(101,171,252,0.06)"]} delay={100} />
              <StatPill value={stats.attention} label="Needs work" color={AMBER} gradColors={["rgba(251,191,36,0.2)", "rgba(251,191,36,0.05)"]} delay={160} />
              <StatPill value={stats.done} label="Graded" color={GREEN} gradColors={["rgba(52,211,153,0.2)", "rgba(52,211,153,0.05)"]} delay={220} />
            </View>

            {/* ── Inbox hero ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <Pressable style={({ pressed }) => [styles.inboxHero, pressed && { opacity: 0.92 }]} onPress={() => { hapticMedium(); router.push("/hackathon-program/inbox"); }}>
                <LinearGradient colors={["rgba(145,196,227,0.22)", "rgba(101,171,252,0.06)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={styles.inboxHeroInner}>
                  <View style={styles.inboxIconWrap}>
                    <Ionicons name="mail-open-outline" size={24} color={CYAN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bold" style={styles.inboxHeroTitle}>Inbox — feedback & scores</AppText>
                    <AppText style={styles.inboxHeroSub}>Mentor comments, assessment grades, and team updates.</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={CYAN} />
                </View>
              </Pressable>
            </Animated.View>

            {/* ── Filter chips ────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.chipsRow}>
              {filters.map(({ key, label, icon }) => {
                const on = filter === key;
                return (
                  <Pressable key={key} onPress={() => { hapticLight(); setFilter(key); }} style={[styles.chip, on && styles.chipOn]}>
                    <Ionicons name={icon} size={14} color={on ? CYAN : WHITE40} style={{ marginRight: 4 }} />
                    <AppText style={[styles.chipText, on && styles.chipTextOn]}>{label}</AppText>
                  </Pressable>
                );
              })}
            </Animated.View>

            {/* ── Cards ───────────────────────────────────────── */}
            {filteredSorted.length === 0 ? (
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={44} color={WHITE40} />
                <AppText variant="bold" style={styles.emptyTitle}>
                  {rows.length === 0 ? "Nothing submitted yet" : "Nothing in this filter"}
                </AppText>
                <AppText style={styles.emptyBody}>
                  {rows.length === 0 ? "Finish tasks in Journey — each submission will appear here with its status." : "Try another filter, or pull down to refresh."}
                </AppText>
                {rows.length === 0 && (
                  <Pressable style={styles.primaryBtn} onPress={() => { hapticMedium(); router.push("/(hackathon)/journey"); }}>
                    <AppText variant="bold" style={styles.primaryBtnText}>Go to Journey</AppText>
                    <Ionicons name="arrow-forward" size={18} color="#0a0f14" />
                  </Pressable>
                )}
              </Animated.View>
            ) : (
              filteredSorted.map((row, index) => {
                const prev = index > 0 ? filteredSorted[index - 1] : null;
                const showPhase = !prev || prev.phaseId !== row.phaseId || prev.phaseTitle !== row.phaseTitle;
                const accent = rowAccent(row.status);
                const enterDelay = Math.min(400 + index * 60, 800);
                return (
                  <Fragment key={row.id}>
                    {showPhase && (
                      <Animated.View entering={FadeInRight.delay(enterDelay - 40).springify()}>
                        <AppText style={styles.sectionLabel}>{phaseLabel(row)}</AppText>
                      </Animated.View>
                    )}
                    <Animated.View entering={FadeInDown.delay(enterDelay).springify()} style={styles.cardWrap}>
                      <LinearGradient
                        colors={[CARD_GRAD_START, CARD_GRAD_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                      >
                        {/* Top row: icon + title + status */}
                        <View style={styles.cardTop}>
                          <View style={[styles.iconCircle, { borderColor: `${accent}33` }]}>
                            <Ionicons name={statusIcon(row.status)} size={22} color={accent} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText variant="bold" style={styles.activityTitle} numberOfLines={2}>{row.activityTitle}</AppText>
                            <View style={styles.metaRow}>
                              <View style={[styles.statusPill, { backgroundColor: `${accent}18` }]}>
                                <AppText style={[styles.statusPillText, { color: accent }]}>{formatSubmissionStatusLabel(row.status)}</AppText>
                              </View>
                              <AppText style={styles.dateLine}>{getRelativeTime(row.submittedAt)}</AppText>
                            </View>
                          </View>
                        </View>

                        {/* Preview text or attachment */}
                        {row.textPreview ? (
                          <AppText style={styles.preview} numberOfLines={3}>{row.textPreview}</AppText>
                        ) : row.hasAttachment ? (
                          <View style={styles.attachRow}>
                            <Ionicons name="attach-outline" size={16} color={CYAN} />
                            <AppText style={styles.previewMuted}>Attachment submitted</AppText>
                          </View>
                        ) : null}

                        {/* ── Feedback snippet ──────────────── */}
                        {row.latestFeedback && <FeedbackSnippet feedback={row.latestFeedback} />}

                        {/* Actions */}
                        <View style={styles.actions}>
                          <Pressable style={({ pressed }) => [wantsRevision(row.status) ? styles.revisionCta : styles.primaryOutline, pressed && { opacity: 0.85 }]} onPress={() => wantsRevision(row.status) ? goActivityRevise(row.activityId) : goActivity(row.activityId)}>
                            <AppText variant="bold" style={wantsRevision(row.status) ? styles.revisionCtaText : styles.primaryOutlineText}>
                              {wantsRevision(row.status) ? "Revise & resubmit" : "Open activity"}
                            </AppText>
                          </Pressable>
                          <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]} onPress={() => goComments(row.activityId)}>
                            <Ionicons name="chatbubbles-outline" size={16} color={CYAN} />
                            {row.commentCount > 0 && <AppText style={styles.commentBadge}>{row.commentCount}</AppText>}
                          </Pressable>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  </Fragment>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: BG },
  root: { flex: 1 },

  /* Header */
  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: Space.sm },
  headerTitle: { fontSize: 22, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(145,196,227,0.5)", textAlign: "center", fontFamily: "BaiJamjuree_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  headerSpacer: { width: 38 },

  /* Loading / Error */
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Space.xl, gap: Space.md },
  loadingLabel: { color: WHITE55, fontSize: 14, fontFamily: "BaiJamjuree_500Medium" },
  errorText: { color: "#FCA5A5", textAlign: "center", fontSize: 15, fontFamily: "BaiJamjuree_400Regular" },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: CYAN_20 },
  retryBtnText: { color: CYAN, fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },

  scrollContent: { paddingHorizontal: Space.lg, gap: Space.md, paddingTop: Space.sm },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 10, marginBottom: Space.xs },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: BORDER_DARK, alignItems: "center", gap: 4 },
  statVal: { fontSize: 24, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  statLab: { fontSize: 10, color: WHITE55, textTransform: "uppercase", letterSpacing: 1, fontFamily: "BaiJamjuree_600SemiBold", textAlign: "center" },

  /* Inbox hero */
  inboxHero: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER_DARK, marginBottom: Space.xs },
  inboxHeroInner: { flexDirection: "row", alignItems: "center", gap: 12, padding: Space.lg },
  inboxIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(3,5,10,0.4)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(145,196,227,0.18)" },
  inboxHeroTitle: { fontSize: 15, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  inboxHeroSub: { marginTop: 3, fontSize: 12, color: WHITE55, lineHeight: 18, fontFamily: "BaiJamjuree_400Regular" },

  /* Filter chips */
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Space.sm },
  chip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: WHITE06, borderWidth: 1, borderColor: BORDER_DARK },
  chipOn: { backgroundColor: CYAN_SOFT, borderColor: BORDER_MUTED },
  chipText: { fontSize: 13, color: WHITE40, fontFamily: "BaiJamjuree_600SemiBold" },
  chipTextOn: { color: CYAN },

  /* Section label */
  sectionLabel: { marginTop: Space.sm, marginBottom: 4, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(145,196,227,0.5)", fontFamily: "BaiJamjuree_700Bold" },

  /* Empty state */
  emptyCard: { alignItems: "center", backgroundColor: CARD_GRAD_START, borderRadius: 22, padding: Space.xl, gap: Space.md, borderWidth: 1, borderColor: BORDER_DARK },
  emptyTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold", textAlign: "center" },
  emptyBody: { fontSize: 14, color: WHITE55, lineHeight: 22, fontFamily: "BaiJamjuree_400Regular", textAlign: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CYAN, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, marginTop: Space.xs },
  primaryBtnText: { color: "#0a0f14", fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },

  /* Card */
  cardWrap: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER_DARK, backgroundColor: "rgba(13,18,25,0.6)" },
  card: { flex: 1, padding: Space.lg, gap: 10 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconCircle: { width: 44, height: 44, borderRadius: 13, backgroundColor: WHITE06, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  activityTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold", lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 11, letterSpacing: 0.4, fontFamily: "BaiJamjuree_700Bold", textTransform: "uppercase" },
  dateLine: { fontSize: 12, color: WHITE40, fontFamily: "BaiJamjuree_400Regular" },
  preview: { fontSize: 14, color: WHITE70, lineHeight: 21, fontFamily: "BaiJamjuree_400Regular" },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewMuted: { fontSize: 13, color: WHITE40, fontStyle: "italic", fontFamily: "BaiJamjuree_400Regular" },

  /* Feedback snippet */
  feedbackWrap: { borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedbackType: { fontSize: 12, fontFamily: "BaiJamjuree_700Bold" },
  feedbackTime: { fontSize: 11, color: WHITE40, fontFamily: "BaiJamjuree_400Regular", marginLeft: "auto" },
  feedbackBody: { fontSize: 13, color: WHITE70, lineHeight: 19, fontFamily: "BaiJamjuree_400Regular" },

  /* Score badge */
  scoreBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  scoreBadgeText: { fontSize: 11, fontFamily: "BaiJamjuree_700Bold" },

  /* Actions */
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  primaryOutline: { flexGrow: 1, minWidth: 140, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: CYAN_SOFT, borderWidth: 1, borderColor: "rgba(145,196,227,0.30)", alignItems: "center" },
  primaryOutlineText: { fontSize: 14, color: CYAN, fontFamily: "BaiJamjuree_700Bold" },
  revisionCta: { flexGrow: 1, minWidth: 140, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 99, backgroundColor: PURPLE, alignItems: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  revisionCtaText: { fontSize: 14, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  ghostBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: WHITE12 },
  ghostBtnText: { fontSize: 14, color: CYAN, fontFamily: "BaiJamjuree_600SemiBold" },
  commentBadge: { fontSize: 12, color: CYAN, fontFamily: "BaiJamjuree_700Bold", minWidth: 16, textAlign: "center" },
});
