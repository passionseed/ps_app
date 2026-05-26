import { StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileAccountCardProps = {
  email: string;
  university: string;
  role: string;
};

export function ProfileAccountCard({
  email,
  university,
  role,
}: ProfileAccountCardProps) {
  return (
    <HackathonGlassCard style={styles.card}>
      <InfoRow label="EMAIL" value={email} />
      <View style={styles.divider} />
      <InfoRow label="UNIVERSITY" value={university} />
      <View style={styles.divider} />
      <InfoRow label="ROLE" value={role} />
    </HackathonGlassCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText variant="bold" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Space.sm,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: HACK_COLORS.cyan,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "BaiJamjuree_700Bold",
  },
  infoValue: {
    fontSize: 15,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: HACK_ALPHA.divider,
  },
});
