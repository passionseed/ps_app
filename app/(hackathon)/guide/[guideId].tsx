import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../components/AppText";
import { HackathonBackground } from "../../../components/Hackathon/HackathonBackground";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import {
  fetchGuidePages,
  fetchGuideWithCompletion,
  completeGuide,
  type MentorGuidePage,
  type GuideWithCompletion,
} from "../../../lib/mentorGuides";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const CYAN20 = "rgba(145,196,227,0.20)";
const CYAN45 = "rgba(145,196,227,0.45)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const GREEN = "#4ADE80";
const GOLD = "#FBBF24";

type PromptType = "text" | "prompt" | "affirmation";

function getPromptStyle(type: PromptType) {
  switch (type) {
    case "prompt":
      return {
        containerStyle: {
          borderColor: CYAN + "50",
          backgroundColor: "rgba(145,196,227,0.06)",
        },
        icon: "👁️",
        label: "Notice This",
      };
    case "affirmation":
      return {
        containerStyle: {
          borderColor: GOLD + "50",
          backgroundColor: "rgba(251,191,36,0.06)",
        },
        icon: "✨",
        label: "Say This Today",
      };
    default:
      return {
        containerStyle: {
          borderColor: BORDER,
          backgroundColor: "rgba(13,18,25,0.6)",
        },
        icon: "📖",
        label: "",
      };
  }
}

export default function GuideReaderScreen() {
  const { guideId } = useLocalSearchParams<{ guideId: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pages, setPages] = useState<MentorGuidePage[]>([]);
  const [guide, setGuide] = useState<GuideWithCompletion | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const cardContent = pages[currentPage];

  useEffect(() => {
    if (!guideId) return;
    const load = async () => {
      setLoading(true);
      const [guideData, pagesData] = await Promise.all([
        fetchGuideWithCompletion(guideId),
        fetchGuidePages(guideId),
      ]);
      setGuide(guideData);
      setPages(pagesData);
      setLoading(false);
    };
    load();
  }, [guideId]);

  const animateToPage = useCallback(
    (pageIndex: number) => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentPage(pageIndex);
    },
    [fadeAnim]
  );

  const goNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateToPage(currentPage + 1);
    }
  }, [currentPage, pages.length, animateToPage]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateToPage(currentPage - 1);
    }
  }, [currentPage, animateToPage]);

  const handleComplete = useCallback(async () => {
    if (!guideId || completing) return;
    setCompleting(true);
    try {
      const result = await completeGuide(guideId);
      if (result.awarded > 0) {
        setShowCompletion(true);
      } else {
        router.back();
      }
    } catch (e: any) {
      console.warn("[guide] completion failed:", e.message);
      router.back();
    }
    setCompleting(false);
  }, [guideId, completing]);

  const progress = pages.length > 0 ? (currentPage + 1) / pages.length : 0;

  if (loading || !cardContent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HackathonBackground />
        <View style={styles.header}>
          <SkiaBackButton onPress={() => router.back()} />
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderText}>
          <AppText style={{ color: WHITE55, fontSize: 14 }}>Loading guide...</AppText>
        </View>
      </View>
    );
  }

  // Completion celebration overlay
  if (showCompletion) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HackathonBackground />
        <View style={styles.completionContainer}>
          <AppText style={styles.completionEmoji}>🎉</AppText>
          <AppText variant="bold" style={styles.completionTitle}>
            Guide Complete!
          </AppText>
          <View style={styles.pointsRow}>
            <AppText variant="bold" style={styles.pointsAwarded}>
              +{guide?.points_on_completion ?? 5}
            </AppText>
            <AppText style={styles.pointsLabel}>points awarded</AppText>
          </View>
          <AppText style={styles.completionSubtext}>
            Your team earned points for completing this guide.
          </AppText>
          <Pressable
            style={styles.doneButton}
            onPress={() => {
              router.back();
              setTimeout(() => router.back(), 100);
            }}
          >
            <LinearGradient
              colors={[CYAN, BLUE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButtonGradient}
            >
              <AppText variant="bold" style={styles.doneButtonText}>
                Done
              </AppText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const promptStyle = getPromptStyle(cardContent.content_type as PromptType);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;
  const isFramework = isFirstPage && cardContent.content_type === "text";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <HackathonBackground />

      {/* Header */}
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <AppText style={styles.pageCounter}>
            {currentPage + 1}/{pages.length}
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <AppText variant="bold" style={styles.guideTitle} numberOfLines={2}>
          {guide?.title}
        </AppText>
        {guide?.subtitle && (
          <AppText style={styles.guideSubtitle}>{guide.subtitle}</AppText>
        )}
      </View>

      {/* Content Card */}
      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={["rgba(145,196,227,0.06)", CARD_BG]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, promptStyle.containerStyle]}
        >
          {isFramework ? (
            // Framework page - special styling
            <View style={styles.frameworkContainer}>
              <AppText style={styles.frameworkTitle}>S.T.I.L.L.</AppText>
              <View style={styles.frameworkSteps}>
                {cardContent.content.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  return (
                    <AppText key={i} style={styles.frameworkLine}>
                      {trimmed}
                    </AppText>
                  );
                })}
              </View>
            </View>
          ) : promptStyle.label ? (
            // Prompt or affirmation
            <View>
              <View style={styles.promptHeader}>
                <AppText style={styles.promptIcon}>{promptStyle.icon}</AppText>
                <AppText variant="bold" style={styles.promptLabel}>
                  {promptStyle.label}
                </AppText>
              </View>
              {cardContent.title && cardContent.content_type !== "affirmation" && (
                <AppText variant="bold" style={styles.cardTitle}>
                  {cardContent.title}
                </AppText>
              )}
              <View style={styles.cardContent}>
                {cardContent.content.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <View key={i} style={{ height: 12 }} />;
                  return (
                    <AppText
                      key={i}
                      style={[
                        styles.cardText,
                        cardContent.content_type === "affirmation" &&
                          styles.affirmationText,
                      ]}
                    >
                      {trimmed}
                    </AppText>
                  );
                })}
              </View>
            </View>
          ) : (
            // Regular text
            <View>
              {cardContent.title && (
                <AppText variant="bold" style={styles.cardTitle}>
                  {cardContent.title}
                </AppText>
              )}
              <View style={styles.cardContent}>
                {cardContent.content.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <View key={i} style={{ height: 12 }} />;
                  return (
                    <AppText key={i} style={styles.cardText}>
                      {trimmed}
                    </AppText>
                  );
                })}
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <Pressable
          style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
          onPress={goPrev}
          disabled={currentPage === 0}
        >
          <AppText
            style={[
              styles.navButtonText,
              currentPage === 0 && styles.navButtonTextDisabled,
            ]}
          >
            ← Back
          </AppText>
        </Pressable>

        {isLastPage ? (
          <Pressable
            style={[styles.completeButton, completing && styles.navButtonDisabled]}
            onPress={handleComplete}
            disabled={completing}
          >
            <LinearGradient
              colors={[GREEN, "#22C55E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeButtonGradient}
            >
              <AppText variant="bold" style={styles.completeButtonText}>
                {completing ? "Completing..." : `Complete (+${guide?.points_on_completion ?? 5} pts)`}
              </AppText>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.navButtonNext} onPress={goNext}>
            <AppText style={styles.navButtonTextNext}>Next →</AppText>
          </Pressable>
        )}
      </View>

      {/* Day indicators for multi-day guides */}
      {pages.length > 4 && (
        <View style={styles.dayIndicators}>
          {(() => {
            const dayMap = new Map<number, number>();
            pages.forEach((p, i) => {
              if (!dayMap.has(p.page_number)) {
                dayMap.set(p.page_number, i);
              }
            });
            const currentDay = Array.from(dayMap.entries()).find(
              ([, endIdx]) => endIdx >= currentPage
            )?.[0] ?? 0;

            return Array.from(dayMap.keys()).map((day) => {
              const isCurrentDay = day === currentDay;
              const dayNum = day === 0 ? 0 : day;
              return (
                <View
                  key={day}
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: isCurrentDay ? CYAN : "rgba(145,196,227,0.2)",
                      width: dayNum === 0 ? 16 : 8,
                    },
                  ]}
                />
              );
            });
          })()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(145,196,227,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: CYAN,
    borderRadius: 2,
  },
  pageCounter: {
    fontSize: 11,
    color: WHITE55,
    fontFamily: "BaiJamjuree_500Medium",
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  guideTitle: {
    fontSize: 22,
    color: WHITE,
    lineHeight: 28,
  },
  guideSubtitle: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_500Medium",
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  loaderText: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  frameworkContainer: {
    flex: 1,
    justifyContent: "center",
  },
  frameworkTitle: {
    fontSize: 32,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 8,
  },
  frameworkSteps: {
    gap: 8,
  },
  frameworkLine: {
    fontSize: 16,
    color: WHITE75,
    lineHeight: 24,
    textAlign: "center",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  promptIcon: {
    fontSize: 20,
  },
  promptLabel: {
    fontSize: 14,
    color: CYAN,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    color: WHITE,
    lineHeight: 24,
    marginBottom: 12,
  },
  cardContent: {
    gap: 4,
  },
  cardText: {
    fontSize: 16,
    color: WHITE75,
    lineHeight: 24,
  },
  affirmationText: {
    fontSize: 20,
    color: GOLD,
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 30,
    textAlign: "center",
    fontStyle: "italic",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(145,196,227,0.1)",
    borderWidth: 1,
    borderColor: BORDER,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_500Medium",
  },
  navButtonTextDisabled: {
    color: WHITE55,
  },
  navButtonNext: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CYAN20,
    borderWidth: 1,
    borderColor: CYAN + "40",
    alignItems: "center",
  },
  navButtonTextNext: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  completeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  completeButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  completeButtonText: {
    fontSize: 14,
    color: "#03050a",
  },
  dayIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 20,
  },
  dayDot: {
    height: 8,
    borderRadius: 4,
  },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  completionEmoji: {
    fontSize: 64,
  },
  completionTitle: {
    fontSize: 24,
    color: WHITE,
  },
  pointsRow: {
    alignItems: "center",
    gap: 4,
  },
  pointsAwarded: {
    fontSize: 48,
    color: GOLD,
  },
  pointsLabel: {
    fontSize: 16,
    color: WHITE55,
  },
  completionSubtext: {
    fontSize: 14,
    color: WHITE55,
    textAlign: "center",
    lineHeight: 20,
  },
  doneButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  doneButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#03050a",
  },
});
