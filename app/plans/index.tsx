// app/plans/index.tsx
// Plans Hub — Admission Plans + Career Explorer tabs

import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { getPlans, MAX_PLANS_PER_USER } from "../../lib/admissionPlans";
import type { AdmissionPlan } from "../../lib/admissionPlans";
import { supabase } from "../../lib/supabase";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../../lib/theme";

type Tab = "plans" | "careers";

const CAREER_CATEGORIES = [
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

export default function PlansHubScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("plans");

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const copy = isThai
    ? {
        title: "แผน & อาชีพ",
        tabPlans: "แผนสมัคร",
        tabCareers: "สำรวจอาชีพ",
      }
    : {
        title: "Plans & Careers",
        tabPlans: "Admission Plans",
        tabCareers: "Career Explorer",
      };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "plans" && styles.tabActive]}
          onPress={() => setActiveTab("plans")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "plans" && styles.tabTextActive,
            ]}
          >
            📋 {copy.tabPlans}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "careers" && styles.tabActive]}
          onPress={() => setActiveTab("careers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "careers" && styles.tabTextActive,
            ]}
          >
            💼 {copy.tabCareers}
          </Text>
        </Pressable>
      </View>

      {activeTab === "plans" ? (
        <AdmissionPlansTab isThai={isThai} />
      ) : (
        <CareerExplorerTab isThai={isThai} />
      )}
    </View>
  );
}

/* ─── Admission Plans Tab ─────────────────────────────────────────────────── */

function AdmissionPlansTab({ isThai }: { isThai: boolean }) {
  const [plans, setPlans] = useState<AdmissionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถโหลดแผนได้" : "Failed to load plans"
      );
    } finally {
      setLoading(false);
    }
  }, [isThai]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  const canCreatePlan = plans.length < MAX_PLANS_PER_USER;

  const copy = isThai
    ? {
        create: "สร้างแผนใหม่",
        empty: "ยังไม่มีแผนสมัคร",
        emptySubtext: "สร้างแผนสมัครเพื่อวางแผนการสมัคร TCAS",
        programs: "สาขา",
      }
    : {
        create: "Create Plan",
        empty: "No admission plans yet",
        emptySubtext: "Create a plan to organize your TCAS applications",
        programs: "programs",
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      {plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{copy.empty}</Text>
          <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => router.push("/plans/create")}
          >
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>{copy.create}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={plans}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlanCard
                plan={item}
                programsLabel={copy.programs}
                onPress={() => router.push(`/plans/${item.id}`)}
              />
            )}
          />
          {canCreatePlan && (
            <View style={styles.bottomButton}>
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                ]}
                onPress={() => router.push("/plans/create")}
              >
                <LinearGradient
                  colors={Gradient.primaryCta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonText}>{copy.create}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function PlanCard({
  plan,
  programsLabel,
  onPress,
}: {
  plan: AdmissionPlan;
  programsLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{plan.name}</Text>
        <Text style={styles.cardMeta}>
          {plan.rounds?.length ?? 0} {programsLabel}
        </Text>
      </View>
      <Text style={styles.cardArrow}>→</Text>
    </Pressable>
  );
}

/* ─── Career Explorer Tab ─────────────────────────────────────────────────── */

function CareerExplorerTab({ isThai }: { isThai: boolean }) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
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
    }, [])
  );

  const filtered = activeCategory
    ? jobs.filter((j) => j.category === activeCategory)
    : jobs;

  const copy = isThai
    ? {
        loading: "กำลังโหลด…",
        error: "โหลดไม่สำเร็จ",
        empty: "ไม่พบอาชีพในหมวดหมู่นี้",
        top100: "100 อาชีพยอดนิยม",
        all: "ทั้งหมด",
      }
    : {
        loading: "Loading…",
        error: "Failed to load",
        empty: "No jobs found for this category.",
        top100: "Top 100 Jobs",
        all: "All",
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <Pressable
          style={[styles.filterPill, !activeCategory && styles.filterPillActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text
            style={[
              styles.filterPillText,
              !activeCategory && styles.filterPillTextActive,
            ]}
          >
            {copy.all}
          </Text>
        </Pressable>
        {CAREER_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.filterPill,
              activeCategory === cat && styles.filterPillActive,
            ]}
            onPress={() =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
          >
            <Text
              style={[
                styles.filterPillText,
                activeCategory === cat && styles.filterPillTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Job List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{copy.error}</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{copy.empty}</Text>
          </View>
        ) : (
          filtered.map((job) => (
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
                <Text style={styles.jobRank}>{job.rank}</Text>
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
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    gap: Space.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.md,
    gap: Space.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "rgb(0,22,81)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.secondary,
  },
  tabTextActive: {
    color: "#BFFF00",
  },

  // Tab Content
  tabContainer: {
    flex: 1,
  },

  // Plans
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  createButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  createButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  createButtonGradient: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  list: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: 120,
    gap: Space.md,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.neutral,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardContent: {
    flex: 1,
    gap: Space.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  cardMeta: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  cardArrow: {
    fontSize: 20,
    color: ThemeText.tertiary,
  },
  bottomButton: {
    position: "absolute",
    bottom: 100,
    left: Space["2xl"],
    right: Space["2xl"],
  },

  // Career Explorer
  filterScroll: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.sm,
    gap: Space.xs,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  filterPillActive: {
    backgroundColor: "rgb(0,22,81)",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterPillTextActive: {
    color: "#BFFF00",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    paddingTop: Space.sm,
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    marginBottom: Space.sm,
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
