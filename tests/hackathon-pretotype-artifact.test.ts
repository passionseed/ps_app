import { describe, expect, it } from "vitest";
import { getPretotypeArtifactImageUri, isPretotypeImageUri } from "../lib/hackathonPretotypeArtifact";

describe("pretotype artifact image handling", () => {
  it("does not treat a bare image filename as a renderable image URI", () => {
    expect(isPretotypeImageUri("asd.png")).toBe(false);
    expect(getPretotypeArtifactImageUri("asd.png")).toBe(null);
  });

  it("treats absolute image URLs and picked file URIs as renderable image URIs", () => {
    expect(isPretotypeImageUri("https://cdn.passionseed.org/file/pseed-dev/pretotype.png")).toBe(true);
    expect(isPretotypeImageUri("file:///tmp/pretotype.jpg")).toBe(true);
    expect(isPretotypeImageUri("blob:http://localhost/pretotype")).toBe(true);
  });
});
