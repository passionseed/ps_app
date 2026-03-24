// app/portfolio/add.tsx
import { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { addPortfolioItem } from "../../lib/portfolioFit";
import { logPortfolioItemAdded } from "../../lib/eventLogger";
import type { PortfolioItemType } from "../../types/portfolio";

const TYPES: Array<{
  value: PortfolioItemType;
  label: string;
  emoji: string;
}> = [
  { value: "project", label: "โปรเจกต์", emoji: "🔨" },
  { value: "award", label: "รางวัล", emoji: "🏆" },
  { value: "activity", label: "กิจกรรม", emoji: "🌱" },
  { value: "course", label: "คอร์สเรียน", emoji: "📚" },
  { value: "other", label: "อื่นๆ", emoji: "📎" },
];

export default function AddPortfolioItemScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [itemType, setItemType] = useState<PortfolioItemType>("project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      setError("กรุณาใส่ชื่อผลงาน");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await addPortfolioItem(user.id, {
        item_type: itemType,
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
      });
      // Log event
      logPortfolioItemAdded(itemType, title.trim()).catch(() => {});
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← ยกเลิก</Text>
          </Pressable>
          <Text style={s.headerTitle}>เพิ่มผลงาน</Text>
          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={s.saveBtnText}>บันทึก</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type picker */}
          <View style={s.field}>
            <Text style={s.label}>ประเภท</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.typeRow}
            >
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[
                    s.typePill,
                    itemType === t.value && s.typePillActive,
                  ]}
                  onPress={() => setItemType(t.value)}
                >
                  <Text style={s.typePillEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      s.typePillText,
                      itemType === t.value && s.typePillTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={s.field}>
            <Text style={s.label}>ชื่อผลงาน *</Text>
            <TextInput
              style={s.input}
              placeholder="เช่น เว็บแอปตรวจสอบคุณภาพอากาศ"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
            <Text style={s.charCount}>{title.length}/200</Text>
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>รายละเอียด</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="บอกเล่าสิ่งที่คุณทำ เทคโนโลยีที่ใช้ และผลที่ได้"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
            <Text style={s.charCount}>{description.length}/2000</Text>
          </View>

          {/* Tags */}
          <View style={s.field}>
            <Text style={s.label}>แท็ก (คั่นด้วยจุลภาค)</Text>
            <TextInput
              style={s.input}
              placeholder="เช่น Python, AI, ทีม, ชุมชน"
              placeholderTextColor="#9CA3AF"
              value={tagsInput}
              onChangeText={setTagsInput}
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  back: { marginRight: 12 },
  backText: { fontSize: 14, color: "#8B5CF6" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111" },
  saveBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  form: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  typeRow: { gap: 10, paddingVertical: 2 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  typePillActive: {
    borderColor: "#8B5CF6",
    backgroundColor: "rgba(139,92,246,0.08)",
  },
  typePillEmoji: { fontSize: 16 },
  typePillText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  typePillTextActive: { color: "#8B5CF6" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    fontFamily: "Orbit_400Regular",
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right" },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },
});
