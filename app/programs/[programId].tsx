// app/programs/[programId].tsx
// Program Detail Screen

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { getProgramDetail } from "../../lib/tcas";
import { toggleSaveProgram, isProgramSaved } from "../../lib/savedPrograms";
import { logProgramViewed } from "../../lib/eventLogger";
import type { TcasProgramWithRounds } from "../../types/tcas";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Type,
  Gradient,
} from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const [program, setProgram] = useState<TcasProgramWithRounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  useEffect(() => {
    if (!programId) return;

    setLoading(true);
    Promise.all([
      getProgramDetail(programId),
      isProgramSaved(programId),
    ])
      .then(([programData, saved]) => {
        setProgram(programData);
        setIsSaved(saved);
        if (programData) {
          logProgramViewed(programId, programData.university_id).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [programId]);

  const handleToggleSave = async () => {
    if (!program || saving) return;
    setSaving(true);
    try {
      const newState = await toggleSaveProgram(
        program.program_id,
        program.university_id,
        isSaved
      );
      setIsSaved(newState);
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Program not found</Text>
      </View>
    );
  }

  const displayName = isThai
    ? program.program_name
    : (program.program_name_en ?? program.program_name);

  const facultyName = isThai
    ? (program.faculty_name ?? '')
    : (program.faculty_name_en ?? program.faculty_name ?? '');

  const copy = isThai
    ? {
        save: "บันทึก",
        unsave: "ยกเลิกบันทึก",
        rounds: "รอบรับสมัคร",
        requirements: "คุณสมบัติ",
        university: "มหาวิทยาลัย",
        degree: "ระดับปริญญา",
      }
    : {
        save: "Save",
        unsave: "Unsave",
        rounds: "Admission Rounds",
        requirements: "Requirements",
        university: "University",
        degree: "Degree Level",
      };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.subtitle}>{facultyName}</Text>
          {program.university && (
            <Pressable
              style={styles.universityLink}
              onPress={() => router.push(`/university/${program.university_id}`)}
            >
              <Text style={styles.universityName}>
                {program.university.university_name}
              </Text>
              <Text style={styles.universityArrow}>→</Text>
            </Pressable>
          )}
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
          onPress={handleToggleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={isSaved ? ["#E5E7EB", "#D1D5DB"] : Gradient.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextSaved]}>
              {isSaved ? copy.unsave : copy.save}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Degree Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.degree}</Text>
          <Text style={styles.sectionValue}>{program.degree_level || "Bachelor"}</Text>
        </View>

        {/* Admission Rounds */}
        {program.admission_rounds && program.admission_rounds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{copy.rounds}</Text>
            <View style={styles.roundsList}>
              {program.admission_rounds.map((round, index) => (
                <View key={round.id || index} style={styles.roundCard}>
                  <View style={styles.roundHeader}>
                    <Text style={styles.roundNumber}>
                      Round {round.round_type}
                    </Text>
                    {round.min_gpax && (
                      <Text style={styles.roundGpax}>
                        GPAX ≥ {round.min_gpax.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {round.quota && (
                    <Text style={styles.roundQuota}>
                      Quota: {round.quota} seats
                    </Text>
                  )}
                  {round.receive_seats && (
                    <Text style={styles.roundQuota}>
                      Seats: {round.receive_seats}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    gap: Space.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  errorText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
  },
  header: {
    gap: Space.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  subtitle: {
    fontSize: 18,
    color: ThemeText.secondary,
  },
  universityLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  universityName: {
    fontSize: 16,
    color: Accent.blue || "#007AFF",
  },
  universityArrow: {
    fontSize: 16,
    color: Accent.blue || "#007AFF",
  },
  saveButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonGradient: {
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  saveButtonTextSaved: {
    color: ThemeText.secondary,
  },
  section: {
    gap: Space.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 16,
    color: ThemeText.primary,
  },
  roundsList: {
    gap: Space.md,
  },
  roundCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    ...Shadow.neutral,
  },
  roundHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  roundGpax: {
    fontSize: 14,
    color: Accent.green,
    fontWeight: "500",
  },
  roundQuota: {
    fontSize: 14,
    color: ThemeText.tertiary,
    marginTop: Space.xs,
  },
});
