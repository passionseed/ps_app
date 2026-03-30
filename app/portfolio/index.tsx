// app/portfolio/index.tsx
import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import {
  getPortfolioItems,
  deletePortfolioItem,
} from "../../lib/portfolioFit";
import { logPortfolioItemDeleted } from "../../lib/eventLogger";
import type {
  StudentPortfolioItem,
  PortfolioItemType,
} from "../../types/portfolio";
import { Radius, Border, Shadow } from "../../lib/theme";

const TYPE_LABELS: Record<
  PortfolioItemType,
  { label: string; emoji: string }
> = {
  project: { label: "โปรเจกต์", emoji: "🔨" },
  award: { label: "รางวัล", emoji: "🏆" },
  activity: { label: "กิจกรรม", emoji: "🌱" },
  course: { label: "คอร์ส", emoji: "📚" },
  other: { label: "อื่นๆ", emoji: "📎" },
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<StudentPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPortfolioItems(user.id);
      setItems(data);
    } catch (e) {
      console.error("Failed to load portfolio:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload on focus (so new items from add screen appear immediately)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeleting(id);
    try {
      await deletePortfolioItem(user.id, id);
      // Log event
      logPortfolioItemDeleted(id).catch(() => {});
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹ กลับ</Text>
        </Pressable>
        <Text style={s.title}>พอร์ตโฟลิโอของฉัน</Text>
        <Pressable
          style={s.addBtn}
          onPress={() => router.push("/portfolio/add")}
        >
          <Text style={s.addBtnText}>+ เพิ่ม</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#8B5CF6" />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} />
          }
          contentContainerStyle={s.list}
        >
          {items.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>ยังไม่มีผลงาน</Text>
              <Text style={s.emptySubtitle}>
                เพิ่มโปรเจกต์ รางวัล หรือกิจกรรมที่คุณทำ{"\n"}
                เพื่อดูว่าเข้ากับโปรแกรมไหนได้บ้าง
              </Text>
              <Pressable
                style={s.emptyBtn}
                onPress={() => router.push("/portfolio/add")}
              >
                <Text style={s.emptyBtnText}>เพิ่มผลงานแรก →</Text>
              </Pressable>
            </View>
          ) : (
            items.map((item) => {
              const meta = TYPE_LABELS[item.item_type];
              return (
                <View key={item.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>{meta.emoji}</Text>
                    <View style={s.cardInfo}>
                      <Text style={s.cardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={s.cardType}>{meta.label}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        s.deleteBtn,
                        pressed && s.pressed,
                      ]}
                      onPress={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={s.deleteBtnText}>ลบ</Text>
                      )}
                    </Pressable>
                  </View>
                  {item.description ? (
                    <Text style={s.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.tags.length > 0 ? (
                    <View style={s.tags}>
                      {item.tags.slice(0, 4).map((tag) => (
                        <View key={tag} style={s.tag}>
                          <Text style={s.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
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
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111" },
  addBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  list: { padding: 20, gap: 12 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#BFFF00",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#111" },
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: 16,
    gap: 8,
    ...Shadow.neutral,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    lineHeight: 21,
  },
  cardType: {
    fontSize: 12,
    color: "#8B5CF6",
    fontWeight: "600",
    marginTop: 2,
  },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  cardDesc: { fontSize: 13, color: "#6B7280", lineHeight: 19 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
