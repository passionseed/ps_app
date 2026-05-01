import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  "Technology & Engineering",
  "Healthcare & Medical",
  "Business & Finance",
  "Creative & Design",
  "Skilled Trades & Infrastructure",
  "Education & Training",
  "Legal & Compliance",
  "Science & Research",
  "Sales & Marketing",
  "Emerging & New Roles",
];

type JobRow = {
  id: string;
  rank: number | null;
  title: string;
  category: string | null;
  demand_trend: string | null;
  automation_risk: number | null;
  growth_rate: string | null;
  viability_score: number | null;
  salary_range_thb: any | null;
};

function aiRiskColor(risk: number | null): string {
  if (risk == null) return "#9CA3AF";
  if (risk <= 0.25) return "#10B981";
  if (risk <= 0.45) return "#F59E0B";
  if (risk <= 0.65) return "#F97316";
  return "#EF4444";
}

function trendIcon(trend: string | null): string {
  if (trend === "growing") return "▲";
  if (trend === "declining") return "▼";
  return "─";
}

function trendColor(trend: string | null): string {
  if (trend === "growing") return "#10B981";
  if (trend === "declining") return "#EF4444";
  return "#9CA3AF";
}

export default function JobsIndex() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: qError } = await supabase
          .from("jobs")
          .select(
            "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
          )
          .not("rank", "is", null)
          .order("rank", { ascending: true });

        if (cancelled) return;
        if (qError) throw qError;
        setJobs((data as JobRow[]) || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = activeCategory
    ? jobs.filter((j) => j.category === activeCategory)
    : jobs;

  return (
    <View style={s.root}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Hero */}
      <View style={s.hero}>
        <StatusBar style="light" />
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={s.heroTitle}>Top 100 Jobs</Text>
        <Text style={s.heroSub}>
          Browse careers ranked by market viability
        </Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
      >
        <Pressable
          style={[s.filterPill, !activeCategory && s.filterPillActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[s.filterPillText, !activeCategory && s.filterPillTextActive]}>
            All
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[s.filterPill, activeCategory === cat && s.filterPillActive]}
            onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            <Text
              style={[
                s.filterPillText,
                activeCategory === cat && s.filterPillTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={s.stateText}>Loading…</Text>
        ) : error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => router.back()} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Go back</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={s.stateText}>No jobs found for this category.</Text>
        ) : (
          filtered.map((job) => (
            <Pressable
              key={job.id}
              style={({ pressed }) => [s.card, pressed && s.pressed]}
              onPress={() =>
                router.push({
                  pathname: "/career/[name]",
                  params: { name: encodeURIComponent(job.title) },
                })
              }
            >
              <View style={s.cardLeft}>
                <Text style={s.rank}>{job.rank}</Text>
              </View>
              <View style={s.cardMid}>
                <Text style={s.cardTitle}>{job.title}</Text>
                <View style={s.cardRow}>
                  {job.category ? (
                    <View style={s.categoryTag}>
                      <Text style={s.categoryTagText}>{job.category}</Text>
                    </View>
                  ) : null}
                </View>
                {job.growth_rate ? (
                  <Text style={s.growthText}>{job.growth_rate}</Text>
                ) : null}
                {job.salary_range_thb ? (
                  <Text style={s.salaryText}>
                    ฿{job.salary_range_thb.min_monthly?.toLocaleString() || "?"} – ฿
                    {job.salary_range_thb.max_monthly?.toLocaleString() || "?"}/mo
                  </Text>
                ) : null}
              </View>
              <View style={s.cardRight}>
                <View
                  style={[
                    s.riskDotOuter,
                    { borderColor: aiRiskColor(job.automation_risk) },
                  ]}
                >
                  <View
                    style={[
                      s.riskDot,
                      { backgroundColor: aiRiskColor(job.automation_risk) },
                    ]}
                  />
                </View>
                <Text style={[s.riskLabel, { color: aiRiskColor(job.automation_risk) }]}>
                  {job.automation_risk != null
                    ? `AI ${Math.round(job.automation_risk * 100)}%`
                    : "—"}
                </Text>
                <Text style={[s.trendText, { color: trendColor(job.demand_trend) }]}>
                  {trendIcon(job.demand_trend)}{" "}
                  {job.demand_trend || "stable"}
                </Text>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },

  // Hero
  hero: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: "rgb(0,22,81)",
  },
  backBtn: { marginBottom: 16, alignSelf: "flex-start" },
  backBtnText: {
    fontSize: 14,
    fontFamily: "LibreFranklin_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "LibreFranklin_400Regular",
    color: "rgba(255,255,255,0.5)",
  },

  // Filter Scroll
  filterScroll: { paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  filterPillActive: { backgroundColor: "rgb(0,22,81)" },
  filterPillText: {
    fontSize: 12,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#4B5563",
  },
  filterPillTextActive: { color: "#BFFF00" },

  // List
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  cardLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgb(0,22,81)",
    justifyContent: "center",
    alignItems: "center",
  },
  rank: {
    fontSize: 13,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#BFFF00",
  },
  cardMid: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#111827",
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  categoryTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#4B5563",
  },
  growthText: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
    color: "#10B981",
  },
  salaryText: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
  },
  cardRight: { alignItems: "center", gap: 3, width: 56 },
  riskDotOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  riskDot: { width: 14, height: 14, borderRadius: 7 },
  riskLabel: {
    fontSize: 9,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
  },
  trendText: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
  },

  // States
  stateText: {
    fontSize: 14,
    fontFamily: "LibreFranklin_400Regular",
    color: "#999",
    textAlign: "center",
    paddingTop: 60,
  },
  errorWrap: { alignItems: "center", paddingTop: 60, gap: 16, paddingHorizontal: 32 },
  errorText: { fontSize: 14, fontFamily: "LibreFranklin_400Regular", color: "#999", textAlign: "center" },
  retryBtn: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: "LibreFranklin_400Regular", color: "#666" },
});
