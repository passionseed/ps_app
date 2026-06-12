/**
 * PathlabWebtoon — Light-theme scrollable webtoon viewer with pinch-to-zoom.
 *
 * Ported from HackathonWebtoon and adapted for PathLab's light
 * design system.  Features:
 *  - Chunked long images for scrollable webtoon strips
 *  - Pinch-to-zoom gesture (zoom in / spring back)
 *  - Virtualized window rendering with configurable overscan
 *  - Image prefetching for adjacent chunks
 *
 * Content type: webtoon
 */

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Space } from "../../lib/theme";
import { IMG } from "../../lib/imageResize";

// ── Types ─────────────────────────────────────────────────────────

export interface WebtoonChunk {
  id: string;
  order: number;
  imageKey: string | null;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface PathlabWebtoonProps {
  chunks: WebtoonChunk[];
  imageUrl: string;
  scrollY?: SharedValue<number>;
  viewportHeight?: number;
  contentSectionY?: number;
  panelWidth?: number | null;
  panelHeight?: number | null;
  originalHeight?: number | null;
}

// ── Light-theme tokens ────────────────────────────────────────────

const WEBTOON_BG = "#F8FAFC";

// ── Rendering constants ───────────────────────────────────────────

const SCROLL_BUCKET_PX = 160;
const OVERSCAN_SCREENS = 1.25;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

// ── Inlined webtoon utility functions ─────────────────────────────
// (Ported from lib/hackathonWebtoon.ts to keep this component self-contained)

function resolveChunkUrl(
  chunk: WebtoonChunk,
  fallbackUrl: string,
): string | null {
  if (chunk.imageUrl) {
    return chunk.imageUrl;
  }

  if (chunk.imageKey) {
    if (
      chunk.imageKey.startsWith("http://") ||
      chunk.imageKey.startsWith("https://") ||
      chunk.imageKey.startsWith("file://") ||
      chunk.imageKey.startsWith("/")
    ) {
      return chunk.imageKey;
    }
  }

  return fallbackUrl;
}

function getChunkHeight({
  chunk,
  containerWidth,
  fallbackAspectRatio,
  chunkIndex,
  totalChunks,
  panelWidth,
  panelHeight,
  originalHeight,
}: {
  chunk: WebtoonChunk;
  containerWidth: number;
  fallbackAspectRatio: number;
  chunkIndex?: number;
  totalChunks?: number;
  panelWidth?: number | null;
  panelHeight?: number | null;
  originalHeight?: number | null;
}): number {
  if (!(containerWidth > 0)) return 0;

  const w = chunk.width;
  const h = chunk.height;

  if (w && h && w > 0 && h > 0) {
    return containerWidth / (w / h);
  }

  // For the last chunk, compute remainder from original height
  if (
    panelWidth &&
    panelHeight &&
    originalHeight &&
    totalChunks &&
    typeof chunkIndex === "number" &&
    totalChunks > 0 &&
    chunkIndex === totalChunks - 1
  ) {
    const consumedHeight = panelHeight * (totalChunks - 1);
    const remainderHeight = originalHeight - consumedHeight;
    if (remainderHeight > 0 && remainderHeight < panelHeight) {
      return containerWidth / (panelWidth / remainderHeight);
    }
  }

  const safeAspectRatio = fallbackAspectRatio > 0 ? fallbackAspectRatio : 1;
  return containerWidth / safeAspectRatio;
}

function getWindowRange({
  itemHeights,
  scrollOffset,
  viewportHeight,
  overscanScreens = 1,
}: {
  itemHeights: number[];
  scrollOffset: number;
  viewportHeight: number;
  overscanScreens?: number;
}): { startIndex: number; endIndex: number } {
  if (itemHeights.length === 0) return { startIndex: 0, endIndex: -1 };

  const overscanPx = Math.max(0, viewportHeight * overscanScreens);
  const windowTop = Math.max(0, scrollOffset - overscanPx);
  const windowBottom = Math.max(windowTop, scrollOffset + viewportHeight + overscanPx);

  let startIndex = 0;
  let endIndex = itemHeights.length - 1;
  let cursor = 0;

  for (let index = 0; index < itemHeights.length; index += 1) {
    const itemTop = cursor;
    const itemBottom = cursor + itemHeights[index];

    if (itemBottom >= windowTop) {
      startIndex = index;
      break;
    }
    cursor = itemBottom;
  }

  cursor = 0;
  for (let index = 0; index < itemHeights.length; index += 1) {
    const itemTop = cursor;
    cursor += itemHeights[index];

    if (itemTop <= windowBottom) {
      endIndex = index;
      continue;
    }
    endIndex = Math.max(startIndex, index - 1);
    break;
  }

  return {
    startIndex,
    endIndex: Math.max(startIndex, Math.min(endIndex, itemHeights.length - 1)),
  };
}

function collectPrefetchUrls({
  chunks,
  visibleStartIndex,
  visibleEndIndex,
  fallbackUrl,
  beforeCount = 2,
  afterCount = 3,
}: {
  chunks: WebtoonChunk[];
  visibleStartIndex: number;
  visibleEndIndex: number;
  fallbackUrl: string;
  beforeCount?: number;
  afterCount?: number;
}): string[] {
  if (chunks.length === 0 || visibleEndIndex < visibleStartIndex) return [];

  const startIndex = Math.max(0, visibleStartIndex - beforeCount);
  const endIndex = Math.min(chunks.length - 1, visibleEndIndex + afterCount);
  const urls = new Set<string>();

  for (let index = startIndex; index <= endIndex; index += 1) {
    const url = resolveChunkUrl(chunks[index], fallbackUrl);
    if (url) urls.add(url);
  }

  return Array.from(urls);
}

// ── Main Component ────────────────────────────────────────────────

export default function PathlabWebtoon({
  chunks,
  imageUrl,
  scrollY,
  viewportHeight = 0,
  contentSectionY = 0,
  panelWidth: panelWidthProp = null,
  panelHeight: panelHeightProp = null,
  originalHeight: originalHeightProp = null,
}: PathlabWebtoonProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const [rootOffsetY, setRootOffsetY] = useState(0);
  const [scrollBucketOffset, setScrollBucketOffset] = useState(0);
  const [visibleRange, setVisibleRange] = useState(() => ({
    startIndex: 0,
    endIndex: Math.min(Math.max(0, chunks.length - 1), 3),
  }));

  const panelWidth = panelWidthProp ?? 1080;
  const panelHeight = panelHeightProp ?? 1374;
  const fallbackAspectRatio =
    panelWidth > 0 && panelHeight > 0 ? panelWidth / panelHeight : 1;

  // Pre-compute every chunk height for window-range calculation
  const chunkHeights = useMemo(
    () =>
      chunks.map((chunk, index) =>
        getChunkHeight({
          chunk,
          containerWidth: viewportWidth,
          fallbackAspectRatio,
          chunkIndex: index,
          totalChunks: chunks.length,
          panelWidth,
          panelHeight,
          originalHeight: originalHeightProp,
        }),
      ),
    [
      fallbackAspectRatio,
      panelHeight,
      panelWidth,
      viewportWidth,
      chunks,
      originalHeightProp,
    ],
  );

  const totalHeight = useMemo(
    () => chunkHeights.reduce((sum, h) => sum + h, 0),
    [chunkHeights],
  );

  // Pinch-to-zoom state
  const scale = useSharedValue(MIN_SCALE);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      originX.value = event.focalX - viewportWidth / 2;
      originY.value = event.focalY - totalHeight / 2;
    })
    .onUpdate((event) => {
      scale.value = clamp(event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      scale.value = withTiming(MIN_SCALE);
    });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: originX.value },
      { translateY: originY.value },
      { scale: scale.value },
      { translateX: -originX.value },
      { translateY: -originY.value },
    ],
  }));

  // Bucket scroll position to avoid thrashing the runOnJS bridge
  useAnimatedReaction(
    () => {
      if (!scrollY) return -1;
      return Math.floor(scrollY.value / SCROLL_BUCKET_PX);
    },
    (bucket, previousBucket) => {
      if (bucket < 0 || bucket === previousBucket) return;
      runOnJS(setScrollBucketOffset)(bucket * SCROLL_BUCKET_PX);
    },
  );

  // Recalculate visible range when scroll position changes
  useEffect(() => {
    if (!(viewportHeight > 0) || !scrollY) {
      setVisibleRange({
        startIndex: 0,
        endIndex: Math.max(0, chunks.length - 1),
      });
      return;
    }

    const nextRange = getWindowRange({
      itemHeights: chunkHeights,
      scrollOffset: Math.max(
        0,
        scrollBucketOffset - (contentSectionY + rootOffsetY),
      ),
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
    chunks.length,
  ]);

  // Prefetch adjacent chunk images
  useEffect(() => {
    const urls = collectPrefetchUrls({
      chunks,
      visibleStartIndex: visibleRange.startIndex,
      visibleEndIndex: visibleRange.endIndex,
      fallbackUrl: imageUrl,
      beforeCount: 2,
      afterCount: 3,
    });

    if (urls.length === 0) return;

    void ExpoImage.prefetch(urls, { cachePolicy: "memory-disk" }).catch(
      () => {},
    );
  }, [
    imageUrl,
    visibleRange.endIndex,
    visibleRange.startIndex,
    chunks,
  ]);

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.View
        style={styles.root}
        onLayout={(event) => setRootOffsetY(event.nativeEvent.layout.y)}
        collapsable={false}
      >
        <Animated.View style={[styles.zoomContainer, zoomStyle]}>
          {chunks.map((chunk, index) => {
            const chunkHeight = chunkHeights[index] ?? 0;
            const rawUrl = resolveChunkUrl(chunk, imageUrl);
            const resizedUrl = rawUrl ? IMG.panel(rawUrl) : null;
            const shouldRender =
              index >= visibleRange.startIndex &&
              index <= visibleRange.endIndex;

            if (!shouldRender || !resizedUrl) {
              return (
                <View
                  key={chunk.id}
                  style={[
                    styles.chunkContainer,
                    { width: viewportWidth, height: chunkHeight },
                  ]}
                />
              );
            }

            return (
              <View
                key={chunk.id}
                style={[
                  styles.chunkContainer,
                  { width: viewportWidth, height: chunkHeight },
                ]}
              >
                <ExpoImage
                  source={{ uri: resizedUrl }}
                  style={styles.chunkImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={`${chunk.id}:${rawUrl}`}
                  transition={120}
                  accessibilityLabel={`Webtoon chunk ${chunk.order}`}
                />
              </View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    marginHorizontal: -Space.lg,
    flexDirection: "column",
    backgroundColor: WEBTOON_BG,
    overflow: "hidden",
  },
  zoomContainer: {
    flexDirection: "column",
    backgroundColor: WEBTOON_BG,
  },
  chunkContainer: {
    overflow: "hidden",
    backgroundColor: WEBTOON_BG,
  },
  chunkImage: {
    width: "100%",
    height: "100%",
  },
});
