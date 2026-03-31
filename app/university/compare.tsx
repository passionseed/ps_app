import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Pressable,
  Modal,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchUniversityInsights } from "../../lib/universityInsights";
import { getAllUniversities, getUniversityPrograms } from "../../lib/tcas";
import type { TcasUniversity, TcasProgram } from "../../types/tcas";
import type { UniversityInsights } from "../../types/university";

type UniOption = {
  label: string;
  universityName: string;
  facultyName: string;
  careerGoal: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
};

type InsightsState = {
  data: UniversityInsights | null;
  loading: boolean;
  error: string | null;
};

const COMPARE_ROWS: Array<{
  label: string;
  icon: string;
  getValue: (i: UniversityInsights) => string;
  higherIsBetter?: boolean;
}> = [
  {
    label: "AI Match",
    icon: "🎯",
    getValue: (i) => (i.aiMatchScore != null ? `${i.aiMatchScore}%` : "—"),
    higherIsBetter: true,
  },
  {
    label: "อัตราการรับ",
    icon: "📋",
    getValue: (i) => i.acceptanceRate ?? "—",
  },
  { label: "GPAX ขั้นต่ำ", icon: "📊", getValue: (i) => i.gpaxCutoff ?? "—" },
  {
    label: "ค่าเล่าเรียน/ปี",
    icon: "💰",
    getValue: (i) =>
      i.tuitionPerYear ? `฿${i.tuitionPerYear.toLocaleString()}` : "—",
    higherIsBetter: false,
  },
  { label: "ระยะเวลา", icon: "📅", getValue: (i) => i.duration ?? "—" },
  { label: "อันดับ", icon: "🏆", getValue: (i) => i.ranking ?? "—" },
];

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { keyA, facultyA, careerGoal } = useLocalSearchParams<{
    keyA?: string;
    facultyA?: string;
    careerGoal?: string;
  }>();

  const [universities, setUniversities] = useState<TcasUniversity[]>([]);
  const [selectedA, setSelectedA] = useState<UniOption | null>(null);
  const [selectedB, setSelectedB] = useState<UniOption | null>(null);
  const [insightsA, setInsightsA] = useState<InsightsState>({
    data: null,
    loading: false,
    error: null,
  });
  const [insightsB, setInsightsB] = useState<InsightsState>({
    data: null,
    loading: false,
    error: null,
  });

  // Fetch universities on mount
  useEffect(() => {
    getAllUniversities().then(setUniversities).catch(console.error);
  }, []);

  // Pre-select slot A if keyA param is provided
  useEffect(() => {
    if (!keyA || universities.length === 0) return;
    const decodedName = decodeURIComponent(keyA);
    const decodedFaculty = facultyA ? decodeURIComponent(facultyA) : "";
    const uni = universities.find((u) => u.university_name === decodedName);
    if (!uni) return;
    const preOption: UniOption = {
      label: `${decodedName} · ${decodedFaculty}`,
      universityName: decodedName,
      facultyName: decodedFaculty,
      careerGoal: careerGoal ? decodeURIComponent(careerGoal) : "",
      passionScore: null,
      futureScore: null,
      worldScore: null,
    };
    setSelectedA(preOption);
  }, [keyA, facultyA, careerGoal, universities]);

  async function loadInsights(
    option: UniOption,
    setter: (s: InsightsState) => void,
  ) {
    setter({ data: null, loading: true, error: null });
    try {
      const data = await fetchUniversityInsights({
        universityName: option.universityName,
        facultyName: option.facultyName,
        careerGoal: option.careerGoal,
        passionScore: option.passionScore,
        futureScore: option.futureScore,
        worldScore: option.worldScore,
      });
      setter({ data, loading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "โหลดไม่สำเร็จ";
      setter({ data: null, loading: false, error: msg });
    }
  }

  useEffect(() => {
    if (!selectedA) return;
    let cancelled = false;
    loadInsights(selectedA, (s) => { if (!cancelled) setInsightsA(s); });
    return () => { cancelled = true; };
  }, [selectedA]);

  useEffect(() => {
    if (!selectedB) return;
    let cancelled = false;
    loadInsights(selectedB, (s) => { if (!cancelled) setInsightsB(s); });
    return () => { cancelled = true; };
  }, [selectedB]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹ กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>เปรียบเทียบ</Text>
        <Text style={s.heroSub}>เลือก 2 มหาวิทยาลัยเพื่อเปรียบเทียบ</Text>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pickers */}
        <View style={s.pickersRow}>
          <UniPicker
            label="มหาวิทยาลัย A"
            selected={selectedA}
            universities={universities.filter(
              (u) => u.university_id !== selectedB?.universityName,
            )}
            careerGoal={careerGoal ? decodeURIComponent(careerGoal) : ""}
            onSelect={setSelectedA}
          />
          <UniPicker
            label="มหาวิทยาลัย B"
            selected={selectedB}
            universities={universities.filter(
              (u) => u.university_id !== selectedA?.universityName,
            )}
            careerGoal={careerGoal ? decodeURIComponent(careerGoal) : ""}
            onSelect={setSelectedB}
          />
        </View>

        {/* Table — only shows when both are selected */}
        {selectedA && selectedB ? (
          <View style={s.tableWrap}>
            {/* Header */}
            <View style={s.tableHeader}>
              <View style={s.labelCol} />
              <ColHeader uni={selectedA} />
              <ColHeader uni={selectedB} />
            </View>

            {/* Rows */}
            {COMPARE_ROWS.map((row, idx) => {
              const valA = insightsA.data ? row.getValue(insightsA.data) : null;
              const valB = insightsB.data ? row.getValue(insightsB.data) : null;
              const numA = valA
                ? parseFloat(valA.replace(/[^0-9.]/g, ""))
                : NaN;
              const numB = valB
                ? parseFloat(valB.replace(/[^0-9.]/g, ""))
                : NaN;
              const aWins =
                row.higherIsBetter !== undefined &&
                !isNaN(numA) &&
                !isNaN(numB) &&
                (row.higherIsBetter ? numA > numB : numA < numB);
              const bWins =
                row.higherIsBetter !== undefined &&
                !isNaN(numA) &&
                !isNaN(numB) &&
                (row.higherIsBetter ? numB > numA : numB < numA);

              return (
                <View
                  key={row.label}
                  style={[s.row, idx % 2 === 0 && s.rowAlt]}
                >
                  <View style={s.labelCol}>
                    <Text style={s.rowIcon}>{row.icon}</Text>
                    <Text style={s.rowLabel}>{row.label}</Text>
                  </View>
                  <View style={[s.dataCol, aWins && s.winCell]}>
                    {insightsA.loading ? (
                      <PathLabSkiaLoader size="tiny" />
                    ) : (
                      <Text style={[s.dataVal, aWins && s.winVal]}>
                        {valA ?? "—"}
                      </Text>
                    )}
                  </View>
                  <View style={[s.dataCol, bWins && s.winCell]}>
                    {insightsB.loading ? (
                      <PathLabSkiaLoader size="tiny" />
                    ) : (
                      <Text style={[s.dataVal, bWins && s.winVal]}>
                        {valB ?? "—"}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyPrompt}>
            <Text style={s.emptyPromptText}>
              เลือกมหาวิทยาลัย 2 แห่งเพื่อดูการเปรียบเทียบ
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function ColHeader({ uni }: { uni: UniOption }) {
  return (
    <View style={s.colHeader}>
      <Text style={s.colHeaderUni} numberOfLines={2}>
        {uni.universityName}
      </Text>
      <Text style={s.colHeaderFaculty} numberOfLines={1}>
        {uni.facultyName}
      </Text>
    </View>
  );
}

type UniPickerProps = {
  label: string;
  selected: UniOption | null;
  universities: TcasUniversity[];
  careerGoal: string;
  onSelect: (o: UniOption) => void;
};

function UniPicker({
  label,
  selected,
  universities,
  careerGoal,
  onSelect,
}: UniPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickedUni, setPickedUni] = useState<TcasUniversity | null>(null);
  const [programs, setPrograms] = useState<TcasProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  function handlePickUniversity(uni: TcasUniversity) {
    setPickedUni(uni);
    setPrograms([]);
    setLoadingPrograms(true);
    getUniversityPrograms(uni.university_id)
      .then(setPrograms)
      .catch(console.error)
      .finally(() => setLoadingPrograms(false));
  }

  function handlePickProgram(program: TcasProgram) {
    const facultyDisplay = program.faculty_name ?? "";
    const option: UniOption = {
      label: `${pickedUni!.university_name} · ${facultyDisplay} - ${program.program_name}`,
      universityName: pickedUni!.university_name,
      facultyName: `${facultyDisplay} - ${program.program_name}`,
      careerGoal,
      passionScore: null,
      futureScore: null,
      worldScore: null,
    };
    onSelect(option);
    setOpen(false);
    setPickedUni(null);
    setPrograms([]);
  }

  function handleClose() {
    setOpen(false);
    setPickedUni(null);
    setPrograms([]);
  }

  return (
    <View style={s.picker}>
      <Text style={s.pickerLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [s.pickerBtn, pressed && s.pressed]}
        onPress={() => setOpen(!open)}
      >
        <Text style={s.pickerBtnText} numberOfLines={2}>
          {selected ? selected.universityName : "เลือก..."}
        </Text>
        {selected ? (
          <Text style={s.pickerFaculty} numberOfLines={1}>
            {selected.facultyName}
          </Text>
        ) : null}
      </Pressable>

      {open && (
        <Modal transparent animationType="none" onRequestClose={handleClose}>
          <Pressable style={s.modalOverlay} onPress={handleClose}>
            <View style={s.dropdownModal}>
              {/* University list */}
              {!pickedUni && (
                <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
                  {universities.map((u) => (
                    <Pressable
                      key={u.university_id}
                      style={({ pressed }) => [
                        s.dropdownItem,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePickUniversity(u);
                      }}
                    >
                      <Text style={s.dropdownItemText} numberOfLines={1}>
                        {u.university_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* Program list after university picked */}
              {pickedUni && (
                <>
                  <Pressable
                    style={s.dropdownBackBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setPickedUni(null);
                      setPrograms([]);
                    }}
                  >
                    <Text style={s.dropdownBackText}>
                      ‹ {pickedUni.university_name}
                    </Text>
                  </Pressable>
                  {loadingPrograms ? (
                    <View style={s.dropdownLoading}>
                      <PathLabSkiaLoader size="tiny" />
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
                      {programs.map((p) => (
                        <Pressable
                          key={p.program_id}
                          style={({ pressed }) => [
                            s.dropdownItem,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePickProgram(p);
                          }}
                        >
                          <Text style={s.dropdownItemText} numberOfLines={1}>
                            {p.faculty_name} - {p.program_name}
                          </Text>
                        </Pressable>
                      ))}
                      {programs.length === 0 && (
                        <View style={s.dropdownLoading}>
                          <Text style={s.dropdownItemSub}>ไม่พบหลักสูตร</Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  hero: { paddingBottom: 20, paddingHorizontal: 24 },
  backBtn: { marginBottom: 14, alignSelf: "flex-start" },
  backBtnText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  pickersRow: { flexDirection: "row", gap: 12, marginBottom: 24, zIndex: 10 },
  picker: { flex: 1, zIndex: 10 },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  pickerBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    minHeight: 72,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  pickerFaculty: { fontSize: 11, color: "#8B5CF6" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  dropdownModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 360,
  },
  dropdownBackBtn: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  dropdownBackText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4C1D95",
  },
  dropdownLoading: {
    padding: 24,
    alignItems: "center",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: { fontSize: 13, fontWeight: "600", color: "#111" },
  dropdownItemSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  tableWrap: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4C1D95",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  labelCol: { flex: 1.2, flexDirection: "row", alignItems: "center", gap: 4 },
  colHeader: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  colHeaderUni: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  colHeaderFaculty: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowAlt: { backgroundColor: "#FAFAFA" },
  rowIcon: { fontSize: 16, marginRight: 4 },
  rowLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  dataCol: { flex: 1, alignItems: "center", padding: 4 },
  dataVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  winCell: { backgroundColor: "rgba(191,255,0,0.12)", borderRadius: 8 },
  winVal: { color: "#3D7A00" },
  emptyPrompt: { alignItems: "center", paddingVertical: 60 },
  emptyPromptText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  pressed: { opacity: 0.85 },
});
