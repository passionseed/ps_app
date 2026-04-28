import { useCallback, useState, useEffect, useMemo, Fragment, type ComponentProps } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/AppText";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { HackathonBackground } from "../../components/Hackathon/HackathonBackground";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";
import { Space } from "../../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { InboxItemWithUnread, InboxItemType } from "../../types/hackathon-inbox";
import {
  getInboxItems,
  markInboxItemRead,
  markAllInboxItemsRead,
  getUnreadInboxCount,
} from "../../lib/hackathonInbox";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN_SOFT = "rgba(145,196,227,0.12)";
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
const BORDER_DARK = "rgba(74,107,130,0.35)";
const BORDER_MUTED = "rgba(90,122,148,0.4)";

type FilterTab = "all" | "unread" | "reviews" | "announcements";

function hapticLight() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticMedium() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

const TYPE_CONFIG: Record<InboxItemType, { label: string; icon: ComponentProps<typeof Ionicons>["name"]; color: string }> = {
  assessment_review: { label: "Review", icon: "ribbon", color: GREEN },
  mentor_comment: { label: "Mentor", icon: "chatbubble-ellipses", color: VIOLET },
  admin_announcement: { label: "Announcement", icon: "megaphone", color: AMBER },
  system: { label: "System", icon: "notifications", color: CYAN },
};

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function matchesFilter(item: InboxItemWithUnread, f: FilterTab): boolean {
  if (f === "all") return true;
  if (f === "unread") return item.isUnread;
  if (f === "reviews") return item.type === "assessment_review" || item.type === "mentor_comment";
  if (f === "announcements") return item.type === "admin_announcement" || item.type === "system";
  return true;
}

/* ── UnreadPulse ──────────────────────────────────────────────── */
function UnreadPulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true);
    opacity.value = withRepeat(withSequence(withTiming(0, { duration: 1400 }), withTiming(0.7, { duration: 1400 })), -1, true);
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color }, animatedStyle]} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

/* ── ScoreBadge ──────────────────────────────────────────────── */
function ScoreBadge({ awarded, possible }: { awarded: number; possible: number }) {
  const pct = possible > 0 ? awarded / possible : 0;
  const color = pct >= 0.8 ? GREEN : pct >= 0.5 ? AMBER : ROSE;
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <AppText style={[styles.scoreBadgeText, { color }]}>{awarded}/{possible}</AppText>
    </View>
  );
}

/* ── InboxRow: compact notification row ──────────────────────── */
function InboxRow({ item, onPress }: { item: InboxItemWithUnread; onPress: (item: InboxItemWithUnread) => void }) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
  const meta = item.metadata as Record<string, unknown> | undefined;
  const scoreAwarded = typeof meta?.score_awarded === "number" ? meta.score_awarded : null;
  const pointsPossible = typeof meta?.points_possible === "number" ? meta.points_possible : null;
  const showScore = item.type === "assessment_review" && scoreAwarded != null && pointsPossible != null;
  const submissionStatus = typeof meta?.submission_status === "string" ? meta.submission_status : null;
  const needsRevision = submissionStatus === "revision_required";

  return (
    <Pressable onPress={() => { hapticLight(); onPress(item); }} style={({ pressed }) => [styles.inboxRow, pressed && { opacity: 0.85 }]}>
      <View style={[styles.rowIcon, { borderColor: `${config.color}33` }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="bold" style={styles.rowTitle} numberOfLines={1}>{item.title}</AppText>
          {item.isUnread && <UnreadPulse color={CYAN} />}
        </View>
        <AppText style={styles.rowBody} numberOfLines={2}>{item.body}</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <View style={[styles.typePill, { backgroundColor: `${config.color}18` }]}>
            <AppText style={[styles.typePillText, { color: config.color }]}>{config.label}</AppText>
          </View>
          <AppText style={styles.rowTime}>{formatRelativeTime(item.created_at)}</AppText>
          {showScore && <ScoreBadge awarded={scoreAwarded!} possible={pointsPossible!} />}
        </View>
      </View>
      {needsRevision ? (
        <View style={styles.revisionTag}>
          <AppText style={styles.revisionTagText}>Revise</AppText>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={WHITE40} />
      )}
    </Pressable>
  );
}

/* ── Main screen ────────────────────────────────────────────────── */
export default function InboxScreen() {
  const [items, setItems] = useState<InboxItemWithUnread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterTab>("all");
  const insets = useSafeAreaInsets();

  const loadItems = useCallback(async () => {
    try {
      const response = await getInboxItems({ limit: 50 });
      setItems(response.items);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error("Failed to load inbox:", error);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    const interval = setInterval(async () => { setUnreadCount(await getUnreadInboxCount()); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const f = items.filter((i) => matchesFilter(i, filter));
    f.sort((a, b) => {
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return f;
  }, [items, filter]);

  const handlePress = async (item: InboxItemWithUnread) => {
    if (item.isUnread) {
      try {
        await markInboxItemRead(item.id);
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isUnread: false, read_at: new Date().toISOString() } : i));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    const meta = item.metadata as Record<string, unknown> | undefined;
    const activityId = typeof meta?.activity_id === "string" ? meta.activity_id : null;
    const needsRevision = typeof meta?.submission_status === "string" && meta.submission_status === "revision_required";
    // Reviews & comments → go to my-submissions (the hub for revision)
    if (activityId && (item.type === "assessment_review" || item.type === "mentor_comment")) {
      router.push("/(hackathon)/my-submissions");
      return;
    }
    if (item.action_url) router.push(item.action_url);
  };

  const handleMarkAllRead = async () => {
    hapticMedium();
    try {
      await markAllInboxItemsRead();
      setItems((prev) => prev.map((i) => ({ ...i, isUnread: false, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  const filters: { key: FilterTab; label: string; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
    { key: "all", label: "All", icon: "grid-outline" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: "mail-unread-outline" },
    { key: "reviews", label: "Reviews", icon: "ribbon-outline" },
    { key: "announcements", label: "News", icon: "megaphone-outline" },
  ];

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <PathLabSkiaLoader size="large" />
        <AppText style={styles.loadingLabel}>Loading inbox…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <HackathonBackground />
      <LinearGradient colors={["rgba(3,5,10,0.15)", "rgba(3,5,10,0.88)", BG]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkiaBackButton variant="dark" onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <AppText variant="bold" style={styles.headerTitle}>Inbox</AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <AppText style={styles.headerSubtitle}>Feedback · scores · updates</AppText>
            </Animated.View>
          </View>
          {unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Ionicons name="checkmark-done" size={18} color={CYAN} />
            </Pressable>
          ) : <View style={styles.headerSpacer} />}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} tintColor={CYAN} colors={[CYAN]} />}
        >
          {/* My Submissions shortcut */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Pressable
              style={({ pressed }) => [styles.submissionsLink, pressed && { opacity: 0.85 }]}
              onPress={() => { hapticMedium(); router.push("/(hackathon)/my-submissions"); }}
            >
              <Ionicons name="documents-outline" size={20} color={CYAN} />
              <View style={{ flex: 1 }}>
                <AppText variant="bold" style={styles.submissionsLinkTitle}>My Submissions</AppText>
                <AppText style={styles.submissionsLinkSub}>Review, revise & resubmit your work</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={CYAN} />
            </Pressable>
          </Animated.View>

          {/* Filter chips */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.chipsRow}>
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

          {/* Notification rows */}
          {filtered.length > 0 ? (
            filtered.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(260 + index * 40, 600)).springify()}>
                <InboxRow item={item} onPress={handlePress} />
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyCard}>
              <Ionicons name="mail-open-outline" size={48} color={WHITE40} />
              <AppText variant="bold" style={styles.emptyTitle}>
                {filter === "unread" ? "All caught up!" : "No messages yet"}
              </AppText>
              <AppText style={styles.emptyBody}>
                {filter === "unread" ? "You've read everything. Nice work!" : "When mentors review your work, they'll appear here."}
              </AppText>
              {filter !== "all" && (
                <Pressable style={styles.primaryBtn} onPress={() => { hapticLight(); setFilter("all"); }}>
                  <AppText variant="bold" style={styles.primaryBtnText}>Show all</AppText>
                </Pressable>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: BG },
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, gap: Space.md },
  loadingLabel: { color: WHITE55, fontSize: 14, fontFamily: "BaiJamjuree_500Medium" },

  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: Space.sm },
  headerTitle: { fontSize: 22, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(145,196,227,0.5)", textAlign: "center", fontFamily: "BaiJamjuree_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  headerSpacer: { width: 38 },
  markAllBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: WHITE06, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: WHITE12 },

  scrollContent: { paddingHorizontal: Space.lg, gap: Space.sm, paddingTop: Space.sm },

  /* My Submissions shortcut */
  submissionsLink: { flexDirection: "row", alignItems: "center", gap: 12, padding: Space.md, borderRadius: 16, borderWidth: 1, borderColor: BORDER_DARK, backgroundColor: "rgba(145,196,227,0.06)", marginBottom: Space.xs },
  submissionsLinkTitle: { fontSize: 15, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  submissionsLinkSub: { fontSize: 12, color: WHITE55, fontFamily: "BaiJamjuree_400Regular", marginTop: 2 },

  /* Filter chips */
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Space.sm },
  chip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: WHITE06, borderWidth: 1, borderColor: BORDER_DARK },
  chipOn: { backgroundColor: CYAN_SOFT, borderColor: BORDER_MUTED },
  chipText: { fontSize: 13, color: WHITE40, fontFamily: "BaiJamjuree_600SemiBold" },
  chipTextOn: { color: CYAN },

  /* Inbox row */
  inboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: BORDER_DARK, backgroundColor: "rgba(13,18,25,0.7)" },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: WHITE06, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  rowTitle: { fontSize: 14, color: WHITE, fontFamily: "BaiJamjuree_700Bold", flex: 1 },
  rowBody: { fontSize: 13, color: WHITE70, lineHeight: 18, fontFamily: "BaiJamjuree_400Regular" },
  rowTime: { fontSize: 11, color: WHITE40, fontFamily: "BaiJamjuree_400Regular" },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, letterSpacing: 0.4, fontFamily: "BaiJamjuree_700Bold", textTransform: "uppercase" },
  revisionTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(157,129,172,0.2)" },
  revisionTagText: { fontSize: 11, color: "#9D81AC", fontFamily: "BaiJamjuree_700Bold" },

  /* Score badge */
  scoreBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  scoreBadgeText: { fontSize: 11, fontFamily: "BaiJamjuree_700Bold" },

  /* Empty state */
  emptyCard: { alignItems: "center", backgroundColor: "rgba(13,18,25,0.9)", borderRadius: 22, padding: Space.xl, gap: Space.md, borderWidth: 1, borderColor: BORDER_DARK },
  emptyTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold", textAlign: "center" },
  emptyBody: { fontSize: 14, color: WHITE55, lineHeight: 22, fontFamily: "BaiJamjuree_400Regular", textAlign: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CYAN, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, marginTop: Space.xs },
  primaryBtnText: { color: "#0a0f14", fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },
});
