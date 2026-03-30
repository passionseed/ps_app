import { Animated } from "react-native";
import { ANIMATION_CONFIG } from "./constants";

export function getDiscoverScrollInterpolations(scrollY: Animated.Value) {
  const titleScale = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0.85],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [
      ANIMATION_CONFIG.collapseThreshold * 0.5,
      ANIMATION_CONFIG.collapseThreshold,
    ],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const smallTitleTranslateY = scrollY.interpolate({
    inputRange: [
      ANIMATION_CONFIG.collapseThreshold * 0.5,
      ANIMATION_CONFIG.collapseThreshold,
    ],
    outputRange: [-10, 0],
    extrapolate: "clamp",
  });

  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  const searchBarOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold * 0.8],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const searchBarScale = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const compactSearchOpacity = scrollY.interpolate({
    inputRange: [
      ANIMATION_CONFIG.collapseThreshold * 0.6,
      ANIMATION_CONFIG.collapseThreshold,
    ],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, ANIMATION_CONFIG.collapseThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return {
    titleScale,
    titleOpacity,
    titleTranslateY,
    smallTitleOpacity,
    smallTitleTranslateY,
    searchBarTranslateY,
    searchBarOpacity,
    searchBarScale,
    compactSearchOpacity,
    headerBgOpacity,
  };
}
