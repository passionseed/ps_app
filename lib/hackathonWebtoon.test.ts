import { describe, it, expect } from "@jest/globals";
import { parseHackathonWebtoonContent } from "./hackathonWebtoon";

describe("parseHackathonWebtoonContent", () => {
  it("should return null for invalid metadata", () => {
    expect(parseHackathonWebtoonContent(null)).toBeNull();
    expect(parseHackathonWebtoonContent(undefined)).toBeNull();
    expect(parseHackathonWebtoonContent("string")).toBeNull();
    expect(parseHackathonWebtoonContent(123)).toBeNull();
    expect(parseHackathonWebtoonContent([])).toBeNull();
  });

  it("should return null if chunks array is missing or empty", () => {
    expect(parseHackathonWebtoonContent({})).toBeNull();
    expect(parseHackathonWebtoonContent({ variant: "webtoon" })).toBeNull();
    expect(parseHackathonWebtoonContent({ chunks: [] })).toBeNull();
    expect(parseHackathonWebtoonContent({ chunks: "not-an-array" })).toBeNull();
  });

  it("should parse valid metadata correctly", () => {
    const metadata = {
      variant: "webtoon",
      original_width: 1080,
      original_height: 4610,
      chunks: [
        { id: "chunk-2", order: 2, image_key: "image2" },
        { id: "chunk-1", order: 1, image_key: "image1" },
      ],
    };

    const result = parseHackathonWebtoonContent(metadata);

    expect(result).not.toBeNull();
    expect(result?.variant).toBe("webtoon");
    expect(result?.originalWidth).toBe(1080);
    expect(result?.originalHeight).toBe(4610);
    expect(result?.chunks.length).toBe(2);

    // Should sort by order
    expect(result?.chunks[0].id).toBe("chunk-1");
    expect(result?.chunks[0].order).toBe(1);
    expect(result?.chunks[0].imageKey).toBe("image1");

    expect(result?.chunks[1].id).toBe("chunk-2");
    expect(result?.chunks[1].order).toBe(2);
    expect(result?.chunks[1].imageKey).toBe("image2");
  });

  it("should provide default values for missing chunk properties", () => {
    const metadata = {
      chunks: [
        { image_key: "image-only" }, // index 0, missing id and order
      ],
    };

    const result = parseHackathonWebtoonContent(metadata);

    expect(result).not.toBeNull();
    expect(result?.variant).toBe("webtoon"); // Default variant
    expect(result?.chunks[0].id).toBe("chunk-1"); // Generated id based on index + 1
    expect(result?.chunks[0].order).toBe(1); // Generated order based on index + 1
    expect(result?.chunks[0].imageKey).toBe("image-only");
  });

  it("should sort chunks by order, then id fallback", () => {
    const metadata = {
      chunks: [
        { id: "b", order: 1, image_key: "imgB" },
        { id: "c", order: 2, image_key: "imgC" },
        { id: "a", order: 1, image_key: "imgA" },
      ],
    };

    const result = parseHackathonWebtoonContent(metadata);

    expect(result?.chunks.length).toBe(3);
    // Same order (1), so sorts by id: 'a' before 'b'
    expect(result?.chunks[0].id).toBe("a");
    expect(result?.chunks[1].id).toBe("b");
    // Order 2 comes last
    expect(result?.chunks[2].id).toBe("c");
  });
});
