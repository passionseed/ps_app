import { useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Canvas, Circle, Group, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { getHackathonComicPanelPhase } from "../../lib/hackathonComicScene";
import { Space } from "../../lib/theme";
import type {
  HackathonComicContent,
  HackathonComicPanel,
} from "../../types/hackathon-phase-activity";

const PANEL_BG = "rgba(7,12,20,0.94)";
const WHITE = "#FFFFFF";
const WHITE80 = "rgba(255,255,255,0.8)";
const WHITE92 = "rgba(255,255,255,0.92)";
const WHITE60 = "rgba(255,255,255,0.6)";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const AMBER = "#E7B75E";
const VIOLET = "#98A3FF";

type HackathonEvidenceComicProps = {
  comic: HackathonComicContent;
  fallbackUrl?: string | null;
  scrollY: SharedValue<number>;
  viewportHeight: number;
  contentSectionY: number;
};

const COMIC_IMAGE_ASSETS: Record<string, ImageSourcePropType> = {
  "phase1-noise": require("../../assets/images/hackathon-phase1-comic/phase1-noise.png"),
  "phase1-evidence": require("../../assets/images/hackathon-phase1-comic/phase1-evidence.png"),
  "phase1-validation": require("../../assets/images/hackathon-phase1-comic/phase1-validation.png"),
  "phase1-outcome": require("../../assets/images/hackathon-phase1-comic/phase1-outcome.png"),
  "walkaway_p1": require("../../assets/images/hackathon-phase1-comic/walkaway_p1.png"),
  "walkaway_p2": require("../../assets/images/hackathon-phase1-comic/walkaway_p2.png"),
  "walkaway_p3": require("../../assets/images/hackathon-phase1-comic/walkaway_p3.png"),
  "walkaway_p4": require("../../assets/images/hackathon-phase1-comic/walkaway_p4.png"),
  "walkaway_p5": require("../../assets/images/hackathon-phase1-comic/walkaway_p5.png"),
};

function accentColor(accent: string): string {
  switch (accent) {
    case "amber":
      return AMBER;
    case "blue":
      return BLUE;
    case "violet":
    case "purple":
      return VIOLET;
    default:
      return CYAN;
  }
}

function resolvePanelImageSource(
  panel: HackathonComicPanel,
  fallbackUrl: string | null,
): ImageSourcePropType | null {
  if (panel.imageKey && COMIC_IMAGE_ASSETS[panel.imageKey]) {
    return COMIC_IMAGE_ASSETS[panel.imageKey];
  }

  if (!panel.imageKey) {
    return fallbackUrl ? { uri: fallbackUrl } : null;
  }

  if (
    panel.imageKey.startsWith("http://") ||
    panel.imageKey.startsWith("https://") ||
    panel.imageKey.startsWith("file://") ||
    panel.imageKey.startsWith("/")
  ) {
    return { uri: panel.imageKey };
  }

  return fallbackUrl ? { uri: fallbackUrl } : null;
}

function PanelAtmosphere({
  accent,
  width,
  height,
}: {
  accent: string;
  width: number;
  height: number;
}) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["rgba(4,8,14,0.08)", "rgba(8,14,24,0.04)", "rgba(3,6,12,0.12)"]}
        />
      </Rect>

      <Group opacity={0.92}>
        <Circle cx={width * 0.16} cy={height * 0.24} r={height * 0.22} color={`${accent}1F`} />
        <Circle cx={width * 0.84} cy={height * 0.72} r={height * 0.18} color="rgba(101,171,252,0.1)" />
        <Rect x={0} y={height * 0.46} width={width} height={height * 0.54}>
          <LinearGradient
            start={vec(0, height * 0.46)}
            end={vec(0, height)}
            colors={["rgba(5,10,18,0)", "rgba(5,10,18,0.18)", "rgba(5,10,18,0.82)"]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}

function EvidencePanel({
  panel,
  fallbackUrl,
  scrollY,
  panelTop,
  width,
  height,
  viewportHeight,
}: {
  panel: HackathonComicPanel;
  fallbackUrl: string | null;
  scrollY: SharedValue<number>;
  panelTop: number;
  width: number;
  height: number;
  viewportHeight: number;
}) {
  const accent = accentColor(panel.accent);
  const imageSource = resolvePanelImageSource(panel, fallbackUrl);

  const imageStyle = useAnimatedStyle(() => {
    const phase = getHackathonComicPanelPhase({
      scrollY: scrollY.value,
      panelTop,
      panelHeight: height,
      viewportHeight,
    });

    return {
      transform: [
        {
          translateX: interpolate(phase, [-1, 0, 1], [-10, 0, 14], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(phase, [-1, 0, 1], [-10, 0, 18], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(Math.abs(phase), [0, 1], [1, 1.06], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const captionStyle = useAnimatedStyle(() => {
    const phase = getHackathonComicPanelPhase({
      scrollY: scrollY.value,
      panelTop,
      panelHeight: height,
      viewportHeight,
    });

    return {
      opacity: interpolate(Math.abs(phase), [0, 0.95], [1, 0.8], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(phase, [-1, 0, 1], [-8, 0, 10], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={[styles.panel, { width, height }]}>
      <View style={styles.mediaFrame}>
        {imageSource ? (
          <Animated.View style={[styles.panelImageMotion, imageStyle]}>
            <Image
              source={imageSource}
              style={styles.panelImage}
              resizeMode="cover"
              accessibilityLabel={panel.headline}
            />
          </Animated.View>
        ) : (
          <View style={styles.placeholderMedia}>
            <AppText variant="bold" style={styles.placeholderTitle}>
              Evidence Snapshot
            </AppText>
            <AppText style={styles.placeholderBody}>
              Art for this panel will plug in here once the comic asset set is generated.
            </AppText>
          </View>
        )}

        <PanelAtmosphere accent={accent} width={width} height={height} />

        <Animated.View style={[styles.captionWrap, captionStyle]}>
          <View style={styles.copyText}>
            <AppText variant="bold" style={styles.panelHeadline}>
              {panel.headline}
            </AppText>
            <AppText style={styles.panelBody}>
              {panel.body}
            </AppText>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default function HackathonEvidenceComic({
  comic,
  fallbackUrl = null,
  scrollY,
  viewportHeight,
  contentSectionY,
}: HackathonEvidenceComicProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const [componentY, setComponentY] = useState(0);

  const panelWidth = Math.max(viewportWidth, 320);
  const sectionHeight = Math.max(Math.round(viewportHeight * 0.82), 560);
  const panelGap = Space.md;

  function handleLayout(event: LayoutChangeEvent) {
    setComponentY(event.nativeEvent.layout.y);
  }

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <View style={styles.panels}>
        {comic.panels.map((panel, index) => (
          <EvidencePanel
            key={panel.id}
            panel={panel}
            fallbackUrl={fallbackUrl}
            scrollY={scrollY}
            panelTop={contentSectionY + componentY + index * (sectionHeight + panelGap)}
            width={panelWidth}
            height={sectionHeight}
            viewportHeight={viewportHeight}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: -Space.lg,
  },
  panels: {
    gap: Space.md,
  },
  panel: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: "rgba(95,123,148,0.18)",
    borderRadius: 26,
    overflow: "hidden",
  },
  mediaFrame: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "rgba(9,15,24,0.9)",
  },
  panelImageMotion: {
    ...StyleSheet.absoluteFillObject,
  },
  panelImage: {
    width: "100%",
    height: "100%",
  },
  placeholderMedia: {
    flex: 1,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.xl,
    justifyContent: "flex-end",
    gap: Space.xs,
    backgroundColor: "rgba(5,10,18,0.95)",
  },
  placeholderTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: WHITE,
  },
  placeholderBody: {
    fontSize: 13,
    lineHeight: 19,
    color: WHITE60,
  },
  captionWrap: {
    position: "absolute",
    left: Space.lg,
    right: Space.lg,
    bottom: Space.xl,
  },
  copyText: {
    gap: Space.xs,
  },
  panelHeadline: {
    fontSize: 18,
    lineHeight: 23,
    color: WHITE92,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  panelBody: {
    fontSize: 13,
    lineHeight: 19,
    color: WHITE80,
  },
});
