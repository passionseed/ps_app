import { describe, it, expect } from "vitest";
import {
  collectWebtoonPrefetchUrls,
  getWebtoonChunkHeight,
  getWebtoonWindowRange,
  parseHackathonWebtoonContent,
} from "../lib/hackathonWebtoon";

describe("hackathon webtoon helpers", () => {
  it("returns null for invalid metadata", () => {
    expect(parseHackathonWebtoonContent(null)).toBeNull();
    expect(parseHackathonWebtoonContent(undefined)).toBeNull();
    expect(parseHackathonWebtoonContent("string")).toBeNull();
    expect(parseHackathonWebtoonContent(123)).toBeNull();
    expect(parseHackathonWebtoonContent([])).toBeNull();
  });

  it("returns null if chunks array is missing or empty", () => {
    expect(parseHackathonWebtoonContent({})).toBeNull();
    expect(parseHackathonWebtoonContent({ variant: "webtoon" })).toBeNull();
    expect(parseHackathonWebtoonContent({ chunks: [] })).toBeNull();
    expect(parseHackathonWebtoonContent({ chunks: "not-an-array" })).toBeNull();
  });

  it("parses metadata without collapsing image urls into image keys", () => {
    const metadata = {
      variant: "webtoon",
      original_width: 1080,
      original_height: 4610,
      chunks: [
        { id: "chunk-2", order: 2, image_key: "image2", image_url: "https://cdn.test/chunk-2.png", width: 1080, height: 1280 },
        { id: "chunk-1", order: 1, image_key: "image1", image_url: "https://cdn.test/chunk-1.png", width: 1080, height: 1280 },
      ],
    };

    const result = parseHackathonWebtoonContent(metadata);

    expect(result).not.toBeNull();
    expect(result?.chunks[0]).toEqual({
      id: "chunk-1",
      order: 1,
      imageKey: "image1",
      imageUrl: "https://cdn.test/chunk-1.png",
      width: 1080,
      height: 1280,
    });
    expect(result?.chunks[1]).toEqual({
      id: "chunk-2",
      order: 2,
      imageKey: "image2",
      imageUrl: "https://cdn.test/chunk-2.png",
      width: 1080,
      height: 1280,
    });
  });

  it("uses per-chunk dimensions over shared panel aspect ratio", () => {
    const height = getWebtoonChunkHeight({
      chunk: {
        id: "chunk-1",
        order: 1,
        imageKey: "image-1",
        imageUrl: "https://cdn.test/chunk-1.png",
        width: 900,
        height: 1800,
      },
      containerWidth: 300,
      fallbackAspectRatio: 4 / 5,
    });

    expect(height).toBe(600);
  });

  it("calculates a virtualized window with overscan", () => {
    const range = getWebtoonWindowRange({
      itemHeights: [400, 400, 400, 400, 400],
      scrollOffset: 450,
      viewportHeight: 500,
      overscanScreens: 0.5,
    });

    expect(range).toEqual({ startIndex: 0, endIndex: 3 });
  });

  it("collects nearby prefetch urls around the visible window", () => {
    const urls = collectWebtoonPrefetchUrls({
      chunks: [
        { id: "c1", order: 1, imageKey: "chunk-1", imageUrl: "https://cdn.test/1.png", width: null, height: null },
        { id: "c2", order: 2, imageKey: "chunk-2", imageUrl: null, width: null, height: null },
        { id: "c3", order: 3, imageKey: "https://cdn.test/3.png", imageUrl: null, width: null, height: null },
        { id: "c4", order: 4, imageKey: "chunk-4", imageUrl: "https://cdn.test/4.png", width: null, height: null },
      ],
      visibleStartIndex: 1,
      visibleEndIndex: 2,
      fallbackUrl: "https://cdn.test/fallback.png",
      beforeCount: 1,
      afterCount: 1,
    });

    expect(urls).toEqual([
      "https://cdn.test/1.png",
      "https://cdn.test/fallback.png",
      "https://cdn.test/3.png",
      "https://cdn.test/4.png",
    ]);
  });
});
