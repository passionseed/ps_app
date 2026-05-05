import { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { CanvasTimeline } from "../../components/Canvas/CanvasTimeline";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { createJourney, updateJourney, getStudentJourneys } from "../../lib/journey";
import type { PathStep, StudentJourney } from "../../types/journey";
import { aiRiskColor } from "../../lib/jobUtils";
import type { JobRow } from "../../types/jobs";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../../lib/theme";

const MILESTONE_TYPES = [
  { type: "university" as const, label: "University", labelTh: "มหาวิทยาลัย", icon: "🎓", color: "#7C3AED", bgColor: "#F3E8FF" },
  { type: "internship" as const, label: "Internship", labelTh: "การฝึกงาน", icon: "💼", color: "#0284C7", bgColor: "#E0F2FE" },
  { type: "job" as const, label: "Job", labelTh: "อาชีพ", icon: "🚀", color: "#059669", bgColor: "#D1FAE5" },
];

type PickerTab = "jobs" | "intern" | "university";

interface TcasProgramRow {
  id: string;
  program_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string | null;
  university_id: string;
  university?: {
    university_name: string;
  } | null;
}

function emptyStep(type: "university" | "internship" | "job"): PathStep {
  return {
    id: `${type}-${Date.now()}`,
    order: 0,
    type,
    title: "",
    subtitle: "",
    detail: "",
    duration: "",
    icon: MILESTONE_TYPES.find((m) => m.type === type)?.icon ?? "📍",
    status: "upcoming",
  };
}

function pathStepFromJourneyStep(
  step: import("../../types/journey").JourneyStep,
  index: number,
): PathStep {
  const icon = MILESTONE_TYPES.find((m) => m.type === step.type)?.icon ?? "📍";
  const details = step.details;
  return {
    id: `${step.type}-${index}`,
    order: index,
    type: step.type,
    title: step.label,
    subtitle: details?.university_name ?? details?.company_type ?? "",
    detail: details?.description ?? "",
    duration: details?.duration_months ? `${details.duration_months} months` : "",
    icon,
    status: "upcoming",
    universityMeta:
      step.type === "university"
        ? {
            universityName: details?.university_name ?? "",
            facultyName: details?.faculty_name ?? "",
          }
        : undefined,
  };
}

export default function CareerCanvasScreen() {
  const insets = useSafeAreaInsets();
  const { user, appLanguage } = useAuth();
  const isThai = appLanguage === "th";
  const [steps, setSteps] = useState<PathStep[]>([]);
  const [journey, setJourney] = useState<StudentJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [pickerTab, setPickerTab] = useState<PickerTab>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [programs, setPrograms] = useState<TcasProgramRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const copy = isThai
    ? {
        title: "สร้างเส้นทางอาชีพ",
        back: "‹ แผน",
        save: "บันทึก",
        saving: "กำลังบันทึก…",
        compare: "เปรียบเทียบ →",
        addMilestone: "เพิ่มเป้าหมาย",
        emptyTitle: "ยังไม่มีเป้าหมาย",
        emptySub: "แตะปุ่มด้านล่างเพื่อเริ่มสร้างเส้นทางอาชีพของคุณ",
        modalTitle: "เลือกเป้าหมาย",
        tabs: { jobs: "อาชีพ", intern: "ฝึกงาน", university: "มหาวิทยาลัย" },
        searchPlaceholder: "ค้นหา…",
        cancel: "ยกเลิก",
        noResults: "ไม่พบผลลัพธ์",
      }
    : {
        title: "Career Canvas",
        back: "‹ Plans",
        save: "Save",
        saving: "Saving…",
        compare: "Compare →",
        addMilestone: "Add Milestone",
        emptyTitle: "No milestones yet",
        emptySub: "Tap the button below to start building your career path",
        modalTitle: "Choose a milestone",
        tabs: { jobs: "Jobs", intern: "Internship", university: "University" },
        searchPlaceholder: "Search…",
        cancel: "Cancel",
        noResults: "No results found",
      };

  const loadLatestJourney = useCallback(async () => {
    if (!user) return;
    try {
      const journeys = await getStudentJourneys();
      const careerJourney = journeys.find(
        (j) => j.source === "manual" || j.career_goal,
      );
      if (careerJourney) {
        setJourney(careerJourney);
        setSteps(careerJourney.steps.map(pathStepFromJourneyStep));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadLatestJourney();
    }, [loadLatestJourney]),
  );

  useEffect(() => {
    if (!showPicker) return;
    
    const loadDefaultData = async () => {
      setPickerLoading(true);
      try {
        if (pickerTab === "jobs") {
          const { data, error } = await supabase
            .from("jobs")
            .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
            .not("rank", "is", null)
            .order("rank", { ascending: true })
            .limit(20);
          if (!error) setJobs((data as JobRow[]) ?? []);
        } else if (pickerTab === "university") {
          const { data, error } = await supabase
            .from("tcas_programs")
            .select("id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)")
            .limit(20);
          if (!error) setPrograms((data as TcasProgramRow[]) ?? []);
        } else if (pickerTab === "intern") {
          const { data, error } = await supabase
            .from("jobs")
            .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
            .or("title.ilike.*intern*,title.ilike.*trainee*,title.ilike.*junior*,title.ilike.*assistant*")
            .order("rank", { ascending: true })
            .limit(20);
          if (!error) setJobs((data as JobRow[]) ?? []);
        }
      } catch {
      } finally {
        setPickerLoading(false);
      }
    };

    loadDefaultData();
  }, [showPicker, pickerTab]);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSteps((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next.map((s, i) => ({ ...s, order: i }));
      });
    },
    [],
  );

  const handleAddMilestone = useCallback(() => {
    setShowPicker(true);
    setPickerTab("jobs");
    setSearchQuery("");
  }, []);

  const handleSelectJob = useCallback((job: JobRow) => {
    setShowPicker(false);
    setSearchQuery("");
    setSteps((prev) => [
      ...prev,
      {
        ...emptyStep("job"),
        title: job.title,
        subtitle: job.category ?? "",
        detail: `AI risk: ${Math.round((job.automation_risk ?? 0) * 100)}% · Growth: ${job.growth_rate ?? "N/A"}`,
        order: prev.length,
      },
    ]);
  }, []);

  const handleSelectProgram = useCallback((program: TcasProgramRow) => {
    setShowPicker(false);
    setSearchQuery("");
    setSteps((prev) => [
      ...prev,
      {
        ...emptyStep("university"),
        title: program.program_name,
        subtitle: program.faculty_name ?? "",
        detail: program.university?.university_name ?? "",
        order: prev.length,
        universityMeta: {
          universityName: program.university?.university_name ?? "",
          facultyName: program.faculty_name ?? "",
        },
      },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert(
        isThai ? "กรุณาเข้าสู่ระบบ" : "Sign in required",
        isThai ? "เข้าสู่ระบบเพื่อบันทึกเส้นทางอาชีพ" : "Please sign in to save your career path."
      );
      return;
    }
    setSaving(true);
    try {
      const journeySteps = steps.map(
        (s): import("../../types/journey").JourneyStep => ({
          type: s.type,
          tcas_program_id: null,
          label: s.title || s.type,
          details: {
            university_name: s.universityMeta?.universityName,
            faculty_name: s.universityMeta?.facultyName,
            description: s.detail,
            duration_months: s.duration ? parseInt(s.duration, 10) || undefined : undefined,
          },
        }),
      );

      if (journey) {
        await updateJourney(journey.id, { steps: journeySteps });
      } else {
        const newJourney = await createJourney({
          title: "My Career Path",
          career_goal: steps[steps.length - 1]?.title ?? "",
          source: "manual",
          steps: journeySteps,
        });
        setJourney(newJourney);
      }
      Alert.alert(
        isThai ? "บันทึกแล้ว" : "Saved",
        isThai ? "เส้นทางอาชีพของคุณถูกบันทึกแล้ว" : "Your career path has been saved."
      );
    } catch (error: any) {
      Alert.alert(
        isThai ? "บันทึกไม่สำเร็จ" : "Save failed",
        error?.message ?? (isThai ? "ลองใหม่อีกครั้ง" : "Could not save your path. Try again.")
      );
    } finally {
      setSaving(false);
    }
  }, [user, steps, journey, isThai]);

  const searchJobs = useCallback(async (query: string) => {
    if (!query.trim()) {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
        .not("rank", "is", null)
        .order("rank", { ascending: true })
        .limit(20);
      if (!error) setJobs((data as JobRow[]) ?? []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
        .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
        .order("rank", { ascending: true })
        .limit(20);
      if (error) throw error;
      setJobs((data as JobRow[]) ?? []);
    } catch {
      setJobs([]);
    }
  }, []);

  const searchPrograms = useCallback(async (query: string) => {
    if (!query.trim()) {
      const { data, error } = await supabase
        .from("tcas_programs")
        .select("id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)")
        .limit(20);
      if (!error) setPrograms((data as TcasProgramRow[]) ?? []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("tcas_programs")
        .select("id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)")
        .or(`program_name.ilike.%${query}%,faculty_name.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      setPrograms((data as TcasProgramRow[]) ?? []);
    } catch {
      setPrograms([]);
    }
  }, []);

  const searchInterns = useCallback(async (query: string) => {
    if (!query.trim()) {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
        .or("title.ilike.*intern*,title.ilike.*trainee*,title.ilike.*junior*,title.ilike.*assistant*")
        .order("rank", { ascending: true })
        .limit(20);
      if (!error) setJobs((data as JobRow[]) ?? []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb")
        .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
        .order("rank", { ascending: true })
        .limit(20);
      if (error) throw error;
      setJobs((data as JobRow[]) ?? []);
    } catch {
      setJobs([]);
    }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (pickerTab === "jobs") searchJobs(text);
    else if (pickerTab === "university") searchPrograms(text);
    else if (pickerTab === "intern") searchInterns(text);
  }, [pickerTab, searchJobs, searchPrograms, searchInterns]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  const meta = MILESTONE_TYPES.find((m) => m.type === pickerTab.replace("intern", "internship")) ?? MILESTONE_TYPES[2];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{copy.back}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={styles.headerActions}>
          {steps.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={Gradient.primaryCta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtnGradient}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? copy.saving : copy.save}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
          <Pressable
            style={styles.compareBtn}
            onPress={() => router.push("/plans/compare")}
          >
            <Text style={styles.compareBtnText}>{copy.compare}</Text>
          </Pressable>
        </View>
      </View>

      <CanvasTimeline
        steps={steps}
        onReorder={handleReorder}
        onAddMilestone={handleAddMilestone}
      />

      <Modal visible={showPicker} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{copy.modalTitle}</Text>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={copy.searchPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            <View style={styles.tabBar}>
              {( ["jobs", "intern", "university"] as PickerTab[] ).map((tab) => {
                const isActive = pickerTab === tab;
                const tabMeta = MILESTONE_TYPES.find((m) =>
                  tab === "intern" ? m.type === "internship" : m.type === tab
                ) ?? MILESTONE_TYPES[2];
                return (
                  <Pressable
                    key={tab}
                    style={[
                      styles.tab,
                      isActive && { backgroundColor: tabMeta.bgColor, borderColor: tabMeta.color },
                    ]}
                    onPress={() => {
                      setPickerTab(tab);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={[styles.tabIcon, isActive && { color: tabMeta.color }]}>
                      {tabMeta.icon}
                    </Text>
                    <Text style={[styles.tabText, isActive && { color: tabMeta.color, fontWeight: "700" }]}>
                      {copy.tabs[tab]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.contentArea}>
              {pickerLoading ? (
                <View style={styles.loadingWrap}>
                  <PathLabSkiaLoader size="small" />
                </View>
              ) : pickerTab === "university" ? (
                programs.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>{copy.noResults}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={programs}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <Pressable
                        style={({ pressed }) => [
                          styles.resultCard,
                          pressed && styles.resultCardPressed,
                        ]}
                        onPress={() => handleSelectProgram(item)}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: "#F3E8FF" }]}>
                          <Text style={[styles.resultIcon, { color: "#7C3AED" }]}>🎓</Text>
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultTitle}>{item.program_name}</Text>
                          <Text style={styles.resultSubtitle}>
                            {item.faculty_name ?? ""}
                            {item.faculty_name && item.university?.university_name ? " · " : ""}
                            {item.university?.university_name ?? ""}
                          </Text>
                        </View>
                        <Text style={styles.resultArrow}>→</Text>
                      </Pressable>
                    )}
                  />
                )
              ) : jobs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>{copy.noResults}</Text>
                </View>
              ) : (
                <FlatList
                  data={jobs}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.resultCard,
                        pressed && styles.resultCardPressed,
                      ]}
                      onPress={() => handleSelectJob(item)}
                    >
                      <View style={[styles.resultIconWrap, { backgroundColor: meta.bgColor }]}>
                        <Text style={[styles.resultIcon, { color: meta.color }]}>{meta.icon}</Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle}>{item.title}</Text>
                        <View style={styles.resultMetaRow}>
                          {item.category ? (
                            <View style={styles.categoryTag}>
                              <Text style={styles.categoryTagText}>{item.category}</Text>
                            </View>
                          ) : null}
                          {item.growth_rate ? (
                            <Text style={styles.growthText}>{item.growth_rate}</Text>
                          ) : null}
                        </View>
                        {item.salary_range_thb ? (
                          <Text style={styles.salaryText}>
                            ฿{item.salary_range_thb.min_monthly?.toLocaleString() ?? "?"} – ฿{item.salary_range_thb.max_monthly?.toLocaleString() ?? "?"}/mo
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.resultRight}>
                        <View
                          style={[
                            styles.riskDotOuter,
                            { borderColor: aiRiskColor(item.automation_risk) },
                          ]}
                        >
                          <View
                            style={[
                              styles.riskDot,
                              { backgroundColor: aiRiskColor(item.automation_risk) },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.riskLabel,
                            { color: aiRiskColor(item.automation_risk) },
                          ]}
                        >
                          {item.automation_risk != null
                            ? `AI ${Math.round(item.automation_risk * 100)}%`
                            : "—"}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowPicker(false);
                setSearchQuery("");
              }}
            >
              <Text style={styles.cancelBtnText}>{copy.cancel}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.md,
    gap: Space.sm,
  },
  backBtn: {
    paddingRight: Space.sm,
  },
  backBtnText: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  saveBtn: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  saveBtnGradient: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  compareBtn: {
    paddingVertical: Space.sm,
  },
  compareBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgb(0,22,81)",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Space["2xl"],
    paddingTop: Space.md,
    paddingBottom: Space.xl,
    height: "90%",
    ...Shadow.neutral,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: Space.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
    textAlign: "center",
    marginBottom: Space.lg,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.full,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    marginBottom: Space.lg,
    gap: Space.sm,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ThemeText.primary,
    paddingVertical: 4,
  },

  tabBar: {
    flexDirection: "row",
    gap: Space.sm,
    marginBottom: Space.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tabIcon: {
    fontSize: 14,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: ThemeText.secondary,
  },

  contentArea: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: ThemeText.tertiary,
  },

  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: Space.lg,
    marginBottom: Space.sm,
    gap: Space.md,
    ...Shadow.neutral,
  },
  resultCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  resultIcon: {
    fontSize: 20,
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  growthText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },
  salaryText: {
    fontSize: 11,
    color: ThemeText.tertiary,
  },
  resultRight: {
    alignItems: "center",
    gap: 3,
    width: 56,
  },
  resultArrow: {
    fontSize: 18,
    color: ThemeText.tertiary,
  },
  riskDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  riskLabel: {
    fontSize: 9,
    fontWeight: "700",
  },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: Space.lg,
    marginTop: Space.sm,
    borderRadius: Radius.lg,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: ThemeText.secondary,
  },
});
