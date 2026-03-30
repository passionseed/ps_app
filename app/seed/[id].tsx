import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Image,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppText } from "../../components/AppText";
import { GlassButton } from "../../components/Glass";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { useAuth } from "../../lib/auth";
import {
  getSeedById,
  getPathBySeedId,
  getRecommendedSeeds,
  getUserEnrollment,
  enrollInPath,
  getPathDays,
  getPathDayActivities,
  getExpertForSeed,
  getEnrollmentDayBundle,
  resetEnrollment,
  invalidateActivityCache,
  type ExpertInfo,
} from "../../lib/pathlab";
import { warmPathDayBundle, clearEnrollmentCache, markEnrollmentReset } from "../../lib/pathlabSession";
import { formatPathDayLabel } from "../../lib/pathlab-day-label";
import type { Seed } from "../../types/seeds";
import type { Path, PathEnrollment, PathDay } from "../../types/pathlab";
import type { SeedRecommendation } from "../../lib/seedRecommendations";

/** Fixed hero cover height; scroll spacer = this minus overlap so the card sits under the image. */
const COVER_IMAGE_HEIGHT = 300;
const HERO_CARD_OVERLAP = 32;
/** Taller than clip so parallax / pull-scale does not show gaps */
const COVER_PARALLAX_HEIGHT = COVER_IMAGE_HEIGHT * 1.22;

function getActivityIcon(type: string): string {
  switch (type) {
    case "npc_chat": return "💬";
    case "ai_chat": return "🤖";
    case "video":
    case "short_video": return "🎬";
    case "text": return "📖";
    case "daily_prompt": return "💡";
    case "quiz": return "❓";
    case "daily_reflection": return "💭";
    case "text_answer": return "✍️";
    case "checklist": return "✓";
    default: return "📋";
  }
}

export default function SeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { appLanguage, isGuest, session } = useAuth();

  const [seed, setSeed] = useState<Seed | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [enrollment, setEnrollment] = useState<PathEnrollment | null>(null);
  const [pathDays, setPathDays] = useState<Pick<PathDay, "id" | "day_number" | "title">[]>([]);
  const [dayActivities, setDayActivities] = useState<Record<string, { title: string; content_type: string }[]>>({});
  const [expert, setExpert] = useState<ExpertInfo | null>(null);
  const [recommendation, setRecommendation] = useState<SeedRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const guestCopy =
    appLanguage === "th"
      ? {
          signInTitle: "เข้าสู่ระบบก่อน",
          signInBody: "คุณต้องเข้าสู่ระบบก่อนเพื่อเริ่มเส้นทางนี้",
          cancel: "ยกเลิก",
          signIn: "เข้าสู่ระบบ",
          errorTitle: "เกิดข้อผิดพลาด",
          errorBody: "เริ่มเส้นทางไม่สำเร็จ ลองใหม่อีกครั้ง",
          loadFailedTitle: "เชื่อมต่อไม่ได้ชั่วคราว",
          retry: "ลองอีกครั้ง",
          comingSoonTitle: "เร็ว ๆ นี้",
          comingSoonBody: "เส้นทางนี้กำลังพัฒนาอยู่ กลับมาดูใหม่นะ!",
          back: "กลับ",
          about: "📖 เกี่ยวกับเส้นทางนี้",
          days: (totalDays: number) => `📅 เส้นทาง ${totalDays} วัน`,
          done: "เสร็จ",
          today: "วันนี้",
          startCurrentDay: (dayNumber: number) => `เริ่มวัน ${dayNumber}`,
          startPath: "เริ่มเส้นทางนี้",
        }
      : {
          signInTitle: "Sign in first",
          signInBody: "You need to sign in before starting this path.",
          cancel: "Cancel",
          signIn: "Sign in",
          errorTitle: "Error",
          errorBody: "Failed to start this path. Please try again.",
          loadFailedTitle: "Temporary connection issue",
          retry: "Try again",
          comingSoonTitle: "Coming Soon!",
          comingSoonBody: "This path is still in development. Check back soon.",
          back: "Back",
          about: "📖 About this path",
          days: (totalDays: number) => `📅 ${totalDays}-day path`,
          done: "Done",
          today: "Today",
          startCurrentDay: (dayNumber: number) => `Start day ${dayNumber}`,
          startPath: "Start this path",
        };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setLoadError(null);

    try {
      console.log("[SeedDetail] Loading seed:", id);

      // Round 1: load seed, expert, path, and recommendation snapshot in parallel.
      const [seedData, expertData, pathData, recommendationPayload] = await Promise.all([
        getSeedById(id),
        getExpertForSeed(id),
        getPathBySeedId(id),
        getRecommendedSeeds().catch(() => null),
      ]);

      console.log("[SeedDetail] Seed loaded:", seedData?.title);
      setSeed(seedData);
      console.log("[SeedDetail] Expert loaded:", expertData?.name);
      setExpert(expertData);
      console.log("[SeedDetail] Path loaded:", pathData?.id);
      setPath(pathData);
      setRecommendation(
        recommendationPayload?.seeds.find((item) => item.id === id) ?? null,
      );

      if (!seedData) {
        setLoading(false);
        return;
      }

      if (pathData) {
        // Round 2: load enrollment and path days in parallel — both need `pathData.id`
        const [enrollmentData, daysData] = await Promise.all([
          session?.user ? getUserEnrollment(pathData.id) : Promise.resolve(null),
          getPathDays(pathData.id),
        ]);

        console.log("[SeedDetail] Enrollment:", enrollmentData?.status);
        setEnrollment(enrollmentData);
        console.log("[SeedDetail] Path days loaded:", daysData.length);
        setPathDays(daysData);

        // Load activities for each day (no enrollment context needed)
        const activitiesPerDay = await Promise.all(
          daysData.map((day) => getPathDayActivities(day.id).catch(() => []))
        );
        const activitiesMap: Record<string, { title: string; content_type: string }[]> = {};
        daysData.forEach((day, i) => {
          activitiesMap[day.id] = activitiesPerDay[i].map((a) => ({
            title: a.title,
            content_type: a.path_content?.[0]?.content_type ?? a.path_assessment?.assessment_type ?? "unknown",
          }));
        });
        setDayActivities(activitiesMap);
      }
    } catch (error) {
      console.error("[SeedDetail] Error loading data:", error);
      setLoadError(
        error instanceof Error ? error.message : "Unable to load this path. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (isGuest || !session) {
      Alert.alert(
        guestCopy.signInTitle,
        guestCopy.signInBody,
        [
          { text: guestCopy.cancel, style: "cancel" },
          { text: guestCopy.signIn, onPress: () => router.replace("/") },
        ]
      );
      return;
    }

    if (!path) return;

    setEnrolling(true);
    try {
      const newEnrollment = await enrollInPath({ pathId: path.id });
      setEnrollment(newEnrollment);
      await navigateToCurrentActivity(newEnrollment.id);
    } catch (error) {
      console.error("[SeedDetail] Error enrolling:", error);
      Alert.alert(guestCopy.errorTitle, guestCopy.errorBody);
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    if (enrollment) {
      setEnrolling(true);
      void navigateToCurrentActivity(enrollment.id);
    }
  };

  const handleReset = async () => {
    console.log("[SeedDetail] handleReset called, enrollment:", enrollment?.id);
    if (!enrollment) return;
    Alert.alert("Reset Progress", "This will delete all activity progress and restart from Day 1.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          console.log("[SeedDetail] Resetting enrollment:", enrollment.id);
          try {
            // Reset DB first, then navigate
            markEnrollmentReset(enrollment.id);
            await resetEnrollment(enrollment.id);
            console.log("[SeedDetail] Reset successful");
            invalidateActivityCache();
            clearEnrollmentCache(enrollment.id);
            await navigateToCurrentActivity(enrollment.id);
          } catch (error) {
            console.error("[SeedDetail] Reset failed:", error);
            Alert.alert("Error", "Failed to reset progress.");
          }
        },
      },
    ]);
  };

  const navigateToCurrentActivity = async (enrollmentId: string) => {
    try {
      const dayBundle = await getEnrollmentDayBundle(enrollmentId);

      if (!dayBundle) {
        router.push(`/reflection/${enrollmentId}`);
        return;
      }

      warmPathDayBundle(enrollmentId, dayBundle);

      const firstIncomplete = dayBundle.activities.find(
        (activity) => activity.progress?.status !== "completed"
      );

      if (!firstIncomplete) {
        // All activities done for the day — go reflect
        router.push(`/reflection/${enrollmentId}`);
        return;
      }

      const activityIndex = dayBundle.activities.findIndex(
        (activity) => activity.id === firstIncomplete.id
      );

      router.push(
        `/activity/${firstIncomplete.id}?enrollmentId=${enrollmentId}&pageIndex=${activityIndex}&totalPages=${dayBundle.activities.length}`
      );
    } catch (error) {
      console.error("[SeedDetail] Error preloading day bundle:", error);
      router.push(`/reflection/${enrollmentId}`);
    } finally {
      setEnrolling(false);
    }
  };

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const coverParallaxStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const pull = y < 0 ? y : 0;
    const down = Math.max(0, y);
    const translateY = pull * 0.48 - down * 0.42;
    const scale = interpolate(pull, [-160, 0], [1.12, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const topFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100, 220], [1, 0.5, 0.28], Extrapolation.CLAMP),
  }));

  const headerBarStyle = useAnimatedStyle(() => {
    const o = interpolate(scrollY.value, [0, 48, 130], [0, 0.92, 1], Extrapolation.CLAMP);
    return {
      backgroundColor: `rgba(248, 249, 250, ${o})`,
      borderBottomWidth: o > 0.14 ? 1 : 0,
      borderBottomColor: "rgba(0,0,0,0.07)",
    };
  });

  /** Compact title — fades in as the hero title scrolls away */
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [64, 128], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [64, 128], [6, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const heroTitleVisibilityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 110], [1, 0], Extrapolation.CLAMP),
  }));

  if (loading) {
    return <AnimatedSplash />;
  }

  if (loadError) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <AppText style={s.backBtnIcon}>‹</AppText>
          </Pressable>
        </View>
        <View style={s.center}>
          <AppText
            variant="bold"
            style={{ fontSize: 24, color: "#111", marginBottom: 8 }}
          >
            {guestCopy.loadFailedTitle}
          </AppText>
          <AppText
            style={{
              fontSize: 14,
              color: "#6B7280",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {loadError}
          </AppText>
          <Pressable style={s.ctaBtn} onPress={() => {
            setLoading(true);
            void loadData();
          }}>
            <AppText variant="bold" style={s.ctaBtnText}>
              {guestCopy.retry}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!seed || !path) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <AppText style={s.backBtnIcon}>‹</AppText>
          </Pressable>
        </View>
        <View style={s.center}>
          <AppText
            variant="bold"
            style={{ fontSize: 24, color: "#111", marginBottom: 8 }}
          >
            {guestCopy.comingSoonTitle}
          </AppText>
          <AppText
            style={{
              fontSize: 14,
              color: "#6B7280",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {guestCopy.comingSoonBody}
          </AppText>
          <Pressable style={s.ctaBtn} onPress={() => router.back()}>
            <AppText variant="bold" style={s.ctaBtnText}>
              {guestCopy.back}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const isEnrolled = enrollment && enrollment.status !== "quit";
  const currentDay = enrollment?.current_day || 1;

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Cover — clipped; inner layer parallax-scrolls */}
      <View style={s.coverClip}>
        <Animated.View style={[s.coverParallaxInner, coverParallaxStyle]}>
          {seed.cover_image_url ? (
            <Image
              source={
                typeof seed.cover_image_url === "string"
                  ? { uri: seed.cover_image_url }
                  : seed.cover_image_url
              }
              style={s.coverImageFill}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#EEF6E3", "#FDFFF5", "#E8F0E0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.coverImageFill}
            />
          )}
        </Animated.View>
      </View>

      <Animated.View
        style={[s.coverTopFade, { height: insets.top + 72 }, topFadeStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.12)", "transparent"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Header — scrim + compact title when scrolled */}
      <Animated.View
        style={[
          s.header,
          { paddingTop: insets.top + 12, paddingBottom: 12 },
          headerBarStyle,
        ]}
      >
        <View style={s.headerRow}>
          <Pressable
            style={s.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <AppText style={s.backBtnIcon}>‹</AppText>
          </Pressable>
          <Animated.View style={[s.headerTitleWrap, headerTitleStyle]} pointerEvents="none">
            <AppText variant="bold" style={s.headerTitleText} numberOfLines={1}>
              {seed.title}
            </AppText>
          </Animated.View>
          <View style={s.headerTitleBalance} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Spacer height + hero negative margin = start of card at (cover height − overlap) */}
        <View style={[s.coverSpacer, { height: COVER_IMAGE_HEIGHT }]} />

        {/* Content card with title */}
        <Animated.View
          entering={FadeInDown.springify().damping(22).stiffness(180).delay(40)}
          style={s.heroContentCard}
        >
          <Animated.View style={heroTitleVisibilityStyle}>
            <AppText variant="bold" style={s.seedTitle}>
              {seed.title}
            </AppText>
          </Animated.View>
          {expert && (
            <View style={s.expertRow}>
              <AppText style={s.expertLabel}>โดย </AppText>
              <AppText variant="bold" style={s.expertName}>{expert.name}</AppText>
              {expert.title && (
                <AppText style={s.expertTitle}> • {expert.title}</AppText>
              )}
            </View>
          )}
          {seed.slogan && (
            <AppText style={s.seedSlogan}>{seed.slogan}</AppText>
          )}
        </Animated.View>

        {/* Scroll hint */}
        <View style={s.scrollHint}>
          <AppText style={s.scrollHintText}>scroll for more</AppText>
          <AppText style={s.scrollHintArrow}>↓</AppText>
        </View>

        {/* Description */}
        {seed.description && (
          <Animated.View
            entering={FadeInDown.springify().damping(24).stiffness(200).delay(110)}
            style={s.card}
          >
            <AppText variant="bold" style={s.cardTitle}>
              {guestCopy.about}
            </AppText>
            <AppText style={s.descriptionText}>{seed.description}</AppText>
          </Animated.View>
        )}

        {recommendation && recommendation.reasons.length > 0 && (
          <Animated.View
            entering={FadeInDown.springify().damping(24).stiffness(200).delay(180)}
            style={s.card}
          >
            <AppText variant="bold" style={s.cardTitle}>
              {appLanguage === "th"
                ? "🌟 ทำไมเส้นทางนี้ถึงแนะนำ"
                : "🌟 Why this path is recommended"}
            </AppText>
            <View style={s.recommendationMetaRow}>
              <AppText style={s.recommendationScore}>
                #{recommendation.bucket === "continue" ? "Now" : Math.max(1, recommendation.recommendationScore)}
              </AppText>
              <AppText style={s.recommendationMetaText}>
                {appLanguage === "th"
                  ? "อิงจากความสนใจ เป้าหมาย และการสำรวจที่ผ่านมา"
                  : "Based on your interests, goals, and exploration history"}
              </AppText>
            </View>
            <View style={s.recommendationReasonList}>
              {recommendation.reasons.map((reason) => (
                <View key={reason.code} style={s.recommendationReasonItem}>
                  <AppText variant="bold" style={s.recommendationReasonLabel}>
                    {reason.label}
                  </AppText>
                  <AppText style={s.recommendationReasonDetail}>
                    {reason.detail}
                  </AppText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Path Days */}
        {pathDays.length > 0 && (
          <Animated.View
            entering={FadeInDown.springify().damping(24).stiffness(200).delay(250)}
            style={s.card}
          >
            <AppText variant="bold" style={s.cardTitle}>
              {guestCopy.days(path.total_days)}
            </AppText>
            {pathDays.map((day, i) => {
              const isDone = enrollment && currentDay > day.day_number;
              const isActive = enrollment && currentDay === day.day_number;

              return (
                <View key={day.day_number} style={s.dayRow}>
                  {/* Connector Line */}
                  {i > 0 && (
                    <View
                      style={[
                        s.connectorLine,
                        isDone ? s.connectorDone : s.connectorPending,
                      ]}
                    />
                  )}

                  {/* Circle */}
                  <View
                    style={[
                      s.dayCircle,
                      isDone && s.dayCircleDone,
                      isActive && s.dayCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <AppText style={s.dayCheckmark}>✓</AppText>
                    ) : (
                      <AppText
                        style={[s.dayNum, isActive && { color: "#fff" }]}
                      >
                        {day.day_number}
                      </AppText>
                    )}
                  </View>

                  {/* Label + activities */}
                  <View style={s.dayLabelCol}>
                    <AppText
                      variant={isActive ? "bold" : "regular"}
                      style={[s.dayTitle, isDone && s.dayTitleDone]}
                    >
                      {formatPathDayLabel(day.day_number, day.title)}
                    </AppText>
                    {(dayActivities[day.id] ?? []).map((act, ai) => (
                      <View key={ai} style={s.activityItem}>
                        <AppText style={s.activityIcon}>{getActivityIcon(act.content_type)}</AppText>
                        <AppText style={s.activityTitle} numberOfLines={1}>{act.title}</AppText>
                      </View>
                    ))}
                  </View>

                  {/* Status */}
                  {isDone && (
                    <View style={s.dayDoneBadge}>
                      <AppText style={s.dayDoneText}>{guestCopy.done}</AppText>
                    </View>
                  )}
                  {isActive && (
                    <View style={s.dayActiveBadge}>
                      <AppText style={s.dayActiveText}>{guestCopy.today}</AppText>
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* CTA */}
      <Animated.View
        entering={FadeIn.delay(300).duration(420)}
        style={[s.ctaBar, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={s.ctaGradient} />
        <GlassButton
          variant="primary"
          size="large"
          fullWidth
          onPress={isEnrolled ? handleContinue : handleEnroll}
          loading={enrolling}
          disabled={enrolling}
        >
          {isEnrolled
            ? guestCopy.startCurrentDay(currentDay)
            : guestCopy.startPath}
        </GlassButton>
        {isEnrolled && (
          <GlassButton
            variant="secondary"
            size="small"
            fullWidth
            onPress={handleReset}
            style={{ marginTop: 10 }}
          >
            Restart (for test only)
          </GlassButton>
        )}
      </Animated.View>

      {enrolling && (
        <View style={s.loadingOverlay}>
          <AnimatedSplash />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  coverClip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: COVER_IMAGE_HEIGHT,
    overflow: "hidden",
    zIndex: 0,
  },
  coverParallaxInner: {
    width: "100%",
    height: COVER_PARALLAX_HEIGHT,
  },
  coverImageFill: {
    width: "100%",
    height: "100%",
  },
  coverTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  coverSpacer: {
    // Spacer in scroll content to push content below cover image
  },

  // Header - overlays cover image
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 17,
    color: "#111827",
    textAlign: "center",
  },
  /** Same width as back button so the title stays visually centered */
  headerTitleBalance: {
    width: 38,
    height: 38,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  backBtnIcon: {
    fontSize: 20,
    color: "#111",
    fontFamily: "BaiJamjuree_400Regular",
  },

  scrollContent: {
    paddingHorizontal: 0,
  },

  // Hero content card - white card below cover image
  heroContentCard: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -HERO_CARD_OVERLAP,
  },
  seedTitle: {
    fontSize: 28,
    color: "#111827",
    lineHeight: 36,
    fontFamily: "BaiJamjuree_700Bold",
  },
  expertRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  expertLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
  },
  expertName: {
    fontSize: 13,
    color: "#111827",
    fontFamily: "BaiJamjuree_700Bold",
  },
  expertTitle: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
  },
  seedSlogan: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: 8,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    color: "#111827",
    marginBottom: 16,
    fontFamily: "BaiJamjuree_700Bold",
  },
  descriptionText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 24,
    fontFamily: "BaiJamjuree_400Regular",
  },
  recommendationMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  recommendationScore: {
    fontSize: 12,
    color: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontFamily: "BaiJamjuree_700Bold",
  },
  recommendationMetaText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  recommendationReasonList: {
    gap: 12,
  },
  recommendationReasonItem: {
    gap: 4,
  },
  recommendationReasonLabel: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "BaiJamjuree_700Bold",
  },
  recommendationReasonDetail: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  connectorLine: {
    position: "absolute",
    left: 15.5,
    top: -12,
    width: 1,
    height: 24,
  },
  connectorDone: { backgroundColor: "#10B981" },
  connectorPending: { backgroundColor: "#E5E7EB" },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dayCircleDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  dayCircleActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  dayCheckmark: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "BaiJamjuree_700Bold",
  },
  dayNum: {
    fontSize: 13,
    color: "#9CA3AF",
    fontFamily: "BaiJamjuree_700Bold",
  },

  dayLabelCol: { flex: 1 },
  dayTitle: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
  },
  dayTitleDone: { color: "#111827" },

  dayDoneBadge: {
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dayDoneText: {
    fontSize: 11,
    color: "#10B981",
    fontFamily: "BaiJamjuree_700Bold",
  },
  dayActiveBadge: {
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dayActiveText: {
    fontSize: 11,
    color: "#3B82F6",
    fontFamily: "BaiJamjuree_700Bold",
  },

  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  ctaGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F8F9FA",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  ctaBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ctaBtnText: {
    fontSize: 18,
    color: "#111827",
    fontFamily: "BaiJamjuree_700Bold",
  },
  scrollHint: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
    opacity: 0.4,
  },
  scrollHintText: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
    letterSpacing: 0.5,
  },
  scrollHintArrow: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  activityIcon: {
    fontSize: 12,
  },
  activityTitle: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
  },
});
