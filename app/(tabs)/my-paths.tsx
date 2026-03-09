import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CareerPathCard } from "../../components/JourneyBoard/CareerPathCard";
import { MOCK_PATH_DATA } from "../../lib/mockPathData";

export default function MyPathsScreen() {
  const { paths, profileCareerGoal } = MOCK_PATH_DATA;
  const [activePathId, setActivePathId] = useState(paths[0]?.id || "");

  const activePath = paths.find((p) => p.id === activePathId) || paths[0];

  // Simulate empty state
  const hasSimulations = paths.length > 0;

  const handleBuildPath = () => {
    router.push("/build-path");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Journeys</Text>
          <Text style={styles.headerSubtitle}>
            Plan your path to{" "}
            <Text style={styles.goalHighlight}>{profileCareerGoal}</Text>
          </Text>
        </View>

        {!hasSimulations ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconGroup}>
              <Text style={styles.emptyEmoji}>🧭</Text>
            </View>
            <Text style={styles.emptyTitle}>What do you want to be?</Text>
            <Text style={styles.emptySubtext}>
              Build up to 3 career simulations. Each one maps out a path from
              where you are now to your dream career — with specific steps.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.buildPathBtn,
                pressed && styles.buildPathBtnPressed,
              ]}
              onPress={handleBuildPath}
            >
              <LinearGradient
                colors={["#BFFF00", "#A3E600"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buildPathGradient}
              >
                <Text style={styles.buildPathBtnText}>Build a Path</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Path Tab Selector */}
            <View style={styles.tabContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScroll}
              >
                {paths.map((path) => {
                  const isActive = path.id === activePathId;
                  return (
                    <Pressable
                      key={path.id}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setActivePathId(path.id)}
                    >
                      {/* Inner highlight edge */}
                      <View
                        style={[
                          styles.tabHighlight,
                          isActive && styles.tabHighlightActive,
                        ]}
                      />
                      <Text style={styles.tabEmoji}>{path.careerGoalIcon}</Text>
                      <View>
                        <Text
                          style={[
                            styles.tabLabel,
                            isActive && styles.tabLabelActive,
                          ]}
                        >
                          {path.label}
                        </Text>
                        <Text
                          style={[
                            styles.tabGoal,
                            isActive && styles.tabGoalActive,
                          ]}
                        >
                          {path.careerGoal}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                {/* Add Path Tab */}
                {paths.length < 3 && (
                  <Pressable
                    style={[styles.tab, styles.tabAdd]}
                    onPress={handleBuildPath}
                  >
                    <Text style={styles.addTabIcon}>+</Text>
                    <Text style={styles.addTabText}>Add</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Active Path Content */}
            <View style={styles.pathContent}>
              {activePath && (
                <CareerPathCard path={activePath} isActive={true} />
              )}
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#888",
    lineHeight: 22,
  },
  goalHighlight: {
    color: "#0040F0",
    fontWeight: "600",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 36,
  },
  emptyIconGroup: {
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#888",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  buildPathBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  buildPathBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buildPathGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  buildPathBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
  },
  // Tabs
  tabContainer: {
    marginBottom: 20,
  },
  tabScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    minWidth: 100,
    overflow: "hidden",
    position: "relative" as const,
    // Subtle lift 2.5D grounded
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: "#111827", // solid deep gray
    borderColor: "rgba(16, 185, 129, 0.4)", // emerald border
    borderBottomColor: "rgba(16, 185, 129, 0.8)", // stronger bottom
    borderBottomWidth: 2,
  },
  tabHighlight: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  tabHighlightActive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)", // subtle for dark bg
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    fontFamily: "Orbit_400Regular",
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabGoal: {
    fontSize: 11,
    fontWeight: "400",
    color: "#888",
    fontFamily: "Orbit_400Regular",
  },
  tabGoalActive: {
    color: "rgba(255,255,255,0.55)",
  },
  tabAdd: {
    borderStyle: "dashed",
    borderColor: "#ccc",
    borderBottomWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
    gap: 4,
    shadowOpacity: 0,
  },
  addTabIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: "#888",
  },
  addTabText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#888",
    fontFamily: "Orbit_400Regular",
  },
  // Path Content
  pathContent: {
    paddingHorizontal: 24,
  },
});
