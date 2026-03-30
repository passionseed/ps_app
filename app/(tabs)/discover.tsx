import { useRef, useState, useCallback } from "react";
import {
  View,
  Animated,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import {
  buildFallbackRecommendations,
  buildSeedRecommendationSections,
} from "../../lib/seedRecommendations";
import type { SeedWithEnrollment } from "../../types/seeds";
import { AppText as Text } from "../../components/AppText";
import { Accent } from "../../lib/theme";
import { SAMPLE_SEEDS } from "../../components/discover/constants";
import { getDiscoverScrollInterpolations } from "../../components/discover/scrollInterpolations";
import { useDiscoverSeeds } from "../../components/discover/useDiscoverSeeds";
import { styles } from "../../components/discover/discoverStyles";
import {
  ProgressSection,
  SeedSection,
} from "../../components/discover/DiscoverSeedSections";

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { appLanguage, user, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const compactSearchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [inlineSearchMode, setInlineSearchMode] = useState(false);

  const { seeds, recommendations, loading, refreshing, onRefresh } =
    useDiscoverSeeds({ isGuest, userId: user?.id });

  const {
    titleScale,
    titleOpacity,
    titleTranslateY,
    smallTitleOpacity,
    smallTitleTranslateY,
    searchBarTranslateY,
    searchBarOpacity,
    searchBarScale,
    compactSearchOpacity,
    headerBgOpacity,
  } = getDiscoverScrollInterpolations(scrollY);

  const handleCompactSearchTap = useCallback(() => {
    setInlineSearchMode(true);
    setTimeout(() => {
      compactSearchInputRef.current?.focus();
    }, 100);
  }, []);

  const handleInlineSearchClose = useCallback(() => {
    setInlineSearchMode(false);
    compactSearchInputRef.current?.blur();
  }, []);

  const handleSearchSubmit = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setInlineSearchMode(false);
  }, []);

  const fallbackPayload = buildFallbackRecommendations(
    seeds.length > 0 ? seeds : (SAMPLE_SEEDS as SeedWithEnrollment[]),
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

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 88,
          },
        ]}
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
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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
      </Animated.ScrollView>

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
        <LinearGradient
          colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.stickyHeaderContent} pointerEvents="box-none">
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
