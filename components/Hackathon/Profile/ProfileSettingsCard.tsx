import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileSettingsCardProps = {
  showPushRow: boolean;
  enablingPush: boolean;
  onEnablePush: () => void;
  isAdmin: boolean;
  onDebugInfo: () => void;
  onSignOut: () => void;
};

export function ProfileSettingsCard({
  showPushRow,
  enablingPush,
  onEnablePush,
  isAdmin,
  onDebugInfo,
  onSignOut,
}: ProfileSettingsCardProps) {
  return (
    <HackathonGlassCard compact gradient="subtle" innerStyle={styles.inner}>
      {showPushRow ? (
        <SettingsRow
          label="Enable notifications"
          hint="Team & mentor updates"
          onPress={onEnablePush}
          disabled={enablingPush}
          trailing={
            enablingPush ? (
              <ActivityIndicator color={HACK_COLORS.amber} size="small" />
            ) : (
              <AppText style={styles.action}>ON</AppText>
            )
          }
        />
      ) : null}
      {isAdmin ? (
        <SettingsRow
          label="Hackathon admin"
          hint="Submissions & team progress"
          onPress={() => router.push("/admin/hackathon" as never)}
          trailing={<AppText style={styles.chevron}>›</AppText>}
        />
      ) : null}
      <SettingsRow
        label="Debug info"
        onPress={onDebugInfo}
        trailing={<AppText style={styles.chevron}>›</AppText>}
      />
      <SettingsRow
        label="Sign out"
        destructive
        onPress={onSignOut}
        trailing={<AppText style={styles.chevronDestructive}>›</AppText>}
      />
    </HackathonGlassCard>
  );
}

function SettingsRow({
  label,
  hint,
  onPress,
  disabled,
  destructive,
  trailing,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.rowText}>
        <AppText
          variant="bold"
          style={[styles.rowLabel, destructive && styles.destructiveLabel]}
        >
          {label}
        </AppText>
        {hint ? <AppText style={styles.rowHint}>{hint}</AppText> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    padding: 0,
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: HACK_ALPHA.divider,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 14,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  destructiveLabel: {
    color: "#f87171",
  },
  rowHint: {
    fontSize: 11,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  action: {
    fontSize: 11,
    color: HACK_COLORS.amber,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
  },
  chevron: {
    fontSize: 18,
    color: HACK_ALPHA.white35,
    fontFamily: "BaiJamjuree_400Regular",
  },
  chevronDestructive: {
    fontSize: 18,
    color: "rgba(248,113,113,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
  },
});
