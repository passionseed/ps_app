import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";

const TABS = ["Mine", "Friends"] as const;
type ProofTab = typeof TABS[number];

import { useState } from "react";

export default function ProofsScreen() {
  const [activeTab, setActiveTab] = useState<ProofTab>("Mine");

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Proofs</Text>
      </View>

      {/* Sub-tabs */}
      <View style={styles.subTabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={styles.subTab}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.subTabText,
                activeTab === tab && styles.subTabTextActive,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.subTabUnderline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>□</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === "Mine" ? "No proofs submitted" : "No friend proofs"}
          </Text>
          <Text style={styles.emptyBody}>
            {activeTab === "Mine"
              ? "Complete a goal action and\nsubmit your proof here."
              : "Your friends haven't posted\nany proofs yet."}
          </Text>
        </View>
      </ScrollView>

      {/* Submit proof FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        {({ pressed }) => (
          <Text style={[styles.fabText, pressed && styles.fabTextPressed]}>
            + Submit Proof
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  subTabs: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    marginTop: 16,
  },
  subTab: {
    marginRight: 32,
    paddingBottom: 12,
    position: "relative",
  },
  subTabText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#555",
    letterSpacing: 0.5,
  },
  subTabTextActive: {
    color: "#111",
    fontWeight: "400",
  },
  subTabUnderline: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#BFFF00",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    color: "#111",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#111",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: "#111",
  },
  fabPressed: {
    backgroundColor: "#BFFF00",
    borderColor: "#BFFF00",
  },
  fabText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#FDFFF5",
    letterSpacing: 0.5,
  },
  fabTextPressed: {
    color: "#111",
  },
});
