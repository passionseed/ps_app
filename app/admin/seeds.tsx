// app/admin/seeds.tsx
// Admin-only screen: edit seed tags, visibility, and slogan from mobile.
// Access is gated by user_roles admin check on mount.

import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

type SeedVisibility = "hidden" | "visible" | "featured";

interface SeedAdmin {
  id: string;
  title: string;
  slogan: string | null;
  tags: string[];
  visibility: SeedVisibility;
}

interface EditingState {
  seedId: string;
  tags: string; // comma-separated string for editing
  slogan: string;
  visibility: SeedVisibility;
}

export default function AdminSeedsScreen() {
  const { user } = useAuth();
  const [seeds, setSeeds] = useState<SeedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  const checkAdminAndLoad = useCallback(async () => {
    if (!user) {
      router.replace("/");
      return;
    }

    // Gate: check user_roles for admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      Alert.alert("Access Denied", "Admin only.");
      router.back();
      return;
    }
    setIsAdmin(true);

    // Load all seeds ordered by title
    const { data, error } = await supabase
      .from("seeds")
      .select("id, title, slogan, tags, visibility")
      .order("title");

    if (!error && data) {
      setSeeds(data as SeedAdmin[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    checkAdminAndLoad();
  }, [checkAdminAndLoad]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkAdminAndLoad();
  }, [checkAdminAndLoad]);

  const startEditing = (seed: SeedAdmin) => {
    if (editing) return; // one edit at a time
    setEditing({
      seedId: seed.id,
      tags: seed.tags.join(", "),
      slogan: seed.slogan ?? "",
      visibility: seed.visibility,
    });
  };

  const cancelEditing = () => setEditing(null);

  const saveEditing = async () => {
    if (!editing) return;
    setSaving(true);

    // Parse tags: split by comma, trim, lowercase, hyphenate spaces
    const tags = editing.tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);

    const { error } = await supabase
      .from("seeds")
      .update({
        tags,
        slogan: editing.slogan.trim() || null,
        visibility: editing.visibility,
      })
      .eq("id", editing.seedId);

    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
    } else {
      // Optimistic local state update
      setSeeds((prev) =>
        prev.map((s) =>
          s.id === editing.seedId
            ? {
                ...s,
                tags,
                slogan: editing.slogan.trim() || null,
                visibility: editing.visibility,
              }
            : s,
        ),
      );
      setEditing(null);
    }
  };

  const cycleVisibility = () => {
    if (!editing) return;
    const order: SeedVisibility[] = ["hidden", "visible", "featured"];
    const next = order[(order.indexOf(editing.visibility) + 1) % 3];
    setEditing({ ...editing, visibility: next });
  };

  const visibilityColor = (v: string) => {
    if (v === "featured") return "#f59e0b";
    if (v === "visible") return "#10b981";
    return "#6b7280";
  };

  const visibilityEmoji = (v: string) => {
    if (v === "featured") return "⭐";
    if (v === "visible") return "✅";
    return "🙈";
  };

  if (loading) {
    return (
      <View style={s.center}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (!isAdmin) return null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366f1"
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.subheader}>
        {seeds.length} seeds · Tap to edit tags, visibility, slogan
      </Text>
      <Text style={s.hint}>
        Tip: Pull down to refresh. Tap a seed to expand editor.
      </Text>

      {seeds.map((seed) => {
        const isEditingSeed = editing?.seedId === seed.id;

        return (
          <View key={seed.id} style={[s.card, isEditingSeed && s.cardActive]}>
            <Pressable
              onPress={() => (!editing ? startEditing(seed) : undefined)}
              style={s.cardPressable}
            >
              <View style={s.cardHeader}>
                <Text style={s.seedTitle} numberOfLines={2}>
                  {seed.title}
                </Text>
                <View
                  style={[
                    s.badge,
                    { borderColor: visibilityColor(seed.visibility) },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeText,
                      { color: visibilityColor(seed.visibility) },
                    ]}
                  >
                    {visibilityEmoji(seed.visibility)}{" "}
                    {seed.visibility.toUpperCase()}
                  </Text>
                </View>
              </View>

              {seed.slogan ? (
                <Text style={s.slogan} numberOfLines={1}>
                  "{seed.slogan}"
                </Text>
              ) : null}

              <View style={s.tagRow}>
                {seed.tags.length === 0 ? (
                  <Text style={s.noTags}>No tags — tap to add</Text>
                ) : (
                  seed.tags.map((tag) => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))
                )}
              </View>
            </Pressable>

            {isEditingSeed && (
              <View style={s.editPanel}>
                <Text style={s.fieldLabel}>SLOGAN</Text>
                <TextInput
                  style={s.input}
                  value={editing.slogan}
                  onChangeText={(text) =>
                    setEditing({ ...editing, slogan: text })
                  }
                  placeholder="Short catchy phrase..."
                  placeholderTextColor="#4b5563"
                  maxLength={100}
                  returnKeyType="next"
                />

                <Text style={s.fieldLabel}>TAGS (comma-separated)</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={editing.tags}
                  onChangeText={(text) =>
                    setEditing({ ...editing, tags: text })
                  }
                  placeholder="tech, ai, coding, stem, business..."
                  placeholderTextColor="#4b5563"
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                <Text style={s.fieldHint}>
                  Suggested: tech · ai · coding · stem · business ·
                  entrepreneurship · economics · philosophy · cooking · gamedev
                  · web · creative
                </Text>

                <Text style={s.fieldLabel}>VISIBILITY</Text>
                <Pressable
                  style={[
                    s.visibilityBtn,
                    { borderColor: visibilityColor(editing.visibility) },
                  ]}
                  onPress={cycleVisibility}
                >
                  <Text
                    style={[
                      s.visibilityBtnText,
                      { color: visibilityColor(editing.visibility) },
                    ]}
                  >
                    {visibilityEmoji(editing.visibility)}{" "}
                    {editing.visibility.toUpperCase()} · tap to cycle
                  </Text>
                </Pressable>

                <View style={s.actionRow}>
                  <Pressable style={s.cancelBtn} onPress={cancelEditing}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.saveBtn, saving && s.saveBtnDisabled]}
                    onPress={saveEditing}
                    disabled={saving}
                  >
                    {saving ? (
                      <PathLabSkiaLoader size="tiny" />
                    ) : (
                      <Text style={s.saveBtnText}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0f",
  },
  subheader: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  hint: { fontSize: 11, color: "#374151", marginBottom: 16 },
  card: {
    backgroundColor: "#111118",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f1f2e",
    overflow: "hidden",
  },
  cardActive: { borderColor: "#6366f1" },
  cardPressable: { padding: 14 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  seedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  slogan: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    backgroundColor: "#1e1e2e",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: "#a5b4fc" },
  noTags: { fontSize: 12, color: "#374151", fontStyle: "italic" },
  editPanel: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#1f1f2e",
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#0d0d17",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2d2d44",
    color: "#e2e8f0",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  fieldHint: { fontSize: 11, color: "#374151", marginTop: 5, lineHeight: 16 },
  visibilityBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  visibilityBtnText: { fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: "#9ca3af", fontWeight: "600", fontSize: 14 },
  saveBtn: {
    flex: 2,
    borderRadius: 8,
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
