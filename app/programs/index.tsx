import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { createPlanWithPrograms, getPlanCount, MAX_PLANS_PER_USER } from "../../lib/admissionPlans";
import { getTcasProfile } from "../../lib/onboarding";
import { getSavedProgramIds, toggleSaveProgram } from "../../lib/savedPrograms";
import { buildProgramPlannerSections, searchPrograms } from "../../lib/tcas";
import type { ProgramPlannerCandidate } from "../../types/tcas";
import {
  Accent,
  Border,
  Gradient,
  PageBg,
  Radius,
  Shadow,
  Space,
  Text as ThemeText,
  Type,
} from "../../lib/theme";

const ROUND_FILTERS = [
  { value: 0, label: "All" },
  { value: 1, label: "R1" },
  { value: 2, label: "R2" },
  { value: 3, label: "R3" },
  { value: 4, label: "R4" },
  { value: 5, label: "R5" },
];

export default function ProgramsBrowserScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ProgramPlannerCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userGpax, setUserGpax] = useState<number | null>(null);
  const [busyProgramId, setBusyProgramId] = useState<string | null>(null);

  const { appLanguage, user, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const loadSavedIds = useCallback(async () => {
    try {
      setSavedIds(await getSavedProgramIds());
    } catch (error) {
      console.error("Failed to load saved programs:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      if (isGuest) {
        if (!cancelled) {
          setUserGpax(null);
        }
        return;
      }

      if (!user?.id) return;

      try {
        const tcasProfile = await getTcasProfile(user.id).catch(() => null);

        if (cancelled) return;
        setUserGpax(tcasProfile?.gpax ?? null);
      } catch (error) {
        console.error("Failed to load planner context:", error);
      }
    }

    loadContext();
    loadSavedIds();

    return () => {
      cancelled = true;
    };
  }, [isGuest, loadSavedIds, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadSavedIds();
    }, [loadSavedIds]),
  );

  const performSearch = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const data = await searchPrograms(query, 36, { userGpax });
        setResults(data);
      } catch (error) {
        console.error("Planner search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [userGpax],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch, searchQuery]);

  const filteredResults = useMemo(
    () =>
      selectedRound === 0
        ? results
        : results.filter((result) => result.round_numbers.includes(selectedRound)),
    [results, selectedRound],
  );

  const sections = useMemo(
    () =>
      buildProgramPlannerSections(filteredResults, searchQuery, {
        userGpax,
        isThai,
      }),
    [filteredResults, isThai, searchQuery, userGpax],
  );

  const copy = isThai
    ? {
        title: "วางแผนอนาคตจาก TCAS",
        subtitle: "ไม่ใช่แค่หาสาขา แต่ดูว่าทางไหนพาคุณไปได้จริง",
        searchPlaceholder: "ค้นหาสาขา คณะ มหาวิทยาลัย หรือเส้นทางที่อยากไป",
        noResultsTitle: "ยังไม่เจอทางที่ใช่",
        noResultsBody: "ลองค้นหาด้วยชื่อสาขาใกล้เคียง หรือดูตัวเลือกที่ระบบแนะนำด้านบน",
        noProfileTitle: "เริ่มจากดูทางเลือกที่น่าไปต่อ",
        noProfileBody: "ถ้ากรอก GPAX และข้อมูล TCAS เพิ่ม ระบบจะจัดอันดับได้แม่นขึ้น",
        save: "บันทึก",
        saved: "บันทึกแล้ว",
        compare: "เทียบ",
        addToPlan: "ใส่แผน",
        detail: "ดูต่อ",
        likely: "ลุ้นได้",
        stretch: "ต้องลุ้นหนัก",
        unknown: "ต้องเช็กเพิ่ม",
        portfolioFit: "พอร์ตเข้าทาง",
        noPortfolioFit: "ยังไม่มีข้อมูลพอร์ตลึก",
        deadlineSoon: "ปิดรับเร็ว",
        deadlineExpired: "รอบนี้ปิดแล้ว",
        affordable: "ค่าใช้จ่ายต่ำกว่า",
        expensive: "ค่าใช้จ่ายสูงกว่า",
      }
    : {
        title: "Plan Your TCAS Futures",
        subtitle: "Search is just the start. See which paths are believable next moves.",
        searchPlaceholder: "Search a program, faculty, university, or future path",
        noResultsTitle: "No strong path found yet",
        noResultsBody: "Try a nearby major, a faculty name, or explore the planner-led suggestions above.",
        noProfileTitle: "Start with options that can go somewhere",
        noProfileBody: "Add GPAX and TCAS profile details later to improve ranking confidence.",
        save: "Save",
        saved: "Saved",
        compare: "Compare",
        addToPlan: "Add to Plan",
        detail: "Open",
        likely: "Realistic",
        stretch: "Stretch",
        unknown: "Need to verify",
        portfolioFit: "Portfolio-fit available",
        noPortfolioFit: "Light fit data only",
        deadlineSoon: "Deadline soon",
        deadlineExpired: "Round expired",
        affordable: "Lower cost",
        expensive: "Higher cost",
      };

  const handleToggleSave = useCallback(
    async (program: ProgramPlannerCandidate) => {
      if (busyProgramId === program.program_id) return;
      setBusyProgramId(program.program_id);

      try {
        const nextState = await toggleSaveProgram(
          program.program_id,
          program.university_id,
          savedIds.has(program.program_id),
        );

        setSavedIds((current) => {
          const next = new Set(current);
          if (nextState) next.add(program.program_id);
          else next.delete(program.program_id);
          return next;
        });
      } catch (error) {
        console.error("Failed to toggle save state:", error);
      } finally {
        setBusyProgramId(null);
      }
    },
    [busyProgramId, savedIds],
  );

  const handleCompare = useCallback((program: ProgramPlannerCandidate) => {
    router.push({
      pathname: "/university/compare",
      params: {
        keyA: encodeURIComponent(program.university_name),
        facultyA: encodeURIComponent(program.faculty_name ?? program.program_name),
        careerGoal: encodeURIComponent(program.field_name_en ?? program.program_name_en ?? program.program_name),
      },
    });
  }, []);

  const handleAddToPlan = useCallback(
    async (program: ProgramPlannerCandidate) => {
      try {
        const planCount = await getPlanCount();
        const alreadySaved = savedIds.has(program.program_id);

        if (planCount < MAX_PLANS_PER_USER) {
          if (!alreadySaved) {
            await toggleSaveProgram(program.program_id, program.university_id, false);
            setSavedIds((current) => new Set(current).add(program.program_id));
          }

          const roundNumber = program.best_round?.round_number ?? 1;
          const plan = await createPlanWithPrograms(
            isThai ? `${program.program_name} แผนสมัคร` : `${program.program_name_en ?? program.program_name} Plan`,
            { [roundNumber]: [program.program_id] },
          );
          router.push(`/plans/${plan.id}`);
          return;
        }

        if (!alreadySaved) {
          await toggleSaveProgram(program.program_id, program.university_id, false);
          setSavedIds((current) => new Set(current).add(program.program_id));
        }

        router.push("/plans/create");
      } catch (error) {
        console.error("Failed to add program to plan:", error);
      }
    },
    [isThai, savedIds],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>TCAS Futures Planner</Text>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[
              styles.searchInput,
              isThai && { fontFamily: "BaiJamjuree_400Regular", paddingTop: 4 },
            ]}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {ROUND_FILTERS.map((item) => (
            <Pressable
              key={item.value}
              style={[
                styles.filterChip,
                selectedRound === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRound(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedRound === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!userGpax && (
          <View style={styles.contextBanner}>
            <Text style={styles.contextBannerTitle}>{copy.noProfileTitle}</Text>
            <Text style={styles.contextBannerBody}>{copy.noProfileBody}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Accent.yellow} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{copy.noResultsTitle}</Text>
            <Text style={styles.emptyBody}>{copy.noResultsBody}</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              </View>

              {section.items.map((program) => (
                <ProgramCard
                  key={`${section.key}-${program.program_id}`}
                  copy={copy}
                  isBusy={busyProgramId === program.program_id}
                  isSaved={savedIds.has(program.program_id)}
                  isThai={isThai}
                  onAddToPlan={() => handleAddToPlan(program)}
                  onCompare={() => handleCompare(program)}
                  onOpen={() => router.push(`/programs/${program.program_id}`)}
                  onToggleSave={() => handleToggleSave(program)}
                  program={program}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ProgramCard({
  copy,
  isBusy,
  isSaved,
  isThai,
  onAddToPlan,
  onCompare,
  onOpen,
  onToggleSave,
  program,
}: {
  copy: Record<string, string>;
  isBusy: boolean;
  isSaved: boolean;
  isThai: boolean;
  onAddToPlan: () => void;
  onCompare: () => void;
  onOpen: () => void;
  onToggleSave: () => void;
  program: ProgramPlannerCandidate;
}) {
  const displayName = isThai
    ? program.program_name
    : (program.program_name_en ?? program.program_name);
  const facultyName = isThai
    ? program.faculty_name
    : (program.faculty_name_en ?? program.faculty_name);

  const statusLabel =
    program.best_round?.is_eligible == null
      ? copy.unknown
      : program.best_round.is_eligible
        ? copy.likely
        : copy.stretch;

  const chips = [
    statusLabel,
    program.has_requirements ? copy.portfolioFit : copy.noPortfolioFit,
    program.best_round?.deadline_status === "soon"
      ? copy.deadlineSoon
      : program.best_round?.deadline_status === "expired"
        ? copy.deadlineExpired
        : null,
    (() => {
      const numericCost = Number((program.cost ?? "").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numericCost) || numericCost <= 0) return null;
      return numericCost <= 25000 ? copy.affordable : numericCost >= 60000 ? copy.expensive : null;
    })(),
  ].filter((value): value is string => Boolean(value));

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardIdentity}>
          <Text style={styles.cardTitle}>{displayName}</Text>
          {facultyName ? <Text style={styles.cardSubtitle}>{facultyName}</Text> : null}
          <Text style={styles.cardUniversity}>{program.university_name}</Text>
        </View>

        <Pressable
          style={[styles.savePill, isSaved && styles.savePillActive]}
          onPress={onToggleSave}
          disabled={isBusy}
        >
          <Text style={[styles.savePillText, isSaved && styles.savePillTextActive]}>
            {isSaved ? copy.saved : copy.save}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.reasonText}>{program.rationale}</Text>
      <Text style={styles.tradeoffText}>{program.tradeoff_summary}</Text>

      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={`${program.program_id}-${chip}`} style={styles.reasonChip}>
            <Text style={styles.reasonChipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metaRow}>
        {program.best_round?.round_number ? (
          <Text style={styles.metaText}>
            {isThai ? "รอบเด่น" : "Best round"} {program.best_round.round_number}
          </Text>
        ) : null}
        {program.best_round?.min_gpax != null ? (
          <Text style={styles.metaText}>GPAX ≥ {program.best_round.min_gpax.toFixed(2)}</Text>
        ) : null}
        {program.best_round?.receive_seats ? (
          <Text style={styles.metaText}>
            {program.best_round.receive_seats} {isThai ? "ที่นั่ง" : "seats"}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <PlannerAction label={copy.compare} onPress={onCompare} />
        <PlannerAction label={copy.addToPlan} onPress={onAddToPlan} primary />
        <PlannerAction label={copy.detail} onPress={onOpen} />
      </View>
    </View>
  );
}

function PlannerAction({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Pressable style={styles.primaryActionWrap} onPress={onPress}>
        <LinearGradient
          colors={Gradient.primaryCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryAction}
        >
          <Text style={styles.primaryActionText}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.secondaryAction} onPress={onPress}>
      <Text style={styles.secondaryActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  scrollContent: {
    paddingBottom: Space["3xl"],
    paddingHorizontal: Space["2xl"],
    gap: Space.lg,
  },
  header: {
    gap: Space.xs,
  },
  headerEyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: ThemeText.tertiary,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: ThemeText.primary,
    lineHeight: 36,
  },
  headerSubtitle: {
    fontSize: 15,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: Space.lg,
    minHeight: 54,
    gap: Space.sm,
    ...Shadow.neutral,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Orbit_400Regular",
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    paddingVertical: Space.md,
  },
  filterList: {
    gap: Space.sm,
    paddingBottom: Space.xs,
  },
  filterChip: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: Accent.yellow,
    borderColor: Accent.yellow,
  },
  filterChipText: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
  filterChipTextActive: {
    color: ThemeText.primary,
    fontWeight: "700",
  },
  contextBanner: {
    padding: Space.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    gap: Space.xs,
  },
  contextBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  contextBannerBody: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: Space.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: ThemeText.secondary,
    textAlign: "center",
    maxWidth: 320,
  },
  section: {
    gap: Space.md,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: ThemeText.secondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    gap: Space.sm,
    ...Shadow.neutral,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Space.md,
  },
  cardIdentity: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ThemeText.primary,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    color: ThemeText.secondary,
  },
  cardUniversity: {
    fontSize: 13,
    color: ThemeText.tertiary,
  },
  savePill: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
  },
  savePillActive: {
    backgroundColor: Accent.yellow,
  },
  savePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: ThemeText.secondary,
  },
  savePillTextActive: {
    color: ThemeText.primary,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.primary,
  },
  tradeoffText: {
    fontSize: 13,
    color: ThemeText.secondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs,
  },
  reasonChip: {
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "#F7F8F4",
  },
  reasonChipText: {
    fontSize: 12,
    color: ThemeText.secondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
  },
  metaText: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  actionRow: {
    flexDirection: "row",
    gap: Space.sm,
    marginTop: Space.xs,
  },
  primaryActionWrap: {
    flex: 1,
  },
  primaryAction: {
    minHeight: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.md,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },
  secondaryAction: {
    minHeight: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.md,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: ThemeText.secondary,
  },
});
