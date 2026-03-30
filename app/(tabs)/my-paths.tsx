import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { CareerPathCard } from "../../components/JourneyBoard/CareerPathCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getActiveJourneys } from "../../lib/journey";
import { useAuth } from "../../lib/auth";
import type { StudentJourney } from "../../types/journey";
import type { CareerPath, PathStep } from "../../types/journey";
import {
  Gradient,
  Radius,
  Border,
  Shadow,
  Space,
} from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const SNAP_INTERVAL = CARD_WIDTH + 8;

/** Convert a StudentJourney to the CareerPath shape expected by CareerPathCard. */
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
      passion: "",
      future: "",
      world: "",
    },
    confidence,
    steps,
  };
}

export default function MyPathsScreen() {
  const { appLanguage } = useAuth();
  const [journeys, setJourneys] = useState<StudentJourney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveJourneys()
      .then(setJourneys)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getActiveJourneys()
        .then(setJourneys)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, []),
  );

  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const copy =
    appLanguage === "en"
      ? {
          title: "Career Path Simulation",
          emptyTitle: "What do you want to become?",
          emptySubtext:
            "Simulate career paths and explore each step toward the future you want.",
          createTitle: "Create your first path",
          createSubtitle: "Start building a route toward your dream career",
          step1: "Choose a university",
          step2: "Gain experience through internships",
          step3: "Do the work you dream about",
          cta: "Start building your path →",
          plansTitle: "TCAS Admission Plans",
          plansCardTitle: "Plan Your Applications",
          plansCardSubtitle: "Create admission plans for each TCAS round",
        }
      : {
          title: "จำลองเส้นทางอาชีพ",
          emptyTitle: "คุณอยากเป็นอะไร?",
          emptySubtext:
            "จำลองเส้นทางอาชีพและดูแผนผังทีละขั้นตอนเพื่อเดินตามความฝันของคุณ",
          createTitle: "สร้างเส้นทางแรกของคุณ",
          createSubtitle: "เริ่มต้นการเดินทางสู่อาชีพในฝัน",
          step1: "เลือกมหาวิทยาลัย",
          step2: "ฝึกงานและสะสมประสบการณ์",
          step3: "ทำงานตามความฝัน",
          cta: "เริ่มสร้างเส้นทาง →",
          plansTitle: "แผนสมัคร TCAS",
          plansCardTitle: "วางแผนการสมัคร",
          plansCardSubtitle: "สร้างแผนสมัครสำหรับแต่ละรอบ TCAS",
        };

  const paths = journeys.map(journeyToCareerPath);
  const hasSimulations = paths.length > 0;

  const handleBuildPath = () => {
    router.push("/build-path");
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BFFF00" />
          </View>
        ) : !hasSimulations ? (
          /* Empty State with Compact Placeholder Card */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconGroup}>
              <Text style={styles.emptyEmoji}>🧭</Text>
            </View>
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>

            {/* Compact Placeholder Card */}
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
                  <Text style={styles.placeholderSubtitle}>
                    {copy.createSubtitle}
                  </Text>
                </View>
              </View>

              <View style={styles.placeholderSteps}>
                <View style={styles.placeholderStep}>
                  <View style={[styles.stepDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.stepText}>{copy.step1}</Text>
                </View>
                <View style={styles.placeholderStep}>
                  <View style={[styles.stepDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.stepText}>{copy.step2}</Text>
                </View>
                <View style={styles.placeholderStep}>
                  <View style={[styles.stepDot, { backgroundColor: "#8B5CF6" }]} />
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
        ) : (
          <View style={styles.carouselContainer}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              contentContainerStyle={styles.carouselContent}
            >
              {paths.map((path, index) => (
                <CareerPathCard
                  key={path.id}
                  path={path}
                  isActive={true}
                  index={index}
                  scrollX={scrollX}
                  isLastCard={index === paths.length - 1 && paths.length === 3}
                />
              ))}

              {/* Add Path Card */}
              {paths.length < 3 && (
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: scrollX.interpolate({
                          inputRange: [
                            (paths.length - 1) * SNAP_INTERVAL,
                            paths.length * SNAP_INTERVAL,
                            (paths.length + 1) * SNAP_INTERVAL,
                          ],
                          outputRange: [0.95, 1, 0.95],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                    opacity: scrollX.interpolate({
                      inputRange: [
                        (paths.length - 1) * SNAP_INTERVAL,
                        paths.length * SNAP_INTERVAL,
                        (paths.length + 1) * SNAP_INTERVAL,
                      ],
                      outputRange: [0.5, 1, 0.5],
                      extrapolate: "clamp",
                    }),
                  }}
                >
                  <Pressable
                    style={[
                      styles.addCardOuter,
                      { width: CARD_WIDTH, marginRight: 0 },
                    ]}
                    onPress={handleBuildPath}
                  >
                    <View style={styles.addCardInner}>
                      <Text style={styles.addCardIcon}>+</Text>
                      <Text style={styles.addCardText}>สร้างเส้นทางร่วม</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.ScrollView>
          </View>
        )}

        {/* TCAS Admission Plans Section */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>
            📋 {copy.plansTitle}
          </Text>
          
          <Pressable
            style={({ pressed }) => [
              styles.plansCard,
              pressed && styles.plansCardPressed,
            ]}
            onPress={() => router.push("/plans")}
          >
            <LinearGradient
              colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plansCardGradient}
            >
              <View style={styles.plansCardHeader}>
                <View style={styles.plansIconCircle}>
                  <Text style={styles.plansIcon}>🎓</Text>
                </View>
                <View style={styles.plansCardText}>
                  <Text style={styles.plansCardTitle}>{copy.plansCardTitle}</Text>
                  <Text style={styles.plansCardSubtitle}>{copy.plansCardSubtitle}</Text>
                </View>
                <Text style={styles.plansCardArrow}>→</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  // Loading
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyIconGroup: {
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  // Carousel
  carouselContainer: {
    marginTop: 4,
  },
  carouselContent: {
    paddingHorizontal: 24,
  },
  // Add Path Card
  addCardOuter: {
    backgroundColor: "transparent",
    borderRadius: Radius["2xl"],
    borderWidth: 2,
    borderColor: Border.light,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  addCardInner: {
    alignItems: "center",
    gap: Space.md,
  },
  addCardIcon: {
    fontSize: 48,
    fontWeight: "300",
    color: "#9CA3AF",
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  // Placeholder Card - Compact
  placeholderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    padding: 20,
    width: CARD_WIDTH,
    ...Shadow.neutral,
  },
  placeholderCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  placeholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  placeholderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 22,
  },
  placeholderTitleSection: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  placeholderSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  placeholderSteps: {
    gap: 8,
    marginBottom: 16,
  },
  placeholderStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
  },
  placeholderCtaGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: "center",
  },
  placeholderCtaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  // Plans Section - Matching style
  plansSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  plansCard: {
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    ...Shadow.neutral,
  },
  plansCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  plansCardGradient: {
    padding: 24,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
  },
  plansCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  plansIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  plansIcon: {
    fontSize: 28,
  },
  plansCardText: {
    flex: 1,
    gap: 4,
  },
  plansCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  plansCardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  plansCardArrow: {
    fontSize: 20,
    color: "#9CA3AF",
  },
});
