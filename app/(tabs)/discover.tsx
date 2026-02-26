import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { getAvailableSeeds } from "../../lib/pathlab";
import type { SeedWithEnrollment } from "../../types/seeds";

export default function DiscoverScreen() {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
        <Text style={styles.loadingText}>Loading paths...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>
          Test a career path in just 4-5 days
        </Text>
      </View>

      {/* Seeds List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {seeds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>No paths available yet</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        ) : (
          seeds.map((seed) => (
            <SeedCard
              key={seed.id}
              seed={seed}
              onPress={() => router.push(`/seed/${seed.id}`)}
            />
          ))
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function SeedCard({
  seed,
  onPress,
}: {
  seed: SeedWithEnrollment;
  onPress: () => void;
}) {
  const hasEnrollment = !!seed.enrollment;
  const isActive = seed.enrollment?.status === "active";
  const totalDays = seed.path?.total_days || 5;
  const currentDay = seed.enrollment?.current_day || 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.seedCard, pressed && styles.seedCardPressed]}
      onPress={onPress}
    >
      {/* Cover Image */}
      {seed.cover_image_url ? (
        <Image source={{ uri: seed.cover_image_url }} style={styles.seedImage} />
      ) : (
        <View style={[styles.seedImage, styles.seedImagePlaceholder]}>
          <Text style={styles.seedImagePlaceholderText}>🌱</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.seedContent}>
        {/* Category badge */}
        {seed.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{seed.category.name}</Text>
          </View>
        )}

        <Text style={styles.seedTitle}>{seed.title}</Text>

        {seed.slogan && (
          <Text style={styles.seedSlogan} numberOfLines={2}>
            {seed.slogan}
          </Text>
        )}

        {/* Duration */}
        <View style={styles.seedMeta}>
          <Text style={styles.seedDuration}>
            {totalDays} days · 30 min/day
          </Text>
        </View>

        {/* Progress indicator if enrolled */}
        {hasEnrollment && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentDay / totalDays) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {isActive ? `Day ${currentDay}/${totalDays}` : seed.enrollment?.status}
            </Text>
          </View>
        )}
      </View>

      {/* Arrow */}
      <Text style={styles.seedArrow}>→</Text>
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
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#666",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
  },
  seedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  seedCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  seedImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#f5f5f5",
  },
  seedImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f5e0",
  },
  seedImagePlaceholderText: {
    fontSize: 48,
  },
  seedContent: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#BFFF00",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    textTransform: "uppercase",
  },
  seedTitle: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  seedSlogan: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  seedMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  seedDuration: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#999",
  },
  progressContainer: {
    marginTop: 12,
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#eee",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#BFFF00",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  seedArrow: {
    position: "absolute",
    right: 16,
    top: 156,
    fontSize: 20,
    color: "#999",
  },
});
