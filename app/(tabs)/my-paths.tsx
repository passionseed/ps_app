import { useCallback, useState } from "react";
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
import { JourneySimulationCard } from "../../components/JourneyBoard";
import { getFullJourneyBoardData } from "../../lib/journey";

export default function MyPathsScreen() {
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSimulations = useCallback(async () => {
    try {
      const data = await getFullJourneyBoardData();
      setSimulations(data);
    } catch (error) {
      console.error("Failed to load journey simulations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadSimulations();
    }, [loadSimulations]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSimulations();
  }, [loadSimulations]);

  const handleBuildPath = () => {
    router.push("/build-path");
  };

  const canAddMore = simulations.length < 3;
  const atMaxCapacity = simulations.length === 3;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  const hasSimulations = simulations.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Paths</Text>
        <Text style={styles.headerSubtitle}>
          What do you want to be? Let's work backwards.
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
        {!hasSimulations ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧭</Text>
            <Text style={styles.emptyTitle}>No paths yet</Text>
            <Text style={styles.emptySubtext}>
              Build up to 3 career simulations. Each one helps you explore a
              potential future.
            </Text>
            <Pressable style={styles.buildPathBtn} onPress={handleBuildPath}>
              <Text style={styles.buildPathBtnText}>Build a Path</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Simulation Count / Max Capacity Notice */}
            <View style={styles.simulationHeader}>
              <Text style={styles.simulationCount}>
                {simulations.length} of 3 paths
              </Text>
              {atMaxCapacity && (
                <Text style={styles.maxCapacityText}>
                  This is your last slot — make it count. You can delete one
                  anytime.
                </Text>
              )}
            </View>

            {/* Horizontal Scrolling Simulations */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={344}
              decelerationRate="fast"
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {simulations.map((sim) => (
                <JourneySimulationCard key={sim.id} simulation={sim} />
              ))}
            </ScrollView>

            {/* Add Another Path Button */}
            {canAddMore && (
              <Pressable
                style={({ pressed }) => [
                  styles.addAnotherBtn,
                  pressed && styles.addAnotherBtnPressed,
                ]}
                onPress={handleBuildPath}
              >
                <Text style={styles.addAnotherIcon}>+</Text>
                <Text style={styles.addAnotherText}>
                  Build Path {simulations.length + 1}
                </Text>
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
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
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  buildPathBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buildPathBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  simulationHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  simulationCount: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  maxCapacityText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
    marginTop: 4,
    fontWeight: "500",
  },
  horizontalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  addAnotherBtn: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#BFFF00",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addAnotherBtnPressed: {
    backgroundColor: "#F8FFF0",
  },
  addAnotherIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
  },
  addAnotherText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
});
