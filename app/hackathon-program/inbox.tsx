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

// ── Design tokens (consistent with journey, my-submissions, home) ──
const BG = "#03050a";
const CYAN = "#91C4E3";
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
const BORDER_DARK = "rgba(74,107,130,0.35)";
const BORDER_MUTED = "rgba(90,122,148,0.4)";
const CARD_GRAD_START = "rgba(13,18,25,0.9)";
const CARD_GRAD_END = "rgba(18,28,41,0.8)";

type FilterTab = "all" | "unread" | "reviews" | "announcements";

function hapticLight() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticMedium() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// ── Type config ──
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

function groupLabel(type: InboxItemType): string {
  switch (type) {
    case "assessment_review": return "Assessment Reviews";
    case "mentor_comment": return "Mentor Comments";
    case "admin_announcement": return "Announcements";
    case "system": return "System";
    default: return "Other";
  }
}

// ── Unread pulse indicator (from journey ActivePulse) ──
function UnreadPulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 1400 }), withTiming(0.7, { duration: 1400 })),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color },
          animatedStyle,
        ]}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

// ── Stat pill (from my-submissions) ──
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

// ── Score badge ──
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

// ── Inbox card (glass card per item) ──
function InboxItemCard({
  item,
  index,
  onPress,
  onRevisePress,
}: {
  item: InboxItemWithUnread;
  index: number;
  onPress: (item: InboxItemWithUnread) => void;
  onRevisePress?: (activityId: string) => void;
}) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
  const meta = item.metadata as Record<string, unknown> | undefined;
  const scoreAwarded = typeof meta?.score_awarded === "number" ? meta.score_awarded : null;
  const pointsPossible = typeof meta?.points_possible === "number" ? meta.points_possible : null;
  const showScore = item.type === "assessment_review" && scoreAwarded != null && pointsPossible != null;
  const activityId = typeof meta?.activity_id === "string" && meta.activity_id ? meta.activity_id : null;
  const submissionStatus = typeof meta?.submission_status === "string" ? meta.submission_status : null;
  const showRevise = submissionStatus === "revision_required" && activityId;
  const feedbackBody = typeof meta?.reviewer_name === "string" ? `Reviewed by ${meta.reviewer_name}` : null;
  const enterDelay = Math.min(300 + index * 60, 800);

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).springify()} style={styles.cardWrap}>
      <Pressable
        onPress={() => { hapticLight(); onPress(item); }}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.body}`}
      >
        <LinearGradient
          colors={[CARD_GRAD_START, CARD_GRAD_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Top row: icon + title + unread */}
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { borderColor: `${config.color}33` }]}>
              <Ionicons name={config.icon} size={22} color={config.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="bold" style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </AppText>
              <View style={styles.metaRow}>
                <View style={[styles.typePill, { backgroundColor: `${config.color}18` }]}>
                  <AppText style={[styles.typePillText, { color: config.color }]}>{config.label}</AppText>
                </View>
                <AppText style={styles.dateLine}>{formatRelativeTime(item.created_at)}</AppText>
                {item.isUnread && <UnreadPulse color={CYAN} />}
              </View>
            </View>
            {showScore && <ScoreBadge awarded={scoreAwarded!} possible={pointsPossible!} />}
          </View>

          {/* Body */}
          <AppText style={styles.cardBody} numberOfLines={3}>{item.body}</AppText>

          {/* Feedback snippet for reviews (colored left border like my-submissions) */}
          {feedbackBody && (
            <View style={[styles.feedbackWrap, { borderLeftColor: config.color }]}>
              <View style={styles.feedbackHeader}>
                <Ionicons name={config.icon} size={14} color={config.color} />
                <AppText style={[styles.feedbackType, { color: config.color }]}>{config.label}</AppText>
              </View>
              <AppText style={styles.feedbackBody}>{feedbackBody}</AppText>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {showRevise ? (
              <Pressable
                style={({ pressed }) => [styles.revisionCta, pressed && { opacity: 0.85 }]}
                onPress={() => { hapticMedium(); onRevisePress?.(activityId!); }}
              >
                <Ionicons name="refresh" size={16} color={WHITE} style={{ marginRight: 6 }} />
                <AppText variant="bold" style={styles.revisionCtaText}>Revise & resubmit</AppText>
              </Pressable>
            ) : item.action_url ? (
              <View style={styles.openHint}>
                <AppText style={styles.openHintText}>Tap to view</AppText>
                <Ionicons name="chevron-forward" size={16} color={CYAN} />
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ──
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getUnreadInboxCount();
      setUnreadCount(count);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    let reviews = 0, announcements = 0;
    for (const i of items) {
      if (i.type === "assessment_review" || i.type === "mentor_comment") reviews++;
      if (i.type === "admin_announcement" || i.type === "system") announcements++;
    }
    return { total: items.length, unread: unreadCount, reviews, announcements };
  }, [items, unreadCount]);

  // ── Filtered + grouped ──
  const filteredGrouped = useMemo(() => {
    const filtered = items.filter((i) => matchesFilter(i, filter));
    // Sort: unread first, then by date
    filtered.sort((a, b) => {
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return filtered;
  }, [items, filter]);

  const handlePress = async (item: InboxItemWithUnread) => {
    if (item.isUnread) {
      try {
        await markInboxItemRead(item.id);
        setItems((prev) =>
          prev.map((i) => i.id === item.id ? { ...i, isUnread: false, read_at: new Date().toISOString() } : i),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    if (item.action_url) router.push(item.action_url);
  };

  const handleRevisePress = (activityId: string) => {
    router.push({
      pathname: "/(hackathon)/activity/[nodeId]",
      params: { nodeId: activityId, isRevision: "true" },
    });
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
      <LinearGradient
        colors={["rgba(3,5,10,0.15)", "rgba(3,5,10,0.88)", BG]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* ── Header ── */}
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
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadItems(); }}
              tintColor={CYAN}
              colors={[CYAN]}
            />
          }
        >
          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatPill value={stats.total} label="Total" color={WHITE} gradColors={["rgba(145,196,227,0.18)", "rgba(101,171,252,0.06)"]} delay={100} />
            <StatPill value={stats.unread} label="Unread" color={CYAN} gradColors={["rgba(145,196,227,0.22)", "rgba(145,196,227,0.05)"]} delay={160} />
            <StatPill value={stats.reviews} label="Reviews" color={GREEN} gradColors={["rgba(52,211,153,0.2)", "rgba(52,211,153,0.05)"]} delay={220} />
          </View>

          {/* ── Filter chips ── */}
          <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.chipsRow}>
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

          {/* ── Cards ── */}
          {filteredGrouped.length > 0 ? (
            filteredGrouped.map((item, index) => {
              const prev = index > 0 ? filteredGrouped[index - 1] : null;
              const showSection = !prev || prev.type !== item.type;
              const enterDelay = Math.min(340 + index * 50, 800);
              return (
                <Fragment key={item.id}>
                  {showSection && (
                    <Animated.View entering={FadeInRight.delay(enterDelay - 40).springify()}>
                      <AppText style={styles.sectionLabel}>{groupLabel(item.type)}</AppText>
                    </Animated.View>
                  )}
                  <InboxItemCard
                    item={item}
                    index={index}
                    onPress={handlePress}
                    onRevisePress={handleRevisePress}
                  />
                </Fragment>
              );
            })
          ) : (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyCard}>
              <Ionicons name="mail-open-outline" size={48} color={WHITE40} />
              <AppText variant="bold" style={styles.emptyTitle}>
                {filter === "unread" ? "All caught up!" : "No messages yet"}
              </AppText>
              <AppText style={styles.emptyBody}>
                {filter === "unread"
                  ? "You've read everything. Nice work!"
                  : "When mentors review your work or admins post updates, they'll appear here."}
              </AppText>
              {filter !== "all" ? (
                <Pressable style={styles.primaryBtn} onPress={() => { hapticLight(); setFilter("all"); }}>
                  <AppText variant="bold" style={styles.primaryBtnText}>Show all messages</AppText>
                </Pressable>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={() => { hapticMedium(); router.push("/(hackathon)/(tabs)/journey"); }}>
                  <AppText variant="bold" style={styles.primaryBtnText}>Go to Journey</AppText>
                  <Ionicons name="arrow-forward" size={18} color="#0a0f14" />
                </Pressable>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: BG },
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, gap: Space.md },
  loadingLabel: { color: WHITE55, fontSize: 14, fontFamily: "BaiJamjuree_500Medium" },

  /* Header */
  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: Space.sm },
  headerTitle: { fontSize: 22, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(145,196,227,0.5)", textAlign: "center", fontFamily: "BaiJamjuree_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  headerSpacer: { width: 38 },
  markAllBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: WHITE06, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: WHITE12 },

  scrollContent: { paddingHorizontal: Space.lg, gap: Space.md, paddingTop: Space.sm },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 10, marginBottom: Space.xs },
  statCard: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: BORDER_DARK, alignItems: "center", gap: 4 },
  statVal: { fontSize: 24, fontFamily: "BaiJamjuree_700Bold" },
  statLab: { fontSize: 10, color: WHITE55, textTransform: "uppercase", letterSpacing: 1, fontFamily: "BaiJamjuree_600SemiBold", textAlign: "center" },

  /* Filter chips */
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Space.sm },
  chip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: WHITE06, borderWidth: 1, borderColor: BORDER_DARK },
  chipOn: { backgroundColor: CYAN_SOFT, borderColor: BORDER_MUTED },
  chipText: { fontSize: 13, color: WHITE40, fontFamily: "BaiJamjuree_600SemiBold" },
  chipTextOn: { color: CYAN },

  /* Section label */
  sectionLabel: { marginTop: Space.sm, marginBottom: 4, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(145,196,227,0.5)", fontFamily: "BaiJamjuree_700Bold" },

  /* Card */
  cardWrap: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER_DARK, backgroundColor: "rgba(13,18,25,0.6)" },
  card: { padding: Space.lg, gap: 10 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconCircle: { width: 44, height: 44, borderRadius: 13, backgroundColor: WHITE06, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cardTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold", lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  typePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typePillText: { fontSize: 11, letterSpacing: 0.4, fontFamily: "BaiJamjuree_700Bold", textTransform: "uppercase" },
  dateLine: { fontSize: 12, color: WHITE40, fontFamily: "BaiJamjuree_400Regular" },
  cardBody: { fontSize: 14, color: WHITE70, lineHeight: 21, fontFamily: "BaiJamjuree_400Regular" },

  /* Score badge */
  scoreBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 13, fontFamily: "BaiJamjuree_700Bold" },

  /* Feedback snippet */
  feedbackWrap: { borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 10, paddingHorizontal: 12, gap: 4, borderLeftWidth: 3 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedbackType: { fontSize: 12, fontFamily: "BaiJamjuree_700Bold" },
  feedbackBody: { fontSize: 13, color: WHITE70, lineHeight: 19, fontFamily: "BaiJamjuree_400Regular" },

  /* Actions */
  actions: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  revisionCta: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 99, backgroundColor: "#9D81AC", shadowColor: "#9D81AC", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  revisionCtaText: { fontSize: 14, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  openHint: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  openHintText: { fontSize: 12, color: CYAN, fontFamily: "BaiJamjuree_600SemiBold" },

  /* Empty state */
  emptyCard: { alignItems: "center", backgroundColor: CARD_GRAD_START, borderRadius: 22, padding: Space.xl, gap: Space.md, borderWidth: 1, borderColor: BORDER_DARK },
  emptyTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold", textAlign: "center" },
  emptyBody: { fontSize: 14, color: WHITE55, lineHeight: 22, fontFamily: "BaiJamjuree_400Regular", textAlign: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CYAN, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, marginTop: Space.xs },
  primaryBtnText: { color: "#0a0f14", fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },
});
