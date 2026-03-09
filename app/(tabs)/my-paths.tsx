import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CareerPathCard } from "../../components/JourneyBoard/CareerPathCard";
import { MOCK_PATH_DATA } from "../../lib/mockPathData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const SNAP_INTERVAL = CARD_WIDTH + 16;

export default function MyPathsScreen() {
  const { paths, profileCareerGoal } = MOCK_PATH_DATA;

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
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.carouselContent}
            >
              {paths.map((path) => (
                <CareerPathCard key={path.id} path={path} isActive={true} />
              ))}

              {/* Add Path Card */}
              {paths.length < 3 && (
                <Pressable
                  style={[
                    styles.addCardOuter,
                    { width: CARD_WIDTH, marginRight: 16 },
                  ]}
                  onPress={handleBuildPath}
                >
                  <View style={styles.addCardInner}>
                    <Text style={styles.addCardIcon}>+</Text>
                    <Text style={styles.addCardText}>Build Another Path</Text>
                  </View>
                </Pressable>
              )}
            </ScrollView>
          </View>
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
  // Carousel
  carouselContainer: {
    marginTop: 8,
  },
  carouselContent: {
    paddingLeft: 24,
    paddingRight: 8, // Ensures trailing space after the last card
  },
  // Add Path Card
  addCardOuter: {
    backgroundColor: "transparent",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400, // Make it roughly the height of a career path card
  },
  addCardInner: {
    alignItems: "center",
    gap: 12,
  },
  addCardIcon: {
    fontSize: 48,
    fontWeight: "300",
    color: "#9CA3AF",
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: "Orbit_400Regular",
  },
});
