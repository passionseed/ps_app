// app/(hackathon)/profile.tsx
import { StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { Space, Radius } from "../../lib/theme";
import { useHackathonParticipant } from "../../lib/hackathon-mode";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";

export default function HackathonProfileScreen() {
  const { signOutHackathon } = useAuth();
  const participant = useHackathonParticipant();

  return (
    <View style={styles.root}>
      {/* Background glows */}
      <View style={styles.glowTopLeft} pointerEvents="none" />
      <View style={styles.glowBottomRight} pointerEvents="none" />

      <View style={styles.content}>
        <AppText variant="bold" style={styles.eyebrow}>PROFILE</AppText>
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

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
          onPress={() => signOutHackathon()}
        >
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </Pressable>
      </View>
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
  root: { flex: 1, backgroundColor: BG },
  glowTopLeft: {
    position: "absolute",
    left: -60,
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0,240,255,0.07)",
  },
  glowBottomRight: {
    position: "absolute",
    right: -60,
    bottom: 100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(123,44,191,0.1)",
  },
  content: {
    flex: 1,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.xl,
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
    marginTop: Space.sm,
  },
  signOutText: {
    fontSize: 15,
    color: WHITE75,
    fontFamily: "LibreFranklin_400Regular",
  },
});
