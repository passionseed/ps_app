// app/(hackathon)/profile.tsx
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { Space, Radius } from "../../lib/theme";
import { useHackathonParticipant } from "../../lib/hackathon-mode";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "transparent";
const CYAN = "#91C4E3";
const CYAN_BORDER = "rgba(145,196,227,0.1)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const AMBER = "#F59E0B";

export default function HackathonProfileScreen() {
  const { signOutHackathon } = useAuth();
  const participant = useHackathonParticipant();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}>
        <AppText variant="bold" style={styles.eyebrow}>YOUR PROFILE</AppText>
        <AppText variant="bold" style={styles.title}>{participant?.name ?? "Participant"}</AppText>

        <View style={styles.infoCard}>
          <LinearGradient
            colors={["#01040A", "#030B17"]}
            style={StyleSheet.absoluteFill}
          />
          <InfoRow label="EMAIL" value={participant?.email ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="UNIVERSITY" value={participant?.university ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="ROLE" value={participant?.role ?? "—"} />
          {participant?.team_name ? (
            <>
              <View style={styles.divider} />
              <InfoRow label="TEAM" value={participant.team_name} accent />
            </>
          ) : null}
        </View>

        <View style={styles.placeholderCard}>
          <AppText variant="bold" style={styles.placeholderTitle}>Team Roster</AppText>
          <AppText style={styles.placeholderText}>View your teammates and team details.</AppText>
          <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
        </View>

        <View style={styles.placeholderCard}>
          <AppText variant="bold" style={styles.placeholderTitle}>Knowledge Vault</AppText>
          <AppText style={styles.placeholderText}>Your completed activities, generated ideas, and reflections in one place.</AppText>
          <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
        </View>

        <View style={styles.placeholderCard}>
          <AppText variant="bold" style={styles.placeholderTitle}>Point Mechanics</AppText>
          <AppText style={styles.placeholderText}>Track your point breakdown. See how you contribute to your team.</AppText>
          <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
          onPress={() => signOutHackathon()}
        >
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText variant="bold" style={[styles.infoValue, accent && { color: CYAN }]}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space.md,
  },
  eyebrow: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
  },
  infoCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
  },
  infoRow: {
    gap: Space.xs,
  },
  infoLabel: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 15,
    color: WHITE,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,240,255,0.08)",
  },
  signOutBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: Space.md,
    alignItems: "center",
    marginTop: Space.lg,
  },
  signOutText: {
    fontSize: 15,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
  },
  placeholderCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.lg,
    gap: Space.xs,
    marginTop: Space.sm,
  },
  placeholderTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  placeholderText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "BaiJamjuree_400Regular" },
  placeholderBadge: { fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
});
