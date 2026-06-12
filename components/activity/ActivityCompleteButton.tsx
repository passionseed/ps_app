import { View, StyleSheet } from "react-native";
import { GlassButton } from "../Glass/GlassButton";
import { Accent, PageBg, Shadow } from "../../lib/theme";

interface Props {
  canComplete: boolean;
  isSubmitting: boolean;
  onPress: () => void;
  label?: string;
}

export default function ActivityCompleteButton({
  canComplete,
  isSubmitting,
  onPress,
  label = "Mark as Complete",
}: Props) {
  if (!canComplete) return null;

  return (
    <View style={styles.ctaContainer}>
      <GlassButton
        variant="primary"
        fullWidth
        onPress={onPress}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Completing..." : label}
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: PageBg.default,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    ...Shadow.floating,
  },
});
