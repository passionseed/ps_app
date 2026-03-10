import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchUniversityInsights } from "../../lib/universityInsights";
import { MOCK_PATH_DATA } from "../../lib/mockPathData";
import type { UniversityInsights } from "../../types/university";

type UniOption = {
  label: string;
  universityName: string;
  facultyName: string;
  pathLabel: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
  careerGoal: string;
};

function getAllUniversityOptions(): UniOption[] {
  const options: UniOption[] = [];
  for (const path of MOCK_PATH_DATA.paths) {
    for (const step of path.steps) {
      if (step.type === "university" && step.universityMeta) {
        options.push({
          label: `${step.universityMeta.universityName} · ${step.universityMeta.facultyName}`,
          universityName: step.universityMeta.universityName,
          facultyName: step.universityMeta.facultyName,
          pathLabel: path.label,
          passionScore: path.passionScore,
          futureScore: path.futureScore,
          worldScore: path.worldScore,
          careerGoal: path.careerGoal,
        });
      }
    }
  }
  return options;
}

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

  const allOptions = getAllUniversityOptions();

  const preselectedA = keyA
    ? (allOptions.find(
        (o) =>
          o.universityName === decodeURIComponent(keyA) &&
          o.facultyName === (facultyA ?? ""),
      ) ?? null)
    : null;

  const [selectedA, setSelectedA] = useState<UniOption | null>(preselectedA);
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
    } catch (e: any) {
      setter({
        data: null,
        loading: false,
        error: e?.message ?? "โหลดไม่สำเร็จ",
      });
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
          <Text style={s.backBtnText}>← กลับ</Text>
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
            options={allOptions.filter((o) => o !== selectedB)}
            onSelect={setSelectedA}
          />
          <UniPicker
            label="มหาวิทยาลัย B"
            selected={selectedB}
            options={allOptions.filter((o) => o !== selectedA)}
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
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <Text style={[s.dataVal, aWins && s.winVal]}>
                        {valA ?? "—"}
                      </Text>
                    )}
                  </View>
                  <View style={[s.dataCol, bWins && s.winCell]}>
                    {insightsB.loading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
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

function UniPicker({
  label,
  selected,
  options,
  onSelect,
}: {
  label: string;
  selected: UniOption | null;
  options: UniOption[];
  onSelect: (o: UniOption) => void;
}) {
  const [open, setOpen] = useState(false);
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
        <Modal transparent animationType="none" onRequestClose={() => setOpen(false)}>
          <Pressable style={s.modalOverlay} onPress={() => setOpen(false)}>
            <View style={s.dropdownModal}>
              {options.map((o, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [s.dropdownItem, pressed && { opacity: 0.7 }]}
                  onPress={() => { onSelect(o); setOpen(false); }}
                >
                  <Text style={s.dropdownItemText} numberOfLines={1}>
                    {o.universityName}
                  </Text>
                  <Text style={s.dropdownItemSub} numberOfLines={1}>
                    {o.facultyName} · {o.pathLabel}
                  </Text>
                </Pressable>
              ))}
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
    maxHeight: 320,
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
