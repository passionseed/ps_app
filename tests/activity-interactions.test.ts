import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const activityScreenSource = readFileSync(
  join(root, "app/activity/[activityId].tsx"),
  "utf8",
);
const swipeSource = readFileSync(
  join(root, "components/activity/SwipeProgressDonut.tsx"),
  "utf8",
);

describe("activity interaction polish", () => {
  it("animates the header based on scroll progress", () => {
    expect(activityScreenSource).toContain("const HEADER_COLLAPSE_DISTANCE =");
    expect(activityScreenSource).toContain(
      "const headerScrollY = useRef(new Animated.Value(0)).current;",
    );
    expect(activityScreenSource).toContain(
      "const headerCollapseProgress = headerScrollY.interpolate({",
    );
    expect(activityScreenSource).toContain("<Animated.ScrollView");
    expect(activityScreenSource).toContain("useNativeDriver: true,");
  });

  it("uses a Skia donut progress indicator for the next-activity swipe", () => {
    expect(activityScreenSource).toContain(
      'import { SwipeProgressDonut } from "../../components/activity/SwipeProgressDonut"',
    );
    expect(activityScreenSource).toContain("const SWIPE_NEXT_THRESHOLD = 220;");
    expect(activityScreenSource).toContain("<SwipeProgressDonut");
    expect(swipeSource).toContain("@shopify/react-native-skia");
    expect(swipeSource).toContain("export function SwipeProgressDonut");
  });
});
