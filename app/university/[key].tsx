import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchUniversityInsights,
  computeQuickMatch,
} from "../../lib/universityInsights";
import type { UniversityInsights } from "../../types/university";
import { getAllUniversities, getEligibleRounds } from "../../lib/tcas";
import type { EligibleRound } from "../../types/tcas";
import { useAuth } from "../../lib/auth";
import { getFitScores } from "../../lib/portfolioFit";
import type { FitScoreResult } from "../../types/portfolio";

export default function UniversityDetailScreen() {
  const {
    key,
    facultyName,
    careerGoal,
    passionScore,
    futureScore,
    worldScore,
  } = useLocalSearchParams<{
    key: string;
    facultyName: string;
    careerGoal: string;
    passionScore: string;
    futureScore: string;
    worldScore: string;
  }>();

  const universityName = key ?? "";
  const ps = passionScore ? Number(passionScore) : null;
  const fs = futureScore ? Number(futureScore) : null;
  const ws = worldScore ? Number(worldScore) : null;
  const quickMatch = computeQuickMatch(ps, fs, ws);

  const { user } = useAuth();
  const [insights, setInsights] = useState<UniversityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admissionRounds, setAdmissionRounds] = useState<EligibleRound[]>([]);
  const [fitScoreMap, setFitScoreMap] = useState<Map<string, FitScoreResult>>(
    new Map(),
  );
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    fetchUniversityInsights({
      universityName,
      facultyName: facultyName ?? "",
      careerGoal: careerGoal ?? "",
      passionScore: ps,
      futureScore: fs,
      worldScore: ws,
    })
      .then((data) => {
        if (!cancelled) {
          setInsights(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? "โหลดไม่สำเร็จ");
          setLoading(false);
        }
      });

    // Fetch admission rounds for this university
    getAllUniversities().then((unis) => {
      const uni = unis.find(
        (u) =>
          u.university_name === universityName ||
          u.university_name_en === universityName
      );
      if (uni) {
        getEligibleRounds(0, undefined, uni.university_id, 50)
          .then((rounds) => {
            if (!cancelled) setAdmissionRounds(rounds);
          })
          .catch(console.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [universityName, facultyName]);

  // Fetch fit scores for Round 1 admission rounds
  useEffect(() => {
    if (!user?.id || admissionRounds.length === 0) return;

    const round1Ids = admissionRounds
      .filter((r) => r.round_number === 1)
      .map((r) => r.round_id);

    if (round1Ids.length === 0) return;

    getFitScores(user.id, round1Ids)
      .then((results) => {
        const map = new Map<string, FitScoreResult>();
        for (const r of results) {
          map.set(r.round_id, r);
        }
        setFitScoreMap(map);
      })
      .catch(() => {
        // Silently fail — fit scores are additive, not critical
      });
  }, [user?.id, admissionRounds]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Hero */}
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>{universityName}</Text>
        <Text style={s.heroFaculty}>{facultyName}</Text>
        {careerGoal ? (
          <Text style={s.heroCareer}>เส้นทาง: {careerGoal}</Text>
        ) : null}

        {/* Match pills — quick match is instant, AI match appears when loaded */}
        <View style={s.matchRow}>
          <View style={s.matchPill}>
            <Text style={s.matchPillLabel}>Match เบื้องต้น</Text>
            <Text style={s.matchPillValue}>{quickMatch}%</Text>
          </View>
          {insights?.aiMatchScore != null ? (
            <View style={[s.matchPill, s.aiMatchPill]}>
              <Text style={s.matchPillLabel}>AI Match</Text>
              <Text style={s.matchPillValue}>{insights.aiMatchScore}%</Text>
            </View>
          ) : loading ? (
            <View style={s.loadingPill}>
              <ActivityIndicator size="small" color="#BFFF00" />
              <Text style={s.loadingPillText}>คำนวณ AI...</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* AI Match Explanation */}
            {insights?.matchExplanation ? (
              <Section title="วิเคราะห์ความเหมาะสม">
                <View style={s.explanationCard}>
                  <Text style={s.explanationText}>
                    {insights.matchExplanation}
                  </Text>
                </View>
              </Section>
            ) : loading ? (
              <Section title="วิเคราะห์ความเหมาะสม">
                <View style={s.skeleton} />
              </Section>
            ) : null}

            {/* Admissions */}
            <Section title="การรับเข้า">
              <View style={s.statsGrid}>
                <StatBox
                  label="อัตราการรับ"
                  value={loading ? "..." : (insights?.acceptanceRate ?? "—")}
                  icon="🎯"
                />
                <StatBox
                  label="GPAX ขั้นต่ำ"
                  value={loading ? "..." : (insights?.gpaxCutoff ?? "—")}
                  icon="📊"
                />
              </View>
            </Section>

            {/* Cost */}
            <Section title="ค่าใช้จ่าย">
              <View style={s.statsGrid}>
                <StatBox
                  label="ค่าเล่าเรียน/ปี"
                  value={
                    loading
                      ? "..."
                      : insights?.tuitionPerYear
                        ? `฿${insights.tuitionPerYear.toLocaleString()}`
                        : "—"
                  }
                  icon="💰"
                />
                <StatBox
                  label="ระยะเวลา"
                  value={loading ? "..." : (insights?.duration ?? "—")}
                  icon="📅"
                />
              </View>
              {insights?.tuitionNote ? (
                <Text style={s.tuitionNote}>{insights.tuitionNote}</Text>
              ) : null}
            </Section>

            {/* Curriculum + Ranking */}
            <Section title="หลักสูตรและอันดับ">
              {insights?.ranking ? (
                <View style={s.rankingBadge}>
                  <Text style={s.rankingText}>🏆 {insights.ranking}</Text>
                </View>
              ) : null}
              {insights?.curriculumUrl ? (
                <Pressable
                  style={({ pressed }) => [
                    s.curriculumBtn,
                    pressed && s.pressed,
                  ]}
                  onPress={() => open(insights.curriculumUrl!)}
                >
                  <Text style={s.curriculumBtnText}>ดูหลักสูตรทั้งหมด →</Text>
                </Pressable>
              ) : loading ? (
                <View style={s.skeleton} />
              ) : null}
            </Section>

            {/* Compare CTA */}
            <Section title="">
              <Pressable
                style={({ pressed }) => [s.compareBtn, pressed && s.pressed]}
                onPress={() =>
                  router.push({
                    pathname: "/university/compare",
                    params: {
                      keyA: encodeURIComponent(universityName),
                      facultyA: facultyName,
                      careerGoal,
                    },
                  })
                }
              >
                <LinearGradient
                  colors={["#BFFF00", "#A3E600"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.compareBtnGradient}
                >
                  <Text style={s.compareBtnText}>
                    เปรียบเทียบกับมหาวิทยาลัยอื่น
                  </Text>
                </LinearGradient>
              </Pressable>
            </Section>

            {/* People */}
            {loading || (insights?.people?.length ?? 0) > 0 ? (
              <Section title="บุคลากร / ศิษย์เก่า">
                {loading ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.hScroll}
                  >
                    {insights?.people.map((p, i) => (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [
                          s.personCard,
                          pressed && s.pressed,
                        ]}
                        onPress={() => open(p.url)}
                      >
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{p.initials}</Text>
                        </View>
                        <Text style={s.personName} numberOfLines={2}>
                          {p.name}
                        </Text>
                        {p.role ? (
                          <Text style={s.personRole} numberOfLines={3}>
                            {p.role}
                          </Text>
                        ) : null}
                        <Text style={s.viewLink}>ดู →</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </Section>
            ) : null}

            {/* News */}
            {loading || (insights?.news?.length ?? 0) > 0 ? (
              <Section title="ข่าวสาร">
                {loading ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <View style={s.newsList}>
                    {insights?.news.map((n, i) => (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [
                          s.newsCard,
                          pressed && s.pressed,
                        ]}
                        onPress={() => open(n.url)}
                      >
                        <Text style={s.newsTitle} numberOfLines={3}>
                          {n.title}
                        </Text>
                        {n.snippet ? (
                          <Text style={s.newsSnippet} numberOfLines={2}>
                            {n.snippet}
                          </Text>
                        ) : null}
                        <Text style={s.readLink}>อ่านต่อ →</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Section>
            ) : null}

            {/* Admission Rounds */}
            <AdmissionRoundsSection
              rounds={admissionRounds}
              onOpenLink={open}
              fitScoreMap={fitScoreMap}
            />
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const ROUND_LABELS: Record<number, string> = {
  1: "รอบ 1 — Portfolio",
  2: "รอบ 2 — Quota",
  3: "รอบ 3 — Admission",
  4: "รอบ 4 — Direct Admission",
};

function AdmissionRoundsSection({
  rounds,
  onOpenLink,
  fitScoreMap,
}: {
  rounds: EligibleRound[];
  onOpenLink: (url: string) => void;
  fitScoreMap: Map<string, FitScoreResult>;
}) {
  // Group rounds by round_number
  const grouped = rounds.reduce<Record<number, EligibleRound[]>>((acc, r) => {
    const rn = r.round_number ?? 0;
    if (!acc[rn]) acc[rn] = [];
    acc[rn].push(r);
    return acc;
  }, {});

  const roundNumbers = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Section title="รอบการรับสมัคร">
      {rounds.length === 0 ? (
        <Text style={s.noRoundsText}>ไม่พบข้อมูลรอบรับสมัคร</Text>
      ) : (
        roundNumbers.map((rn) => (
          <View key={rn} style={s.roundGroup}>
            <Text style={s.roundGroupLabel}>
              {ROUND_LABELS[rn] ?? `รอบ ${rn}`}
            </Text>
            {grouped[rn].map((r) => {
              const fitResult = fitScoreMap.get(r.round_id);
              return (
              <Pressable
                key={r.round_id}
                style={({ pressed }) => [
                  s.roundCard,
                  pressed && s.pressed,
                ]}
                onPress={() => {
                  if (r.link) onOpenLink(r.link);
                }}
              >
                <View style={s.roundCardHeader}>
                  <View style={s.roundCardHeaderText}>
                    <Text style={s.roundProgramName} numberOfLines={2}>
                      {r.program_name}
                    </Text>
                    <Text style={s.roundFaculty} numberOfLines={1}>
                      {r.faculty_name}
                    </Text>
                  </View>
                  {fitResult != null && (
                    <View
                      style={[
                        s.fitBadge,
                        {
                          backgroundColor:
                            fitResult.fit_score >= 75
                              ? "rgba(191,255,0,0.2)"
                              : fitResult.fit_score >= 50
                                ? "rgba(252,211,77,0.2)"
                                : "rgba(248,113,113,0.2)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.fitBadgeText,
                          {
                            color:
                              fitResult.fit_score >= 75
                                ? "#4D7C0F"
                                : fitResult.fit_score >= 50
                                  ? "#92400E"
                                  : "#991B1B",
                          },
                        ]}
                      >
                        {fitResult.fit_score}
                      </Text>
                    </View>
                  )}
                </View>
                {r.project_name ? (
                  <Text style={s.roundProject} numberOfLines={1}>
                    โครงการ: {r.project_name}
                  </Text>
                ) : null}
                <View style={s.roundMeta}>
                  {r.receive_seats != null ? (
                    <View style={s.roundMetaPill}>
                      <Text style={s.roundMetaText}>
                        {r.receive_seats} ที่นั่ง
                      </Text>
                    </View>
                  ) : null}
                  {r.min_gpax != null && r.min_gpax > 0 ? (
                    <View style={s.roundMetaPill}>
                      <Text style={s.roundMetaText}>
                        GPAX ≥ {r.min_gpax.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  {r.link ? (
                    <View style={[s.roundMetaPill, s.roundLinkPill]}>
                      <Text style={[s.roundMetaText, s.roundLinkText]}>
                        รายละเอียด →
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              );
            })}
          </View>
        ))
      )}
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      {title ? (
        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={s.statBox}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  hero: { paddingBottom: 24, paddingHorizontal: 24 },
  backBtn: { marginBottom: 16, alignSelf: "flex-start" },
  backBtnText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  heroFaculty: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  heroCareer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
  },
  matchRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  matchPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiMatchPill: { backgroundColor: "rgba(191,255,0,0.2)" },
  matchPillLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  matchPillValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loadingPillText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20 },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: "#8B5CF6",
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.2,
  },
  explanationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
  },
  explanationText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  skeleton: { height: 60, backgroundColor: "#e5e7eb", borderRadius: 12 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#111" },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },
  tuitionNote: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  rankingBadge: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  rankingText: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  curriculumBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    alignItems: "center",
  },
  curriculumBtnText: { fontSize: 14, fontWeight: "700", color: "#8B5CF6" },
  compareBtn: { borderRadius: 12, overflow: "hidden" },
  compareBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  compareBtnText: { fontSize: 15, fontWeight: "700", color: "#111" },
  hScroll: { gap: 12, paddingRight: 20 },
  personCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4C1D95",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: "#BFFF00" },
  personName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  personRole: { fontSize: 11, color: "#6B7280", lineHeight: 16, flexGrow: 1 },
  viewLink: { fontSize: 11, fontWeight: "600", color: "#8B5CF6" },
  newsList: { gap: 10 },
  newsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  newsTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  newsSnippet: { fontSize: 12, color: "#4B5563", lineHeight: 18 },
  readLink: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8B5CF6",
    alignSelf: "flex-end",
  },
  errorWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: "#999", textAlign: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  noRoundsText: { fontSize: 13, color: "#9CA3AF", paddingVertical: 8 },
  roundGroup: { marginBottom: 16 },
  roundGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B5CF6",
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  roundCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 14,
    marginBottom: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roundCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  roundCardHeaderText: {
    flex: 1,
    gap: 2,
  },
  fitBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  fitBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  roundProgramName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    lineHeight: 20,
  },
  roundFaculty: { fontSize: 12, color: "#6B7280" },
  roundProject: { fontSize: 12, color: "#8B5CF6" },
  roundMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  roundMetaPill: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roundMetaText: { fontSize: 11, fontWeight: "600", color: "#4B5563" },
  roundLinkPill: { backgroundColor: "rgba(191,255,0,0.18)" },
  roundLinkText: { color: "#4D7C0F" },
});
