import { View, StyleSheet } from "react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { SkiaBackButton } from "../navigation/SkiaBackButton";
import {
  Accent,
  PageBg,
  Text as ThemeText,
  Radius,
  Shadow,
} from "../../lib/theme";

interface Props {
  title: string;
  scrollY: SharedValue<number>;
  onBack: () => void;
  headerChipLabel?: string;
  headerSubtitle?: string;
  showPagination?: boolean;
  insetsTop?: number;
}

const HEADER_COLLAPSE_DISTANCE = 96;

export default function ActivityHeader({
  title,
  scrollY,
  onBack,
  headerChipLabel = "Activity",
  headerSubtitle = "",
  showPagination = false,
  insetsTop = 0,
}: Props) {
  const heroHeaderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE * 0.62],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HEADER_COLLAPSE_DISTANCE * 0.72],
          [0, -10],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const collapsedInlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.22, HEADER_COLLAPSE_DISTANCE * 0.62],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <>
      {/* Top bar with back button and collapsed title */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insetsTop + 8,
            paddingBottom: 10,
            zIndex: 10,
          },
        ]}
      >
        <View style={[styles.headerTopRow, { marginBottom: 4 }]}>
          <SkiaBackButton onPress={onBack} style={styles.headerBackButton} />
          <View
            style={[
              styles.headerTopRowCenter,
              showPagination && styles.headerTopRowCenterWithDots,
            ]}
          >
            <Reanimated.View
              style={[styles.headerCollapsedTitleWrap, collapsedInlineAnimatedStyle]}
              pointerEvents="none"
            >
              <AppText variant="bold" numberOfLines={1} style={styles.headerTitleCollapsed}>
                {title}
              </AppText>
            </Reanimated.View>
          </View>
          <View style={styles.headerTopSpacer} />
        </View>
      </View>

      {/* Hero section */}
      <Reanimated.View
        style={[
          styles.headerHero,
          heroHeaderAnimatedStyle,
          {
            marginBottom: 16,
            marginTop: -10,
          },
        ]}
      >
        <View style={styles.headerChipRow}>
          <View style={styles.headerChip}>
            <AppText style={styles.headerChipText}>{headerChipLabel}</AppText>
          </View>
        </View>
        <AppText variant="bold" style={styles.headerTitle}>
          {title}
        </AppText>
        {headerSubtitle ? (
          <AppText style={styles.headerSubtitle}>{headerSubtitle}</AppText>
        ) : null}
      </Reanimated.View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    backgroundColor: PageBg.default,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.card,
  },
  headerTopSpacer: {
    width: 38,
    height: 38,
  },
  headerTopRowCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 4,
  },
  headerTopRowCenterWithDots: {
    paddingRight: 10,
  },
  headerCollapsedTitleWrap: {
    width: "100%",
    justifyContent: "center",
  },
  headerTitleCollapsed: {
    fontSize: 17,
    lineHeight: 22,
    color: ThemeText.primary,
    textAlign: "center",
  },
  headerHero: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    overflow: "hidden",
  },
  headerChipRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerChip: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  headerChipText: {
    fontSize: 12,
    color: Accent.blue,
    textAlign: "center",
    includeFontPadding: false,
  },
  headerTitle: {
    width: "100%",
    fontSize: 30,
    lineHeight: 36,
    color: ThemeText.primary,
    textAlign: "center",
  },
  headerSubtitle: {
    width: "100%",
    fontSize: 14,
    lineHeight: 21,
    color: ThemeText.secondary,
    textAlign: "center",
  },
});
