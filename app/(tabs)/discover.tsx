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
import { getAvailableSeeds } from "../../lib/pathlab";
import type { SeedWithEnrollment } from "../../types/seeds";
import { AppText } from "../../components/AppText";

// Sample seeds for when database is empty
const SAMPLE_SEEDS: Partial<SeedWithEnrollment>[] = [
  { id: "sample-1", title: "Software Engineer", slogan: "Build the future with code", cover_image_url: null },
  { id: "sample-2", title: "UX Designer", slogan: "Craft beautiful experiences", cover_image_url: null },
  { id: "sample-3", title: "Data Scientist", slogan: "Unlock insights from data", cover_image_url: null },
  { id: "sample-4", title: "Product Manager", slogan: "Lead product innovation", cover_image_url: null },
  { id: "sample-5", title: "Marketing Specialist", slogan: "Tell compelling stories", cover_image_url: null },
  { id: "sample-6", title: "Mechanical Engineer", slogan: "Design the physical world", cover_image_url: null },
  { id: "sample-7", title: "Teacher", slogan: "Inspire the next generation", cover_image_url: null },
  { id: "sample-8", title: "Nurse", slogan: "Care for those in need", cover_image_url: null },
  { id: "sample-9", title: "Entrepreneur", slogan: "Build your own business", cover_image_url: null },
];

export default function DiscoverScreen() {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    loadSeeds();
  }, [loadSeeds]);

  // Use sample seeds if no real seeds exist
  const displaySeeds = seeds.length > 0 ? seeds : (SAMPLE_SEEDS as SeedWithEnrollment[]);

  // Split seeds into 3 sections
  const youMustLike = displaySeeds.slice(0, 3);
  const maybeULike = displaySeeds.slice(3, 6);
  const notForYou = displaySeeds.slice(6, 9);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
        <AppText style={styles.loadingText}>Loading paths...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <AppText variant="bold" style={styles.headerTitle}>
          Choose your first Seed
        </AppText>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <AppText style={styles.searchIcon}>🔍</AppText>
          <TextInput
            style={styles.searchInput}
            placeholder="Search paths..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Seeds Sections */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* You Must Like */}
        <SeedSection
          title="you must like"
          seeds={youMustLike}
        />

        {/* Maybe U Like */}
        <SeedSection
          title="maybe u like"
          seeds={maybeULike}
        />

        {/* Not For You At All */}
        <SeedSection
          title="not for you at all"
          seeds={notForYou}
        />

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
      <View style={styles.sectionGrid}>
        {seeds.map((seed, index) => (
          <CompactSeedCard
            key={seed.id || `seed-${index}`}
            seed={seed}
            onPress={() => {
              if (!seed.id.startsWith("sample-")) {
                router.push(`/seed/${seed.id}`);
              }
            }}
          />
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: 3 - seeds.length }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.emptyCard} />
        ))}
      </View>
    </View>
  );
}

function CompactSeedCard({
  seed,
  onPress,
}: {
  seed: SeedWithEnrollment;
  onPress: () => void;
}) {
  return (
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
          source={{ uri: seed.cover_image_url }}
          style={styles.compactImageFull}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.compactImageFull, styles.compactImagePlaceholder]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: "#111",
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Orbit_400Regular",
    fontSize: 16,
    color: "#111",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },
  sectionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  compactCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    height: 180,
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
    backgroundColor: "#f5f5f5",
  },
  compactImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f5e0",
  },
  compactImageIcon: {
    fontSize: 48,
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
  compactTitle: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 18,
  },
  compactSlogan: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 14,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
    minHeight: 160,
  },
});
