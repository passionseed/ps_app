import { useEffect, useState, useCallback } from "react";
import {
  View,
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
import { AppText } from "../../components/AppText";

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
          Discover
        </AppText>
        <AppText style={styles.headerSubtitle}>
          Test a career path in just 4-5 days
        </AppText>
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
            <AppText style={styles.emptyIcon}>🌱</AppText>
            <AppText variant="bold" style={styles.emptyText}>
              No paths available yet
            </AppText>
            <AppText style={styles.emptySubtext}>Check back soon!</AppText>
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
      style={({ pressed }) => [
        styles.seedCard,
        pressed && styles.seedCardPressed,
      ]}
      onPress={onPress}
    >
      {/* Cover Image */}
      {seed.cover_image_url ? (
        <Image
          source={{ uri: seed.cover_image_url }}
          style={styles.seedImage}
        />
      ) : (
        <View style={[styles.seedImage, styles.seedImagePlaceholder]}>
          <AppText style={styles.seedImagePlaceholderText}>🌱</AppText>
        </View>
      )}

      {/* Content */}
      <View style={styles.seedContent}>
        {/* Category badge */}
        {seed.category && (
          <View style={styles.categoryBadge}>
            <AppText variant="bold" style={styles.categoryText}>
              {seed.category.name}
            </AppText>
          </View>
        )}

        <AppText variant="bold" style={styles.seedTitle}>
          {seed.title}
        </AppText>

        {seed.slogan && (
          <AppText style={styles.seedSlogan} numberOfLines={2}>
            {seed.slogan}
          </AppText>
        )}

        {/* Duration */}
        <View style={styles.seedMeta}>
          <AppText style={styles.seedDuration}>
            {totalDays} days · 30 min/day
          </AppText>
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
            <AppText style={styles.progressText}>
              {isActive
                ? `Day ${currentDay}/${totalDays}`
                : seed.enrollment?.status}
            </AppText>
          </View>
        )}
      </View>

      {/* Arrow */}
      <AppText style={styles.seedArrow}>→</AppText>
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
    fontSize: 32,
    color: "#111",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
    color: "#111",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
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
    color: "#111",
    textTransform: "uppercase",
  },
  seedTitle: {
    fontSize: 20,
    color: "#111",
    marginBottom: 4,
  },
  seedSlogan: {
    fontSize: 14,
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
