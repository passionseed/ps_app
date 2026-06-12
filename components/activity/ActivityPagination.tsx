import { View, StyleSheet } from "react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Accent, Text as ThemeText } from "../../lib/theme";

interface Props {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  scrollY?: SharedValue<number>;
  variant?: "default" | "npc";
}

const HEADER_COLLAPSE_DISTANCE = 96;

export default function ActivityPagination({
  currentIndex,
  total,
  onPrev: _onPrev,
  onNext: _onNext,
  scrollY,
  variant = "default",
}: Props) {
  const pageDotsAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };
    const collapse = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: interpolate(collapse, [0, 1], [0.68, 1], Extrapolation.CLAMP),
    };
  });

  if (total <= 0) return null;

  const isNpc = variant === "npc";
  const containerStyle = isNpc ? styles.npcContainer : styles.defaultContainer;
  const dotStyle = isNpc ? styles.npcDot : styles.dot;
  const activeDotStyle = isNpc ? styles.npcDotActive : styles.dotActive;

  return (
    <Reanimated.View style={[containerStyle, pageDotsAnimatedStyle]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            dotStyle,
            index === currentIndex && activeDotStyle,
          ]}
        />
      ))}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -50 }],
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  npcContainer: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -50 }],
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ThemeText.tertiary,
  },
  dotActive: {
    backgroundColor: Accent.yellow,
    height: 24,
  },
  npcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  npcDotActive: {
    backgroundColor: Accent.yellow,
    height: 24,
  },
});
