// app/(hackathon)/profile.tsx
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { GlassButton } from "../../components/Glass/GlassButton";
import { useAuth } from "../../lib/auth";
import { PageBg, Space, Text as ThemeText, Type } from "../../lib/theme";
import { supabase } from "../../lib/supabase";

export default function HackathonProfileScreen() {
  const { user } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.root}>
      <AppText variant="bold" style={styles.title}>Profile</AppText>

      <View style={styles.infoRow}>
        <AppText style={styles.label}>Email</AppText>
        <AppText style={styles.value}>{user?.email ?? "—"}</AppText>
      </View>

      <GlassButton variant="secondary" onPress={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.xl,
  },
  title: {
    fontSize: 30,
    color: ThemeText.primary,
  },
  infoRow: {
    gap: Space.xs,
  },
  label: {
    fontSize: 12,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  signOutButton: {
    marginTop: Space.lg,
  },
});
