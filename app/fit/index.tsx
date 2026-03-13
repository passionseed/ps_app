// app/fit/index.tsx
import { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { getFitScores, getDiscoveredPrograms } from "../../lib/portfolioFit";
import type { FitScoreResult } from "../../types/portfolio";

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const color =
    score >= 75 ? "#BFFF00" : score >= 50 ? "#FCD34D" : "#F87171";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.04)",
      }}
    >
      <Text style={{ fontSize: size * 0.3, fontWeight: "800", color }}>
        {score}
      </Text>
    </View>
  );
}

function ProgramCard({
  item,
  onPress,
}: {
  item: FitScoreResult;
  onPress: () => void;
}) {
  const dayDiff = item.folio_closed_date
    ? Math.ceil(
        (new Date(item.folio_closed_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={onPress}
    >
      <View style={s.cardLeft}>
        {item.eligibility_pass ? (
          <ScoreRing score={item.fit_score} />
        ) : (
          <View style={s.ineligibleRing}>
            <Text style={s.ineligibleText}>✕</Text>
          </View>
        )}
      </View>
      <View style={s.cardRight}>
        <Text style={s.cardProgram} numberOfLines={2}>
          {item.program_name}
        </Text>
        <Text style={s.cardFaculty} numberOfLines={1}>
          {item.faculty_name}
        </Text>
        <Text style={s.cardUni} numberOfLines={1}>
          {item.university_name}
        </Text>
        <View style={s.cardMeta}>
          {item.receive_seats ? (
            <View style={s.metaPill}>
              <Text style={s.metaPillText}>{item.receive_seats} ที่นั่ง</Text>
            </View>
          ) : null}
          {dayDiff !== null && dayDiff > 0 ? (
            <View style={[s.metaPill, s.deadlinePill]}>
              <Text style={[s.metaPillText, s.deadlineText]}>
                ปิด {dayDiff} วัน
              </Text>
            </View>
          ) : null}
          {!item.eligibility_pass ? (
            <View style={[s.metaPill, s.ineligiblePill]}>
              <Text style={[s.metaPillText, s.ineligiblePillText]}>
                GPAX ไม่ผ่าน
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function FitBrowserScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<FitScoreResult[]>([]);
  const [discovered, setDiscovered] = useState<FitScoreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "eligible">("eligible");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all TCAS1 round IDs for this student's eligible programs
      const { data: rounds } = await supabase
        .from("tcas_admission_rounds")
        .select("id")
        .eq("round_number", 1)
        .limit(50);

      const roundIds = (rounds ?? []).map((r: { id: string }) => r.id);
      if (roundIds.length > 0) {
        const scores = await getFitScores(user.id, roundIds);
        const sorted = [...scores].sort((a, b) => {
          // Eligible first, then by score desc
          if (a.eligibility_pass !== b.eligibility_pass)
            return a.eligibility_pass ? -1 : 1;
          return b.fit_score - a.fit_score;
        });
        setResults(sorted);
      }

      // Load hidden gems
      const gems = await getDiscoveredPrograms(user.id, 5);
      setDiscovered(gems);
    } catch (e) {
      console.error("Fit browser load failed:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === "eligible"
      ? results.filter((r) => r.eligibility_pass)
      : results;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>ความเหมาะสมของโปรแกรม</Text>
        <Text style={s.heroSubtitle}>รอบ 1 Portfolio</Text>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {(["eligible", "all"] as const).map((f) => (
          <Pressable
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === "eligible" ? "ผ่านเกณฑ์" : "ทั้งหมด"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#8B5CF6" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.round_id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} />
          }
          ListHeaderComponent={
            discovered.length > 0 ? (
              <View style={s.gemsSection}>
                <View style={s.sectionHeader}>
                  <View style={s.accent} />
                  <Text style={s.sectionTitle}>HIDDEN GEMS สำหรับคุณ</Text>
                </View>
                <Text style={s.gemsSubtitle}>
                  โปรแกรมที่เหมาะกับคุณที่คุณอาจยังไม่เคยเห็น
                </Text>
                {discovered.map((d) => (
                  <ProgramCard
                    key={d.round_id}
                    item={d}
                    onPress={() =>
                      router.push({
                        pathname: "/fit/[roundId]",
                        params: { roundId: d.round_id },
                      })
                    }
                  />
                ))}
                <View style={s.divider} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                {filter === "eligible"
                  ? "ไม่พบโปรแกรมที่ผ่านเกณฑ์ GPAX"
                  : "ยังไม่มีข้อมูลคะแนน"}
              </Text>
              <Text style={s.emptySubtitle}>
                {filter === "eligible"
                  ? "ลองดูแท็บ 'ทั้งหมด' หรืออัปเดต GPAX ของคุณ"
                  : "เพิ่มผลงานพอร์ตโฟลิโอเพื่อรับคะแนน"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProgramCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/fit/[roundId]",
                  params: { roundId: item.round_id },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  hero: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  back: { marginBottom: 12 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#8B5CF6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#8B5CF6" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  cardLeft: { alignItems: "center", justifyContent: "center" },
  cardRight: { flex: 1, gap: 3 },
  cardProgram: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    lineHeight: 20,
  },
  cardFaculty: { fontSize: 12, color: "#6B7280" },
  cardUni: { fontSize: 12, color: "#9CA3AF" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  metaPill: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaPillText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },
  deadlinePill: { backgroundColor: "rgba(251,191,36,0.15)" },
  deadlineText: { color: "#92400E" },
  ineligibleRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#F87171",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  ineligibleText: { fontSize: 18, color: "#F87171", fontWeight: "800" },
  ineligiblePill: { backgroundColor: "rgba(248,113,113,0.1)" },
  ineligiblePillText: { color: "#DC2626" },
  gemsSection: { gap: 10, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  accent: {
    width: 3,
    height: 14,
    backgroundColor: "#BFFF00",
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.2,
  },
  gemsSubtitle: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
