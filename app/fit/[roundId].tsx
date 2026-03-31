// app/fit/[roundId].tsx
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useAuth } from "../../lib/auth";
import { getFitScores } from "../../lib/portfolioFit";
import type { FitScoreResult, FitGap } from "../../types/portfolio";

const CONFIDENCE_LABELS = {
  high: { label: "วิเคราะห์จากพอร์ตโฟลิโอ", color: "#BFFF00" },
  medium: { label: "วิเคราะห์จากความสนใจ", color: "#FCD34D" },
  low: { label: "เกณฑ์เบื้องต้น", color: "#9CA3AF" },
};

export default function FitDetailScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<FitScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !roundId) return;
    getFitScores(user.id, [roundId])
      .then((res) => setResult(res[0] ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, roundId]);

  const scoreColor = !result
    ? "#9CA3AF"
    : result.fit_score >= 75
      ? "#BFFF00"
      : result.fit_score >= 50
        ? "#FCD34D"
        : "#F87171";

  // Days until portfolio deadline
  const dayDiff =
    result?.folio_closed_date
      ? Math.ceil(
          (new Date(result.folio_closed_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹ กลับ</Text>
        </Pressable>

        {loading ? (
          <PathLabSkiaLoader size="large" />
        ) : result ? (
          <>
            <Text style={s.heroProgram}>{result.program_name}</Text>
            <Text style={s.heroFaculty}>{result.faculty_name}</Text>
            <Text style={s.heroUni}>{result.university_name}</Text>

            {/* Score display */}
            <View style={s.scoreRow}>
              <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[s.scoreValue, { color: scoreColor }]}>
                  {result.eligibility_pass ? result.fit_score : "✕"}
                </Text>
                <Text style={s.scoreLabel}>
                  {result.eligibility_pass ? "ความเหมาะสม" : "GPAX ไม่ผ่าน"}
                </Text>
              </View>
              <View style={s.scoreMeta}>
                {result.receive_seats ? (
                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>
                      {result.receive_seats} ที่นั่ง
                    </Text>
                  </View>
                ) : null}
                {result.min_gpax && result.min_gpax > 0 ? (
                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>
                      GPAX ≥ {result.min_gpax.toFixed(2)}
                    </Text>
                  </View>
                ) : null}
                {dayDiff !== null && dayDiff > 0 ? (
                  <View style={[s.metaPill, s.deadlinePill]}>
                    <Text style={[s.metaPillText, s.deadlineText]}>
                      ⏰ ปิดพอร์ตโฟลิโอใน {dayDiff} วัน
                    </Text>
                  </View>
                ) : null}
                <View style={s.confidenceBadge}>
                  <Text style={s.confidenceText}>
                    {CONFIDENCE_LABELS[result.confidence]?.label ??
                      result.confidence}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={s.heroProgram}>ไม่พบข้อมูล</Text>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body}>
        {result?.narrative ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.accent} />
              <Text style={s.sectionTitle}>วิเคราะห์ความเหมาะสม</Text>
            </View>
            <View style={s.narrativeCard}>
              <Text style={s.narrativeText}>{result.narrative}</Text>
              <Text style={s.aiDisclaimer}>
                * ข้อมูลนี้วิเคราะห์โดย AI — ไม่ใช่การรับประกันการรับเข้า
              </Text>
            </View>
          </View>
        ) : result && !result.eligibility_pass ? (
          <View style={s.section}>
            <View style={s.ineligibleCard}>
              <Text style={s.ineligibleTitle}>ไม่ผ่านเกณฑ์ GPAX</Text>
              <Text style={s.ineligibleBody}>
                โปรแกรมนี้ต้องการ GPAX ≥{" "}
                {result.min_gpax?.toFixed(2)} — คุณสามารถดูโปรแกรมอื่นๆ
                ที่เหมาะกับ GPAX ของคุณได้
              </Text>
            </View>
          </View>
        ) : null}

        {/* Gaps */}
        {result?.gaps && result.gaps.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.accent} />
              <Text style={s.sectionTitle}>สิ่งที่ควรเพิ่มเติม</Text>
            </View>
            <View style={s.gapsList}>
              {result.gaps.map((gap: FitGap, i: number) => (
                <View key={i} style={s.gapCard}>
                  <Text style={s.gapTitle}>⚡ {gap.gap}</Text>
                  <Text style={s.gapSuggestion}>{gap.suggestion}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Add portfolio CTA if score is low confidence */}
        {result?.confidence === "low" ? (
          <View style={s.section}>
            <Pressable
              style={({ pressed }) => [s.portfolioCta, pressed && s.pressed]}
              onPress={() => router.push("/portfolio/index")}
            >
              <Text style={s.portfolioCtaTitle}>เพิ่มพอร์ตโฟลิโอ</Text>
              <Text style={s.portfolioCtaSubtitle}>
                เพิ่มโปรเจกต์และผลงานเพื่อรับการวิเคราะห์ที่แม่นยำขึ้น →
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Link to program */}
        {result?.link ? (
          <View style={s.section}>
            <Pressable
              style={({ pressed }) => [s.linkBtn, pressed && s.pressed]}
              onPress={() => Linking.openURL(result.link!)}
            >
              <Text style={s.linkBtnText}>ดูรายละเอียดการรับสมัคร →</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  hero: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroProgram: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 28,
  },
  heroFaculty: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  heroUni: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
  },
  scoreRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scoreValue: { fontSize: 26, fontWeight: "800" },
  scoreLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    marginTop: 1,
  },
  scoreMeta: { flex: 1, gap: 6, flexWrap: "wrap", flexDirection: "row" },
  metaPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaPillText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  deadlinePill: { backgroundColor: "rgba(251,191,36,0.25)" },
  deadlineText: { color: "#FCD34D" },
  confidenceBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confidenceText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  body: { padding: 20, gap: 4 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  accent: {
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
  narrativeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
    gap: 10,
  },
  narrativeText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  aiDisclaimer: { fontSize: 11, color: "#9CA3AF" },
  ineligibleCard: {
    backgroundColor: "rgba(248,113,113,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  ineligibleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 6,
  },
  ineligibleBody: { fontSize: 13, color: "#6B7280", lineHeight: 20 },
  gapsList: { gap: 10 },
  gapCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    gap: 6,
  },
  gapTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  gapSuggestion: { fontSize: 13, color: "#374151", lineHeight: 19 },
  portfolioCta: {
    backgroundColor: "rgba(191,255,0,0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(191,255,0,0.3)",
    gap: 4,
  },
  portfolioCtaTitle: { fontSize: 15, fontWeight: "700", color: "#4D7C0F" },
  portfolioCtaSubtitle: { fontSize: 13, color: "#6B7280" },
  linkBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    alignItems: "center",
  },
  linkBtnText: { fontSize: 14, fontWeight: "700", color: "#8B5CF6" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
