import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect } from "expo-router";
import {
  getUserActiveEnrollments,
  getUserCompletedEnrollments,
} from "../../lib/pathlab";

type EnrollmentWithPath = {
  id: string;
  current_day: number;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  path: {
    id: string;
    total_days: number;
    seed: {
      id: string;
      title: string;
      slogan: string | null;
      cover_image_url: string | null;
    };
  };
};

export default function MyPathsScreen() {
  const [activeEnrollments, setActiveEnrollments] = useState<EnrollmentWithPath[]>([]);
  const [completedEnrollments, setCompletedEnrollments] = useState<EnrollmentWithPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEnrollments = useCallback(async () => {
    try {
      const [active, completed] = await Promise.all([
        getUserActiveEnrollments(),
        getUserCompletedEnrollments(),
      ]);
      setActiveEnrollments(active as EnrollmentWithPath[]);
      setCompletedEnrollments(completed as EnrollmentWithPath[]);
    } catch (error) {
      console.error("Failed to load enrollments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadEnrollments();
    }, [loadEnrollments])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEnrollments();
  }, [loadEnrollments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  const hasContent = activeEnrollments.length > 0 || completedEnrollments.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Paths</Text>
        <Text style={styles.headerSubtitle}>
          Track your career exploration journey
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!hasContent ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧭</Text>
            <Text style={styles.emptyText}>No paths yet</Text>
            <Text style={styles.emptySubtext}>
              Start exploring careers in the Discover tab
            </Text>
            <Pressable
              style={styles.discoverBtn}
              onPress={() => router.push("/(tabs)/discover")}
            >
              <Text style={styles.discoverBtnText}>Browse Paths</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Active Paths */}
            {activeEnrollments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>In Progress</Text>
                {activeEnrollments.map((enrollment) => (
                  <PathCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onPress={() => router.push(`/path/${enrollment.id}`)}
                  />
                ))}
              </View>
            )}

            {/* Completed Paths */}
            {completedEnrollments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completedEnrollments.map((enrollment) => (
                  <PathCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onPress={() => router.push(`/path/${enrollment.id}`)}
                    completed
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function PathCard({
  enrollment,
  onPress,
  completed = false,
}: {
  enrollment: EnrollmentWithPath;
  onPress: () => void;
  completed?: boolean;
}) {
  const { path } = enrollment;
  const progress = (enrollment.current_day / path.total_days) * 100;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pathCard,
        pressed && styles.pathCardPressed,
        completed && styles.pathCardCompleted,
      ]}
      onPress={onPress}
    >
      <View style={styles.pathContent}>
        <View style={styles.pathHeader}>
          <Text style={styles.pathTitle}>{path.seed.title}</Text>
          {completed && <Text style={styles.completedBadge}>✓ Explored</Text>}
        </View>

        {!completed && (
          <>
            <View style={styles.progressInfo}>
              <Text style={styles.dayText}>
                Day {enrollment.current_day} of {path.total_days}
              </Text>
              <Text style={styles.statusText}>
                {enrollment.status === "paused" ? "Paused" : "Ready to continue"}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </>
        )}

        {completed && (
          <Text style={styles.completedDate}>
            Completed {new Date(enrollment.completed_at!).toLocaleDateString()}
          </Text>
        )}
      </View>

      <Text style={styles.arrow}>{completed ? "📊" : "→"}</Text>
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
    textAlign: "center",
    marginBottom: 24,
  },
  discoverBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  discoverBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  pathCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  pathCardPressed: {
    opacity: 0.9,
  },
  pathCardCompleted: {
    backgroundColor: "#f8f8f8",
  },
  pathContent: {
    flex: 1,
  },
  pathHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pathTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  completedBadge: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#4CAF50",
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#BFFF00",
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
  completedDate: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  arrow: {
    fontSize: 20,
    color: "#999",
    marginLeft: 12,
  },
});
