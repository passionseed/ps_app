// app/build-path.tsx
// Career Path Builder — simple onboarding for anonymous users

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as TextComp } from "../components/AppText";
import { PathLabSkiaLoader } from "../components/PathLabSkiaLoader";
import { supabase } from "../lib/supabase";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../lib/theme";

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

export default function BuildPathScreen() {
  const [dreamJob, setDreamJob] = useState("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const insets = useSafeAreaInsets();

  const searchJobs = async (query: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
        )
        .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
        .order("rank", { ascending: true })
        .limit(20);

      if (error) throw error;
      setJobs((data as JobRow[]) || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const q = dreamJob.trim();
    if (!q) return;
    searchJobs(q);
  };

  const handleExploreAll = () => {
    router.push("/plans");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>What do you want to become?</Text>
          <Text style={styles.headerSub}>
            Type your dream job or interest and we will show you the path
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={dreamJob}
            onChangeText={setDreamJob}
            placeholder="e.g. Software Engineer, Doctor, Designer..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchBtnGradient}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Explore All Link */}
        <Pressable onPress={handleExploreAll} style={styles.exploreAllBtn}>
          <Text style={styles.exploreAllText}>
            Or explore all 100 careers →
          </Text>
        </Pressable>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <PathLabSkiaLoader size="large" />
          </View>
        ) : searched && jobs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptySub}>
              Try a different keyword or browse all careers
            </Text>
          </View>
        ) : (
          jobs.map((job) => (
            <Pressable
              key={job.id}
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.jobCardPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/career/[name]",
                  params: { name: encodeURIComponent(job.title) },
                })
              }
            >
              <View style={styles.jobCardLeft}>
                <Text style={styles.jobRank}>{job.rank ?? "—"}</Text>
              </View>
              <View style={styles.jobCardMid}>
                <Text style={styles.jobCardTitle}>{job.title}</Text>
                <View style={styles.jobCardRow}>
                  {job.category ? (
                    <View style={styles.jobCategoryTag}>
                      <Text style={styles.jobCategoryTagText}>
                        {job.category}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {job.growth_rate ? (
                  <Text style={styles.jobGrowthText}>{job.growth_rate}</Text>
                ) : null}
                {job.salary_range_thb ? (
                  <Text style={styles.jobSalaryText}>
                    ฿
                    {job.salary_range_thb.min_monthly?.toLocaleString() ||
                      "?"}{" "}
                    – ฿
                    {job.salary_range_thb.max_monthly?.toLocaleString() ||
                      "?"}
                    /mo
                  </Text>
                ) : null}
              </View>
              <View style={styles.jobCardRight}>
                <View
                  style={[
                    styles.riskDotOuter,
                    { borderColor: aiRiskColor(job.automation_risk) },
                  ]}
                >
                  <View
                    style={[
                      styles.riskDot,
                      { backgroundColor: aiRiskColor(job.automation_risk) },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.riskLabel,
                    { color: aiRiskColor(job.automation_risk) },
                  ]}
                >
                  {job.automation_risk != null
                    ? `AI ${Math.round(job.automation_risk * 100)}%`
                    : "—"}
                </Text>
                <Text
                  style={[
                    styles.trendText,
                    { color: trendColor(job.demand_trend) },
                  ]}
                >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    gap: Space.lg,
  },
  header: {
    gap: Space.sm,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: Space.sm,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.tertiary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  headerSub: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  searchRow: {
    flexDirection: "row",
    gap: Space.sm,
    marginTop: Space.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.primary,
    ...Shadow.neutral,
  },
  searchBtn: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  searchBtnGradient: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    fontFamily: "LibreFranklin_400Regular",
  },
  exploreAllBtn: {
    alignSelf: "flex-start",
  },
  exploreAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgb(0,22,81)",
    fontFamily: "LibreFranklin_400Regular",
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: Space.md,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  emptySub: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.md,
    ...Shadow.neutral,
  },
  jobCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  jobCardLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgb(0,22,81)",
    justifyContent: "center",
    alignItems: "center",
  },
  jobRank: {
    fontSize: 13,
    fontWeight: "700",
    color: "#BFFF00",
  },
  jobCardMid: {
    flex: 1,
    gap: 4,
  },
  jobCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  jobCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jobCategoryTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  jobCategoryTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  jobGrowthText: {
    fontSize: 11,
    color: "#10B981",
  },
  jobSalaryText: {
    fontSize: 11,
    color: ThemeText.tertiary,
  },
  jobCardRight: {
    alignItems: "center",
    gap: 3,
    width: 56,
  },
  riskDotOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  riskDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  riskLabel: {
    fontSize: 9,
    fontWeight: "700",
  },
  trendText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
