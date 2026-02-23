import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

function StatBox({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signInWithGoogle } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "You";
  const email = user?.email || "";

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
            <Text style={styles.avatarText}>▲</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.handle}>{email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={0} label="Goals" />
          <View style={styles.statDivider} />
          <StatBox value={0} label="Proofs" />
          <View style={styles.statDivider} />
          <StatBox value="0d" label="Streak" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
          >
            <Text style={styles.actionLabel}>Friends</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
          >
            <Text style={styles.actionLabel}>Notifications</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
          >
            <Text style={styles.actionLabel}>Settings</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>
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
      </ScrollView>
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
  identity: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    color: "#111",
  },
  name: {
    fontSize: 22,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  handle: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#555",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    borderWidth: 2,
    borderColor: "#111",
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  statDivider: {
    width: 2,
    backgroundColor: "#111",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#555",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actions: {
    marginHorizontal: 24,
    borderWidth: 2,
    borderColor: "#111",
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionRowPressed: {
    backgroundColor: "#111",
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
  },
  actionArrow: {
    fontSize: 16,
    color: "#555",
  },
  divider: {
    height: 2,
    backgroundColor: "#111",
  },
  signOutBtn: {
    marginHorizontal: 24,
    borderWidth: 2,
    borderColor: "#111",
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
    color: "#111",
    letterSpacing: 0.5,
  },
  signOutTextPressed: {
    color: "#FDFFF5",
  },
});
