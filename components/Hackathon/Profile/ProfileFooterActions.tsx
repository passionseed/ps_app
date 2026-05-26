import { Pressable, StyleSheet } from "react-native";

import { AppText } from "../../AppText";
import { Radius, Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";

type ProfileFooterActionsProps = {
  onDebugInfo: () => void;
  onSignOut: () => void;
};

export function ProfileFooterActions({
  onDebugInfo,
  onSignOut,
}: ProfileFooterActionsProps) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
        onPress={onDebugInfo}
      >
        <AppText style={styles.btnText}>ℹ️ Debug Info</AppText>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
        onPress={onSignOut}
      >
        <AppText style={styles.btnText}>Sign Out</AppText>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: HACK_ALPHA.white12,
    backgroundColor: HACK_ALPHA.white04,
    paddingVertical: Space.md,
    alignItems: "center",
    marginTop: Space.lg,
  },
  btnText: {
    fontSize: 15,
    color: HACK_ALPHA.white75,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
