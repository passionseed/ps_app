import { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { createJourney, updateJourney, getStudentJourneys } from "../../lib/journey";
import type { PathStep, StudentJourney } from "../../types/journey";
import { aiRiskColor } from "../../lib/jobUtils";
import type { JobRow } from "../../types/jobs";
import {
  Text as ThemeText,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../../lib/theme";

const MILESTONE_TYPES = [
  { type: "university" as const, label: "EDUCATION", labelTh: "การศึกษา", icon: "🎓", color: "#7C3AED", bgColor: "#F3E8FF" },
  { type: "internship" as const, label: "EXPERIENCE", labelTh: "ประสบการณ์", icon: "💼", color: "#0284C7", bgColor: "#E0F2FE" },
  { type: "job" as const, label: "CAREER", labelTh: "อาชีพ", icon: "🚀", color: "#059669", bgColor: "#D1FAE5" },
];

const META_BY_TYPE: Record<string, typeof MILESTONE_TYPES[0]> = {};
MILESTONE_TYPES.forEach((m) => { META_BY_TYPE[m.type] = m; });

type PickerTab = "jobs" | "intern" | "university";

interface TcasProgramRow {
  id: string;
  program_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string | null;
  university_id: string;
  university?: { university_name: string } | null;
}

function normalizeProgram(row: any): TcasProgramRow {
  const uni = row.university;
  return {
    ...row,
    university: Array.isArray(uni) ? uni[0] ?? null : uni ?? null,
  };
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
    icon: META_BY_TYPE[type]?.icon ?? "📍",
    status: "upcoming",
  };
}

function ElegantTimeline({
  steps,
  onAddMilestone,
  onRemoveStep,
}: {
  steps: PathStep[];
  onAddMilestone: () => void;
  onRemoveStep: (index: number) => void;
}) {
  const { appLanguage } = useAuth();
  const isThai = appLanguage === "th";

  if (steps.length === 0) {
    return (
      <Pressable style={styles.emptyTimelineCard} onPress={onAddMilestone}>
        <View style={styles.emptyTimelineIconCircle}>
          <Text style={styles.emptyTimelineIcon}>✨</Text>
        </View>
        <Text style={styles.emptyTimelineTitle}>
          {isThai ? "เริ่มสร้างเส้นทางของคุณ" : "Start building your path"}
        </Text>
        <Text style={styles.emptyTimelineSubtitle}>
          {isThai ? "เพิ่มเป้าหมายแรกของคุณ" : "Add your first milestone"}
        </Text>
      </Pressable>
    );
  }

  const completedSteps = 0;
  const careerGoal = steps[steps.length - 1]?.title ?? "";

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineCardHeader}>
        <View style={styles.timelineGoalRow}>
          <Text style={styles.timelineGoalEmoji}>🎯</Text>
          <Text style={styles.timelineGoalTitle}>{careerGoal || (isThai ? "เส้นทางอาชีพ" : "Career Path")}</Text>
        </View>
        <View style={styles.timelineProgressBadge}>
          <Text style={styles.timelineProgressText}>
            {completedSteps}/{steps.length} {isThai ? "เสร็จสิ้น" : "completed"}
          </Text>
        </View>
      </View>

      <View style={styles.timelineStepsWrapper}>
        {steps.map((step, idx) => {
          const meta = META_BY_TYPE[step.type] || META_BY_TYPE.job;
          const isLastStep = idx === steps.length - 1;

          return (
            <View key={step.id} style={styles.timelineStepRow}>
              <View style={styles.timelineStepLeft}>
                <View style={[styles.timelineStepIconCircle, { backgroundColor: meta.bgColor }]}>
                  <Text style={[styles.timelineStepIconText, { color: meta.color }]}>{meta.icon}</Text>
                </View>
                {!isLastStep && <View style={styles.timelineConnectorLine} />}
              </View>

              <View style={styles.timelineStepContent}>
                <View style={styles.timelineStepContentHeader}>
                  <View style={[styles.timelineCategoryPill, { backgroundColor: meta.bgColor }]}>
                    <Text style={[styles.timelineCategoryText, { color: meta.color }]}>
                      {isThai ? meta.labelTh : meta.label}
                    </Text>
                  </View>
                  <View style={styles.timelineStepActions}>
                    <Text style={styles.timelineStepNumber}>
                      {isThai ? "ขั้นตอน" : "Step"} {step.order + 1}
                    </Text>
                    <Pressable onPress={() => onRemoveStep(idx)} style={styles.timelineRemoveBtn}>
                      <Text style={styles.timelineRemoveBtnText}>✕</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.timelineStepTitle}>{step.title}</Text>
                {step.subtitle ? (
                  <Text style={styles.timelineStepSubtitle}>{step.subtitle}</Text>
                ) : null}
                {step.detail ? (
                  <Text style={styles.timelineStepDetail}>{step.detail}</Text>
                ) : null}
                {step.duration ? (
                  <View style={styles.timelineDurationRow}>
                    <Text style={styles.timelineDurationIcon}>⏱</Text>
                    <Text style={styles.timelineDurationText}>{step.duration}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.timelineAddBtn} onPress={onAddMilestone}>
        <View style={styles.timelineAddBtnIconCircle}>
          <Text style={styles.timelineAddBtnIcon}>+</Text>
        </View>
        <Text style={styles.timelineAddBtnText}>
          {isThai ? "เพิ่มเป้าหมาย" : "Add Milestone"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function PlansHubScreen() {
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
        save: "บันทึก",
        saving: "กำลังบันทึก…",
        compare: "เปรียบเทียบ",
        addMilestone: "เพิ่มเป้าหมาย",
        modalTitle: "เลือกเป้าหมาย",
        tabs: { jobs: "อาชีพ", intern: "ฝึกงาน", university: "มหาวิทยาลัย" },
        searchPlaceholder: "ค้นหา…",
        cancel: "ยกเลิก",
        noResults: "ไม่พบผลลัพธ์",
      }
    : {
        title: "Career Canvas",
        save: "Save",
        saving: "Saving…",
        compare: "Compare",
        addMilestone: "Add Milestone",
        modalTitle: "Choose a milestone",
        tabs: { jobs: "Jobs", intern: "Internship", university: "University" },
        searchPlaceholder: "Search…",
        cancel: "Cancel",
        noResults: "No results found",
      };

  const loadLatestJourney = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const journeys = await getStudentJourneys();
      const careerJourney = journeys.find(
        (j) => j.source === "manual" || j.career_goal,
      );
      if (careerJourney) {
        setJourney(careerJourney);
        setSteps(
          careerJourney.steps.map((step, index) => {
            const icon =
              META_BY_TYPE[step.type]?.icon ?? "📍";
            const details = step.details;
            return {
              id: `${step.type}-${index}`,
              order: index,
              type: step.type,
              title: step.label,
              subtitle: details?.university_name ?? details?.company_type ?? "",
              detail: details?.description ?? "",
              duration: details?.duration_months
                ? `${details.duration_months} months`
                : "",
              icon,
              status: "upcoming" as const,
              universityMeta:
                step.type === "university"
                  ? {
                      universityName: details?.university_name ?? "",
                      facultyName: details?.faculty_name ?? "",
                    }
                  : undefined,
            };
          }),
        );
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
            .select(
              "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
            )
            .not("rank", "is", null)
            .order("rank", { ascending: true })
            .limit(20);
          if (!error) setJobs((data as JobRow[]) ?? []);
        } else if (pickerTab === "university") {
          const { data, error } = await supabase
            .from("tcas_programs")
            .select(
              "id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)",
            )
            .limit(20);
          if (!error) setPrograms((data ?? []).map(normalizeProgram));
        } else if (pickerTab === "intern") {
          const { data, error } = await supabase
            .from("jobs")
            .select(
              "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
            )
            .or(
              "title.ilike.*intern*,title.ilike.*trainee*,title.ilike.*junior*,title.ilike.*assistant*",
            )
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

  const handleRemoveStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  }, []);

  const handleAddMilestone = useCallback(() => {
    setShowPicker(true);
    setPickerTab("jobs");
    setSearchQuery("");
  }, []);

  const handleSelectJob = useCallback(
    (job: JobRow) => {
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
    },
    [],
  );

  const handleSelectProgram = useCallback(
    (program: TcasProgramRow) => {
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
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert(
        isThai ? "กรุณาเข้าสู่ระบบ" : "Sign in required",
        isThai
          ? "เข้าสู่ระบบเพื่อบันทึกเส้นทางอาชีพ"
          : "Please sign in to save your career path.",
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
            duration_months: s.duration
              ? parseInt(s.duration, 10) || undefined
              : undefined,
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
        isThai
          ? "เส้นทางอาชีพของคุณถูกบันทึกแล้ว"
          : "Your career path has been saved.",
      );
    } catch (error: any) {
      Alert.alert(
        isThai ? "บันทึกไม่สำเร็จ" : "Save failed",
        error?.message ??
          (isThai ? "ลองใหม่อีกครั้ง" : "Could not save your path. Try again."),
      );
    } finally {
      setSaving(false);
    }
  }, [user, steps, journey, isThai]);

  const searchJobs = useCallback(async (query: string) => {
    if (!query.trim()) {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
        )
        .not("rank", "is", null)
        .order("rank", { ascending: true })
        .limit(20);
      if (!error) setJobs((data as JobRow[]) ?? []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
        )
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
        .select(
          "id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)",
        )
        .limit(20);
      if (!error) setPrograms((data ?? []).map(normalizeProgram));
      return;
    }
    try {
      const { data, error } = await supabase
        .from("tcas_programs")
        .select(
          "id, program_id, program_name, program_name_en, faculty_name, university_id, university:university_id(university_name)",
        )
        .or(`program_name.ilike.%${query}%,faculty_name.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      setPrograms((data ?? []).map(normalizeProgram));
    } catch {
      setPrograms([]);
    }
  }, []);

  const searchInterns = useCallback(async (query: string) => {
    if (!query.trim()) {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
        )
        .or(
          "title.ilike.*intern*,title.ilike.*trainee*,title.ilike.*junior*,title.ilike.*assistant*",
        )
        .order("rank", { ascending: true })
        .limit(20);
      if (!error) setJobs((data as JobRow[]) ?? []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, rank, title, category, demand_trend, automation_risk, growth_rate, viability_score, salary_range_thb",
        )
        .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
        .order("rank", { ascending: true })
        .limit(20);
      if (error) throw error;
      setJobs((data as JobRow[]) ?? []);
    } catch {
      setJobs([]);
    }
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (pickerTab === "jobs") searchJobs(text);
      else if (pickerTab === "university") searchPrograms(text);
      else if (pickerTab === "intern") searchInterns(text);
    },
    [pickerTab, searchJobs, searchPrograms, searchInterns],
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
        </View>
        <View style={styles.loadingWrap}>
          <PathLabSkiaLoader size="large" />
        </View>
      </View>
    );
  }

  const meta =
    MILESTONE_TYPES.find(
      (m) => m.type === pickerTab.replace("intern", "internship"),
    ) ?? MILESTONE_TYPES[2];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={styles.headerActions}>
          {steps.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.8 },
              ]}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ElegantTimeline
          steps={steps}
          onReorder={handleReorder}
          onAddMilestone={handleAddMilestone}
          onRemoveStep={handleRemoveStep}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

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
              {(["jobs", "intern", "university"] as PickerTab[]).map(
                (tab) => {
                  const isActive = pickerTab === tab;
                  const tabMeta =
                    MILESTONE_TYPES.find((m) =>
                      tab === "intern"
                        ? m.type === "internship"
                        : m.type === tab,
                    ) ?? MILESTONE_TYPES[2];
                  return (
                    <Pressable
                      key={tab}
                      style={[
                        styles.tab,
                        isActive && {
                          backgroundColor: tabMeta.bgColor,
                          borderColor: tabMeta.color,
                        },
                      ]}
                      onPress={() => {
                        setPickerTab(tab);
                        setSearchQuery("");
                      }}
                    >
                      <Text
                        style={[
                          styles.tabIcon,
                          isActive && { color: tabMeta.color },
                        ]}
                      >
                        {tabMeta.icon}
                      </Text>
                      <Text
                        style={[
                          styles.tabText,
                          isActive && {
                            color: tabMeta.color,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {copy.tabs[tab]}
                      </Text>
                    </Pressable>
                  );
                },
              )}
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
                        <View
                          style={[
                            styles.resultIconWrap,
                            { backgroundColor: "#F3E8FF" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.resultIcon,
                              { color: "#7C3AED" },
                            ]}
                          >
                            🎓
                          </Text>
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultTitle}>
                            {item.program_name}
                          </Text>
                          <Text style={styles.resultSubtitle}>
                            {item.faculty_name ?? ""}
                            {item.faculty_name &&
                            item.university?.university_name
                              ? " · "
                              : ""}
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
                      <View
                        style={[
                          styles.resultIconWrap,
                          { backgroundColor: meta.bgColor },
                        ]}
                      >
                        <Text
                          style={[styles.resultIcon, { color: meta.color }]}
                        >
                          {meta.icon}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle}>{item.title}</Text>
                        <View style={styles.resultMetaRow}>
                          {item.category ? (
                            <View style={styles.categoryTag}>
                              <Text style={styles.categoryTagText}>
                                {item.category}
                              </Text>
                            </View>
                          ) : null}
                          {item.growth_rate ? (
                            <Text style={styles.growthText}>
                              {item.growth_rate}
                            </Text>
                          ) : null}
                        </View>
                        {item.salary_range_thb ? (
                          <Text style={styles.salaryText}>
                            ฿
                            {item.salary_range_thb.min_monthly?.toLocaleString() ??
                              "?"}{" "}
                            – ฿
                            {item.salary_range_thb.max_monthly?.toLocaleString() ??
                              "?"}
                            /mo
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
                              {
                                backgroundColor: aiRiskColor(
                                  item.automation_risk,
                                ),
                              },
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
    backgroundColor: "#F8F9FB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    paddingTop: Space.md,
    paddingBottom: Space.xl,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
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
    paddingHorizontal: Space.md,
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.lg,
  },
  compareBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: ThemeText.secondary,
  },

  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius["2xl"],
    padding: Space["2xl"],
    ...Shadow.neutral,
  },
  timelineCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Space.lg,
  },
  timelineGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    flex: 1,
  },
  timelineGoalEmoji: {
    fontSize: 24,
  },
  timelineGoalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  timelineProgressBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.full,
  },
  timelineProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  timelineStepsWrapper: {
    marginTop: Space.md,
  },
  timelineStepRow: {
    flexDirection: "row",
    marginBottom: Space.lg,
  },
  timelineStepLeft: {
    width: 40,
    alignItems: "center",
    marginRight: Space.md,
  },
  timelineStepIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineStepIconText: {
    fontSize: 16,
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
    marginBottom: -Space.lg,
  },
  timelineStepContent: {
    flex: 1,
    backgroundColor: "#FAFBFC",
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  timelineStepContentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Space.sm,
  },
  timelineCategoryPill: {
    paddingHorizontal: Space.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  timelineCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  timelineStepActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  timelineStepNumber: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  timelineRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineRemoveBtnText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  timelineStepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  timelineStepSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  timelineStepDetail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  timelineDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Space.sm,
  },
  timelineDurationIcon: {
    fontSize: 12,
  },
  timelineDurationText: {
    fontSize: 12,
    color: "#6B7280",
  },
  timelineAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.md,
    marginTop: Space.md,
    paddingVertical: Space.md,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: Radius.lg,
  },
  timelineAddBtnIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineAddBtnIcon: {
    fontSize: 16,
    fontWeight: "300",
    color: "#9CA3AF",
  },
  timelineAddBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  emptyTimelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius["2xl"],
    padding: Space.xl,
    alignItems: "center",
    gap: Space.md,
    ...Shadow.neutral,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyTimelineIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTimelineIcon: {
    fontSize: 28,
  },
  emptyTimelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyTimelineSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
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
