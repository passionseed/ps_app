/**
 * PathlabComic — Light-theme cinematic infographic comic panels.
 *
 * Ported from HackathonEvidenceComic and adapted for PathLab's light
 * glass-morphism design system.  Renders full-viewport panels with:
 *  - Skia gradient atmosphere (warm, light pastels)
 *  - Parallax image motion via Reanimated
 *  - Overscan virtualized rendering for performance
 *  - Text overlays with soft shadows for light backgrounds
 *
 * Content type: infographic_comic
 */

import { useState } from "react";
import {
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space, Text as ThemeText } from "../../lib/theme";
import { IMG } from "../../lib/imageResize";

// ── Types ─────────────────────────────────────────────────────────

export interface InfographicComicPanel {
  id: string;
  order: number;
  headline: string;
  body: string;
  imageKey: string | null;
  accent: string;
}

export interface PathlabComicProps {
  panels: InfographicComicPanel[];
  fallbackUrl?: string | null;
  scrollY: SharedValue<number>;
  viewportHeight: number;
  contentSectionY: number;
}

// ── Light-theme design tokens ─────────────────────────────────────

const PANEL_BG = "#FFFFFF";
const PANEL_BORDER = "rgba(0,0,0,0.06)";
const MEDIA_BG = "#F1F5F9";
const TEXT_PRIMARY = ThemeText.primary; // #111827
const TEXT_SECONDARY = ThemeText.secondary; // #4B5563
const TEXT_MUTED = ThemeText.tertiary; // #9CA3AF

// PathLab accent palette
const ACCENT_GREEN = "#10B981";
const ACCENT_BLUE = "#3B82F6";
const ACCENT_AMBER = "#F59E0B";
const ACCENT_PURPLE = "#8B5CF6";

// ── Helpers ───────────────────────────────────────────────────────

function accentColor(accent: string): string {
  switch (accent) {
    case "amber":
    case "orange":
      return ACCENT_AMBER;
    case "blue":
      return ACCENT_BLUE;
    case "violet":
    case "purple":
      return ACCENT_PURPLE;
    default:
      return ACCENT_GREEN;
  }
}

function resolvePanelImageSource(
  panel: InfographicComicPanel,
  fallbackUrl: string | null,
): string | null {
  if (panel.imageKey) {
    if (
      panel.imageKey.startsWith("http://") ||
      panel.imageKey.startsWith("https://") ||
      panel.imageKey.startsWith("file://") ||
      panel.imageKey.startsWith("/")
    ) {
      return panel.imageKey;
    }
  }
  return fallbackUrl || null;
}

/**
 * Compute parallax phase indicator for a panel relative to the viewport
 * centre.  Returns 0 when the panel centre aligns with the viewport centre,
 * negative when above, positive when below.
 */
function getComicPanelPhase({
  scrollY,
  panelTop,
  panelHeight,
  viewportHeight,
}: {
  scrollY: number;
  panelTop: number;
  panelHeight: number;
  viewportHeight: number;
}): number {
  "worklet";

  const panelCenter = panelTop + panelHeight / 2;
  const viewportCenter = scrollY + viewportHeight / 2;
  const normalizer = Math.max(viewportHeight * 0.75, 1);

  return (panelCenter - viewportCenter) / normalizer;
}

// ── Skia Atmosphere ───────────────────────────────────────────────

/**
 * Light-themed atmospheric overlay using Skia gradients.
 * Replaces the dark bioluminescent Hackathon version with warm,
 * pastel-tinted accents against a white panel background.
 */
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
      {/* Soft diagonal gradient base */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[
            "rgba(255,255,255,0.3)",
            "rgba(248,250,252,0.15)",
            "rgba(241,245,249,0.3)",
          ]}
        />
      </Rect>

      <Group opacity={0.65}>
        {/* Accent glow — top-left */}
        <Circle
          cx={width * 0.16}
          cy={height * 0.24}
          r={height * 0.22}
          color={`${accent}14`}
        />
        {/* Secondary glow — bottom-right */}
        <Circle
          cx={width * 0.84}
          cy={height * 0.72}
          r={height * 0.18}
          color={`${ACCENT_BLUE}10`}
        />
        {/* Subtle bottom vignette for text readability */}
        <Rect x={0} y={height * 0.5} width={width} height={height * 0.5}>
          <LinearGradient
            start={vec(0, height * 0.5)}
            end={vec(0, height)}
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.55)",
            ]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}

// ── Individual Comic Panel ────────────────────────────────────────

/** Viewports of overscan before unloading a panel */
const OVERSCAN = 1.5;

function InfographicPanel({
  panel,
  index,
  fallbackUrl,
  scrollY,
  panelTop,
  width,
  height,
  viewportHeight,
}: {
  panel: InfographicComicPanel;
  index: number;
  fallbackUrl: string | null;
  scrollY: SharedValue<number>;
  panelTop: number;
  width: number;
  height: number;
  viewportHeight: number;
}) {
  const accent = accentColor(panel.accent);
  const imageSource = IMG.panel(resolvePanelImageSource(panel, fallbackUrl));

  // First panel starts visible to avoid flash of empty content
  const [visible, setVisible] = useState(index === 0);

  useAnimatedReaction(
    () => {
      const top = panelTop - scrollY.value;
      const bottom = top + height;
      const buffer = viewportHeight * OVERSCAN;
      return bottom > -buffer && top < viewportHeight + buffer;
    },
    (isVisible, prev) => {
      if (isVisible !== prev) runOnJS(setVisible)(isVisible);
    },
    [panelTop, height, viewportHeight],
  );

  const imageStyle = useAnimatedStyle(() => {
    const phase = getComicPanelPhase({
      scrollY: scrollY.value,
      panelTop,
      panelHeight: height,
      viewportHeight,
    });

    return {
      transform: [
        {
          translateX: interpolate(
            phase,
            [-1, 0, 1],
            [-10, 0, 14],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            phase,
            [-1, 0, 1],
            [-10, 0, 18],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            Math.abs(phase),
            [0, 1],
            [1, 1.06],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const captionStyle = useAnimatedStyle(() => {
    const phase = getComicPanelPhase({
      scrollY: scrollY.value,
      panelTop,
      panelHeight: height,
      viewportHeight,
    });

    return {
      opacity: interpolate(
        Math.abs(phase),
        [0, 0.95],
        [1, 0.8],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            phase,
            [-1, 0, 1],
            [-8, 0, 10],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View style={[styles.panel, { width, height }]}>
      {visible ? (
        <View style={styles.mediaFrame}>
          {imageSource ? (
            <Animated.View style={[styles.panelImageMotion, imageStyle]}>
              <ExpoImage
                source={imageSource}
                style={styles.panelImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={imageSource}
                accessibilityLabel={panel.headline}
              />
            </Animated.View>
          ) : (
            <View style={styles.placeholderMedia}>
              <AppText variant="bold" style={styles.placeholderTitle}>
                Infographic Snapshot
              </AppText>
              <AppText style={styles.placeholderBody}>
                Art for this panel will appear here once the comic asset set
                is generated.
              </AppText>
            </View>
          )}

          <PanelAtmosphere accent={accent} width={width} height={height} />

          <Animated.View style={[styles.captionWrap, captionStyle]}>
            <View style={styles.copyText}>
              <AppText variant="bold" style={styles.panelHeadline}>
                {panel.headline}
              </AppText>
              <AppText style={styles.panelBody}>{panel.body}</AppText>
            </View>
          </Animated.View>
        </View>
      ) : (
        <View style={styles.mediaFrame} />
      )}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function PathlabComic({
  panels,
  fallbackUrl = null,
  scrollY,
  viewportHeight,
  contentSectionY,
}: PathlabComicProps) {
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
        {panels.map((panel, index) => (
          <InfographicPanel
            key={panel.id}
            panel={panel}
            index={index}
            fallbackUrl={fallbackUrl}
            scrollY={scrollY}
            panelTop={
              contentSectionY + componentY + index * (sectionHeight + panelGap)
            }
            width={panelWidth}
            height={sectionHeight}
            viewportHeight={viewportHeight}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

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
    borderColor: PANEL_BORDER,
    borderRadius: 26,
    overflow: "hidden",
    // Soft card shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  mediaFrame: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: MEDIA_BG,
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
    backgroundColor: "#F8FAFC",
  },
  placeholderTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: TEXT_PRIMARY,
  },
  placeholderBody: {
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_MUTED,
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
    color: TEXT_PRIMARY,
    // Soft light-bg shadow for readability when over bright images
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  panelBody: {
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_SECONDARY,
  },
});
