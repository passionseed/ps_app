import type {
  HackathonWebtoonContent,
  HackathonWebtoonChunk,
  HackathonWebtoonChunkMetadata,
} from "../types/hackathon-phase-activity";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeChunk(
  chunk: HackathonWebtoonChunkMetadata,
  index: number,
): HackathonWebtoonChunk {
  return {
    id: toStringValue(chunk.id) ?? `chunk-${index + 1}`,
    order: toNumberValue(chunk.order) ?? index + 1,
    imageKey:
      toStringValue(chunk.image_key) ??
      toStringValue(chunk.imageKey),
    imageUrl:
      toStringValue(chunk.image_url) ??
      toStringValue(chunk.imageUrl),
    width: toNumberValue(chunk.width),
    height: toNumberValue(chunk.height),
  };
}

function isAbsoluteImageUrl(value: string | null): value is string {
  if (!value) return false;
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://") ||
    value.startsWith("/")
  );
}

export function resolveWebtoonChunkUrl(
  chunk: HackathonWebtoonChunk,
  fallbackUrl: string | null,
): string | null {
  if (chunk.imageUrl) {
    return chunk.imageUrl;
  }

  if (isAbsoluteImageUrl(chunk.imageKey)) {
    return chunk.imageKey;
  }

  return fallbackUrl;
}

export function getWebtoonChunkHeight({
  chunk,
  containerWidth,
  fallbackAspectRatio,
  chunkIndex,
  totalChunks,
  panelWidth,
  panelHeight,
  originalHeight,
}: {
  chunk: HackathonWebtoonChunk;
  containerWidth: number;
  fallbackAspectRatio: number;
  chunkIndex?: number;
  totalChunks?: number;
  panelWidth?: number | null;
  panelHeight?: number | null;
  originalHeight?: number | null;
}): number {
  if (!(containerWidth > 0)) {
    return 0;
  }

  const width = chunk.width;
  const height = chunk.height;

  if (width && height && width > 0 && height > 0) {
    return containerWidth / (width / height);
  }

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

export function getWebtoonWindowRange({
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
  if (itemHeights.length === 0) {
    return { startIndex: 0, endIndex: -1 };
  }

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

export function collectWebtoonPrefetchUrls({
  chunks,
  visibleStartIndex,
  visibleEndIndex,
  fallbackUrl,
  beforeCount = 1,
  afterCount = 2,
}: {
  chunks: HackathonWebtoonChunk[];
  visibleStartIndex: number;
  visibleEndIndex: number;
  fallbackUrl: string | null;
  beforeCount?: number;
  afterCount?: number;
}): string[] {
  if (chunks.length === 0 || visibleEndIndex < visibleStartIndex) {
    return [];
  }

  const startIndex = Math.max(0, visibleStartIndex - beforeCount);
  const endIndex = Math.min(chunks.length - 1, visibleEndIndex + afterCount);
  const urls = new Set<string>();

  for (let index = startIndex; index <= endIndex; index += 1) {
    const url = resolveWebtoonChunkUrl(chunks[index], fallbackUrl);
    if (url) {
      urls.add(url);
    }
  }

  return Array.from(urls);
}

export function parseHackathonWebtoonContent(
  metadata: unknown,
): HackathonWebtoonContent | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const chunks = metadata.chunks;
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return null;
  }

  const normalizedChunks = chunks
    .filter(isRecord)
    .map((chunk, index) =>
      normalizeChunk(chunk as HackathonWebtoonChunkMetadata, index),
    )
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.id.localeCompare(right.id);
    });

  if (normalizedChunks.length === 0) {
    return null;
  }

  return {
    variant: toStringValue(metadata.variant) ?? "webtoon",
    originalWidth:
      toNumberValue(metadata.original_width) ??
      toNumberValue(metadata.originalWidth),
    originalHeight:
      toNumberValue(metadata.original_height) ??
      toNumberValue(metadata.originalHeight),
    panelWidth:
      toNumberValue(metadata.panel_width) ??
      toNumberValue(metadata.panelWidth),
    panelHeight:
      toNumberValue(metadata.panel_height) ??
      toNumberValue(metadata.panelHeight),
    chunks: normalizedChunks,
  };
}
