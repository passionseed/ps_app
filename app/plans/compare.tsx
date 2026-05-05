import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { getStudentJourneys } from "../../lib/journey";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { aiRiskColor } from "../../lib/jobUtils";
import type { StudentJourney } from "../../types/journey";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../../lib/theme";

interface PathSnapshot {
  journey: StudentJourney;
  totalDuration: number;
  topSalary: number;
  avgAiRisk: number;
  topGrowth: string;
}

export default function CareerCompareScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [paths, setPaths] = useState<PathSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadPaths = useCallback(async () => {
    if (!user) return;
    try {
      const journeys = await getStudentJourneys();
      const careerJourneys = journeys.filter((j) => j.steps && j.steps.length > 0);
      const enriched: PathSnapshot[] = await Promise.all(
        careerJourneys.map(async (j) => enrichSnapshot(j)),
      );
      setPaths(enriched);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPaths();
    }, [loadPaths]),
  );

  const handleShare = useCallback(async () => {
    const path = paths[selectedIndex];
    if (!path) return;
    const steps = path.journey.steps.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
    await Share.share({
      message: `My Career Path: ${path.journey.title}\n\n${steps}\n\nBuilt with Passion Seed`,
    });
  }, [paths, selectedIndex]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Compare Paths</Text>
        {paths.length > 0 && (
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share</Text>
          </Pressable>
        )}
      </View>

      {paths.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No paths to compare</Text>
          <Text style={styles.emptySub}>
            Build your first career path on the canvas, then come back to compare
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/plans/canvas")}
          >
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtnGradient}
            >
              <Text style={styles.emptyBtnText}>Go to Canvas</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : paths.length === 1 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Build another path to compare</Text>
          <Text style={styles.emptySub}>
            You have one path. Build a second one on the canvas to see them side by side.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/plans/canvas")}
          >
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtnGradient}
            >
              <Text style={styles.emptyBtnText}>Build another path</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Path selector dots */}
          <View style={styles.pathSelector}>
            {paths.map((_, i) => (
              <Pressable
                key={i}
                style={[styles.pathDot, i === selectedIndex && styles.pathDotActive]}
                onPress={() => setSelectedIndex(i)}
              />
            ))}
          </View>

          {/* Scorecard */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {paths.map((path, i) => {
              const isSelected = i === selectedIndex;
              if (!isSelected && paths.length > 2) return null;

              return (
                <View
                  key={path.journey.id}
                  style={[styles.scorecard, isSelected && styles.scorecardSelected]}
                >
                  <Text style={styles.scorecardTitle}>{path.journey.title}</Text>
                  <Text style={styles.scorecardGoal}>{path.journey.career_goal || "Career Path"}</Text>

                  {/* Dimensions */}
                  <View style={styles.dimensionRow}>
                    <Dimension label="Total Time" value={`${path.totalDuration} months`} icon="⏱" />
                    <Dimension
                      label="Top Salary"
                      value={`฿${path.topSalary.toLocaleString()}/mo`}
                      icon="💰"
                    />
                  </View>
                  <View style={styles.dimensionRow}>
                    <Dimension
                      label="Avg AI Risk"
                      value={`${Math.round(path.avgAiRisk * 100)}%`}
                      color={aiRiskColor(path.avgAiRisk)}
                      icon="🤖"
                    />
                    <Dimension label="Growth" value={path.topGrowth} icon="📈" />
                  </View>

                  {/* Steps summary */}
                  <View style={styles.stepsSummary}>
                    {path.journey.steps.map((step, j) => (
                      <View key={j} style={styles.stepRow}>
                        <View style={styles.stepDot} />
                        <Text style={styles.stepLabel}>{step.label}</Text>
                      </View>
                    ))}
                  </View>

                  {path.journey.scores && (
                    <View style={styles.scoresRow}>
                      <ScorePill label="Passion" value={path.journey.scores.passion} />
                      <ScorePill label="Future" value={path.journey.scores.future} />
                      <ScorePill label="World" value={path.journey.scores.world} />
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonTitle}>📊 Quick Comparison</Text>
              {paths.map((p, i) => (
                <View key={i} style={styles.comparisonRow}>
                  <Text style={styles.comparisonName} numberOfLines={1}>
                    {p.journey.title}
                  </Text>
                  <Text style={styles.comparisonTime}>{p.totalDuration}m</Text>
                  <Text style={styles.comparisonSalary}>฿{p.topSalary.toLocaleString()}</Text>
                  <Text style={{ color: aiRiskColor(p.avgAiRisk), fontWeight: "700" }}>
                    {Math.round(p.avgAiRisk * 100)}%
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

function Dimension({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <View style={dimStyles.card}>
      <Text style={dimStyles.icon}>{icon}</Text>
      <Text style={[dimStyles.value, color ? { color } : undefined]}>{value}</Text>
      <Text style={dimStyles.label}>{label}</Text>
    </View>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <View style={scoreStyles.pill}>
      <Text style={scoreStyles.pillValue}>{value}</Text>
      <Text style={scoreStyles.pillLabel}>{label}</Text>
    </View>
  );
}

async function enrichSnapshot(journey: StudentJourney): Promise<PathSnapshot> {
  let totalDuration = 0;
  let totalRisk = 0;
  let riskCount = 0;
  let topSalary = 0;
  let topGrowth = "N/A";

  for (const step of journey.steps) {
    totalDuration += step.details?.duration_months ?? 0;

    if (step.details?.job_id) {
      try {
        const { data } = await supabase
          .from("jobs")
          .select("automation_risk, salary_range_thb, growth_rate")
          .eq("id", step.details.job_id)
          .single();
        if (data) {
          totalRisk += (data as any).automation_risk ?? 0;
          riskCount++;
          const maxSalary = (data as any).salary_range_thb?.max_monthly ?? 0;
          if (maxSalary > topSalary) topSalary = maxSalary;
          if ((data as any).growth_rate) topGrowth = (data as any).growth_rate;
        }
      } catch {
        // skip
      }
    }
  }

  const avgAiRisk = riskCount > 0 ? totalRisk / riskCount : 0;

  return {
    journey,
    totalDuration,
    topSalary: topSalary || 50000,
    avgAiRisk,
    topGrowth,
  };
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.md,
    gap: Space.sm,
  },
  backBtn: {
    paddingRight: Space.sm,
  },
  backBtnText: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
    flex: 1,
  },
  shareBtn: {
    paddingVertical: Space.sm,
  },
  shareBtnText: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
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
  emptySub: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    borderRadius: Radius.full,
    overflow: "hidden",
    marginTop: Space.md,
    ...Shadow.neutral,
  },
  emptyBtnGradient: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  pathSelector: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Space.sm,
    paddingVertical: Space.md,
  },
  pathDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
  },
  pathDotActive: {
    backgroundColor: "rgb(0,22,81)",
    width: 24,
    borderRadius: 5,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Space["2xl"],
  },
  scrollContent: {
    gap: Space.lg,
  },
  scorecard: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.md,
    ...Shadow.neutral,
  },
  scorecardSelected: {
    borderColor: "rgb(0,22,81)",
    borderWidth: 2,
  },
  scorecardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  scorecardGoal: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  dimensionRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  stepsSummary: {
    borderTopWidth: 1,
    borderTopColor: Border.default,
    paddingTop: Space.md,
    gap: Space.xs,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgb(0,22,81)",
  },
  stepLabel: {
    fontSize: 13,
    color: ThemeText.secondary,
    flex: 1,
  },
  scoresRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  comparisonBox: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.sm,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: ThemeText.primary,
    marginBottom: Space.xs,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Space.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  comparisonName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  comparisonTime: {
    fontSize: 12,
    color: ThemeText.tertiary,
    width: 40,
    textAlign: "right",
  },
  comparisonSalary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    width: 80,
    textAlign: "right",
  },
});

const dimStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: Radius.md,
    padding: Space.md,
    alignItems: "center",
    gap: 2,
  },
  icon: {
    fontSize: 16,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  label: {
    fontSize: 10,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

const scoreStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
  },
  pillValue: {
    fontSize: 16,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  pillLabel: {
    fontSize: 10,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
