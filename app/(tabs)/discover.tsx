import { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { getProfile } from "../../lib/onboarding";
import { getAvailableSeeds } from "../../lib/pathlab";
import type { SeedWithEnrollment } from "../../types/seeds";
import { AppText } from "../../components/AppText";
import { FireStreakIcon } from "../../components/icons/FireStreakIcon";

const SAMPLE_SEEDS: Partial<SeedWithEnrollment>[] = [
  {
    id: "sample-1",
    title: "Software Engineer",
    slogan: "Build the future with code",
    cover_image_url: require("../../assets/images/se_cover_1773089983030.png"),
  },
  {
    id: "sample-2",
    title: "UX Designer",
    slogan: "Craft beautiful experiences",
    cover_image_url: require("../../assets/images/ux_cover_1773089994116.png"),
  },
  {
    id: "sample-3",
    title: "Data Scientist",
    slogan: "Unlock insights from data",
    cover_image_url: require("../../assets/images/ds_cover_1773090008206.png"),
  },
  {
    id: "sample-4",
    title: "Product Manager",
    slogan: "Lead product innovation",
    cover_image_url: require("../../assets/images/pm_cover_1773090022131.png"),
  },
  {
    id: "sample-5",
    title: "Marketing Specialist",
    slogan: "Tell compelling stories",
    cover_image_url: require("../../assets/images/marketing_cover_1773090176143.png"),
  },
  {
    id: "sample-6",
    title: "Mechanical Engineer",
    slogan: "Design the physical world",
    cover_image_url: require("../../assets/images/mech_eng_cover_1773090190460.png"),
  },
  {
    id: "sample-7",
    title: "Teacher",
    slogan: "Inspire the next generation",
    cover_image_url: require("../../assets/images/teacher_cover_1773090202433.png"),
  },
  {
    id: "sample-8",
    title: "Nurse",
    slogan: "Care for those in need",
    cover_image_url: require("../../assets/images/nurse_cover_1773090217616.png"),
  },
  {
    id: "sample-9",
    title: "Entrepreneur",
    slogan: "Build your own business",
    cover_image_url: null,
  },
  {
    id: "sample-10",
    title: "Cybersecurity Analyst",
    slogan: "Protect the digital realm",
    cover_image_url: null,
  },
  {
    id: "sample-11",
    title: "Game Developer",
    slogan: "Create new worlds",
    cover_image_url: null,
  },
  {
    id: "sample-12",
    title: "3D Animator",
    slogan: "Bring characters to life",
    cover_image_url: null,
  },
];

export default function DiscoverScreen() {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const [isThai, setIsThai] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user?.id) {
      getProfile(user.id).then((p) => {
        if (p?.preferred_language === "th") {
          setIsThai(true);
        }
      });
    }
  }, [user?.id]);

  const loadSeeds = useCallback(async () => {
    try {
      const data = await getAvailableSeeds();
      setSeeds(data);
    } catch (error) {
      console.error("Failed to load seeds:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSeeds();
  }, [loadSeeds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const appVersion = "dev"; // or keep logic from profile

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
        <AppText style={styles.loadingText}>
          {isThai ? "กำลังโหลดเส้นทาง..." : "Loading paths..."}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Player Header Section */}
        <View style={[styles.playerHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.avatarContainer}>
            <Image
              source={require("../../assets/passionseed-logo.svg")}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <AppText variant="bold" style={styles.playerName}>
            {user?.user_metadata?.full_name ||
              user?.user_metadata?.name ||
              "Player 1"}
          </AppText>
          <View style={styles.titleBadge}>
            <AppText style={styles.titleBadgeText}>Level 3 Explorer</AppText>
          </View>
        </View>

        {/* Following sections will go here... */}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function SeedSection({
  title,
  seeds,
}: {
  title: string;
  seeds: SeedWithEnrollment[];
}) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
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
              if (!seed.id.startsWith("sample-")) {
                router.push(`/seed/${seed.id}`);
              }
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
  seeds: SeedWithEnrollment[];
}) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
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
            progress={index === 0 ? 0.6 : index === 1 ? 0.25 : 0.8} // Mock progress
            onPress={() => {
              if (!seed.id.startsWith("sample-")) {
                router.push(`/seed/${seed.id}`);
              }
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
  onPress,
}: {
  seed: SeedWithEnrollment;
  progress: number;
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
            <AppText style={styles.compactImageIcon}>🌱</AppText>
          </View>
        )}

        {/* Gamified Fire Streak */}
        <View style={styles.streakIconContainer}>
          <FireStreakIcon
            width={48}
            height={48}
            count={index === 0 ? 12 : index === 1 ? 5 : 2}
          />
        </View>

        {/* Gradient Overlay at Bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.95)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <AppText variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </AppText>

          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
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
  seed: SeedWithEnrollment;
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
            <AppText style={styles.compactImageIcon}>🌱</AppText>
          </View>
        )}

        {/* Gradient Overlay at Bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.85)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <AppText variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </AppText>
          {seed.slogan && (
            <AppText style={styles.compactSlogan} numberOfLines={1}>
              {seed.slogan}
            </AppText>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  playerHeader: {
    alignItems: "center",
    paddingBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#10B981", // glowing effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 50,
    height: 50,
  },
  playerName: {
    fontSize: 24,
    color: "#111827",
    marginBottom: 8,
  },
  titleBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Light green mint
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  titleBadgeText: {
    color: "#10B981",
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 24, // Consistent general offset
  },
  sectionGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 0, // Removed to allow programmatic left-margin via indexing
    paddingRight: 24, // Keep right cut off clean
  },
  fullWidthScroll: {
    marginHorizontal: -16, // Negate any parent padding if present to ensure bleed to edges
  },
  compactTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 18,
    marginBottom: 4,
  },
  compactSlogan: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 14,
  },
  compactCardWrapper: {
    width: 140,
    marginRight: 0, // Gap gives the space now
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  compactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    overflow: "hidden",
    height: 200,
    position: "relative",
  },
  compactCardPressed: {
    opacity: 0.8,
  },
  compactImageFull: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#F9F5FF",
  },
  compactImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F5FF",
  },
  compactImageIcon: {
    fontSize: 48,
  },
  streakIconContainer: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 10,
  },
  compactOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 40,
    gap: 4,
    justifyContent: "flex-end",
  },
  progressBarContainer: {
    height: 4,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981", // Success green to denote progress
    borderRadius: 2,
  },
  emptyCard: {
    width: 140, // Match compactCardWrapper width
    backgroundColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(206, 206, 206, 0.5)",
    borderStyle: "dashed",
    height: 200,
    marginRight: 0,
  },
});
