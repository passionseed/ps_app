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

  const [insights, setInsights] = useState<UniversityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    return () => {
      cancelled = true;
    };
  }, [universityName, facultyName]);

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
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
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
  root: { flex: 1, backgroundColor: "#FDFFF5" },
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 6,
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
    color: "#111",
    lineHeight: 18,
  },
  personRole: { fontSize: 11, color: "#888", lineHeight: 16, flexGrow: 1 },
  viewLink: { fontSize: 11, fontWeight: "600", color: "#8B5CF6" },
  newsList: { gap: 10 },
  newsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 6,
  },
  newsTitle: { fontSize: 14, fontWeight: "600", color: "#111", lineHeight: 20 },
  newsSnippet: { fontSize: 12, color: "#777", lineHeight: 18 },
  readLink: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8B5CF6",
    alignSelf: "flex-end",
  },
  errorWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: "#999", textAlign: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
