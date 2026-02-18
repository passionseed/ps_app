import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function GoalsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          {({ pressed }) => (
            <Text style={[styles.addBtnText, pressed && styles.addBtnTextPressed]}>
              + New
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>○</Text>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>
            Set a goal and invite friends{"\n"}to keep each other accountable.
          </Text>
        </View>
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
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
  },
  title: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  addBtn: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  addBtnPressed: {
    backgroundColor: "#111",
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
  },
  addBtnTextPressed: {
    color: "#FDFFF5",
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
});
