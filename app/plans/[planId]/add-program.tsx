// app/plans/[planId]/add-program.tsx
// Add Program to Round Screen — CRITICAL BUG FIX

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../../components/AppText";
import { useAuth } from "../../../lib/auth";
import { addProgramToRound, getPlanById } from "../../../lib/admissionPlans";
import { getSavedPrograms } from "../../../lib/savedPrograms";
import type { SavedProgram } from "../../../lib/savedPrograms";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Gradient,
} from "../../../lib/theme";

const ROUND_NAMES: Record<number, string> = {
  1: "Portfolio",
  2: "Quota",
  3: "Admission",
  4: "Direct Admission",
  5: "Clearing House",
};

export default function AddProgramScreen() {
  const { planId, round } = useLocalSearchParams<{ planId: string; round: string }>();
  const parsedRound = parseInt(round || "1", 10);
  const roundNumber = Number.isFinite(parsedRound) ? Math.max(1, Math.min(5, parsedRound)) : 1;
  
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [existingProgramIds, setExistingProgramIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const loadData = useCallback(async () => {
    if (!planId) {
      Alert.alert(isThai ? "เกิดข้อผิดพลาด" : "Error", isThai ? "ไม่พบรหัสแผน" : "Plan ID not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [programs, plan] = await Promise.all([
        getSavedPrograms(),
        getPlanById(planId),
      ]);
      setSavedPrograms(programs);
      
      // Get existing programs in this round to prevent duplicates
      const existingIds = new Set(
        plan?.rounds
          ?.filter((r) => r.round_number === roundNumber)
          .map((r) => r.program_id) || []
      );
      setExistingProgramIds(existingIds);
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        isThai ? "ไม่สามารถโหลดข้อมูลได้" : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }, [planId, roundNumber, isThai]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddProgram = async (programId: string) => {
    if (adding) return;
    
    setAdding(programId);
    try {
      await addProgramToRound(planId, roundNumber, programId);
      
      // Show success and go back
      router.back();
    } catch (error: any) {
      console.error("Failed to add program:", error);
      Alert.alert(
        isThai ? "เกิดข้อผิดพลาด" : "Error",
        error.message === "Program already in this round"
          ? (isThai ? "สาขานี้อยู่ในรอบนี้แล้ว" : "Program already in this round")
          : (isThai ? "ไม่สามารถเพิ่มสาขาได้" : "Failed to add program")
      );
    } finally {
      setAdding(null);
    }
  };

  const copy = isThai
    ? {
        title: `รอบ ${roundNumber}: ${ROUND_NAMES[roundNumber]}`,
        selectProgram: "เลือกสาขาที่ต้องการเพิ่ม",
        noSaved: "ยังไม่มีสาขาที่บันทึกไว้",
        noSavedSubtext: "บันทึกสาขาที่สนใจก่อนเพิ่มลงแผน",
        browse: "ค้นหาสาขา",
        alreadyAdded: "เพิ่มแล้ว",
        add: "เพิ่ม",
        emptyRound: "ไม่มีสาขาที่เพิ่มได้",
        allAdded: "สาขาที่บันทึกทั้งหมดอยู่ในแผนแล้ว",
      }
    : {
        title: `Round ${roundNumber}: ${ROUND_NAMES[roundNumber]}`,
        selectProgram: "Select a program to add",
        noSaved: "No saved programs",
        noSavedSubtext: "Save programs you're interested in first",
        browse: "Browse Programs",
        alreadyAdded: "Added",
        add: "Add",
        emptyRound: "No programs available to add",
        allAdded: "All saved programs are already in this plan",
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  // Filter out programs already in this round
  const availablePrograms = savedPrograms.filter(
    (sp) => !existingProgramIds.has(sp.program_id)
  );

  if (savedPrograms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>{copy.noSaved}</Text>
          <Text style={styles.emptySubtext}>{copy.noSavedSubtext}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.browseButton,
              pressed && styles.browseButtonPressed,
            ]}
            onPress={() => router.push("/programs")}
          >
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.browseButtonGradient}
            >
              <Text style={styles.browseButtonText}>{copy.browse}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  if (availablePrograms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>{copy.emptyRound}</Text>
          <Text style={styles.emptySubtext}>{copy.allAdded}</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹ {isThai ? "กลับ" : "Back"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <Text style={styles.headerSubtitle}>{copy.selectProgram}</Text>
        </View>

        {/* Available Programs */}
        <View style={styles.programsList}>
          {availablePrograms.map((sp) => {
            const program = sp.program;
            if (!program) return null;
            
            const displayName = isThai
              ? program.program_name
              : (program.program_name_en ?? program.program_name);
            const facultyName = isThai
              ? program.faculty_name
              : (program.faculty_name_en ?? program.faculty_name);
            
            const isAdding = adding === sp.program_id;

            return (
              <Pressable
                key={sp.id}
                style={({ pressed }) => [
                  styles.programCard,
                  pressed && styles.programCardPressed,
                ]}
                onPress={() => handleAddProgram(sp.program_id)}
                disabled={isAdding}
              >
                <View style={styles.programInfo}>
                  <Text style={styles.programName} numberOfLines={2}>
                    {displayName}
                  </Text>
                  {facultyName && (
                    <Text style={styles.programFaculty} numberOfLines={1}>
                      {facultyName}
                    </Text>
                  )}
                </View>
                <View style={styles.addButton}>
                  {isAdding ? (
                    <PathLabSkiaLoader size="tiny" />
                  ) : (
                    <Text style={styles.addButtonText}>+ {copy.add}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    gap: Space.lg,
  },
  header: {
    gap: Space.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  programsList: {
    gap: Space.md,
  },
  programCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.neutral,
  },
  programCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  programInfo: {
    flex: 1,
    gap: Space.xs,
  },
  programName: {
    fontSize: 16,
    fontWeight: "500",
    color: ThemeText.primary,
  },
  programFaculty: {
    fontSize: 13,
    color: ThemeText.tertiary,
  },
  addButton: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    minWidth: 80,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  browseButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  browseButtonPressed: {
    opacity: 0.9,
  },
  browseButtonGradient: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  backButton: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    borderRadius: Radius.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Border.default,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
  },
});
