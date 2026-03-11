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
import type { StudentJourney } from "../../types/journey";
import type { CareerPath, PathStep } from "../../lib/mockPathData";

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
          <Text style={styles.headerTitle}>จำลองเส้นทางอาชีพ</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BFFF00" />
          </View>
        ) : !hasSimulations ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconGroup}>
              <Text style={styles.emptyEmoji}>🧭</Text>
            </View>
            <Text style={styles.emptyTitle}>คุณอยากเป็นอะไร?</Text>
            <Text style={styles.emptySubtext}>
              จำลองเส้นทางอาชีพและดูแผนผังทีละขั้นตอนเพื่อเดินตามความฝันของคุณ
            </Text>
            <Text
              style={{
                fontFamily: "Orbit_400Regular",
                color: "#666",
                textAlign: "center",
                marginTop: 40,
              }}
            >
              ยังไม่มีแผนการเดินทาง
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.buildPathBtn,
                pressed && styles.buildPathBtnPressed,
              ]}
              onPress={handleBuildPath}
            >
              <LinearGradient
                colors={["#BFFF00", "#A3E600"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buildPathGradient}
              >
                <Text style={styles.buildPathBtnText}>สร้างเส้นทางใหม่</Text>
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

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA", // fresh, airy tech blue-grey (not 'dead' flat grey)
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
    paddingVertical: 60,
    paddingHorizontal: 36,
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
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400, // Make it roughly the height of a career path card
  },
  addCardInner: {
    alignItems: "center",
    gap: 12,
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
});
