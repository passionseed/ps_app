import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { submitDailyReflection } from "../../lib/pathlab";
import { VoiceAIReflection } from "../../components/Reflection";
import type { PathReflectionDecision } from "../../types/pathlab";

type EnrollmentData = {
  id: string;
  current_day: number;
  path: {
    id: string;
    total_days: number;
    seed: {
      title: string;
    }[];
  }[];
};

export default function ReflectionScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reflection state
  const [energyLevel, setEnergyLevel] = useState(5);
  const [confusionLevel, setConfusionLevel] = useState(5);
  const [interestLevel, setInterestLevel] = useState(5);
  const [openResponse, setOpenResponse] = useState("");
  const [showVoiceAI, setShowVoiceAI] = useState(false);

  useEffect(() => {
    async function load() {
      if (!enrollmentId) return;

      const { data } = await supabase
        .from("path_enrollments")
        .select(
          `
          id,
          current_day,
          path:paths(
            id,
            total_days,
            seed:seeds(title)
          )
        `,
        )
        .eq("id", enrollmentId)
        .single();

      setEnrollment(data as EnrollmentData);
      setLoading(false);
    }
    load();
  }, [enrollmentId]);

  const handleSubmit = async (decision: PathReflectionDecision) => {
    if (!enrollment) return;

    setSubmitting(true);
    try {
      await submitDailyReflection({
        enrollmentId: enrollment.id,
        dayNumber: enrollment.current_day,
        energyLevel,
        confusionLevel,
        interestLevel,
        openResponse: openResponse || undefined,
        decision,
      });

      // Mock triggering Score Engine after reflection
      try {
        console.log("Triggering Score Engine for simulation update");
        // In a real implementation this would call the Supabase Edge Function
        await supabase.functions.invoke("score-engine/ingest", {
          body: {
            reflectionData: { energyLevel, interestLevel },
            simulationId: enrollment.id,
          },
        });
      } catch (err) {
        console.error("Score Engine error", err);
      }

      // Navigate based on decision
      if (decision === "continue_now") {
        router.replace(`/path/${enrollment.id}`);
      } else if (decision === "final_reflection") {
        router.replace("/(tabs)/my-paths");
      } else {
        router.replace("/(tabs)/my-paths");
      }
    } catch (error) {
      console.error("Failed to submit reflection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!enrollment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isLastDay = enrollment.current_day >= enrollment.path[0].total_days;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Daily Reflection</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day info */}
        <View style={styles.dayInfo}>
          <Text style={styles.dayBadge}>
            Day {enrollment.current_day} Complete! 🎉
          </Text>
          <Text style={styles.seedName}>
            {enrollment.path[0].seed[0].title}
          </Text>
        </View>

        {/* Prompts intro */}
        <Text style={styles.intro}>
          Take a moment to reflect on today's experience
        </Text>

        {/* Energy Level */}
        <View style={styles.sliderSection}>
          <Text style={styles.sliderLabel}>How energized do you feel?</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderEmoji}>😴</Text>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    energyLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setEnergyLevel(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderEmoji}>⚡</Text>
          </View>
        </View>

        {/* Confusion Level */}
        <View style={styles.sliderSection}>
          <Text style={styles.sliderLabel}>How clear was everything?</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderEmoji}>😕</Text>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    confusionLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setConfusionLevel(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderEmoji}>💡</Text>
          </View>
          <Text style={styles.sliderHint}>
            (Low = confusing, High = crystal clear)
          </Text>
        </View>

        {/* Interest Level */}
        <View style={styles.sliderSection}>
          <Text style={styles.sliderLabel}>
            How interested are you in this path?
          </Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderEmoji}>😐</Text>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Pressable
                  key={val}
                  style={[
                    styles.sliderDot,
                    interestLevel >= val && styles.sliderDotActive,
                  ]}
                  onPress={() => setInterestLevel(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderEmoji}>🤩</Text>
          </View>
        </View>

        {/* Open response */}
        {showVoiceAI ? (
          <View style={{ marginBottom: 32 }}>
            <VoiceAIReflection
              onSave={(transcript) => {
                setOpenResponse(transcript);
                setShowVoiceAI(false);
              }}
              onDismiss={() => setShowVoiceAI(false)}
            />
          </View>
        ) : (
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable
              style={{
                backgroundColor: "#F3F4F6",
                padding: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
              onPress={() => setShowVoiceAI(true)}
            >
              <Text style={{ fontSize: 16 }}>🎙️</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Orbit_400Regular",
                  color: "#4B5563",
                }}
              >
                Reflect with Voice AI
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.textSection}>
          <Text style={styles.sliderLabel}>Any thoughts or insights?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What stood out today? What surprised you?"
            placeholderTextColor="#999"
            value={openResponse}
            onChangeText={setOpenResponse}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Decision buttons */}
        <View style={styles.decisionSection}>
          <Text style={styles.decisionTitle}>What's next?</Text>

          {isLastDay ? (
            // Last day - show final reflection option
            <>
              <Pressable
                style={[styles.decisionBtn, styles.decisionBtnPrimary]}
                onPress={() => handleSubmit("final_reflection")}
                disabled={submitting}
              >
                <Text style={styles.decisionBtnText}>
                  🎓 Complete Path & See Report
                </Text>
              </Pressable>
            </>
          ) : (
            // Not last day - show continue/pause/quit options
            <>
              <Pressable
                style={[styles.decisionBtn, styles.decisionBtnPrimary]}
                onPress={() => handleSubmit("continue_tomorrow")}
                disabled={submitting}
              >
                <Text style={styles.decisionBtnText}>
                  ✓ Done for today, continue tomorrow
                </Text>
              </Pressable>

              <Pressable
                style={[styles.decisionBtn, styles.decisionBtnSecondary]}
                onPress={() => handleSubmit("continue_now")}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.decisionBtnText,
                    styles.decisionBtnTextSecondary,
                  ]}
                >
                  🚀 I'm on fire! Start Day {enrollment.current_day + 1}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.decisionBtn, styles.decisionBtnTertiary]}
                onPress={() => handleSubmit("pause")}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.decisionBtnText,
                    styles.decisionBtnTextTertiary,
                  ]}
                >
                  ⏸️ Pause for now
                </Text>
              </Pressable>

              <Pressable
                style={[styles.decisionBtn, styles.decisionBtnDanger]}
                onPress={() => handleSubmit("quit")}
                disabled={submitting}
              >
                <Text
                  style={[styles.decisionBtnText, styles.decisionBtnTextDanger]}
                >
                  This isn't for me
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {submitting && (
          <View style={styles.submittingOverlay}>
            <ActivityIndicator size="small" color="#BFFF00" />
            <Text style={styles.submittingText}>Saving reflection...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  errorContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  backText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeText: {
    fontSize: 20,
    color: "#666",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  dayInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  dayBadge: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  seedName: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
  },
  intro: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  sliderSection: {
    marginBottom: 28,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sliderEmoji: {
    fontSize: 20,
  },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  sliderDotActive: {
    backgroundColor: "#BFFF00",
  },
  sliderHint: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  textSection: {
    marginBottom: 32,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    minHeight: 100,
    textAlignVertical: "top",
  },
  decisionSection: {
    gap: 12,
  },
  decisionTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  decisionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  decisionBtnPrimary: {
    backgroundColor: "#BFFF00",
  },
  decisionBtnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#BFFF00",
  },
  decisionBtnTertiary: {
    backgroundColor: "#f5f5f5",
  },
  decisionBtnDanger: {
    backgroundColor: "transparent",
  },
  decisionBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  decisionBtnTextSecondary: {
    color: "#111",
  },
  decisionBtnTextTertiary: {
    color: "#666",
  },
  decisionBtnTextDanger: {
    color: "#999",
    fontWeight: "400",
  },
  submittingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  submittingText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
});
