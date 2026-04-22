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
} from "../../lib/hackathonParticipantSubmissions";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN_SOFT = "rgba(145,196,227,0.12)";
const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE40 = "rgba(255,255,255,0.4)";
const AMBER = "#FBBF24";
const GREEN = "#34D399";
const ROSE = "#FB7185";

type FilterTab = "all" | "attention" | "active" | "done";

function hapticLight() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function hapticMedium() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
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
  if (row.phaseNumber != null && row.phaseTitle) {
    return `Phase ${row.phaseNumber} · ${row.phaseTitle}`;
  }
  if (row.phaseTitle) return row.phaseTitle;
  return "Program";
}

function getRelativeTime(dateStr: string | Date) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function MySubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ParticipantSubmissionDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchParticipantSubmissionsDashboard();
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load submissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const stats = useMemo(() => {
    let attention = 0;
    let done = 0;
    let submitted = 0;
    for (const r of rows) {
      const k = statusKey(r.status);
      if (k === "revision_required" || k === "draft") attention++;
      if (k === "passed" || k === "graded" || k === "completed") done++;
      if (k === "submitted") submitted++;
    }
    return { total: rows.length, attention, done, submitted };
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

  const goActivity = (activityId: string) => {
    hapticLight();
    router.push({
      pathname: "/(hackathon)/activity/[nodeId]",
      params: { nodeId: activityId },
    });
  };

  const goComments = (activityId: string) => {
    hapticLight();
    router.push(`/hackathon-program/activity/${activityId}/comments` as const);
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "attention", label: "Needs attention" },
    { key: "active", label: "In review" },
    { key: "done", label: "Graded" },
  ];

  return (
    <View style={styles.shell}>
      <HackathonBackground />
      <LinearGradient
        colors={["rgba(3,5,10,0.2)", "rgba(3,5,10,0.92)", BG]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <SkiaBackButton variant="dark" onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            <AppText variant="bold" style={styles.headerTitle}>
              My work
            </AppText>
            <AppText style={styles.headerSubtitle}>
              Submissions, status, and shortcuts to feedback
            </AppText>
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
              <AppText variant="bold" style={styles.retryBtnText}>
                Retry
              </AppText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={CYAN}
                colors={[CYAN]}
              />
            }
          >
            <View style={styles.statsRow}>
              <LinearGradient
                colors={["rgba(145,196,227,0.18)", "rgba(101,171,252,0.06)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <AppText style={styles.statVal}>{stats.total}</AppText>
                <AppText style={styles.statLab}>Total</AppText>
              </LinearGradient>
              <LinearGradient
                colors={["rgba(251,191,36,0.2)", "rgba(251,191,36,0.05)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <AppText style={[styles.statVal, { color: AMBER }]}>{stats.attention}</AppText>
                <AppText style={styles.statLab}>Needs attention</AppText>
              </LinearGradient>
              <LinearGradient
                colors={["rgba(52,211,153,0.2)", "rgba(52,211,153,0.05)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <AppText style={[styles.statVal, { color: GREEN }]}>{stats.done}</AppText>
                <AppText style={styles.statLab}>Graded</AppText>
              </LinearGradient>
            </View>

            <Pressable
              style={({ pressed }) => [styles.inboxHero, pressed && { opacity: 0.92 }]}
              onPress={() => {
                hapticMedium();
                router.push("/hackathon-program/inbox");
              }}
            >
              <LinearGradient
                colors={["rgba(145,196,227,0.25)", "rgba(101,171,252,0.08)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.inboxHeroInner}>
                <View style={styles.inboxIconWrap}>
                  <Ionicons name="mail-open-outline" size={26} color={CYAN} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bold" style={styles.inboxHeroTitle}>
                    Inbox — feedback & scores
                  </AppText>
                  <AppText style={styles.inboxHeroSub}>
                    Mentor comments, assessment grades, and team updates land here.
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={22} color={CYAN} />
              </View>
            </Pressable>

            <View style={styles.chipsRow}>
              {filters.map(({ key, label }) => {
                const on = filter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      hapticLight();
                      setFilter(key);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <AppText style={[styles.chipText, on && styles.chipTextOn]}>{label}</AppText>
                  </Pressable>
                );
              })}
            </View>

            {filteredSorted.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={44} color={WHITE40} />
                <AppText variant="bold" style={styles.emptyTitle}>
                  {rows.length === 0 ? "Nothing submitted yet" : "Nothing in this filter"}
                </AppText>
                <AppText style={styles.emptyBody}>
                  {rows.length === 0
                    ? "Finish tasks in Journey — each submission will appear here with its status."
                    : "Try another filter, or pull down to refresh."}
                </AppText>
                {rows.length === 0 ? (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => {
                      hapticMedium();
                      router.push("/(hackathon)/journey");
                    }}
                  >
                    <AppText variant="bold" style={styles.primaryBtnText}>
                      Go to Journey
                    </AppText>
                    <Ionicons name="arrow-forward" size={18} color="#0a0f14" />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              filteredSorted.map((row, index) => {
                const prev = index > 0 ? filteredSorted[index - 1] : null;
                const showPhase =
                  !prev || prev.phaseId !== row.phaseId || prev.phaseTitle !== row.phaseTitle;
                return (
                  <Fragment key={row.id}>
                    {showPhase ? (
                      <AppText style={styles.sectionLabel}>{phaseLabel(row)}</AppText>
                    ) : null}
                    <View style={styles.cardWrap}>
                      <View style={[styles.accentBar, { backgroundColor: rowAccent(row.status) }]} />
                      <View style={styles.card}>
                        <View style={styles.cardTop}>
                          <View style={styles.iconCircle}>
                            <Ionicons
                              name={statusIcon(row.status)}
                              size={22}
                              color={rowAccent(row.status)}
                            />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText variant="bold" style={styles.activityTitle} numberOfLines={2}>
                              {row.activityTitle}
                            </AppText>
                            <View style={styles.statusPill}>
                              <AppText style={styles.statusPillText}>
                                {formatSubmissionStatusLabel(row.status)}
                              </AppText>
                            </View>
                          </View>
                        </View>
                        <AppText style={styles.dateLine}>
                          {getRelativeTime(row.submittedAt)}
                        </AppText>
                        {row.textPreview ? (
                          <AppText style={styles.preview} numberOfLines={4}>
                            {row.textPreview}
                          </AppText>
                        ) : row.hasAttachment ? (
                          <View style={styles.attachRow}>
                            <Ionicons name="attach-outline" size={16} color={CYAN} />
                            <AppText style={styles.previewMuted}>Attachment submitted</AppText>
                          </View>
                        ) : null}
                        <View style={styles.actions}>
                          <Pressable
                            style={styles.primaryOutline}
                            onPress={() => goActivity(row.activityId)}
                          >
                            <AppText variant="bold" style={styles.primaryOutlineText}>
                              {wantsRevision(row.status) ? "Revise & resubmit" : "Open activity"}
                            </AppText>
                          </Pressable>
                          <Pressable style={styles.ghostBtn} onPress={() => goComments(row.activityId)}>
                            <Ionicons name="chatbubbles-outline" size={17} color={CYAN} />
                            <AppText style={styles.ghostBtnText}>Comments</AppText>
                          </Pressable>
                        </View>
                      </View>
                    </View>
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

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: BG },
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Space.md,
    paddingBottom: Space.sm,
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: Space.sm },
  headerTitle: {
    fontSize: 20,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: WHITE55,
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
  },
  headerSpacer: { width: 38 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.xl,
    gap: Space.md,
  },
  loadingLabel: {
    color: WHITE55,
    fontSize: 14,
    fontFamily: "BaiJamjuree_500Medium",
  },
  errorText: { color: "#FCA5A5", textAlign: "center", fontSize: 15, fontFamily: "BaiJamjuree_400Regular" },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.35)",
  },
  retryBtnText: { color: CYAN, fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },
  scrollContent: {
    paddingHorizontal: Space.lg,
    gap: Space.md,
    paddingTop: Space.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Space.xs,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.15)",
    alignItems: "center",
    gap: 4,
  },
  statVal: {
    fontSize: 22,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  statLab: {
    fontSize: 10,
    color: WHITE55,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "BaiJamjuree_600SemiBold",
    textAlign: "center",
  },
  inboxHero: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.28)",
    marginBottom: Space.sm,
  },
  inboxHeroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: Space.lg,
  },
  inboxIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(3,5,10,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  inboxHeroTitle: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  inboxHeroSub: {
    marginTop: 4,
    fontSize: 13,
    color: WHITE70,
    lineHeight: 19,
    fontFamily: "BaiJamjuree_400Regular",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Space.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipOn: {
    backgroundColor: CYAN_SOFT,
    borderColor: "rgba(145,196,227,0.35)",
  },
  chipText: {
    fontSize: 13,
    color: WHITE55,
    fontFamily: "BaiJamjuree_600SemiBold",
  },
  chipTextOn: {
    color: CYAN,
  },
  sectionLabel: {
    marginTop: Space.sm,
    marginBottom: 4,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: WHITE40,
    fontFamily: "BaiJamjuree_700Bold",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: Space.xl,
    gap: Space.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  emptyTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold", textAlign: "center" },
  emptyBody: {
    fontSize: 14,
    color: WHITE55,
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CYAN,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    marginTop: Space.xs,
  },
  primaryBtnText: { color: "#0a0f14", fontSize: 15, fontFamily: "BaiJamjuree_700Bold" },
  cardWrap: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.14)",
    backgroundColor: "rgba(10,14,20,0.75)",
  },
  accentBar: { width: 5 },
  card: {
    flex: 1,
    padding: Space.lg,
    gap: 10,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activityTitle: {
    fontSize: 17,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 23,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(145,196,227,0.1)",
  },
  statusPillText: {
    fontSize: 11,
    color: CYAN,
    letterSpacing: 0.4,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
  },
  dateLine: {
    fontSize: 12,
    color: WHITE40,
    fontFamily: "BaiJamjuree_400Regular",
  },
  preview: {
    fontSize: 14,
    color: WHITE70,
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewMuted: {
    fontSize: 13,
    color: WHITE40,
    fontStyle: "italic",
    fontFamily: "BaiJamjuree_400Regular",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  primaryOutline: {
    flexGrow: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(145,196,227,0.12)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.35)",
    alignItems: "center",
  },
  primaryOutlineText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ghostBtnText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_600SemiBold",
  },
});
