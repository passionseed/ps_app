import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { getAvailableSeeds, getRecommendedSeeds } from "../../lib/pathlab";
import { supabase } from "../../lib/supabase";
import type { SeedWithEnrollment } from "../../types/seeds";
import { AppText as Text } from "../../components/AppText";
import {
  buildFallbackRecommendations,
  buildSeedRecommendationSections,
  hydrateRecommendationSeedMedia,
  type SeedRecommendation,
  type SeedRecommendationsPayload,
} from "../../lib/seedRecommendations";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Gradient,
  Accent,
  Space,
  Type,
} from "../../lib/theme";

// Animation constants - Apple HIG values
const ANIMATION_CONFIG = {
  // Large title: 34pt bold → Small title: 17pt (in nav bar)
  largeTitleHeight: 96,
  smallTitleHeight: 44,
  searchBarHeight: 48,
  // Animation triggers when scroll passes this threshold
  collapseThreshold: 50,
  // Header collapse completion point
  headerCollapsedAt: 80,
};

const SAMPLE_SEEDS: Partial<SeedWithEnrollment>[] = [
  {
    id: "sample-1",
    title: "Software Engineer",
    slogan: "Build the future with code",
    cover_image_url: require("../../assets/images/se_tangible.png"),
  },
  {
    id: "sample-2",
    title: "UX Designer",
    slogan: "Craft beautiful experiences",
    cover_image_url: require("../../assets/images/ux_tangible.png"),
  },
  {
    id: "sample-3",
    title: "Data Scientist",
    slogan: "Unlock insights from data",
    cover_image_url: require("../../assets/images/ds_tangible.png"),
  },
  {
    id: "sample-4",
    title: "Dentist",
    slogan: "Design confident smiles",
    cover_image_url: require("../../assets/images/dentist_tangible.png"),
  },
  {
    id: "sample-5",
    title: "Lawyer",
    slogan: "Advocate for justice and rights",
    cover_image_url: require("../../assets/images/lawyer_tangible.png"),
  },
  {
    id: "sample-6",
    title: "Chef",
    slogan: "Create culinary masterpieces",
    cover_image_url: require("../../assets/images/chef_tangible.png"),
  },
  {
    id: "sample-7",
    title: "Architect",
    slogan: "Design the spaces we live in",
    cover_image_url: require("../../assets/images/architect_tangible.png"),
  },
  {
    id: "sample-8",
    title: "Teacher",
    slogan: "Inspire the next generation",
    cover_image_url: require("../../assets/images/teacher_tangible.png"),
  },
  {
    id: "sample-9",
    title: "Nurse",
    slogan: "Care for those in need",
    cover_image_url: require("../../assets/images/nurse_tangible.png"),
  },
  {
    id: "sample-10",
    title: "Product Manager",
    slogan: "Lead product innovation",
    cover_image_url: null,
  },
  {
    id: "sample-11",
    title: "Marketing Specialist",
    slogan: "Tell compelling stories",
    cover_image_url: null,
  },
  {
    id: "sample-12",
    title: "Entrepreneur",
    slogan: "Build your own business",
    cover_image_url: null,
  },
  {
    id: "sample-13",
    title: "Cybersecurity Analyst",
    slogan: "Protect the digital realm",
    cover_image_url: null,
  },
  {
    id: "sample-14",
    title: "Game Developer",
    slogan: "Create new worlds",
    cover_image_url: null,
  },
  {
    id: "sample-15",
    title: "3D Animator",
    slogan: "Bring characters to life",
    cover_image_url: null,
  },
  {
    id: "sample-16",
    title: "Mechanical Engineer",
    slogan: "Design the physical world",
    cover_image_url: null,
  },
];

export default function DiscoverScreen() {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>([]);
  const [recommendations, setRecommendations] =
    useState<SeedRecommendationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { appLanguage, user, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  // Animated values for scroll-based animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const compactSearchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Inline search mode - shows search field in sticky header
  const [inlineSearchMode, setInlineSearchMode] = useState(false);

  const loadSeeds = useCallback(async () => {
    try {
      console.log("[Discover] Loading seeds...");
      const data = await getAvailableSeeds();
      console.log("[Discover] Seeds loaded:", data?.length || 0);

      // For enrolled seeds, check if today's activities are all completed
      if (user?.id && data) {
        const enrolledSeeds = data.filter(s => s.enrollment);

        if (enrolledSeeds.length > 0) {
          // Batch query: fetch all relevant reflections in one round trip
          const { data: reflections } = await supabase
            .from("path_reflections")
            .select("enrollment_id, day_number, created_at")
            .in("enrollment_id", enrolledSeeds.map(s => s.enrollment!.id));

          const today = new Date().toDateString();
          const reflectionMap = new Map(
            (reflections || []).map(r => [r.enrollment_id, r])
          );

          const enrichedSeeds = data.map(seed => {
            if (!seed.enrollment) return seed;
            const ref = reflectionMap.get(seed.enrollment.id);
            const isDoneToday = ref?.created_at
              ? new Date(ref.created_at).toDateString() === today
              : false;
            return { ...seed, enrollment: { ...seed.enrollment, isDoneToday } };
          });

          setSeeds(enrichedSeeds);
          if (!isGuest && user?.id) {
            setRecommendations(
              hydrateRecommendationSeedMedia(
                await getRecommendedSeeds(),
                enrichedSeeds,
              ),
            );
          } else {
            setRecommendations(buildFallbackRecommendations(enrichedSeeds));
          }
        } else {
          setSeeds(data);
          setRecommendations(buildFallbackRecommendations(data));
        }
      } else {
        setSeeds(data || []);
        setRecommendations(buildFallbackRecommendations(data || []));
      }
    } catch (error) {
      console.error("[Discover] Failed to load seeds:", error);
      setSeeds([]);
      setRecommendations(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, user?.id]);

  // Force loading to false after timeout as failsafe
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("[Discover] Loading timeout - forcing ready state");
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    loadSeeds();
  }, [loadSeeds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSeeds();
  }, [loadSeeds]);

  // Interpolations for large title → small title animation
  const titleScale = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0.85],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  // Small title (in navigation bar) animations
  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [ANIMATION_CONFIG.collapseThreshold * 0.5, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const smallTitleTranslateY = scrollY.interpolate({
    inputRange: [ANIMATION_CONFIG.collapseThreshold * 0.5, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [-10, 0],
    extrapolate: "clamp",
  });

  // Search bar animations
  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  const searchBarOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold * 0.8],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const searchBarScale = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  // Compact search icon (shows when scrolled)
  const compactSearchOpacity = scrollY.interpolate({
    inputRange: [ANIMATION_CONFIG.collapseThreshold * 0.6, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Header background blur opacity
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Handler for compact search tap - Apple HIG style inline search
  const handleCompactSearchTap = useCallback(() => {
    setInlineSearchMode(true);
    // Focus the inline search input after a brief delay for animation
    setTimeout(() => {
      compactSearchInputRef.current?.focus();
    }, 100);
  }, []);

  // Handler for closing inline search
  const handleInlineSearchClose = useCallback(() => {
    setInlineSearchMode(false);
    compactSearchInputRef.current?.blur();
  }, []);

  // Handler for search submission - scroll to top smoothly
  const handleSearchSubmit = useCallback(() => {
    // Smooth scroll to top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    // Exit inline search mode
    setInlineSearchMode(false);
  }, []);

  const fallbackPayload = buildFallbackRecommendations(
    seeds.length > 0
      ? seeds
      : (SAMPLE_SEEDS as SeedWithEnrollment[]),
  );
  const displayRecommendations = recommendations ?? fallbackPayload;
  const filteredRecommendations = displayRecommendations.seeds.filter((seed) => {
    if (!searchQuery.trim()) return true;

    const haystack =
      `${seed.title} ${seed.slogan ?? ""} ${seed.description ?? ""}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });
  const sections = buildSeedRecommendationSections(filteredRecommendations);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Accent.yellow} />
        <Text style={styles.loadingText}>
          {isThai ? "กำลังโหลดเส้นทาง..." : "Loading paths..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Main ScrollView with Animated Event */}
      <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Expandable Header Section */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 24, 60) }]}>
          {/* Large Title with Animation */}
          <Animated.View
            style={{
              transform: [
                { scale: titleScale },
                { translateY: titleTranslateY },
              ],
              opacity: titleOpacity,
            }}
          >
            <View style={styles.titleRow}>
              <Image
                source={require("../../assets/passionseed-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>
                {isThai ? "ค้นหาเส้นทางของคุณ" : "Discover Your Path"}
              </Text>
            </View>
          </Animated.View>

          {/* Search Bar with Animation */}
          <Animated.View
            style={{
              transform: [{ translateY: searchBarTranslateY }, { scale: searchBarScale }],
              opacity: searchBarOpacity,
            }}
          >
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  isThai && {
                    fontFamily: "BaiJamjuree_400Regular",
                    paddingTop: 4,
                  },
                ]}
                placeholder={isThai ? "ค้นหาเส้นทาง..." : "Search paths..."}
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Animated.View>
        </View>

        <HackathonHeroCard isThai={isThai} />

        {/* Seeds Sections */}
        <CoverageSummaryCard
          coverage={displayRecommendations.coverage}
          source={displayRecommendations.source}
          isThai={isThai}
        />

        {/* Continue Your Path Section */}
        {sections.continue.length > 0 && (
          <ProgressSection
            title={isThai ? "▶️ ทำต่อจากที่ค้างไว้" : "▶️ continue your path"}
            seeds={sections.continue}
          />
        )}

        <SeedSection
          title={isThai ? "🌟 แนะนำสำหรับคุณ" : "🌟 recommended for you"}
          seeds={sections.recommended}
        />

        <SeedSection
          title={isThai ? "💡 สำรวจเพิ่ม" : "💡 explore more"}
          seeds={sections.exploreMore}
        />

        <SeedSection
          title={isThai ? "🗂️ เก็บไว้ก่อน" : "🗂️ lower priority"}
          seeds={sections.deprioritized}
        />

        {/* TCAS Programs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isThai ? "🎓 สาขา TCAS" : "🎓 TCAS Programs"}
          </Text>
          <View style={styles.quickLinks}>
            <Pressable
              style={({ pressed }) => [styles.quickLinkCard, pressed && styles.quickLinkPressed]}
              onPress={() => router.push("/programs")}
            >
              <Text style={styles.quickLinkIcon}>🔍</Text>
              <Text style={styles.quickLinkTitle}>
                {isThai ? "ค้นหาสาขา" : "Browse Programs"}
              </Text>
              <Text style={styles.quickLinkSubtitle}>
                {isThai ? "ค้นหาสาขาที่สนใจ" : "Find your dream program"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickLinkCard, pressed && styles.quickLinkPressed]}
              onPress={() => router.push("/saved")}
            >
              <Text style={styles.quickLinkIcon}>⭐</Text>
              <Text style={styles.quickLinkTitle}>
                {isThai ? "สาขาที่บันทึก" : "Saved Programs"}
              </Text>
              <Text style={styles.quickLinkSubtitle}>
                {isThai ? "ดูสาขาที่สนใจ" : "View your favorites"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickLinkCard, pressed && styles.quickLinkPressed]}
              onPress={() => router.push("/plans")}
            >
              <Text style={styles.quickLinkIcon}>📋</Text>
              <Text style={styles.quickLinkTitle}>
                {isThai ? "แผนสมัคร" : "My Plans"}
              </Text>
              <Text style={styles.quickLinkSubtitle}>
                {isThai ? "วางแผนการสมัคร" : "Plan your applications"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Sticky Navigation Header with Gradient - matches tab bar design */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top + 8,
            opacity: headerBgOpacity,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Gradient background matching tab bar */}
        <LinearGradient
          colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.stickyHeaderContent} pointerEvents="box-none">
          {/* Inline Search Mode - Apple HIG style */}
          {inlineSearchMode ? (
            <Animated.View style={styles.inlineSearchContainer}>
              <TextInput
                ref={compactSearchInputRef}
                style={[
                  styles.inlineSearchInput,
                  isThai && {
                    fontFamily: "BaiJamjuree_400Regular",
                    paddingTop: 4,
                  },
                ]}
                placeholder={isThai ? "ค้นหาเส้นทาง..." : "Search paths..."}
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
              />
              <Pressable
                style={styles.inlineSearchCancelButton}
                onPress={handleInlineSearchClose}
              >
                <Text style={styles.inlineSearchCancelText}>
                  {isThai ? "ยกเลิก" : "Cancel"}
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              {/* Small Title in Navigation Bar */}
              <Animated.View
                style={[
                  styles.smallTitleContainer,
                  {
                    opacity: smallTitleOpacity,
                    transform: [{ translateY: smallTitleTranslateY }],
                  },
                ]}
              >
                <Image
                  source={require("../../assets/passionseed-logo.png")}
                  style={styles.smallLogoImage}
                  resizeMode="contain"
                />
                <Text style={styles.smallHeaderTitle}>
                  {isThai ? "ค้นหาเส้นทาง" : "Discover"}
                </Text>
              </Animated.View>

              {/* Compact Search Icon */}
              <Animated.View
                style={[
                  styles.compactSearchContainer,
                  { opacity: compactSearchOpacity },
                ]}
                pointerEvents="box-none"
              >
                <Pressable
                  style={styles.compactSearchButton}
                  onPress={handleCompactSearchTap}
                >
                  <Text style={styles.compactSearchIcon}>🔍</Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function SeedSection({
  title,
  seeds,
}: {
  title: string;
  seeds: SeedRecommendation[];
}) {
  if (seeds.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionGrid}
        style={styles.fullWidthScroll}
      >
        {seeds.map((seed, index) => (
          <CompactSeedCard
            key={seed.id || `seed-${index}`}
            seed={seed}
            index={index}
            onPress={() => {
              router.push(`/seed/${seed.id}`);
            }}
          />
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - seeds.length) }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.emptyCard} />
        ))}
      </ScrollView>
    </View>
  );
}

function ProgressSection({
  title,
  seeds,
}: {
  title: string;
  seeds: SeedRecommendation[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionGrid}
        style={styles.fullWidthScroll}
      >
        {seeds.map((seed, index) => (
          <ProgressSeedCard
            key={seed.id || `progress-${index}`}
            seed={seed}
            index={index}
            progress={
              seed.enrollment
                ? (seed.enrollment.current_day - 1) / (seed.path?.total_days || 5)
                : 0
            }
            doneToday={seed.enrollment?.isDoneToday || false}
            onPress={() => {
              router.push(`/seed/${seed.id}`);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ProgressSeedCard({
  seed,
  progress,
  index,
  doneToday,
  onPress,
}: {
  seed: SeedRecommendation;
  progress: number;
  index: number;
  doneToday?: boolean;
  onPress: () => void;
}) {
  const totalDays = seed.path?.total_days || 5;
  const daysCompleted = seed.enrollment ? seed.enrollment.current_day - 1 : 0;
  return (
    <View
      style={[styles.compactCardWrapper, index === 0 && { marginLeft: 24 }]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.compactCardPressed,
        ]}
        onPress={onPress}
      >
        {/* Full Background Image or Placeholder */}
        {seed.cover_image_url ? (
          <Image
            source={
              typeof seed.cover_image_url === "string"
                ? { uri: seed.cover_image_url }
                : seed.cover_image_url
            }
            style={styles.compactImageFull}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.compactImageFull, styles.compactImagePlaceholder]}
          >
            <Text style={styles.compactImageIcon}>🌱</Text>
          </View>
        )}

        {/* Gradient Overlay at Bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.95)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <Text variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </Text>

          {doneToday ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✅ done today</Text>
            </View>
          ) : (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {daysCompleted}/{totalDays}
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CompactSeedCard({
  seed,
  index,
  onPress,
}: {
  seed: SeedRecommendation;
  index: number;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.compactCardWrapper, index === 0 && { marginLeft: 24 }]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.compactCardPressed,
        ]}
        onPress={onPress}
      >
        {/* Full Background Image or Placeholder */}
        {seed.cover_image_url ? (
          <Image
            source={
              typeof seed.cover_image_url === "string"
                ? { uri: seed.cover_image_url }
                : seed.cover_image_url
            }
            style={styles.compactImageFull}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.compactImageFull, styles.compactImagePlaceholder]}
          >
            <Text style={styles.compactImageIcon}>🌱</Text>
          </View>
        )}

        {/* Gradient Overlay at Bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.85)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <Text variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </Text>
          {seed.slogan && (
            <Text style={styles.compactSlogan} numberOfLines={1}>
              {seed.slogan}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CoverageSummaryCard({
  coverage,
  source,
  isThai,
}: {
  coverage: SeedRecommendationsPayload["coverage"];
  source: SeedRecommendationsPayload["source"];
  isThai: boolean;
}) {
  const title = isThai ? "ความครอบคลุมการสำรวจ" : "exploration coverage";
  const subtitle =
    source === "cache"
      ? isThai
        ? "แสดงจากแคชและจะรีเฟรชเมื่อออนไลน์"
        : "Showing cached results and refreshing when online"
      : source === "fallback"
        ? isThai
          ? "กำลังใช้รายการสำรอง"
          : "Using fallback ranking"
        : isThai
          ? "อัปเดตล่าสุดจากระบบแนะนำ"
          : "Updated from the recommendation service";

  return (
    <View style={styles.coverageCard}>
      <View style={styles.coverageHeader}>
        <Text style={styles.coverageTitle}>{title}</Text>
        <Text style={styles.coveragePercent}>{coverage.completionPercent}%</Text>
      </View>
      <Text style={styles.coverageSubtitle}>{subtitle}</Text>
      <View style={styles.coverageBarTrack}>
        <View
          style={[
            styles.coverageBarFill,
            { width: `${Math.max(6, coverage.completionPercent)}%` },
          ]}
        />
      </View>
      <View style={styles.coverageStats}>
        <Text style={styles.coverageStat}>
          {isThai ? "กำลังทำ" : "active"} {coverage.activeCount}
        </Text>
        <Text style={styles.coverageStat}>
          {isThai ? "สำรวจแล้ว" : "explored"} {coverage.exploredCount}/
          {coverage.totalCount}
        </Text>
        <Text style={styles.coverageStat}>
          {isThai ? "จบแล้ว" : "completed"} {coverage.completedCount}
        </Text>
      </View>
    </View>
  );
}

function HackathonHeroCard({ isThai }: { isThai: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.hackathonHeroWrap,
        pressed && styles.hackathonHeroPressed,
      ]}
      onPress={() => router.push("/hackathon-program")}
    >
      <LinearGradient
        colors={["#02050C", "#071629", "#12345B", "#2A62A0"]}
        start={{ x: 0.05, y: 0.1 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.hackathonHero}
      >
        <View style={styles.hackathonGlowTop} />
        <View style={styles.hackathonGlowBottom} />
        <View style={styles.hackathonGlowOrb} />
        <View style={styles.hackathonWaveBack} />
        <View style={styles.hackathonWaveMid} />
        <View style={styles.hackathonWaveFront} />
        <View style={styles.hackathonShoreLine} />

        <View style={styles.hackathonHeroContent}>
          <View style={styles.hackathonBadge}>
            <Text style={styles.hackathonBadgeText}>
              {isThai ? "แฮกกาธอนสด" : "live hackathon"}
            </Text>
          </View>

          <Image
            source={require("../../assets/HackLogo.png")}
            style={styles.hackathonLogo}
            resizeMode="contain"
          />

          <Text style={styles.hackathonBody}>
            {isThai
              ? "Playlist-based PathLab สำหรับ phase 1 ของ hackathon: customer discovery, สัมภาษณ์ลูกค้าจริง, และสังเคราะห์ pain point ของทีม"
              : "Playlist-based PathLab for phase 1 of the hackathon: customer discovery, real interviews, and sharper team pain points."}
          </Text>

          <View style={styles.hackathonMetaRow}>
            <View style={styles.hackathonMetaPill}>
              <Text style={styles.hackathonMetaText}>
                {isThai ? "เฟส 1" : "phase 1"}
              </Text>
            </View>
            <View style={styles.hackathonMetaPill}>
              <Text style={styles.hackathonMetaText}>Apr 7-26, 2026</Text>
            </View>
          </View>

          <View style={styles.hackathonCtaRow}>
            <Text style={styles.hackathonCtaText}>
              {isThai ? "เข้าสู่ hackathon playlist" : "enter hackathon playlist"}
            </Text>
            <Text style={styles.hackathonCtaArrow}>↗</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
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

  // Sticky Navigation Header
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(206, 206, 206)",
  },
  stickyHeaderContent: {
    height: ANIMATION_CONFIG.smallTitleHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space["2xl"],
  },
  smallTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  smallLogoImage: {
    width: 24,
    height: 24,
  },
  smallHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  compactSearchContainer: {
    position: "absolute",
    right: Space["2xl"],
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  compactSearchButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Border.default,
    ...Shadow.neutral,
  },
  compactSearchIcon: {
    fontSize: 16,
  },

  // Inline Search (Apple HIG style)
  inlineSearchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  inlineSearchInput: {
    flex: 1,
    height: 36,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 10,
    paddingHorizontal: Space.lg,
    fontFamily: "Orbit_400Regular",
    fontSize: 17,
    color: ThemeText.primary,
  },
  inlineSearchCancelButton: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
  },
  inlineSearchCancelText: {
    fontSize: 17,
    color: Accent.blue || "#007AFF",
    fontWeight: "400",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Space.xl,
    gap: Space["3xl"],
  },

  // Expandable Header
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.lg,
    gap: Space.md,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: ThemeText.primary,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: Space.lg,
    height: ANIMATION_CONFIG.searchBarHeight,
    gap: Space.sm,
    ...Shadow.neutral,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Orbit_400Regular",
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },

  // Sections
  section: {
    gap: Space.md,
  },
  coverageCard: {
    marginHorizontal: Space["2xl"],
    marginTop: Space.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.sm,
    ...Shadow.neutral,
  },
  hackathonHeroWrap: {
    marginTop: Space.sm,
  },
  hackathonHeroPressed: {
    opacity: 0.96,
  },
  hackathonHero: {
    overflow: "hidden",
    minHeight: 316,
  },
  hackathonHeroContent: {
    paddingHorizontal: Space["2xl"],
    paddingTop: Space["2xl"],
    paddingBottom: 92,
    gap: Space.md,
    zIndex: 2,
  },
  hackathonGlowTop: {
    position: "absolute",
    width: 340,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(101,171,252,0.16)",
    top: -52,
    right: -36,
  },
  hackathonGlowBottom: {
    position: "absolute",
    width: 420,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(145,196,227,0.14)",
    bottom: -40,
    left: "10%",
  },
  hackathonGlowOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(145,196,227,0.12)",
    top: 56,
    right: -18,
  },
  hackathonWaveBack: {
    position: "absolute",
    left: -56,
    right: -56,
    bottom: 54,
    height: 64,
    borderRadius: 999,
    backgroundColor: "rgba(101,171,252,0.16)",
    transform: [{ rotate: "-4deg" }],
  },
  hackathonWaveMid: {
    position: "absolute",
    left: -48,
    right: -48,
    bottom: 28,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(101,171,252,0.26)",
    transform: [{ rotate: "2deg" }],
  },
  hackathonWaveFront: {
    position: "absolute",
    left: -44,
    right: -44,
    bottom: 8,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(145,196,227,0.34)",
    transform: [{ rotate: "-1deg" }],
  },
  hackathonShoreLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 46,
    height: 1,
    backgroundColor: "rgba(145,196,227,0.76)",
  },
  hackathonBadge: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
  },
  hackathonBadgeText: {
    fontSize: 11,
    color: "#D6E9FF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hackathonLogo: {
    width: "100%",
    height: 88,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  hackathonBody: {
    maxWidth: "82%",
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(241,245,249,0.9)",
  },
  hackathonMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  hackathonMetaPill: {
    borderRadius: Radius.full,
    backgroundColor: "rgba(3,5,10,0.32)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.18)",
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
  },
  hackathonMetaText: {
    fontSize: 12,
    color: "#D6E9FF",
  },
  hackathonCtaRow: {
    marginTop: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  hackathonCtaText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hackathonCtaArrow: {
    fontSize: 20,
    color: "#91C4E3",
  },
  coverageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  coverageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  coveragePercent: {
    fontSize: 20,
    fontWeight: "700",
    color: Accent.green,
  },
  coverageSubtitle: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  coverageBarTrack: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    overflow: "hidden",
  },
  coverageBarFill: {
    height: "100%",
    borderRadius: Radius.full,
    backgroundColor: Accent.green,
  },
  coverageStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
  },
  coverageStat: {
    fontSize: 12,
    color: ThemeText.secondary,
  },
  sectionTitle: {
    fontSize: Type.label.fontSize,
    color: ThemeText.tertiary,
    textTransform: Type.label.textTransform,
    letterSpacing: Type.label.letterSpacing,
    marginBottom: Space.xs,
    paddingHorizontal: Space["2xl"],
  },
  sectionGrid: {
    flexDirection: "row",
    gap: Space.md,
    paddingHorizontal: 0,
    paddingRight: Space["2xl"],
  },
  fullWidthScroll: {
    marginHorizontal: -5,
  },

  // Cards
  compactTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 18,
    marginBottom: Space.xs,
  },
  compactSlogan: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 14,
  },
  compactCardWrapper: {
    width: 140,
    marginRight: 0,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  compactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    overflow: "hidden",
    height: 240,
    position: "relative",
  },
  compactCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  compactImageFull: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: Gradient.masterCard[1],
  },
  compactImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Gradient.masterCard[1],
  },
  compactImageIcon: {
    fontSize: 48,
  },
  compactOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Space.md,
    paddingTop: 40,
    gap: Space.xs,
    justifyContent: "flex-end",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginTop: Space.xs,
  },
  progressLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    minWidth: 22,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Accent.green,
    borderRadius: 2,
  },
  emptyCard: {
    width: 140,
    backgroundColor: "transparent",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(206, 206, 206, 0.5)",
    borderStyle: "dashed",
    height: 240,
    marginRight: 0,
  },
  doneBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 3,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.md,
    alignSelf: "flex-start",
  },
  doneBadgeText: {
    fontSize: 10,
    color: Accent.green,
    fontFamily: "Orbit_400Regular",
  },

  // Quick Links for TCAS
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
    paddingHorizontal: Space["2xl"],
  },
  quickLinkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    width: "47%",
    ...Shadow.neutral,
  },
  quickLinkPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  quickLinkIcon: {
    fontSize: 28,
    marginBottom: Space.sm,
  },
  quickLinkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: Space.xs,
  },
  quickLinkSubtitle: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
});
