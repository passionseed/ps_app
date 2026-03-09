import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function CareerDetailScreen() {
  const { name } = useLocalSearchParams();
  const rawCareerName =
    typeof name === "string" ? decodeURIComponent(name) : "";
  const careerName = rawCareerName.split("(")[0].trim();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{careerName}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top People */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top People to Follow</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Text style={styles.cardDesc}>
              Discover industry leaders and experts in {careerName}.
            </Text>
          </View>
        </View>

        {/* Companies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Companies</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Text style={styles.cardDesc}>
              Explore companies hiring for {careerName} roles.
            </Text>
          </View>
        </View>

        {/* News */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Industry News</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Text style={styles.cardDesc}>
              Stay updated with the latest trends in {careerName}.
            </Text>
          </View>
        </View>

        {/* Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jobs & Internships</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Text style={styles.cardDesc}>
              Find relevant opportunities tailored to your profile.
            </Text>
          </View>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    lineHeight: 20,
  },
});
