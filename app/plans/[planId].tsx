// app/plans/[planId].tsx
// Plan Detail Screen

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import {
  getPlanById,
  deletePlan,
  removeProgramFromRound,
} from "../../lib/admissionPlans";
import type { AdmissionPlan } from "../../lib/admissionPlans";
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

const ROUND_NAMES: Record<number, string> = {
  1: "Portfolio",
  2: "Quota",
  3: "Admission",
  4: "Direct Admission",
  5: "Clearing House",
};

export default function PlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [plan, setPlan] = useState<AdmissionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const loadPlan = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const data = await getPlanById(planId);
      setPlan(data);
    } catch (error) {
      console.error("Failed to load plan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const handleDelete = () => {
    if (!plan) return;

    Alert.alert(
      isThai ? "ลบแผน?" : "Delete Plan?",
      isThai
        ? "การกระทำนี้ไม่สามารถย้อนกลับได้"
        : "This action cannot be undone.",
      [
        { text: isThai ? "ยกเลิก" : "Cancel", style: "cancel" },
        {
          text: isThai ? "ลบ" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlan(plan.id);
              router.back();
            } catch (error) {
              console.error("Failed to delete plan:", error);
            }
          },
        },
      ]
    );
  };

  const handleRemoveProgram = async (roundNumber: number, programId: string) => {
    if (!plan) return;
    try {
      await removeProgramFromRound(plan.id, roundNumber, programId);
      loadPlan(); // Refresh
    } catch (error) {
      console.error("Failed to remove program:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Plan not found</Text>
      </View>
    );
  }

  // Group rounds by round_number
  const roundsMap = new Map<number, typeof plan.rounds>();
  plan.rounds?.forEach((r) => {
    const existing = roundsMap.get(r.round_number) || [];
    existing.push(r);
    roundsMap.set(r.round_number, existing);
  });

  const copy = isThai
    ? {
        delete: "ลบแผน",
        addProgram: "เพิ่มสาขา",
        noPrograms: "ยังไม่มีสาขาในรอบนี้",
      }
    : {
        delete: "Delete Plan",
        addProgram: "Add Program",
        noPrograms: "No programs in this round",
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
          <Text style={styles.title}>{plan.name}</Text>
          <Text style={styles.subtitle}>
            {plan.rounds?.length ?? 0} {isThai ? "สาขา" : "programs"}
          </Text>
        </View>

        {/* Rounds */}
        {[1, 2, 3, 4, 5].map((roundNum) => {
          const roundPrograms = roundsMap.get(roundNum) || [];
          return (
            <View key={roundNum} style={styles.roundSection}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>
                  Round {roundNum}: {ROUND_NAMES[roundNum]}
                </Text>
                <Pressable
                  style={styles.addProgramButton}
                  onPress={() => {
                    // TODO: Navigate to program selection for this round
                    router.push(`/plans/${plan.id}/add-program?round=${roundNum}`);
                  }}
                >
                  <Text style={styles.addProgramText}>+</Text>
                </Pressable>
              </View>

              {roundPrograms.length === 0 ? (
                <View style={styles.emptyRound}>
                  <Text style={styles.emptyRoundText}>{copy.noPrograms}</Text>
                </View>
              ) : (
                <View style={styles.programsList}>
                  {roundPrograms.map((rp, index) => {
                    const program = rp.program;
                    if (!program) return null;
                    // program_name is Thai, program_name_en is English
                    const displayName = isThai
                      ? program.program_name
                      : (program.program_name_en ?? program.program_name);

                    return (
                      <View key={rp.id} style={styles.programCard}>
                        <View style={styles.programContent}>
                          <Text style={styles.programPriority}>{index + 1}</Text>
                          <View style={styles.programInfo}>
                            <Text style={styles.programName} numberOfLines={2}>
                              {displayName}
                            </Text>
                            {program.faculty_name && (
                              <Text style={styles.programFaculty} numberOfLines={1}>
                                {program.faculty_name}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => handleRemoveProgram(roundNum, rp.program_id)}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Delete Button */}
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>{copy.delete}</Text>
        </Pressable>

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
    gap: Space.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  subtitle: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  roundSection: {
    gap: Space.md,
  },
  roundHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  addProgramButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
  },
  addProgramText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
  },
  emptyRound: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    borderStyle: "dashed",
    padding: Space.lg,
    alignItems: "center",
  },
  emptyRoundText: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  programsList: {
    gap: Space.sm,
  },
  programCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.md,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.neutral,
  },
  programContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  programPriority: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: "#F3F4F6",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.secondary,
  },
  programInfo: {
    flex: 1,
    gap: Space.xs,
  },
  programName: {
    fontSize: 14,
    fontWeight: "500",
    color: ThemeText.primary,
  },
  programFaculty: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 18,
    color: "#DC2626",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    paddingVertical: Space.lg,
    borderRadius: Radius.lg,
    alignItems: "center",
    marginTop: Space.lg,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
});
