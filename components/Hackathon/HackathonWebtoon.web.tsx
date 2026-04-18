import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  getWebtoonChunkHeight,
  resolveWebtoonChunkUrl,
} from "../../lib/hackathonWebtoon";
import type {
  HackathonWebtoonContent,
} from "../../types/hackathon-phase-activity";

type HackathonWebtoonProps = {
  webtoon: HackathonWebtoonContent;
  fallbackUrl?: string | null;
  scrollY?: { value: number };
  viewportHeight?: number;
  contentSectionY?: number;
};

const MAX_WEBTOON_WIDTH = 480;

export default function HackathonWebtoon({
  webtoon,
  fallbackUrl = null,
}: HackathonWebtoonProps) {
  const { width: viewportWidth } = useWindowDimensions();

  const contentWidth = Math.min(viewportWidth, MAX_WEBTOON_WIDTH);
  const panelWidth = webtoon.panelWidth ?? 1080;
  const panelHeight = webtoon.panelHeight ?? 1374;
  const fallbackAspectRatio =
    panelWidth > 0 && panelHeight > 0 ? panelWidth / panelHeight : 1;

  const chunkHeights = useMemo(
    () =>
      webtoon.chunks.map((chunk, index) =>
        getWebtoonChunkHeight({
          chunk,
          containerWidth: contentWidth,
          fallbackAspectRatio,
          chunkIndex: index,
          totalChunks: webtoon.chunks.length,
          panelWidth,
          panelHeight,
          originalHeight: webtoon.originalHeight,
        }),
      ),
    [
      fallbackAspectRatio,
      panelHeight,
      panelWidth,
      contentWidth,
      webtoon.chunks,
      webtoon.originalHeight,
    ],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.container, { width: contentWidth }]}>
        {webtoon.chunks.map((chunk, index) => {
          const chunkHeight = chunkHeights[index] ?? 0;
          const imageUrl = resolveWebtoonChunkUrl(chunk, fallbackUrl);

          if (!imageUrl) {
            return (
              <View
                key={chunk.id}
                style={[styles.chunkContainer, { width: contentWidth, height: chunkHeight }]}
              />
            );
          }

          return (
            <View
              key={chunk.id}
              style={[styles.chunkContainer, { width: contentWidth, height: chunkHeight }]}
            >
              <ExpoImage
                source={{ uri: imageUrl }}
                style={styles.chunkImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
                accessibilityLabel={`Webtoon chunk ${chunk.order}`}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#000",
    overflow: "hidden",
    alignItems: "center",
  },
  container: {
    flexDirection: "column",
    backgroundColor: "#000",
    maxWidth: MAX_WEBTOON_WIDTH,
    width: "100%",
  },
  chunkContainer: {
    overflow: "hidden",
    backgroundColor: "#000",
    alignSelf: "center",
  },
  chunkImage: {
    width: "100%",
    height: "100%",
  },
});
