import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const activityScreenSource = readFileSync(
  "/Users/bunyasit/dev/ps_app/app/activity/[activityId].tsx",
  "utf8",
);

describe("activity interaction polish", () => {
  it("animates the header based on scroll progress", () => {
    expect(activityScreenSource).toContain("const HEADER_COLLAPSE_DISTANCE =");
    expect(activityScreenSource).toContain("const headerScrollY = useRef(new Animated.Value(0)).current;");
    expect(activityScreenSource).toContain("const headerCollapseProgress = headerScrollY.interpolate({");
    expect(activityScreenSource).toContain("<Animated.ScrollView");
    expect(activityScreenSource).toContain("useNativeDriver: true,");
  });

  it("uses a donut progress indicator for the next-activity swipe", () => {
    expect(activityScreenSource).toContain("function SwipeProgressDonut(");
    expect(activityScreenSource).toContain("const SWIPE_NEXT_THRESHOLD = 220;");
    expect(activityScreenSource).toContain("onPanResponderMove: (_, gestureState) => {");
    expect(activityScreenSource).toContain("<SwipeProgressDonut");
  });
});
