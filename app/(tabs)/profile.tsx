import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Explorer";
  const email = user?.email || "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats placeholder */}
        <View style={styles.statsRow}>
          <StatBox value="0" label="Paths Explored" />
          <View style={styles.statDivider} />
          <StatBox value="0" label="Tasks Done" />
          <View style={styles.statDivider} />
          <StatBox value="0d" label="Streak" />
        </View>

        {/* Coming soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonIcon}>🚀</Text>
          <Text style={styles.comingSoonTitle}>Direction Finder</Text>
          <Text style={styles.comingSoonText}>
            After exploring paths, unlock AI-powered career direction
            recommendations tailored to your interests.
          </Text>
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && styles.signOutBtnPressed,
          ]}
          onPress={handleSignOut}
        >
          {({ pressed }) => (
            <Text
              style={[styles.signOutText, pressed && styles.signOutTextPressed]}
            >
              Sign out
            </Text>
          )}
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  identity: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 32,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#BFFF00",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  name: {
    fontSize: 22,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
  },
  email: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#eee",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  comingSoon: {
    marginHorizontal: 24,
    backgroundColor: "#f0f8e8",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  comingSoonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  signOutBtn: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutBtnPressed: {
    backgroundColor: "#111",
  },
  signOutText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  signOutTextPressed: {
    color: "#fff",
  },
});
