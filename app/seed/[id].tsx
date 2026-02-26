import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import {
  getSeedById,
  getPathBySeedId,
  getUserEnrollment,
  enrollInPath,
} from "../../lib/pathlab";
import type { Seed } from "../../types/seeds";
import type { Path, PathEnrollment } from "../../types/pathlab";

export default function SeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [enrollment, setEnrollment] = useState<PathEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showWhyForm, setShowWhyForm] = useState(false);
  const [whyJoined, setWhyJoined] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const seedData = await getSeedById(id);
        setSeed(seedData);

        if (seedData) {
          const pathData = await getPathBySeedId(seedData.id);
          setPath(pathData);

          if (pathData) {
            const enrollmentData = await getUserEnrollment(pathData.id);
            setEnrollment(enrollmentData);
          }
        }
      } catch (error) {
        console.error("Failed to load seed:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStartPath = async () => {
    if (!path) return;

    setEnrolling(true);
    try {
      const newEnrollment = await enrollInPath({
        pathId: path.id,
        whyJoined: whyJoined || undefined,
      });
      setEnrollment(newEnrollment);
      router.push(`/path/${newEnrollment.id}`);
    } catch (error) {
      console.error("Failed to enroll:", error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinuePath = () => {
    if (enrollment) {
      router.push(`/path/${enrollment.id}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!seed) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Path not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isEnrolled = !!enrollment;
  const canContinue = enrollment?.status === "active" || enrollment?.status === "paused";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {seed.cover_image_url ? (
          <Image source={{ uri: seed.cover_image_url }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
            <Text style={styles.heroPlaceholderText}>🌱</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Category */}
          {seed.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{seed.category.name}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{seed.title}</Text>

          {/* Slogan */}
          {seed.slogan && <Text style={styles.slogan}>{seed.slogan}</Text>}

          {/* Duration */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{path?.total_days || 5} days</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={styles.metaText}>30 min/day</Text>
            </View>
          </View>

          {/* Description */}
          {seed.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>What you'll explore</Text>
              <Text style={styles.description}>{seed.description}</Text>
            </View>
          )}

          {/* What to expect */}
          <View style={styles.expectSection}>
            <Text style={styles.sectionTitle}>What to expect</Text>
            <ExpectItem icon="📝" text="Daily tasks like quizzes, videos, and activities" />
            <ExpectItem icon="💭" text="Reflection after each day to track your feelings" />
            <ExpectItem icon="🎯" text="Decide if this path is right for you" />
          </View>

          {/* Enrollment Status */}
          {isEnrolled && (
            <View style={styles.enrollmentStatus}>
              <Text style={styles.enrollmentText}>
                {enrollment.status === "explored"
                  ? "✅ You've explored this path"
                  : `📍 Day ${enrollment.current_day} of ${path?.total_days || 5}`}
              </Text>
            </View>
          )}

          {/* Why join form */}
          {showWhyForm && !isEnrolled && (
            <View style={styles.whyForm}>
              <Text style={styles.whyLabel}>Why are you interested? (optional)</Text>
              <TextInput
                style={styles.whyInput}
                placeholder="I want to explore this because..."
                placeholderTextColor="#999"
                value={whyJoined}
                onChangeText={setWhyJoined}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        {!isEnrolled ? (
          showWhyForm ? (
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
                enrolling && styles.ctaButtonDisabled,
              ]}
              onPress={handleStartPath}
              disabled={enrolling}
            >
              {enrolling ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.ctaText}>Start Exploring</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
              onPress={() => setShowWhyForm(true)}
            >
              <Text style={styles.ctaText}>Begin This Path</Text>
            </Pressable>
          )
        ) : canContinue ? (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleContinuePath}
          >
            <Text style={styles.ctaText}>Continue Day {enrollment.current_day}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              styles.ctaButtonSecondary,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleContinuePath}
          >
            <Text style={[styles.ctaText, styles.ctaTextSecondary]}>View Report</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ExpectItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.expectItem}>
      <Text style={styles.expectIcon}>{icon}</Text>
      <Text style={styles.expectText}>{text}</Text>
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
  errorContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#f5f5f5",
  },
  heroImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f5e0",
  },
  heroPlaceholderText: {
    fontSize: 72,
  },
  content: {
    padding: 24,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#BFFF00",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    lineHeight: 24,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    fontSize: 16,
  },
  metaText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#444",
    lineHeight: 22,
  },
  expectSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 24,
  },
  expectItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  expectIcon: {
    fontSize: 18,
  },
  expectText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#444",
    lineHeight: 20,
  },
  enrollmentStatus: {
    backgroundColor: "#e8f5e0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  enrollmentText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
  },
  whyForm: {
    marginBottom: 16,
  },
  whyLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
    marginBottom: 8,
  },
  whyInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    minHeight: 80,
    textAlignVertical: "top",
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#FDFFF5",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ctaButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonPressed: {
    backgroundColor: "#9FE800",
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#111",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  ctaTextSecondary: {
    color: "#111",
  },
});
