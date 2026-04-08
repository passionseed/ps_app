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
      toStringValue(chunk.image_url) ??
      toStringValue(chunk.imageUrl) ??
      toStringValue(chunk.image_key) ??
      toStringValue(chunk.imageKey),
  };
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
