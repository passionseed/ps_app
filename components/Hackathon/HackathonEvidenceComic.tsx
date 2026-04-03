import { useEffect, useMemo } from "react";
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { parseHackathonComicContent } from "../../lib/hackathonComic";
import { Space } from "../../lib/theme";
import type {
  HackathonComicPanel,
  HackathonPhaseActivityContent,
} from "../../types/hackathon-phase-activity";

const CARD_BG = "rgba(13,18,25,0.95)";
const PANEL_BG = "rgba(7,12,20,0.94)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE80 = "rgba(255,255,255,0.8)";
const WHITE60 = "rgba(255,255,255,0.6)";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const AMBER = "#E7B75E";
const VIOLET = "#98A3FF";
const PANEL_MEDIA_HEIGHT = 164;

type HackathonEvidenceComicProps = {
  item: HackathonPhaseActivityContent;
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

function resolvePanelImageUrl(
  panel: HackathonComicPanel,
  fallbackUrl: string | null,
): string | null {
  if (!panel.imageKey) return fallbackUrl;
  if (
    panel.imageKey.startsWith("http://") ||
    panel.imageKey.startsWith("https://") ||
    panel.imageKey.startsWith("file://") ||
    panel.imageKey.startsWith("/")
  ) {
    return panel.imageKey;
  }

  return fallbackUrl;
}

function PanelAtmosphere({
  index,
  accent,
  width,
  height,
  progress,
}: {
  index: number;
  accent: string;
  width: number;
  height: number;
  progress: SharedValue<number>;
}) {
  const glowA = useDerivedValue(() =>
    width * (0.18 + 0.08 * Math.sin(progress.value * Math.PI + index * 0.5)),
  );
  const glowB = useDerivedValue(() =>
    width * (0.84 + 0.06 * Math.cos(progress.value * Math.PI + index * 0.35)),
  );
  const scanX = useDerivedValue(() => width * (-0.35 + progress.value * 1.5));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["rgba(5,10,18,0.05)", "rgba(8,18,32,0.24)", "rgba(3,7,14,0.08)"]}
        />
      </Rect>

      <Group opacity={0.95}>
        <Circle cx={glowA} cy={height * 0.28} r={height * 0.44} color={`${accent}2E`}>
          <Blur blur={48} />
        </Circle>
        <Circle cx={glowB} cy={height * 0.76} r={height * 0.36} color="rgba(101,171,252,0.18)">
          <Blur blur={56} />
        </Circle>
        <Rect x={scanX} y={0} width={width * 0.18} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width * 0.18, 0)}
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}

function EvidencePanel({
  index,
  panel,
  fallbackUrl,
  progress,
  width,
}: {
  index: number;
  panel: HackathonComicPanel;
  fallbackUrl: string | null;
  progress: SharedValue<number>;
  width: number;
}) {
  const accent = accentColor(panel.accent);
  const imageUrl = resolvePanelImageUrl(panel, fallbackUrl);

  return (
    <View style={[styles.panel, { width, alignSelf: "center" }]}>
      <View style={styles.mediaFrame}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.panelImage}
            resizeMode="cover"
            accessibilityLabel={panel.headline}
          />
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

        <PanelAtmosphere
          index={index}
          accent={accent}
          width={width}
          height={PANEL_MEDIA_HEIGHT}
          progress={progress}
        />

        <View style={[styles.panelTag, { borderColor: `${accent}66`, backgroundColor: `${accent}24` }]}>
          <AppText style={[styles.panelTagText, { color: accent }]}>
            Panel {index + 1}
          </AppText>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <View style={[styles.accentRule, { backgroundColor: accent }]} />
        <View style={styles.copyText}>
          <AppText variant="bold" style={styles.panelHeadline}>
            {panel.headline}
          </AppText>
          <AppText style={styles.panelBody}>
            {panel.body}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export default function HackathonEvidenceComic({
  item,
}: HackathonEvidenceComicProps) {
  const { width } = useWindowDimensions();
  const comic = useMemo(
    () => parseHackathonComicContent(item.metadata, item.content_title, item.content_body),
    [item.content_body, item.content_title, item.metadata],
  );
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [progress]);

  if (!comic) {
    return (
      <View style={styles.root}>
        {item.content_title ? (
          <AppText variant="bold" style={styles.title}>
            {item.content_title}
          </AppText>
        ) : null}
        <AppText style={styles.description}>
          {item.content_body ?? "Comic content is not available yet."}
        </AppText>
      </View>
    );
  }

  const panelWidth = Math.max(width - Space.lg * 4, 240);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText style={styles.kicker}>Evidence Comic</AppText>
        {item.content_title ? (
          <AppText variant="bold" style={styles.title}>
            {item.content_title}
          </AppText>
        ) : null}
        <AppText style={styles.description}>
          {item.content_body ??
            "See how raw signals turn into a validated pain point with a clear target user."}
        </AppText>
      </View>

      <View style={styles.panels}>
        {comic.panels.map((panel, index) => (
          <EvidencePanel
            key={panel.id}
            index={index}
            panel={panel}
            fallbackUrl={item.content_url}
            progress={progress}
            width={panelWidth}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: Space.lg,
    gap: Space.lg,
    overflow: "hidden",
  },
  header: {
    gap: Space.sm,
  },
  kicker: {
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(145,196,227,0.58)",
    textTransform: "uppercase",
    letterSpacing: 2.2,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    color: WHITE,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: WHITE60,
  },
  panels: {
    gap: Space.md,
  },
  panel: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: "rgba(95,123,148,0.18)",
    borderRadius: 18,
    padding: Space.sm,
    gap: Space.md,
    overflow: "hidden",
  },
  mediaFrame: {
    height: PANEL_MEDIA_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(9,15,24,0.9)",
  },
  panelImage: {
    ...StyleSheet.absoluteFillObject,
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
  panelTag: {
    position: "absolute",
    top: Space.sm,
    left: Space.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  panelTagText: {
    fontSize: 10,
    lineHeight: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  copyBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
    paddingHorizontal: 2,
  },
  accentRule: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 999,
  },
  copyText: {
    flex: 1,
    gap: Space.xs,
  },
  panelHeadline: {
    fontSize: 17,
    lineHeight: 22,
    color: WHITE,
  },
  panelBody: {
    fontSize: 13,
    lineHeight: 20,
    color: WHITE80,
  },
});
