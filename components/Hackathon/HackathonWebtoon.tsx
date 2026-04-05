import React from "react";
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Space } from "../../lib/theme";
import type {
  HackathonWebtoonContent,
  HackathonWebtoonChunk,
} from "../../types/hackathon-phase-activity";

type HackathonWebtoonProps = {
  webtoon: HackathonWebtoonContent;
  fallbackUrl?: string | null;
};

const WEBTOON_IMAGE_ASSETS: Record<string, ImageSourcePropType> = {
  "webtoon1-1": require("../../assets/images/hackathon-phase1-comic/webtoon1-1.png"),
  "webtoon1-2": require("../../assets/images/hackathon-phase1-comic/webtoon1-2.png"),
  "webtoon1-3": require("../../assets/images/hackathon-phase1-comic/webtoon1-3.png"),
  "webtoon1-4": require("../../assets/images/hackathon-phase1-comic/webtoon1-4.png"),
};

function resolveChunkImageSource(
  chunk: HackathonWebtoonChunk,
  fallbackUrl: string | null,
): ImageSourcePropType | null {
  if (chunk.imageKey && WEBTOON_IMAGE_ASSETS[chunk.imageKey]) {
    return WEBTOON_IMAGE_ASSETS[chunk.imageKey];
  }

  if (!chunk.imageKey) {
    return fallbackUrl ? { uri: fallbackUrl } : null;
  }

  if (
    chunk.imageKey.startsWith("http://") ||
    chunk.imageKey.startsWith("https://") ||
    chunk.imageKey.startsWith("file://") ||
    chunk.imageKey.startsWith("/")
  ) {
    return { uri: chunk.imageKey };
  }

  return fallbackUrl ? { uri: fallbackUrl } : null;
}

function WebtoonChunk({
  chunk,
  fallbackUrl,
  width,
}: {
  chunk: HackathonWebtoonChunk;
  fallbackUrl: string | null;
  width: number;
}) {
  const imageSource = resolveChunkImageSource(chunk, fallbackUrl);

  if (!imageSource) {
    return null;
  }

  // Use a default aspect ratio for the webtoon slices (1080x1152) if we don't know the exact one.
  // webtoon1-4 is 1080x1154, which is extremely close (0.9375 vs 0.9358), so 1080/1152 works fine visually
  // as React Native 'cover' or 'stretch' can handle subpixel differences.
  const aspectRatio = 1080 / 1152;
  const chunkHeight = width / aspectRatio;

  return (
    <View style={[styles.chunkContainer, { width, height: chunkHeight }]}>
      <Image
        source={imageSource}
        style={[styles.chunkImage, { width, height: chunkHeight }]}
        resizeMode="cover"
        accessibilityLabel={`Webtoon chunk ${chunk.order}`}
      />
    </View>
  );
}

export default function HackathonWebtoon({
  webtoon,
  fallbackUrl = null,
}: HackathonWebtoonProps) {
  const { width: viewportWidth } = useWindowDimensions();

  return (
    <View style={styles.root}>
      {webtoon.chunks.map((chunk) => (
        <WebtoonChunk
          key={chunk.id}
          chunk={chunk}
          fallbackUrl={fallbackUrl}
          width={viewportWidth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Negative horizontal margin to go edge-to-edge if the parent has padding
    marginHorizontal: -Space.lg,
    flexDirection: "column",
    backgroundColor: "#000",
  },
  chunkContainer: {
    overflow: "hidden",
  },
  chunkImage: {
    // Images are stacked vertically without gaps
  },
});
