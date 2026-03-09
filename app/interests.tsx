import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { InterestCategory } from "../types/onboarding";

export default function InterestsScreen() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<InterestCategory[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const loadInterests = async () => {
      const { data } = await supabase
        .from("user_interests")
        .select("*")
        .eq("user_id", user.id);
      if (data) setInterests(data);
    };
    loadInterests();
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>All Interests</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {interests.length === 0 ? (
          <Text style={styles.emptyText}>No interests found.</Text>
        ) : (
          interests.map((interest, idx) => (
            <View key={idx} style={styles.interestCategory}>
              <Text style={styles.categoryName}>{interest.category_name}</Text>
              {interest.selected && interest.selected.length > 0 ? (
                <View style={styles.statementsWrap}>
                  {interest.selected.map((stmt, sidx) => (
                    <View key={sidx} style={styles.statementChip}>
                      <Text style={styles.statementChipText}>{stmt}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCategoryText}>None selected</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 16,
  },
  backBtnText: {
    fontSize: 18,
    color: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  scrollContent: {
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#888",
    textAlign: "center",
    marginTop: 40,
  },
  interestCategory: {
    marginBottom: 24,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  statementsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statementChip: {
    backgroundColor: "#f0f8e8",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)",
  },
  statementChipText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  emptyCategoryText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    fontStyle: "italic",
  },
});
