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
// Leave margin so previous/next cards peek out, but keep cards wider.
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
  const { guestLanguage, isGuest } = useAuth();
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
    isGuest && guestLanguage === "en"
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 24, 60) }]}
        >
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BFFF00" />
          </View>
        ) : !hasSimulations ? (
          /* Empty State with Placeholder Card */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconGroup}>
              <Text style={styles.emptyEmoji}>🧭</Text>
            </View>
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>

            {/* Placeholder Card Preview */}
            <LinearGradient
              colors={Gradient.masterCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeholderCardGradient}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.placeholderCard,
                  pressed && styles.placeholderCardPressed,
                ]}
                onPress={handleBuildPath}
              >
                {/* Card Header */}
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

                {/* Preview Steps */}
                  <View style={styles.placeholderSteps}>
                    <View style={styles.placeholderStep}>
                      <View style={[styles.stepDot, { backgroundColor: "#3B82F6" }]} />
                      <View style={styles.stepLine} />
                      <Text style={styles.stepText}>{copy.step1}</Text>
                    </View>
                    <View style={styles.placeholderStep}>
                      <View style={[styles.stepDot, { backgroundColor: "#10B981" }]} />
                      <View style={styles.stepLine} />
                      <Text style={styles.stepText}>{copy.step2}</Text>
                    </View>
                    <View style={styles.placeholderStep}>
                      <View style={[styles.stepDot, { backgroundColor: "#8B5CF6" }]} />
                      <Text style={styles.stepText}>{copy.step3}</Text>
                    </View>
                  </View>

                {/* CTA Button inside card */}
                <View style={styles.placeholderCta}>
                  <LinearGradient
                    colors={Gradient.primaryCta}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.placeholderCtaGradient}
                  >
                    <Text style={styles.placeholderCtaText}>{copy.cta}</Text>
                  </LinearGradient>
                </View>
              </Pressable>
            </LinearGradient>
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
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingTop: 48, // very tight professional spacing
    paddingHorizontal: 24,
    paddingBottom: 8, // reduced padding drastically
  },
  headerTitle: {
    fontSize: 28, // slightly smaller to match tighter layout
    fontWeight: "700",
    color: "#111",
  },
  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  emptyIconGroup: {
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    fontWeight: "400",
    color: "#888",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  buildPathBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 20,
  },
  buildPathBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buildPathGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  buildPathBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  // Carousel
  carouselContainer: {
    marginTop: 8,
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
    minHeight: 400, // Make it roughly the height of a career path card
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
  // Placeholder Card
  placeholderCardGradient: {
    borderRadius: Radius["2xl"],
    marginTop: Space["3xl"],
    marginHorizontal: Space["2xl"],
    width: CARD_WIDTH,
    ...Shadow.neutral,
  },
  placeholderCard: {
    backgroundColor: "transparent",
    borderRadius: Radius["2xl"],
    padding: Space["2xl"],
    width: "100%",
  },
  placeholderCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  placeholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  placeholderIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 28,
  },
  placeholderTitleSection: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  placeholderSteps: {
    gap: 12,
    marginBottom: 24,
  },
  placeholderStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E5E7EB",
  },
  stepText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  placeholderCta: {
    alignItems: "center",
  },
  placeholderCtaGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
  },
  placeholderCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
});
