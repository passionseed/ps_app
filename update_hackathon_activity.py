import re

with open("app/(hackathon)/activity/[nodeId].tsx", "r") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { useCallback, useState } from "react";',
    'import { useCallback, useState, useRef } from "react";'
)
content = content.replace(
    'import { AppText } from "../../../components/AppText";',
    'import { AppText } from "../../../components/AppText";\nimport { HackathonSwipeDonut } from "../../../components/Hackathon/HackathonSwipeDonut";'
)
content = content.replace(
    '  withSpring,\n} from "react-native-reanimated";',
    '  withSpring,\n  withSequence,\n  Extrapolation,\n  interpolate,\n  runOnJS,\n} from "react-native-reanimated";'
)

# 2. State & Hooks in Component
hook_start = """export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();"""

hook_replacement = """export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  
  const [siblings, setSiblings] = useState<{id: string, title: string}[]>([]);
  
  const SWIPE_NEXT_THRESHOLD = 220;
  const PULL_HINT_SLIDE_PX = 104;

  const lastPrevNavAtRef = useRef(0);
  const swipePrevEnabledSV = useSharedValue(0);
  const swipeNextEnabledSV = useSharedValue(0);
  const lastPrevHapticMilestoneSV = useSharedValue(0);
  const lastNextHapticMilestoneSV = useSharedValue(0);
  const prevSwipeThresholdSV = useSharedValue(0);
  const nextSwipeThresholdSV = useSharedValue(0);
  const nextSwipeProgress = useSharedValue(0);
  const bottomReadyProgress = useSharedValue(0);
  const nextSwipePulse = useSharedValue(1);

  const prevSwipeProgress = useSharedValue(0);
  const prevReadyProgress = useSharedValue(0);
  const prevSwipePulse = useSharedValue(1);"""

content = content.replace(hook_start, hook_replacement)

# 3. onScroll and Handlers
scroll_start = """  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });"""

scroll_replacement = """  const triggerSwipeHaptic = useCallback((milestone: number) => {
    if (milestone <= 0) return;
    void Haptics.impactAsync(
      milestone >= 4
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    
    const scrollY_val = event.contentOffset.y;
    const contentH = event.contentSize.height;
    const viewportH = event.layoutMeasurement.height;

    const maxScrollY = Math.max(0, contentH - viewportH);

    if (swipePrevEnabledSV.value === 1) {
      const overscrollTop = scrollY_val < 0 ? -scrollY_val : 0;
      if (overscrollTop > 0) {
        prevReadyProgress.value = 1;
        const p = Math.min(overscrollTop / SWIPE_NEXT_THRESHOLD, 1);
        prevSwipeProgress.value = p;

        const milestone = p >= 1 ? 4 : Math.min(3, Math.floor(p * 4));
        if (milestone > lastPrevHapticMilestoneSV.value && milestone > 0) {
          lastPrevHapticMilestoneSV.value = milestone;
          runOnJS(triggerSwipeHaptic)(milestone);
        }

        if (p >= 1 && prevSwipeThresholdSV.value === 0) {
          prevSwipeThresholdSV.value = 1;
          prevSwipePulse.value = withSequence(
            withSpring(1.06, { damping: 12, stiffness: 260 }),
            withSpring(1, { damping: 14, stiffness: 200 }),
          );
        } else if (p < 1 && prevSwipeThresholdSV.value === 1) {
          prevSwipeThresholdSV.value = 0;
          prevSwipePulse.value = withSpring(1, { damping: 15, stiffness: 200 });
        }
      } else {
        prevReadyProgress.value = 0;
        lastPrevHapticMilestoneSV.value = 0;
        prevSwipeThresholdSV.value = 0;
        if (prevSwipeProgress.value > 0) {
          prevSwipeProgress.value = 0;
          prevSwipePulse.value = 1;
        }
      }
    }

    if (swipeNextEnabledSV.value === 1) {
      const overscrollY = scrollY_val - maxScrollY;
      if (overscrollY > 0) {
        bottomReadyProgress.value = 1;
        const p = Math.min(overscrollY / SWIPE_NEXT_THRESHOLD, 1);
        nextSwipeProgress.value = p;

        const milestone = p >= 1 ? 4 : Math.min(3, Math.floor(p * 4));
        if (milestone > lastNextHapticMilestoneSV.value && milestone > 0) {
          lastNextHapticMilestoneSV.value = milestone;
          runOnJS(triggerSwipeHaptic)(milestone);
        }

        if (p >= 1 && nextSwipeThresholdSV.value === 0) {
          nextSwipeThresholdSV.value = 1;
          nextSwipePulse.value = withSequence(
            withSpring(1.06, { damping: 12, stiffness: 260 }),
            withSpring(1, { damping: 14, stiffness: 200 }),
          );
        } else if (p < 1 && nextSwipeThresholdSV.value === 1) {
          nextSwipeThresholdSV.value = 0;
          nextSwipePulse.value = withSpring(1, { damping: 15, stiffness: 200 });
        }
      } else {
        bottomReadyProgress.value = 0;
        lastNextHapticMilestoneSV.value = 0;
        nextSwipeThresholdSV.value = 0;
        if (nextSwipeProgress.value > 0) {
          nextSwipeProgress.value = 0;
          nextSwipePulse.value = 1;
        }
      }
    }
  });

  const prevPullOverlayStyle = useAnimatedStyle(() => {
    const p = prevSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0, 1],
            [-PULL_HINT_SLIDE_PX, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const nextPullOverlayStyle = useAnimatedStyle(() => {
    const p = nextSwipeProgress.value;
    return {
      opacity: interpolate(p, [0, 0.04, 0.18, 1], [0, 0.88, 1, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0, 1],
            [PULL_HINT_SLIDE_PX, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const handleSwipeToNext = () => {
    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      router.replace(`/activity/${siblings[currentIndex + 1].id}`);
    } else if (currentIndex === siblings.length - 1) {
      router.back(); // Go back to activities list
    }
  };

  const handleSwipeToPrevious = () => {
    const now = Date.now();
    if (now - lastPrevNavAtRef.current < 450) return;
    lastPrevNavAtRef.current = now;

    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex > 0) {
      router.replace(`/activity/${siblings[currentIndex - 1].id}`);
    }
  };"""

content = content.replace(scroll_start, scroll_replacement)

# 4. Fetch Siblings
focus_effect_start = """            setActivity(dbData);
            setPastSubmissions(submissions);
          }"""
          
focus_effect_replacement = """            setActivity(dbData);
            setPastSubmissions(submissions);

            if (dbData && dbData.phase_id) {
              const { data: sibs } = await supabase
                .from("hackathon_phase_activities")
                .select("id, title")
                .eq("phase_id", dbData.phase_id)
                .order("display_order", { ascending: true });
              if (sibs && !cancelled) {
                setSiblings(sibs);
                const currentIndex = sibs.findIndex(s => s.id === nodeId);
                swipePrevEnabledSV.value = currentIndex > 0 ? 1 : 0;
                swipeNextEnabledSV.value = 1; // allow swipe next to go back if last
              }
            }
          }"""

content = content.replace(focus_effect_start, focus_effect_replacement)

# 5. Add Wrappers & Pull Overlays
return_start = """  return (
    <View style={styles.root}>
      {/* Glow orb */}"""
      
return_replacement = """  const currentIndex = siblings.findIndex(s => s.id === nodeId);
  const previousTitle = currentIndex > 0 ? siblings[currentIndex - 1].title : "";
  const nextTitle = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].title : "Return to Map";

  return (
    <View style={styles.root}>
      {/* Glow orb */}"""

content = content.replace(return_start, return_replacement)

scrollview_start = """      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >"""
      
scrollview_replacement = """      <Animated.View
        pointerEvents="none"
        style={[
          styles.pullOverlayTop,
          { paddingTop: insets.top + 16 },
          prevPullOverlayStyle,
        ]}
      >
        {swipePrevEnabledSV.value === 1 ? (
          <HackathonSwipeDonut
            direction="previous"
            progress={prevSwipeProgress}
            readyProgress={prevReadyProgress}
            pulseScale={prevSwipePulse}
            label="Previous activity"
            titleHint={previousTitle}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pullOverlayBottom,
          { paddingBottom: Math.max(insets.bottom, 4) + 12 },
          nextPullOverlayStyle,
        ]}
      >
        {swipeNextEnabledSV.value === 1 ? (
          <HackathonSwipeDonut
            direction="next"
            progress={nextSwipeProgress}
            readyProgress={bottomReadyProgress}
            pulseScale={nextSwipePulse}
            label="Next"
            titleHint={nextTitle}
          />
        ) : null}
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const scrollY_val = contentOffset.y;
          if (swipePrevEnabledSV.value === 1 && scrollY_val < -SWIPE_NEXT_THRESHOLD * 0.6) {
            handleSwipeToPrevious();
          }
          const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height);
          const overscrollY = scrollY_val - maxScrollY;
          if (swipeNextEnabledSV.value === 1 && overscrollY > SWIPE_NEXT_THRESHOLD * 0.6) {
            handleSwipeToNext();
          }
        }}
      >"""

content = content.replace(scrollview_start, scrollview_replacement)

# 6. Styles
styles_start = """const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },"""

styles_replacement = """const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  pullOverlayTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 25,
    alignItems: "center",
    overflow: "visible",
  },
  pullOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  scroll: { flex: 1 },"""

content = content.replace(styles_start, styles_replacement)

with open("app/(hackathon)/activity/[nodeId].tsx", "w") as f:
    f.write(content)
