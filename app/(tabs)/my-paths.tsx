import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import React, { useRef, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getActiveJourneys } from "../../lib/journey";
import { useAuth } from "../../lib/auth";
import {
  readCachedMyPathsSnapshot,
  writeCachedMyPathsSnapshot,
  getMyPathsCacheStatus,
  type MyPathsSnapshot,
} from "../../lib/myPathsCache";
import type { StudentJourney } from "../../types/journey";
import type { CareerPath, PathStep } from "../../types/journey";
import {
  getLogoUrlByName,
} from "../../lib/universityLogos";
import {
  Gradient,
  Radius,
  Shadow,
  Space,
} from "../../lib/theme";

const MILESTONE_META: Record<string, { label: string; labelTh: string; color: string; bgColor: string; icon: string }> = {
  university: { label: "EDUCATION", labelTh: "การศึกษา", color: "#7C3AED", bgColor: "#F3E8FF", icon: "🎓" },
  internship: { label: "EXPERIENCE", labelTh: "ประสบการณ์", color: "#0284C7", bgColor: "#E0F2FE", icon: "💼" },
  job: { label: "CAREER", labelTh: "อาชีพ", color: "#059669", bgColor: "#D1FAE5", icon: "🚀" },
};

function generateExplanation(type: "passion" | "future" | "world", score: number | null): string {
  if (score === null) return "ยังไม่มีข้อมูลเพียงพอ";
  if (score >= 85) {
    if (type === "passion") return "คุณมีความสนใจและกระตือรือร้นในด้านนี้สูงมาก";
    if (type === "future") return "อนาคตของอาชีพนี้สดใสและมีแนวโน้มเติบโต";
    return "ตลาดแรงงานต้องการบุคลากรด้านนี้จำนวนมาก";
  }
  if (score >= 70) {
    if (type === "passion") return "คุณมีความสนใจในด้านนี้ในระดับดี";
    if (type === "future") return "อนาคตของอาชีพนี้มีแนวโน้มที่ดี";
    return "มีความต้องการบุคลากรด้านนี้ในระดับดี";
  }
  if (score >= 50) {
    if (type === "passion") return "คุณมีความสนใจในด้านนี้ในระดับปานกลาง";
    if (type === "future") return "อนาคตของอาชีพนี้อยู่ในระดับปานกลาง";
    return "ความต้องการบุคลากรอยู่ในระดับปานกลาง";
  }
  if (type === "passion") return "อาจต้องสำรวจเพิ่มเติมว่านี่คือสิ่งที่คุณรักจริงๆ";
  if (type === "future") return "อาชีพนี้อาจมีความท้าทายในระยะยาว";
  return "ตลาดแรงงานอาจมีการแข่งขันสูง";
}

function journeyToCareerPath(journey: StudentJourney): CareerPath {
  const scores = journey.scores;
  const passionScore = scores?.passion ?? null;
  const futureScore = scores?.future ?? null;
  const worldScore = scores?.world ?? null;
  const journeyScore =
    scores
      ? Math.round((scores.passion + scores.future + scores.world) / 3)
      : null;

  const confidence: CareerPath["confidence"] =
    journeyScore === null
      ? "low"
      : journeyScore >= 70
        ? "high"
        : journeyScore >= 50
          ? "medium"
          : "low";

  const steps: PathStep[] = journey.steps.map((step, idx) => ({
    id: `${journey.id}-step-${idx}`,
    order: idx + 1,
    type: step.type,
    title: step.label,
    subtitle: step.details.university_name ?? step.details.company_type ?? "",
    detail: [step.details.faculty_name, step.details.salary_range, step.details.description]
      .filter(Boolean)
      .join(" · "),
    duration: "",
    icon:
      step.type === "university"
        ? "🎓"
        : step.type === "internship"
          ? "💼"
          : "🚀",
    status: "upcoming" as PathStep["status"],
    universityMeta:
      step.type === "university" &&
      step.details.university_name &&
      step.details.faculty_name
        ? {
            universityName: step.details.university_name,
            facultyName: step.details.faculty_name,
          }
        : undefined,
  }));

  return {
    id: journey.id,
    label: journey.title,
    careerGoal: journey.career_goal,
    careerGoalIcon: "🎯",
    passionScore,
    futureScore,
    worldScore,
    journeyScore,
    explanations: {
      passion: generateExplanation("passion", passionScore),
      future: generateExplanation("future", futureScore),
      world: generateExplanation("world", worldScore),
    },
    confidence,
    steps,
  };
}

function CareerMapCard({ path }: { path: CareerPath }) {
  const { appLanguage } = useAuth();
  const isThai = appLanguage === "th";
  const totalSteps = path.steps.length;

  // Accent color based on last step (the career goal)
  const lastStepType = path.steps[path.steps.length - 1]?.type || "job";
  const accentMeta = MILESTONE_META[lastStepType] || MILESTONE_META.job;

  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles.card,
        pressed && cardStyles.cardPressed,
      ]}
      onPress={() => router.push(`/career-builder`)}
    >
      <LinearGradient
        colors={["#FFFFFF", "#FAFBFC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyles.gradient}
      >
        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.iconCircle, { backgroundColor: accentMeta.bgColor }]}>
            <Text style={[cardStyles.iconText, { color: accentMeta.color }]}>
              {path.careerGoalIcon}
            </Text>
          </View>
          <View style={cardStyles.headerText}>
            <Text style={cardStyles.goalTitle} numberOfLines={1}>
              {path.careerGoal || path.label}
            </Text>
            <Text style={cardStyles.summary}>
              {totalSteps} {isThai ? "ขั้นตอน" : "steps"}
              {path.journeyScore !== null && ` · ${path.journeyScore}% ${isThai ? "คะแนน" : "score"}`}
            </Text>
          </View>
          <Text style={cardStyles.arrow}>→</Text>
        </View>

        {/* Scores — moved to TOP, right under header */}
        {path.journeyScore !== null && (
          <View style={cardStyles.scoresRow}>
            <View style={cardStyles.scorePill}>
              <View style={[cardStyles.scoreDot, { backgroundColor: "#F59E0B" }]} />
              <Text style={cardStyles.scoreValue}>{path.passionScore ?? "—"}</Text>
              <Text style={cardStyles.scoreLabel}>{isThai ? "ความหลงใหล" : "Passion"}</Text>
            </View>
            <View style={cardStyles.scorePill}>
              <View style={[cardStyles.scoreDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={cardStyles.scoreValue}>{path.futureScore ?? "—"}</Text>
              <Text style={cardStyles.scoreLabel}>{isThai ? "อนาคต" : "Future"}</Text>
            </View>
            <View style={cardStyles.scorePill}>
              <View style={[cardStyles.scoreDot, { backgroundColor: "#10B981" }]} />
              <Text style={cardStyles.scoreValue}>{path.worldScore ?? "—"}</Text>
              <Text style={cardStyles.scoreLabel}>{isThai ? "ตลาด" : "Market"}</Text>
            </View>
          </View>
        )}

        {/* Compact Timeline */}
        {totalSteps > 0 && (
          <View style={cardStyles.timeline}>
            {path.steps.map((step, idx) => {
              const meta = MILESTONE_META[step.type] || MILESTONE_META.job;
              const isLastStep = idx === path.steps.length - 1;
              const hasSubtitle = step.subtitle && step.subtitle.trim().length > 0;
              const hasDetail = step.detail && step.detail.trim().length > 0 && step.detail !== step.subtitle;

              return (
                <View key={step.id}>
                  <View style={cardStyles.stepRow}>
                    <View style={[cardStyles.stepIcon, { backgroundColor: meta.bgColor }]}>
                      <Text style={[cardStyles.stepIconText, { color: meta.color }]}>
                        {meta.icon}
                      </Text>
                    </View>
                    <View style={cardStyles.stepText}>
                      <Text style={cardStyles.stepTitle}>{step.title}</Text>
                      {hasSubtitle && (
                        <View style={cardStyles.subtitleRow}>
                          {step.type === "university" && (() => {
                            const logoUrl = getLogoUrlByName(step.subtitle);
                            if (logoUrl) {
                              return (
                                <Image
                                  source={{ uri: logoUrl }}
                                  style={cardStyles.universityLogo}
                                  resizeMode="contain"
                                />
                              );
                            }
                            return null;
                          })()}
                          <Text style={cardStyles.stepSubtitle}>{step.subtitle}</Text>
                        </View>
                      )}
                      {hasDetail && (
                        <Text style={cardStyles.stepDetail}>{step.detail}</Text>
                      )}
                    </View>
                  </View>
                  {!isLastStep && <View style={cardStyles.stepDivider} />}
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function MyPathsScreen() {
  const { appLanguage, user } = useAuth();
  const [journeys, setJourneys] = useState<StudentJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const isThai = appLanguage === "th";

  const applySnapshot = useCallback((snapshot: MyPathsSnapshot) => {
    setJourneys(snapshot.journeys);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const userId = user.id;
      let cancelled = false;

      async function loadData() {
        let cachedSnapshot: MyPathsSnapshot | null = null;
        try {
          cachedSnapshot = readCachedMyPathsSnapshot(userId);
        } catch {
          cachedSnapshot = null;
        }

        if (cancelled) return;

        if (cachedSnapshot) {
          applySnapshot(cachedSnapshot);
          setLoading(false);
        }

        const cacheStatus = getMyPathsCacheStatus(cachedSnapshot);
        const isFirstLoad = !hasLoadedRef.current;
        hasLoadedRef.current = true;

        if (cacheStatus.isFresh && !isFirstLoad) {
          if (!cachedSnapshot) setLoading(false);
          return;
        }

        if (!cachedSnapshot) setLoading(true);

        try {
          const journeysData = await getActiveJourneys();
          if (cancelled) return;

          setJourneys(journeysData);

          const snapshot: MyPathsSnapshot = {
            version: 1,
            userId,
            cachedAt: new Date().toISOString(),
            journeys: journeysData,
            enrollments: [],
          };
          try { writeCachedMyPathsSnapshot(snapshot); } catch {}
        } catch (error) {
          console.error("[MyPaths] Failed to load:", error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      void loadData();

      return () => { cancelled = true; };
    }, [user?.id, applySnapshot]),
  );

  const insets = useSafeAreaInsets();
  const copy = isThai
    ? {
        title: "แผนอาชีพของฉัน",
        emptyTitle: "คุณอยากเป็นอะไร?",
        emptySubtext: "สร้างแผนอาชีพเพื่อดูเส้นทางจากการศึกษาสู่ประสบการณ์และอาชีพในฝัน",
        createTitle: "สร้างแผนอาชีพแรก",
        createSubtitle: "เริ่มต้นการเดินทางสู่อาชีพในฝัน",
        step1: "เลือกมหาวิทยาลัย",
        step2: "ฝึกงานและสะสมประสบการณ์",
        step3: "ทำงานตามความฝัน",
        cta: "สร้างแผนอาชีพ →",
        addPath: "สร้างแผนใหม่",
        compare: "เปรียบเทียบ",
      }
    : {
        title: "My Career Plans",
        emptyTitle: "What do you want to become?",
        emptySubtext: "Build a career plan to map your journey from education to experience to dream job.",
        createTitle: "Create your first plan",
        createSubtitle: "Start mapping your route to your dream career",
        step1: "Choose a university",
        step2: "Gain experience through internships",
        step3: "Do the work you dream about",
        cta: "Build your career plan →",
        addPath: "Create new plan",
        compare: "Compare",
      };

  const paths = journeys.map(journeyToCareerPath);
  const hasPaths = paths.length > 0;

  const handleBuildPath = () => {
    router.push("/career-builder");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <PathLabSkiaLoader size="large" />
        </View>
      );
    }

    if (!hasPaths) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconGroup}>
            <Text style={styles.emptyEmoji}>🧭</Text>
          </View>
          <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.placeholderCard,
              pressed && styles.placeholderCardPressed,
            ]}
            onPress={handleBuildPath}
          >
            <View style={styles.placeholderHeader}>
              <View style={styles.placeholderIconCircle}>
                <Text style={styles.placeholderIcon}>✨</Text>
              </View>
              <View style={styles.placeholderTitleSection}>
                <Text style={styles.placeholderTitle}>{copy.createTitle}</Text>
                <Text style={styles.placeholderSubtitle}>{copy.createSubtitle}</Text>
              </View>
            </View>

            <View style={styles.placeholderSteps}>
              <View style={styles.placeholderStep}>
                <View style={[styles.stepDot, { backgroundColor: "#7C3AED" }]} />
                <Text style={styles.stepText}>{copy.step1}</Text>
              </View>
              <View style={styles.placeholderStep}>
                <View style={[styles.stepDot, { backgroundColor: "#0284C7" }]} />
                <Text style={styles.stepText}>{copy.step2}</Text>
              </View>
              <View style={styles.placeholderStep}>
                <View style={[styles.stepDot, { backgroundColor: "#059669" }]} />
                <Text style={styles.stepText}>{copy.step3}</Text>
              </View>
            </View>

            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeholderCtaGradient}
            >
              <Text style={styles.placeholderCtaText}>{copy.cta}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.pathsSection}>
        {paths.map((path) => (
          <CareerMapCard key={path.id} path={path} />
        ))}

        {/* Always show create button */}
        <Pressable
          style={({ pressed }) => [
            styles.addPathButton,
            pressed && styles.addPathButtonPressed,
          ]}
          onPress={handleBuildPath}
        >
          <View style={styles.addPathIconCircle}>
            <Text style={styles.addPathIcon}>+</Text>
          </View>
          <Text style={styles.addPathText}>{copy.addPath}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 12, 48) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with compare button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          {paths.length >= 2 && (
            <Pressable
              style={({ pressed }) => [
                styles.headerCompareBtn,
                pressed && styles.headerCompareBtnPressed,
              ]}
              onPress={() => router.push("/plans/compare")}
            >
              <Text style={styles.headerCompareText}>{copy.compare}</Text>
            </Pressable>
          )}
        </View>

        {renderContent()}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    marginBottom: Space.lg,
    ...Shadow.neutral,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  gradient: {
    padding: Space.xl,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    marginBottom: Space.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  summary: {
    fontSize: 13,
    color: "#6B7280",
  },
  arrow: {
    fontSize: 18,
    color: "#9CA3AF",
  },

  // Scores at top
  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Space.md,
    marginBottom: Space.md,
    paddingBottom: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FAFBFC",
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  scoreLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Compact timeline
  timeline: {
    marginTop: Space.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
    paddingVertical: Space.sm,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepIconText: {
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  universityLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  stepDetail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 40,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  headerCompareBtn: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Shadow.neutral,
  },
  headerCompareBtnPressed: {
    opacity: 0.8,
  },
  headerCompareText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Space.lg,
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.xl,
  },
  emptyIconGroup: {
    marginBottom: Space.md,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: Space.sm,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: Space.xl,
    lineHeight: 20,
    paddingHorizontal: Space.xl,
  },
  placeholderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius["2xl"],
    padding: Space.xl,
    width: "100%",
    ...Shadow.neutral,
  },
  placeholderCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  placeholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.lg,
    gap: Space.md,
  },
  placeholderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 24,
  },
  placeholderTitleSection: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  placeholderSteps: {
    gap: Space.md,
    marginBottom: Space.lg,
  },
  placeholderStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  placeholderCtaGradient: {
    paddingVertical: Space.md,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  placeholderCtaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  pathsSection: {
    paddingHorizontal: Space["2xl"],
    paddingTop: Space.sm,
  },
  addPathButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.md,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius["2xl"],
    padding: Space.lg,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    marginBottom: Space.lg,
  },
  addPathButtonPressed: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  addPathIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  addPathIcon: {
    fontSize: 20,
    fontWeight: "300",
    color: "#9CA3AF",
  },
  addPathText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});
