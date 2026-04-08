import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
} from "react-native-reanimated";
import { Space } from "../../lib/theme";
import {
  collectWebtoonPrefetchUrls,
  getWebtoonChunkHeight,
  getWebtoonWindowRange,
  resolveWebtoonChunkUrl,
} from "../../lib/hackathonWebtoon";
import type {
  HackathonWebtoonContent,
} from "../../types/hackathon-phase-activity";

type HackathonWebtoonProps = {
  webtoon: HackathonWebtoonContent;
  fallbackUrl?: string | null;
  scrollY?: SharedValue<number>;
  viewportHeight?: number;
  contentSectionY?: number;
};

const SCROLL_BUCKET_PX = 160;
const OVERSCAN_SCREENS = 1.25;

export default function HackathonWebtoon({
  webtoon,
  fallbackUrl = null,
  scrollY,
  viewportHeight = 0,
  contentSectionY = 0,
}: HackathonWebtoonProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const [rootOffsetY, setRootOffsetY] = useState(0);
  const [scrollBucketOffset, setScrollBucketOffset] = useState(0);
  const [visibleRange, setVisibleRange] = useState(() => ({
    startIndex: 0,
    endIndex: Math.min(Math.max(0, webtoon.chunks.length - 1), 3),
  }));

  const panelWidth = webtoon.panelWidth ?? 1080;
  const panelHeight = webtoon.panelHeight ?? 1374;
  const fallbackAspectRatio =
    panelWidth > 0 && panelHeight > 0 ? panelWidth / panelHeight : 1;

  const chunkHeights = useMemo(
    () =>
      webtoon.chunks.map((chunk, index) =>
        getWebtoonChunkHeight({
          chunk,
          containerWidth: viewportWidth,
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
      viewportWidth,
      webtoon.chunks,
      webtoon.originalHeight,
    ],
  );

  useAnimatedReaction(
    () => {
      if (!scrollY) {
        return -1;
      }

      return Math.floor(scrollY.value / SCROLL_BUCKET_PX);
    },
    (bucket, previousBucket) => {
      if (bucket < 0 || bucket === previousBucket) {
        return;
      }

      runOnJS(setScrollBucketOffset)(bucket * SCROLL_BUCKET_PX);
    },
  );

  useEffect(() => {
    if (!(viewportHeight > 0) || !scrollY) {
      setVisibleRange({
        startIndex: 0,
        endIndex: Math.max(0, webtoon.chunks.length - 1),
      });
      return;
    }

    const nextRange = getWebtoonWindowRange({
      itemHeights: chunkHeights,
      scrollOffset: Math.max(0, scrollBucketOffset - (contentSectionY + rootOffsetY)),
      viewportHeight,
      overscanScreens: OVERSCAN_SCREENS,
    });

    setVisibleRange((previousRange) => {
      if (
        previousRange.startIndex === nextRange.startIndex &&
        previousRange.endIndex === nextRange.endIndex
      ) {
        return previousRange;
      }

      return nextRange;
    });
  }, [
    chunkHeights,
    contentSectionY,
    rootOffsetY,
    scrollBucketOffset,
    scrollY,
    viewportHeight,
    webtoon.chunks.length,
  ]);

  useEffect(() => {
    const urls = collectWebtoonPrefetchUrls({
      chunks: webtoon.chunks,
      visibleStartIndex: visibleRange.startIndex,
      visibleEndIndex: visibleRange.endIndex,
      fallbackUrl,
      beforeCount: 2,
      afterCount: 3,
    });

    if (urls.length === 0) {
      return;
    }

    void ExpoImage.prefetch(urls, { cachePolicy: "memory-disk" }).catch(() => {});
  }, [fallbackUrl, visibleRange.endIndex, visibleRange.startIndex, webtoon.chunks]);

  return (
    <View
      style={styles.root}
      onLayout={(event) => setRootOffsetY(event.nativeEvent.layout.y)}
    >
      {webtoon.chunks.map((chunk, index) => {
        const chunkHeight = chunkHeights[index] ?? 0;
        const imageUrl = resolveWebtoonChunkUrl(chunk, fallbackUrl);
        const shouldRenderImage =
          index >= visibleRange.startIndex && index <= visibleRange.endIndex;

        if (!shouldRenderImage || !imageUrl) {
          return (
            <View
              key={chunk.id}
              style={[styles.chunkContainer, { width: viewportWidth, height: chunkHeight }]}
            />
          );
        }

        return (
          <View
            key={chunk.id}
            style={[styles.chunkContainer, { width: viewportWidth, height: chunkHeight }]}
          >
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.chunkImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`${chunk.id}:${imageUrl}`}
              transition={120}
              accessibilityLabel={`Webtoon chunk ${chunk.order}`}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: -Space.lg,
    flexDirection: "column",
    backgroundColor: "#000",
  },
  chunkContainer: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
  chunkImage: {
    width: "100%",
    height: "100%",
  },
});
