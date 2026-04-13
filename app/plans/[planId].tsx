// app/plans/[planId].tsx
// Plan Detail Screen

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import {
  getPlanById,
  deletePlan,
  removeProgramFromRound,
  reorderProgramsInRound,
  updatePlanName,
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

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
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถโหลดแผนได้" : "Failed to load plan"
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [planId])
  );

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
              Alert.alert(
                isThai ? "เกิดข้อผิดพลาด" : "Error",
                isThai ? "ไม่สามารถลบแผนได้" : "Failed to delete plan"
              );
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
      loadPlan();
    } catch (error) {
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถลบสาขาได้" : "Failed to remove program"
      );
    }
  };

  const handleMoveProgram = async (roundNumber: number, fromIndex: number, toIndex: number) => {
    if (!plan) return;
    const roundPrograms = plan.rounds?.filter((r) => r.round_number === roundNumber) || [];
    if (fromIndex < 0 || fromIndex >= roundPrograms.length) return;
    if (toIndex < 0 || toIndex >= roundPrograms.length) return;

    const newOrder = [...roundPrograms];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    try {
      await reorderProgramsInRound(
        plan.id,
        roundNumber,
        newOrder.map((rp) => rp.program_id)
      );
      loadPlan();
    } catch (error) {
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถจัดลำดับใหม่ได้" : "Failed to reorder programs"
      );
    }
  };

  const handleUpdateName = async () => {
    if (!plan) return;
    const trimmed = editedName.trim();
    if (!trimmed) {
      Alert.alert(
        isThai ? "ชื่อว่างเปล่า" : "Empty Name",
        isThai ? "กรุณาใส่ชื่อแผน" : "Please enter a plan name",
        [
          { text: isThai ? "ยกเลิก" : "Cancel", style: "cancel", onPress: handleCancelEditName },
          { text: isThai ? "ตกลง" : "OK" }
        ]
      );
      return;
    }
    try {
      await updatePlanName(plan.id, trimmed);
      setIsEditingName(false);
      loadPlan();
    } catch (error) {
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถอัปเดตชื่อได้" : "Failed to update name"
      );
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    if (plan) setEditedName(plan.name);
  };

  const startEditingName = () => {
    if (plan) {
      setEditedName(plan.name);
      setIsEditingName(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
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
          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={[styles.nameInput, isThai && { fontFamily: "BaiJamjuree_400Regular", paddingTop: 4 }]}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                onSubmitEditing={handleUpdateName}
              />
              <Pressable style={styles.cancelNameButton} onPress={handleCancelEditName}>
                <Text style={styles.cancelNameButtonText}>✕</Text>
              </Pressable>
              <Pressable style={styles.saveNameButton} onPress={handleUpdateName}>
                <Text style={styles.saveNameButtonText}>✓</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditingName}>
              <Text style={styles.title}>{plan.name}</Text>
            </Pressable>
          )}
          <Text style={styles.subtitle}>
            {plan.rounds?.length ?? 0} {isThai ? "สาขา" : "programs"}
            {!isEditingName && <Text style={styles.editHint}> {isThai ? "(แตะเพื่อแก้ไข)" : "(tap to edit)"}</Text>}
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

                    const canMoveUp = index > 0;
                    const canMoveDown = index < roundPrograms.length - 1;

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
                        <View style={styles.programActions}>
                          {roundPrograms.length > 1 && (
                            <View style={styles.reorderButtons}>
                              <Pressable
                                style={[styles.reorderButton, !canMoveUp && styles.reorderButtonDisabled]}
                                onPress={() => canMoveUp && handleMoveProgram(roundNum, index, index - 1)}
                                disabled={!canMoveUp}
                              >
                                <Text style={[styles.reorderButtonText, !canMoveUp && styles.reorderButtonTextDisabled]}>↑</Text>
                              </Pressable>
                              <Pressable
                                style={[styles.reorderButton, !canMoveDown && styles.reorderButtonDisabled]}
                                onPress={() => canMoveDown && handleMoveProgram(roundNum, index, index + 1)}
                                disabled={!canMoveDown}
                              >
                                <Text style={[styles.reorderButtonText, !canMoveDown && styles.reorderButtonTextDisabled]}>↓</Text>
                              </Pressable>
                            </View>
                          )}
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => handleRemoveProgram(roundNum, rp.program_id)}
                          >
                            <Text style={styles.removeButtonText}>×</Text>
                          </Pressable>
                        </View>
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
  nameEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: ThemeText.primary,
    fontFamily: "LibreFranklin_400Regular",
    padding: Space.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Accent.yellow,
  },
  saveNameButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
  },
  saveNameButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  cancelNameButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelNameButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  editHint: {
    fontSize: 12,
    color: ThemeText.tertiary,
    fontWeight: "400",
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
  programActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  reorderButtons: {
    flexDirection: "row",
    gap: Space.xs,
  },
  reorderButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  reorderButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.5,
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.secondary,
  },
  reorderButtonTextDisabled: {
    color: ThemeText.tertiary,
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
