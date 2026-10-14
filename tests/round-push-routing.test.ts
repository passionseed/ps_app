import { describe, expect, it, vi } from "vitest";
import { pathForResponse, responseId, routeLastResponse } from "../lib/round/pushRouting";

const response = (id: string, url?: string) => ({
  actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
  notification: { request: { identifier: id, content: { data: url ? { url } : {} } } },
});

describe("push taps (5.8)", () => {
  it("maps data.url to an in-app path", () => {
    expect(pathForResponse(response("n1", "passion-seed://round/evidence/abc"))).toBe("/round/evidence/abc");
    expect(pathForResponse(response("n2"))).toBeNull();
  });

  it("routes the tap that cold-started the app once per response id", async () => {
    const handled = new Set<string>();
    const onPath = vi.fn();
    const last = response("n1", "passion-seed://round/squad");
    await routeLastResponse(async () => last, handled, onPath);
    expect(onPath).toHaveBeenCalledWith("/(tabs)/squad");
    // Re-mounts/readiness flips return the same last response: not routed again.
    await routeLastResponse(async () => last, handled, onPath);
    expect(onPath).toHaveBeenCalledTimes(1);
    expect(handled.has(responseId(last))).toBe(true);
  });

  it("ignores missing responses and lookup failures", async () => {
    const onPath = vi.fn();
    await routeLastResponse(async () => null, new Set(), onPath);
    await routeLastResponse(async () => {
      throw new Error("unavailable");
    }, new Set(), onPath);
    expect(onPath).not.toHaveBeenCalled();
  });
});
