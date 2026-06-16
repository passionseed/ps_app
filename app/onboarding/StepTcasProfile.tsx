// app/onboarding/StepTcasProfile.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { saveTcasProfile } from "../../lib/onboarding";
import { Text as ThemeText, Radius, Shadow, Space } from "../../lib/theme";

const BUDGET_OPTIONS = [
  { label: "ไม่จำกัด", value: null },
  { label: "ไม่เกิน 50,000 บาท/ปี", value: 50000 },
  { label: "ไม่เกิน 100,000 บาท/ปี", value: 100000 },
  { label: "ไม่เกิน 200,000 บาท/ปี", value: 200000 },
  { label: "มากกว่า 200,000 บาท/ปี", value: 300000 },
];

const LOCATION_OPTIONS = [
  "ไม่จำกัด",
  "กรุงเทพฯ และปริมณฑล",
  "ภาคเหนือ",
  "ภาคตะวันออกเฉียงเหนือ",
  "ภาคกลาง",
  "ภาคใต้",
  "ภาคตะวันออก",
];

const SUBJECT_INTERESTS = [
  "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย",
  "สังคมศึกษา", "ศิลปะ", "ดนตรี", "คอมพิวเตอร์",
  "ธุรกิจ", "กีฬา", "สุขศึกษา", "เกษตร",
];

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function StepTcasProfile({ userId, onComplete }: Props) {
  const [gpax, setGpax] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [location, setLocation] = useState("ไม่จำกัด");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (subject: string) => {
    setInterests((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const gpaxNum = gpax ? parseFloat(gpax) : null;
      if (gpaxNum !== null && (gpaxNum < 0 || gpaxNum > 4)) {
        setSaving(false);
        return;
      }
      await saveTcasProfile(userId, {
        gpax: gpaxNum,
        budget_per_year: budget,
        preferred_location: location === "ไม่จำกัด" ? null : location,
        subject_interests: interests,
      });
      onComplete();
    } catch {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ข้อมูล TCAS ของคุณ</Text>
      <Text style={styles.subtitle}>
        เพื่อแนะนำโปรแกรมที่เหมาะกับคุณ
      </Text>

      {/* GPAX Input */}
      <Text style={styles.label}>เกรดเฉลี่ยสะสม (GPAX)</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น 3.50"
        keyboardType="decimal-pad"
        value={gpax}
        onChangeText={setGpax}
        maxLength={4}
      />

      {/* Budget Picker */}
      <Text style={styles.label}>งบประมาณค่าเล่าเรียน</Text>
      <View style={styles.chipRow}>
        {BUDGET_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.chip, budget === opt.value && styles.chipSelected]}
            onPress={() => setBudget(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                budget === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location Picker */}
      <Text style={styles.label}>ทำเลที่ต้องการ</Text>
      <View style={styles.chipRow}>
        {LOCATION_OPTIONS.map((loc) => (
          <TouchableOpacity
            key={loc}
            style={[styles.chip, location === loc && styles.chipSelected]}
            onPress={() => setLocation(loc)}
          >
            <Text
              style={[
                styles.chipText,
                location === loc && styles.chipTextSelected,
              ]}
            >
              {loc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subject Interests */}
      <Text style={styles.label}>วิชาที่สนใจ (เลือกได้หลายข้อ)</Text>
      <View style={styles.chipRow}>
        {SUBJECT_INTERESTS.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.chip,
              interests.includes(subject) && styles.chipSelected,
            ]}
            onPress={() => toggleInterest(subject)}
          >
            <Text
              style={[
                styles.chipText,
                interests.includes(subject) && styles.chipTextSelected,
              ]}
            >
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <PathLabSkiaLoader size="tiny" />
        ) : (
          <Text style={styles.saveBtnText}>บันทึก</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Space["2xl"], paddingBottom: 48 },
  title: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 24,
    fontWeight: "700",
    color: ThemeText.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 14,
    color: ThemeText.secondary,
    marginBottom: 24,
  },
  label: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontFamily: "LibreFranklin_400Regular",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.16)",
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 16,
    color: ThemeText.primary,
    backgroundColor: "rgba(139, 92, 246, 0.03)",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.16)",
    backgroundColor: "rgba(139, 92, 246, 0.05)",
  },
  chipSelected: {
    backgroundColor: "#BFFF00",
    borderColor: "#BFFF00",
  },
  chipText: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 14,
    color: ThemeText.secondary,
  },
  chipTextSelected: { color: "#0a0514", fontWeight: "600" },
  saveBtn: {
    marginTop: 32,
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: "center",
    ...Shadow.ctaGlow,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0514",
  },
});
