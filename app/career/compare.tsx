import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { AppText as Text } from "../../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  title: string;
  title_th?: string;
  category: string;
  viability_score?: number;
  demand_trend?: "growing" | "stable" | "declining";
  salary_range_thb?: { entry?: number; mid?: number; senior?: number };
  work_life_balance?: number;
  stress_level?: number;
  required_skills?: string[];
  description_th?: string;
};

type CareerOption = {
  job: Job;
  label: string;
};

type Scores = {
  salary: { a: number; b: number };
  work_life: { a: number; b: number };
  growth: { a: number; b: number };
  interest: { a: number; b: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJobDisplayName(job: Job): string {
  return job.title_th || job.title;
}

function demandTrendRank(trend?: string): number {
  if (trend === "growing") return 3;
  if (trend === "stable") return 2;
  return 1;
}

function formatSalary(val?: number): string {
  if (val == null) return "—";
  return `฿${val.toLocaleString()}`;
}

// ─── Compare Rows Config ──────────────────────────────────────────────────────

const COMPARE_ROWS: Array<{
  label: string;
  icon: string;
  getValue: (job: Job) => string;
  higherIsBetter?: boolean;
  lowerIsBetter?: boolean;
}> = [
  {
    label: "ความ viable",
    icon: "📊",
    getValue: (j) => (j.viability_score != null ? `${j.viability_score}` : "—"),
    higherIsBetter: true,
  },
  {
    label: "แนวโน้ม",
    icon: "📈",
    getValue: (j) => {
      const map: Record<string, string> = {
        growing: "เติบโต",
        stable: "คงที่",
        declining: "ลดลง",
      };
      return j.demand_trend ? map[j.demand_trend] || j.demand_trend : "—";
    },
    higherIsBetter: true,
  },
  {
    label: "เงินเดือนเริ่มต้น",
    icon: "💰",
    getValue: (j) => formatSalary(j.salary_range_thb?.entry),
    higherIsBetter: true,
  },
  {
    label: "สมดุลชีวิต",
    icon: "⚖️",
    getValue: (j) => (j.work_life_balance != null ? `${j.work_life_balance}/10` : "—"),
    higherIsBetter: true,
  },
  {
    label: "ความเครียด",
    icon: "😰",
    getValue: (j) => (j.stress_level != null ? `${j.stress_level}/10` : "—"),
    lowerIsBetter: true,
  },
  {
    label: "ทักษะที่ต้องการ",
    icon: "🛠️",
    getValue: (j) =>
      j.required_skills?.length ? `${j.required_skills.length} อย่าง` : "—",
  },
];

const SCORE_CRITERIA: Array<{ key: keyof Scores; label: string; icon: string }> = [
  { key: "salary", label: "เงินเดือน", icon: "💵" },
  { key: "work_life", label: "สมดุลชีวิต", icon: "🏠" },
  { key: "growth", label: "โอกาสเติบโต", icon: "🚀" },
  { key: "interest", label: "ความสนใจ", icon: "❤️" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompareCareersScreen() {
  const insets = useSafeAreaInsets();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedA, setSelectedA] = useState<CareerOption | null>(null);
  const [selectedB, setSelectedB] = useState<CareerOption | null>(null);
  const [scores, setScores] = useState<Scores>({
    salary: { a: 5, b: 5 },
    work_life: { a: 5, b: 5 },
    growth: { a: 5, b: 5 },
    interest: { a: 5, b: 5 },
  });
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch all jobs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(
            "id, title, title_th, category, viability_score, demand_trend, salary_range_thb, work_life_balance, stress_level, required_skills, description_th"
          )
          .order("title_th", { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        setJobs(data || []);
      } catch (e) {
        console.error("Failed to load jobs:", e);
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateScore(
    criteria: keyof Scores,
    side: "a" | "b",
    value: number
  ) {
    setScores((prev) => ({
      ...prev,
      [criteria]: { ...prev[criteria], [side]: Math.max(1, Math.min(10, value)) },
    }));
  }

  async function handleSave() {
    if (!selectedA || !selectedB) return;
    setSaving(true);
    try {
      const payload = {
        career_a_id: selectedA.job.id,
        career_b_id: selectedB.job.id,
        scores,
        winner_id: winnerId,
        notes: notes.trim() || null,
      };
      console.log("Saving comparison:", payload);
      const { error } = await supabase.from("career_comparisons").insert(payload);
      if (error) throw error;
      console.log("✅ Comparison saved");
    } catch (e) {
      console.error("Failed to save comparison:", e);
    } finally {
      setSaving(false);
    }
  }

  const categories = Array.from(new Set(jobs.map((j) => j.category)));

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
        <Text style={s.heroTitle}>เปรียบเทียบอาชีพ</Text>
        <Text style={s.heroSub}>เลือก 2 อาชีพเพื่อเปรียบเทียบ</Text>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {loadingJobs ? (
          <View style={s.loadingWrap}>
            <PathLabSkiaLoader size="small" />
          </View>
        ) : (
          <View style={s.pickersRow}>
            <CareerPicker
              label="อาชีพ A"
              selected={selectedA}
              jobs={jobs.filter((j) => j.id !== selectedB?.job.id)}
              categories={categories}
              onSelect={setSelectedA}
            />
            <CareerPicker
              label="อาชีพ B"
              selected={selectedB}
              jobs={jobs.filter((j) => j.id !== selectedA?.job.id)}
              categories={categories}
              onSelect={setSelectedB}
            />
          </View>
        )}

        {selectedA && selectedB && (
          <>
            <View style={s.tableWrap}>
              <View style={s.tableHeader}>
                <View style={s.labelCol} />
                <ColHeader job={selectedA.job} />
                <ColHeader job={selectedB.job} />
              </View>

              {COMPARE_ROWS.map((row, idx) => {
                const valA = row.getValue(selectedA.job);
                const valB = row.getValue(selectedB.job);
                let aWins = false;
                let bWins = false;

                if (row.higherIsBetter) {
                  const numA = parseFloat(valA.replace(/[^0-9.]/g, ""));
                  const numB = parseFloat(valB.replace(/[^0-9.]/g, ""));
                  if (!isNaN(numA) && !isNaN(numB)) {
                    if (row.label === "แนวโน้ม") {
                      aWins = demandTrendRank(selectedA.job.demand_trend) > demandTrendRank(selectedB.job.demand_trend);
                      bWins = demandTrendRank(selectedB.job.demand_trend) > demandTrendRank(selectedA.job.demand_trend);
                    } else {
                      aWins = numA > numB;
                      bWins = numB > numA;
                    }
                  }
                } else if (row.lowerIsBetter) {
                  const numA = parseFloat(valA.replace(/[^0-9.]/g, ""));
                  const numB = parseFloat(valB.replace(/[^0-9.]/g, ""));
                  if (!isNaN(numA) && !isNaN(numB)) {
                    aWins = numA < numB;
                    bWins = numB < numA;
                  }
                }

                return (
                  <View key={row.label} style={[s.row, idx % 2 === 0 && s.rowAlt]}>
                    <View style={s.labelCol}>
                      <Text style={s.rowIcon}>{row.icon}</Text>
                      <Text style={s.rowLabel}>{row.label}</Text>
                    </View>
                    <View style={[s.dataCol, aWins && s.winCell]}>
                      <Text style={[s.dataVal, aWins && s.winVal]}>{valA}</Text>
                    </View>
                    <View style={[s.dataCol, bWins && s.winCell]}>
                      <Text style={[s.dataVal, bWins && s.winVal]}>{valB}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={s.scoreSection}>
              <Text style={s.scoreTitle}>ให้คะแนนของคุณ (1-10)</Text>
              {SCORE_CRITERIA.map((criteria) => (
                <View key={criteria.key} style={s.scoreRow}>
                  <View style={s.scoreLabelCol}>
                    <Text style={s.scoreIcon}>{criteria.icon}</Text>
                    <Text style={s.scoreLabel}>{criteria.label}</Text>
                  </View>
                  <View style={s.scoreInputs}>
                    <ScoreButton
                      value={scores[criteria.key].a}
                      onChange={(v) => updateScore(criteria.key, "a", v)}
                      highlight={winnerId === selectedA.job.id}
                    />
                    <ScoreButton
                      value={scores[criteria.key].b}
                      onChange={(v) => updateScore(criteria.key, "b", v)}
                      highlight={winnerId === selectedB.job.id}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={s.winnerSection}>
              <Text style={s.winnerTitle}>เลือกอาชีพที่ชนะใจคุณ</Text>
              <View style={s.winnerRow}>
                <Pressable
                  style={[
                    s.winnerBtn,
                    winnerId === selectedA.job.id && s.winnerBtnActive,
                  ]}
                  onPress={() => setWinnerId(selectedA.job.id)}
                >
                  <Text
                    style={[
                      s.winnerBtnText,
                      winnerId === selectedA.job.id && s.winnerBtnTextActive,
                    ]}
                    numberOfLines={2}
                  >
                    {getJobDisplayName(selectedA.job)}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    s.winnerBtn,
                    winnerId === selectedB.job.id && s.winnerBtnActive,
                  ]}
                  onPress={() => setWinnerId(selectedB.job.id)}
                >
                  <Text
                    style={[
                      s.winnerBtnText,
                      winnerId === selectedB.job.id && s.winnerBtnTextActive,
                    ]}
                    numberOfLines={2}
                  >
                    {getJobDisplayName(selectedB.job)}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={s.notesSection}>
              <Text style={s.notesLabel}>บันทึกเพิ่มเติม</Text>
              <TextInput
                style={s.notesInput}
                multiline
                numberOfLines={3}
                placeholder="ความคิดเห็นของคุณ..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                s.saveBtn,
                pressed && s.saveBtnPressed,
                saving && s.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>
                {saving ? "กำลังบันทึก..." : "บันทึกการเปรียบเทียบ"}
              </Text>
            </Pressable>
          </>
        )}

        {/* Empty state */}
        {!selectedA || !selectedB ? (
          <View style={s.emptyPrompt}>
            <Text style={s.emptyPromptText}>
              เลือกอาชีพ 2 ตัวเพื่อดูการเปรียบเทียบ
            </Text>
          </View>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColHeader({ job }: { job: Job }) {
  return (
    <View style={s.colHeader}>
      <Text style={s.colHeaderName} numberOfLines={2}>
        {getJobDisplayName(job)}
      </Text>
      <Text style={s.colHeaderCategory} numberOfLines={1}>
        {job.category}
      </Text>
    </View>
  );
}

function ScoreButton({
  value,
  onChange,
  highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  return (
    <View style={s.scoreBtnWrap}>
      <Pressable
        style={s.scoreDecBtn}
        onPress={() => onChange(value - 1)}
      >
        <Text style={s.scoreDecText}>−</Text>
      </Pressable>
      <Text style={[s.scoreValue, highlight && s.scoreValueHighlight]}>
        {value}
      </Text>
      <Pressable
        style={s.scoreIncBtn}
        onPress={() => onChange(value + 1)}
      >
        <Text style={s.scoreIncText}>+</Text>
      </Pressable>
    </View>
  );
}

type CareerPickerProps = {
  label: string;
  selected: CareerOption | null;
  jobs: Job[];
  categories: string[];
  onSelect: (option: CareerOption) => void;
};

function CareerPicker({
  label,
  selected,
  jobs,
  categories,
  onSelect,
}: CareerPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = searchQuery.trim()
    ? jobs.filter((j) =>
        getJobDisplayName(j)
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
    : jobs;

  function handlePick(job: Job) {
    onSelect({ job, label: getJobDisplayName(job) });
    setOpen(false);
    setSearchQuery("");
  }

  function handleClose() {
    setOpen(false);
    setSearchQuery("");
  }

  return (
    <View style={s.picker}>
      <Text style={s.pickerLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [s.pickerBtn, pressed && s.pressed]}
        onPress={() => setOpen(!open)}
      >
        <Text style={s.pickerBtnText} numberOfLines={2}>
          {selected ? getJobDisplayName(selected.job) : "เลือก..."}
        </Text>
        {selected ? (
          <Text style={s.pickerCategory} numberOfLines={1}>
            {selected.job.category}
          </Text>
        ) : null}
      </Pressable>

      {open && (
        <Modal transparent animationType="none" onRequestClose={handleClose}>
          <Pressable style={s.modalOverlay} onPress={handleClose}>
            <View style={s.dropdownModal}>
              <View style={s.dropdownSearch}>
                <Text style={s.dropdownSearchIcon}>🔍</Text>
                <TextInput
                  style={s.dropdownSearchInput}
                  placeholder="ค้นหาอาชีพ..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>

              <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
                {categories.map((cat) => {
                  const catJobs = filteredJobs.filter((j) => j.category === cat);
                  if (catJobs.length === 0) return null;
                  return (
                    <View key={cat}>
                      <View style={s.dropdownCategoryHeader}>
                        <Text style={s.dropdownCategoryText}>{cat}</Text>
                      </View>
                      {catJobs.map((job) => (
                        <Pressable
                          key={job.id}
                          style={({ pressed }) => [
                            s.dropdownItem,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePick(job);
                          }}
                        >
                          <Text
                            style={s.dropdownItemText}
                            numberOfLines={1}
                          >
                            {getJobDisplayName(job)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })}
                {filteredJobs.length === 0 && (
                  <View style={s.dropdownLoading}>
                    <Text style={s.dropdownItemSub}>ไม่พบอาชีพ</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  loadingWrap: { alignItems: "center", paddingVertical: 40 },
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
  pickerCategory: { fontSize: 11, color: "#8B5CF6" },
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
    maxHeight: 420,
  },
  dropdownSearch: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  dropdownSearchIcon: { fontSize: 14, marginRight: 8 },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    padding: 0,
  },
  dropdownCategoryHeader: {
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dropdownCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4C1D95",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  labelCol: { flex: 1.2, flexDirection: "row", alignItems: "center", gap: 4 },
  colHeader: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  colHeaderName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  colHeaderCategory: {
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

  // Score section
  scoreSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  scoreLabelCol: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreIcon: { fontSize: 16, marginRight: 4 },
  scoreLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  scoreInputs: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  scoreBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreDecBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreDecText: { fontSize: 16, fontWeight: "700", color: "#6B7280" },
  scoreValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    minWidth: 24,
    textAlign: "center",
  },
  scoreValueHighlight: { color: "#4C1D95" },
  scoreIncBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreIncText: { fontSize: 16, fontWeight: "700", color: "#6B7280" },

  // Winner section
  winnerSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 20,
  },
  winnerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    textAlign: "center",
  },
  winnerRow: {
    flexDirection: "row",
    gap: 12,
  },
  winnerBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  winnerBtnActive: {
    backgroundColor: "rgba(76,29,149,0.08)",
    borderColor: "#4C1D95",
  },
  winnerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  winnerBtnTextActive: {
    color: "#4C1D95",
    fontWeight: "700",
  },

  // Notes section
  notesSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#4C1D95",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
