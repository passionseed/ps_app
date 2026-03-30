// app/plans/create.tsx
// Create Admission Plan Screen

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { createPlanWithPrograms, getPlanCount, MAX_PLANS_PER_USER } from "../../lib/admissionPlans";
import { getSavedPrograms } from "../../lib/savedPrograms";
import type { SavedProgram } from "../../lib/savedPrograms";
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

export default function CreatePlanScreen() {
  const [planName, setPlanName] = useState("My Plan");
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canCreate, setCanCreate] = useState(true);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [programs, count] = await Promise.all([
          getSavedPrograms(),
          getPlanCount(),
        ]);
        setSavedPrograms(programs);
        setCanCreate(count < MAX_PLANS_PER_USER);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleProgram = (roundNumber: number, programId: string) => {
    setSelectedPrograms((prev) => {
      const current = prev[roundNumber] || [];
      const exists = current.includes(programId);
      return {
        ...prev,
        [roundNumber]: exists
          ? current.filter((id) => id !== programId)
          : [...current, programId],
      };
    });
  };

  const isProgramSelected = (roundNumber: number, programId: string) => {
    return selectedPrograms[roundNumber]?.includes(programId) ?? false;
  };

  const handleCreate = async () => {
    if (saving) return;

    const hasPrograms = Object.values(selectedPrograms).some((arr) => arr.length > 0);
    if (!hasPrograms) {
      // Show error - need at least one program
      return;
    }

    setSaving(true);
    try {
      const plan = await createPlanWithPrograms(planName, selectedPrograms);
      router.replace(`/plans/${plan.id}`);
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setSaving(false);
    }
  };

  const copy = isThai
    ? {
        title: "สร้างแผนสมัคร",
        namePlaceholder: "ชื่อแผน",
        selectPrograms: "เลือกสาขาสำหรับแต่ละรอบ",
        noSaved: "ยังไม่มีสาขาที่บันทึกไว้",
        noSavedSubtext: "บันทึกสาขาที่สนใจก่อนสร้างแผน",
        browse: "ค้นหาสาขา",
        create: "สร้างแผน",
        maxReached: `มีแผนครบ ${MAX_PLANS_PER_USER} แผนแล้ว`,
      }
    : {
        title: "Create Admission Plan",
        namePlaceholder: "Plan name",
        selectPrograms: "Select programs for each round",
        noSaved: "No saved programs",
        noSavedSubtext: "Save programs you're interested in before creating a plan",
        browse: "Browse Programs",
        create: "Create Plan",
        maxReached: `Maximum ${MAX_PLANS_PER_USER} plans reached`,
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  if (!canCreate) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>
        <View style={styles.maxReachedContainer}>
          <Text style={styles.maxReachedText}>{copy.maxReached}</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
        </View>

        {/* Plan Name Input */}
        <View style={styles.nameInputContainer}>
          <TextInput
            style={[
              styles.nameInput,
              isThai && { fontFamily: "BaiJamjuree_400Regular", paddingTop: 4 },
            ]}
            placeholder={copy.namePlaceholder}
            placeholderTextColor="#9CA3AF"
            value={planName}
            onChangeText={setPlanName}
          />
        </View>

        <Text style={styles.sectionTitle}>{copy.selectPrograms}</Text>

        {/* Rounds with saved programs */}
        {[1, 2, 3, 4, 5].map((roundNum) => (
          <View key={roundNum} style={styles.roundSection}>
            <Text style={styles.roundTitle}>
              Round {roundNum}: {ROUND_NAMES[roundNum]}
            </Text>
            <View style={styles.programsGrid}>
              {savedPrograms.map((sp) => {
                const program = sp.program;
                if (!program) return null;
                // program_name is Thai, program_name_en is English
                const displayName = isThai
                  ? program.program_name
                  : (program.program_name_en ?? program.program_name);
                const selected = isProgramSelected(roundNum, sp.program_id);

                return (
                  <Pressable
                    key={sp.id}
                    style={({ pressed }) => [
                      styles.programChip,
                      selected && styles.programChipSelected,
                      pressed && styles.programChipPressed,
                    ]}
                    onPress={() => toggleProgram(roundNum, sp.program_id)}
                  >
                    <Text
                      style={[
                        styles.programChipText,
                        selected && styles.programChipTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Create Button */}
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
          onPress={handleCreate}
          disabled={saving}
        >
          <LinearGradient
            colors={Gradient.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.createButtonText}>{copy.create}</Text>
            )}
          </LinearGradient>
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
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  nameInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    ...Shadow.neutral,
  },
  nameInput: {
    padding: Space.lg,
    fontSize: 16,
    fontFamily: "LibreFranklin_400Regular",
    color: ThemeText.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.secondary,
  },
  roundSection: {
    gap: Space.md,
  },
  roundTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  programsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  programChip: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Border.default,
    maxWidth: "48%",
  },
  programChipSelected: {
    backgroundColor: Accent.yellow,
    borderColor: Accent.yellow,
  },
  programChipPressed: {
    opacity: 0.8,
  },
  programChipText: {
    fontSize: 13,
    color: ThemeText.primary,
  },
  programChipTextSelected: {
    fontWeight: "600",
    color: "#111",
  },
  createButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
    marginTop: Space.lg,
    ...Shadow.neutral,
  },
  createButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  createButtonGradient: {
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
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
  maxReachedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Space.lg,
  },
  maxReachedText: {
    fontSize: 18,
    color: ThemeText.tertiary,
    textAlign: "center",
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
