import { describe, expect, it } from "vitest";

import {
  buildExaNewsSearchBody,
  buildExaPeopleSearchBody,
  mapExaNewsResult,
} from "../scripts/lib/exa-search";

describe("Exa search helpers", () => {
  it("builds a news search body using auto search plus the news category", () => {
    expect(buildExaNewsSearchBody("Software Engineer")).toEqual({
      query: "Software Engineer career news 2024 2025",
      type: "auto",
      category: "news",
      numResults: 5,
      startPublishedDate: "2024-01-01T00:00:00.000Z",
      endPublishedDate: "2025-12-31T23:59:59.999Z",
      text: true,
    });
  });

  it("builds a general people search body using auto search", () => {
    expect(buildExaPeopleSearchBody("Doctor")).toEqual({
      query: "famous Doctor professionals notable people",
      type: "auto",
      numResults: 5,
      text: true,
    });
  });

  it("maps either publishedDate or published_date into the stored payload", () => {
    expect(
      mapExaNewsResult({
        title: "Example",
        url: "https://example.com/article",
        publishedDate: "2026-03-23T00:00:00.000Z",
        author: "Example News",
        text: "A".repeat(400),
      }),
    ).toEqual({
      title: "Example",
      url: "https://example.com/article",
      published_date: "2026-03-23T00:00:00.000Z",
      source: "Example News",
      summary: `${"A".repeat(300)}...`,
    });
  });
});
