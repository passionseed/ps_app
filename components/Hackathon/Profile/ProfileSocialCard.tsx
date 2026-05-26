import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "../../AppText";
import { Radius, Space } from "../../../lib/theme";
import {
  HACK_ALPHA,
  HACK_COLORS,
  HACK_SHADOW,
} from "../../../lib/hackathonTheme";

type ProfileSocialCardProps = {
  instagramHandle: string;
  discordUsername: string;
  saving: boolean;
  onChangeInstagram: (value: string) => void;
  onChangeDiscord: (value: string) => void;
  onSave: () => void;
};

export function buildSocialSummary(
  instagramHandle: string,
  discordUsername: string,
): string {
  const parts: string[] = [];
  if (instagramHandle.trim()) parts.push(`IG @${instagramHandle.trim()}`);
  if (discordUsername.trim()) parts.push(`Discord ${discordUsername.trim()}`);
  return parts.length > 0 ? parts.join(" · ") : "Add Instagram or Discord";
}

export function ProfileSocialFields({
  instagramHandle,
  discordUsername,
  saving,
  onChangeInstagram,
  onChangeDiscord,
  onSave,
}: ProfileSocialCardProps) {
  return (
    <>
      <View style={styles.socialInputRow}>
        <AppText style={styles.socialIcon}>📷</AppText>
        <TextInput
          style={styles.socialInput}
          placeholder="Instagram handle"
          placeholderTextColor={HACK_ALPHA.white35}
          value={instagramHandle}
          onChangeText={onChangeInstagram}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.socialInputRow}>
        <AppText style={styles.socialIcon}>💬</AppText>
        <TextInput
          style={styles.socialInput}
          placeholder="Discord username"
          placeholderTextColor={HACK_ALPHA.white35}
          value={discordUsername}
          onChangeText={onChangeDiscord}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          pressed && { opacity: 0.85 },
          saving && { opacity: 0.5 },
        ]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={HACK_COLORS.white} size="small" />
        ) : (
          <AppText variant="bold" style={styles.saveBtnText}>
            Save
          </AppText>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  socialInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: HACK_COLORS.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HACK_ALPHA.glassBorder,
    paddingHorizontal: Space.sm,
    paddingVertical: 10,
  },
  socialIcon: {
    fontSize: 18,
  },
  socialInput: {
    flex: 1,
    fontSize: 14,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_400Regular",
    padding: 0,
  },
  saveBtn: {
    backgroundColor: HACK_COLORS.purpleMuted,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Space.lg,
    alignItems: "center",
    alignSelf: "flex-start",
    ...HACK_SHADOW.purpleCta,
  },
  saveBtnText: {
    color: HACK_COLORS.white,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
