import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Modal,
  Dimensions,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { MOCK_PATH_DATA } from "../../lib/mockPathData";
import type { CareerPath, PathStep, StudentJourney } from "../../types/journey";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PathStepCard } from "../../components/JourneyBoard/PathStepCard";
import { DonutScore } from "../../components/JourneyBoard/DonutScore";
import { getJourneyById, updateJourney } from "../../lib/journey";

const MOCK_LIBRARY_STEPS: PathStep[] = [
  {
    id: "lib_uni_1",
    type: "university",
    title: "ปริญญาโทสาขา HCI",
    subtitle: "Carnegie Mellon University",
    detail: "เรียนรู้เรื่องจิตวิทยามนุษย์และการออกแบบ",
    duration: "2 ปี",
    order: 0,
    icon: "🎓",
    status: "upcoming",
  },
  {
    id: "lib_int_1",
    type: "internship",
    title: "Product Design Intern",
    subtitle: "Airbnb",
    detail: "เข้าร่วมทีมออกแบบระบบจองพื้นฐาน",
    duration: "6 เดือน",
    order: 0,
    icon: "💼",
    status: "upcoming",
  },
  {
    id: "lib_job_1",
    type: "job",
    title: "Senior UX Designer",
    subtitle: "Google",
    detail: "ผู้นำทีมออกแบบ Google Maps",
    duration: "3+ ปี",
    order: 0,
    icon: "🚀",
    status: "upcoming",
  },
  {
    id: "lib_job_2",
    type: "job",
    title: "Product Manager",
    subtitle: "Stripe",
    detail: "ดูแลผลิตภัณฑ์ฝั่งผู้ค้า",
    duration: "2+ ปี",
    order: 0,
    icon: "📈",
    status: "upcoming",
  },
];

function studentJourneyToCareerPath(journey: StudentJourney): CareerPath {
  const scores = journey.scores;
  const passionScore = scores?.passion ?? null;
  const futureScore = scores?.future ?? null;
  const worldScore = scores?.world ?? null;
  const journeyScore =
    scores ? Math.round((scores.passion + scores.future + scores.world) / 3) : null;

  const confidence: CareerPath["confidence"] =
    journeyScore === null
      ? "low"
      : journeyScore >= 70
        ? "high"
        : journeyScore >= 50
          ? "medium"
          : "low";

  const generateExplanation = (
    type: "passion" | "future" | "world",
    score: number | null
  ): string => {
    if (score === null) return "ยังไม่มีข้อมูลเพียงพอ";
    if (score >= 85) {
      if (type === "passion") return "คุณมีความสนใจและกระตือรือร้นในด้านนี้สูงมาก";
      if (type === "future") return "อนาคตของอาชีพนี้สดใสและมีแนวโน้มเติบโต";
      return "ตลาดแรงงานต้องการบุคลากรด้านนี้จำนวนมาก";
    }
    if (score >= 70) {
      if (type === "passion") return "คุณมีความสนใจในด้านนี้ในระดับดี";
      if (type === "future") return "อนาคตของอาชีพนี้มีแนวโน้มที่ดี";
      return "มีความต้องการบุคลากรด้านนี้ในระดับดี";
    }
    if (score >= 50) {
      if (type === "passion") return "คุณมีความสนใจในด้านนี้ในระดับปานกลาง";
      if (type === "future") return "อนาคตของอาชีพนี้อยู่ในระดับปานกลาง";
      return "ความต้องการบุคลากรอยู่ในระดับปานกลาง";
    }
    if (type === "passion") return "อาจต้องสำรวจเพิ่มเติมว่านี่คือสิ่งที่คุณรักจริงๆ";
    if (type === "future") return "อาชีพนี้อาจมีความท้าทายในระยะยาว";
    return "ตลาดแรงงานอาจมีการแข่งขันสูง";
  };

  const steps: PathStep[] = journey.steps.map((step, idx) => ({
    id: `${journey.id}-step-${idx}`,
    order: idx + 1,
    type: step.type,
    title: step.label,
    subtitle: step.details.university_name ?? step.details.company_type ?? "",
    detail: [step.details.faculty_name, step.details.salary_range, step.details.description]
      .filter(Boolean)
      .join(" · "),
    duration: "",
    icon:
      step.type === "university"
        ? "🎓"
        : step.type === "internship"
          ? "💼"
          : "🚀",
    status: "upcoming" as PathStep["status"],
    universityMeta:
      step.type === "university" &&
      step.details.university_name &&
      step.details.faculty_name
        ? {
            universityName: step.details.university_name,
            facultyName: step.details.faculty_name,
          }
        : undefined,
  }));

  return {
    id: journey.id,
    label: journey.title,
    careerGoal: journey.career_goal,
    careerGoalIcon: "🎯",
    passionScore,
    futureScore,
    worldScore,
    journeyScore,
    explanations: {
      passion: generateExplanation("passion", passionScore),
      future: generateExplanation("future", futureScore),
      world: generateExplanation("world", worldScore),
    },
    confidence,
    steps,
  };
}

function pathStepsToJourneySteps(steps: PathStep[]): StudentJourney["steps"] {
  return steps.map((step) => ({
    type: step.type,
    tcas_program_id: null,
    label: step.title,
    details: {
      university_name: step.universityMeta?.universityName,
      faculty_name: step.universityMeta?.facultyName,
      company_type: step.subtitle || undefined,
      salary_range: undefined,
      description: step.detail || undefined,
    },
  }));
}

export default function EditPathScreen() {
  const { id } = useLocalSearchParams();
  const [path, setPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadPath() {
      setLoading(true);
      try {
        const journey = await getJourneyById(String(id));
        if (journey) {
          setPath(studentJourneyToCareerPath(journey));
        } else {
          const foundPath = MOCK_PATH_DATA.paths.find((p) => p.id === id);
          if (foundPath) {
            setPath(JSON.parse(JSON.stringify(foundPath)));
          }
        }
      } catch (err) {
        console.error("[EditPath] Failed to load journey:", err);
        const foundPath = MOCK_PATH_DATA.paths.find((p) => p.id === id);
        if (foundPath) {
          setPath(JSON.parse(JSON.stringify(foundPath)));
        }
      } finally {
        setLoading(false);
      }
    }

    loadPath();
  }, [id]);

  const handleSave = async () => {
    if (!path) return;
    try {
      await updateJourney(String(id), {
        steps: pathStepsToJourneySteps(path.steps),
      });
    } catch (err) {
      console.error("[EditPath] Save failed:", err);
    }
    router.back();
  };

  const moveStepUp = (index: number) => {
    if (!path || index === 0) return;
    const newSteps = [...path.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    setPath({ ...path, steps: newSteps });
  };

  const moveStepDown = (index: number) => {
    if (!path || index === path.steps.length - 1) return;
    const newSteps = [...path.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    setPath({ ...path, steps: newSteps });
  };

  const openSelectorForStep = (index: number) => {
    setEditingStepIndex(index);
    setIsSelectorOpen(true);
  };

  const selectLibraryStep = (libStep: PathStep) => {
    if (!path || editingStepIndex === null) return;
    const newSteps = [...path.steps];
    // Copy the library step but keep a unique ID so we don't duplicate keys if picked twice
    newSteps[editingStepIndex] = { ...libStep, id: Math.random().toString() };
    setPath({ ...path, steps: newSteps });
    setIsSelectorOpen(false);
    setEditingStepIndex(null);
  };

  const deleteStep = (index: number) => {
    if (!path) return;
    const newSteps = path.steps.filter((_, i) => i !== index);
    setPath({ ...path, steps: newSteps });
  };

  if (loading || !path) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#6B7280", fontSize: 16 }}>
          {loading ? "กำลังโหลด..." : "ไม่พบเส้นทาง"}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#111" />
          </Pressable>
          <Text style={styles.headerTitle} variant="bold">
            วางแผนเส้นทาง
          </Text>
          <Pressable onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText} variant="bold">
              บันทึก
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Goal & Scoring Block */}
          <Pressable
            style={styles.goalBlock}
            onPress={() => {
              // Mock navigation to reasons page
              alert("Navigating to detailed reasoning page.");
            }}
          >
            <View style={styles.goalInfoRow}>
              <Text style={styles.goalIcon}>{path.careerGoalIcon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalText}>{path.careerGoal}</Text>
                <View style={styles.planLabelPill}>
                  <Text style={styles.planLabelText}>{path.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>

            <View style={styles.scoresRow}>
              <DonutScore
                score={path.passionScore}
                label="ความชอบ"
                icon="🔥"
                color="#F97316"
                size={56}
                strokeWidth={5}
              />
              <DonutScore
                score={path.futureScore}
                label="อนาคต"
                icon="🚀"
                color="#8B5CF6"
                size={56}
                strokeWidth={5}
              />
              <DonutScore
                score={path.worldScore}
                label="สอดคล้อง"
                icon="🌍"
                color="#10B981"
                size={56}
                strokeWidth={5}
              />
            </View>
          </Pressable>

          {/* Interactive Roadmap */}
          <View style={styles.roadmapBox}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle} variant="bold">
                ไทม์ไลน์ของคุณ
              </Text>
              <Text style={styles.timelineHint}>
                แตะเพื่อเปลี่ยน • ใช้ลูกศรเลื่อนลำดับ
              </Text>
            </View>

            {path.steps.map((step, index) => {
              const isFirst = index === 0;
              const isLast = index === path.steps.length - 1;

              return (
                <View key={step.id} style={styles.stepRow}>
                  {/* Step Selector Area */}
                  <Pressable
                    style={styles.stepCardWrap}
                    onPress={() => openSelectorForStep(index)}
                  >
                    <View pointerEvents="none">
                      <PathStepCard step={step} index={index} isLast={isLast} />
                    </View>
                  </Pressable>

                  {/* Rearrange Controls */}
                  <View style={styles.controlsWrap}>
                    <Pressable
                      onPress={() => moveStepUp(index)}
                      style={[styles.iconButton, isFirst && { opacity: 0.2 }]}
                      disabled={isFirst}
                    >
                      <Ionicons name="chevron-up" size={24} color="#6B7280" />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteStep(index)}
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#EF4444"
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => moveStepDown(index)}
                      style={[styles.iconButton, isLast && { opacity: 0.2 }]}
                      disabled={isLast}
                    >
                      <Ionicons name="chevron-down" size={24} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Mock Search & Select Modal */}
      <Modal visible={isSelectorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} variant="bold">
                เลือกขั้นตอนใหม่
              </Text>
              <Pressable onPress={() => setIsSelectorOpen(false)}>
                <Ionicons name="close-circle" size={28} color="#D1D5DB" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {MOCK_LIBRARY_STEPS.map((libStep) => (
                <Pressable
                  key={libStep.id}
                  style={styles.libStepItem}
                  onPress={() => selectLibraryStep(libStep)}
                >
                  <View pointerEvents="none">
                    <PathStepCard step={libStep} index={0} isLast={true} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  goalBlock: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  goalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  goalIcon: {
    fontSize: 32,
  },
  goalText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  planLabelPill: {
    backgroundColor: "rgba(0,0,0,0.05)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  scoresRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  roadmapBox: {},
  timelineHeader: {
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 24,
    color: "#111",
  },
  timelineHint: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 16,
  },
  stepCardWrap: {
    flex: 1,
  },
  controlsWrap: {
    width: 60,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingLeft: 12,
  },
  iconButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: Dimensions.get("window").height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 18,
    color: "#111",
  },
  libStepItem: {
    marginBottom: 16,
    opacity: 0.9,
  },
});
