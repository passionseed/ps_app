import { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { PathLabSkiaLoader } from "../components/PathLabSkiaLoader";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  readCachedSeedRecommendations,
  type SeedCoverageSummary,
  type SeedRecommendation,
} from "../lib/seedRecommendations";
import { AppText as Text } from "../components/AppText";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Type,
} from "../lib/theme";

interface IkigaiData {
  coverage: SeedCoverageSummary;
  interests: string[];
  strengths: string[];
  needs: string[];
  opportunities: string[];
}

export default function IkigaiScreen() {
  const { appLanguage, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<IkigaiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isThai = appLanguage === "th";
  const percent = data?.coverage?.completionPercent ?? 0;
  const isComplete = percent >= 100;

  const loadData = useCallback(async () => {
    try {
      // Load coverage from cache
      const payload = await readCachedSeedRecommendations();
      const coverage = payload?.coverage ?? {
        activeCount: 0,
        exploredCount: 0,
        completedCount: 0,
        totalCount: 0,
        completionPercent: 0,
      };

      // Extract interests from explored seeds
      const seeds = payload?.seeds ?? [];
      const exploredSeeds = seeds.filter((s) => s.coverage?.hasExplored);

      // Build Ikigai data from user's exploration
      const interests = exploredSeeds.slice(0, 5).map((s) => s.title);
      const strengths = exploredSeeds
        .filter((s) => s.coverage?.reflectionCount > 0)
        .slice(0, 3)
        .map((s) => s.title);
      const needs = ["Creative problem solving", "Digital literacy", "Communication"];
      const opportunities = exploredSeeds.slice(0, 4).map((s) => s.title);

      setData({
        coverage,
        interests,
        strengths,
        needs,
        opportunities,
      });
    } catch (error) {
      console.error("[Ikigai] Load failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
        <Text style={styles.loadingText}>
          {isThai ? "กำลังโหลด Ikigai..." : "Loading your Ikigai..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Hero Header */}
      <LinearGradient
        colors={isComplete ? ["#F59E0B", "#D97706", "#92400E"] : ["#1E0A3C", "#4C1D95", "#5B21B6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ {isThai ? "กลับ" : "Back"}</Text>
        </Pressable>

        <Text style={styles.heroTitle}>
          {isComplete
            ? isThai
              ? "✨ คุณค้นพบ Ikigai ของคุณ!"
              : "✨ You discovered your Ikigai!"
            : isThai
              ? "🧭 เส้นทางสู่ Ikigai"
              : "🧭 Your path to Ikigai"}
        </Text>

        <Text style={styles.heroSubtitle}>
          {isThai ? `สำรวจไปแล้ว ${percent}%` : `Explored ${percent}%`}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(6, percent)}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Coverage Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data?.coverage?.activeCount ?? 0}</Text>
              <Text style={styles.statLabel}>{isThai ? "กำลังทำ" : "Active"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data?.coverage?.exploredCount ?? 0}</Text>
              <Text style={styles.statLabel}>{isThai ? "สำรวจแล้ว" : "Explored"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data?.coverage?.completedCount ?? 0}</Text>
              <Text style={styles.statLabel}>{isThai ? "จบแล้ว" : "Completed"}</Text>
            </View>
          </View>
        </View>

        {/* Ikigai Diagram */}
        <View style={styles.ikigaiSection}>
          <Text style={styles.sectionTitle}>
            {isThai ? "ไออิไก ของคุณ" : "Your Ikigai"}
          </Text>

          {isComplete ? (
            <View style={styles.ikigaiDiagram}>
              {/* Four overlapping circles */}
              <View style={styles.diagramContainer}>
                <View style={[styles.circle, styles.circleLove]}>
                  <Text style={styles.circleTitle}>{isThai ? "สิ่งที่คุณรัก" : "What you LOVE"}</Text>
                  {data?.interests?.map((item, i) => (
                    <Text key={i} style={styles.circleItem}>{item}</Text>
                  ))}
                </View>

                <View style={[styles.circle, styles.circleGood]}>
                  <Text style={styles.circleTitle}>{isThai ? "สิ่งที่คุณเก่ง" : "What you're GOOD AT"}</Text>
                  {data?.strengths?.map((item, i) => (
                    <Text key={i} style={styles.circleItem}>{item}</Text>
                  ))}
                </View>

                <View style={[styles.circle, styles.circleNeeds]}>
                  <Text style={styles.circleTitle}>{isThai ? "สิ่งที่โลกต้องการ" : "What the world NEEDS"}</Text>
                  {data?.needs?.map((item, i) => (
                    <Text key={i} style={styles.circleItem}>{item}</Text>
                  ))}
                </View>

                <View style={[styles.circle, styles.circlePaid]}>
                  <Text style={styles.circleTitle}>{isThai ? "สิ่งที่ได้รับค่าตอบแทน" : "What you can be PAID FOR"}</Text>
                  {data?.opportunities?.map((item, i) => (
                    <Text key={i} style={styles.circleItem}>{item}</Text>
                  ))}
                </View>

                {/* Center - Ikigai */}
                <View style={styles.ikigaiCenter}>
                  <Text style={styles.ikigaiCenterText}>✨ IKIGAI ✨</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.lockedDiagram}>
              <View style={styles.lockedIcon}>
                <Text style={styles.lockedEmoji}>🔒</Text>
              </View>
              <Text style={styles.lockedTitle}>
                {isThai ? "解锁ไออิไกของคุณ" : "Unlock your Ikigai"}
              </Text>
              <Text style={styles.lockedSubtitle}>
                {isThai
                  ? `สำรวจเส้นทางให้ครบ 100% เพื่อดูไออิไกของคุณ`
                  : `Explore all paths to 100% to reveal your Ikigai`}
              </Text>
              <Pressable
                style={styles.exploreButton}
                onPress={() => router.push("/(tabs)/discover")}
              >
                <Text style={styles.exploreButtonText}>
                  {isThai ? "🧭 สำรวจเพิ่ม" : "🧭 Explore more"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>
            {isThai ? "💡 วิธีค้นพบ Ikigai" : "💡 How to find your Ikigai"}
          </Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={styles.tipText}>
              {isThai
                ? "สำรวจเส้นทางที่คุณสนใจ - ทำกิจกรรมและเขียนบันทึก"
                : "Explore paths you're curious about - complete activities and reflect"}
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={styles.tipText}>
              {isThai
                ? "สังเกตสิ่งที่ทำให้คุณมีความสุขและมีพลัง"
                : "Notice what brings you joy and energy"}
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={styles.tipText}>
              {isThai
                ? "เมื่อครบ 100% คุณจะเห็นภาพรวมของไออิไกของคุณ"
                : "At 100%, you'll see your complete Ikigai picture"}
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 120 }} />
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
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
    gap: Space.lg,
  },
  loadingText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
  },

  // Hero
  hero: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
  },
  backButton: {
    marginBottom: Space.md,
  },
  backText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: Space.xs,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: Space.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
    backgroundColor: "#FCD34D",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Space.xl,
    gap: Space["2xl"],
  },

  // Stats Card
  statsCard: {
    marginHorizontal: Space["2xl"],
    marginTop: Space.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    ...Shadow.neutral,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: Space.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Accent.green,
  },
  statLabel: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Border.default,
  },

  // Ikigai Section
  ikigaiSection: {
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
  },

  // Ikigai Diagram (simplified visual)
  ikigaiDiagram: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    ...Shadow.neutral,
  },
  diagramContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Space.md,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.md,
    borderWidth: 2,
  },
  circleLove: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#EF4444",
  },
  circleGood: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "#3B82F6",
  },
  circleNeeds: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },
  circlePaid: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "#F59E0B",
  },
  circleTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: ThemeText.primary,
    textAlign: "center",
    marginBottom: Space.xs,
  },
  circleItem: {
    fontSize: 10,
    color: ThemeText.secondary,
    textAlign: "center",
  },
  ikigaiCenter: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: "#FCD34D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F59E0B",
    marginTop: Space.md,
  },
  ikigaiCenterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },

  // Locked Diagram
  lockedDiagram: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space["2xl"],
    alignItems: "center",
    gap: Space.md,
    ...Shadow.neutral,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedEmoji: {
    fontSize: 36,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: Accent.green,
    borderRadius: Radius.full,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Tips
  tipsSection: {
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.md,
    ...Shadow.neutral,
  },
  tipNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: Accent.yellow,
  },
  tipText: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 20,
    flex: 1,
  },
});