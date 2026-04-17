import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidateHackathonHomeCache = vi.fn();
const invalidateTeamCache = vi.fn();
const invalidatePhaseCache = vi.fn();
const invalidateTeamMembershipCache = vi.fn();

vi.mock("../lib/prefetch", () => ({
  invalidateHackathonHomeCache,
  invalidateTeamCache,
  invalidatePhaseCache,
  invalidateTeamMembershipCache,
}));

function createWebhookRequest(payload: Record<string, unknown>) {
  return new Request("https://example.com/api/hackathon/webhook/cache-invalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("hackathon cache invalidate webhook", () => {
  beforeEach(() => {
    invalidateHackathonHomeCache.mockReset();
    invalidateTeamCache.mockReset();
    invalidatePhaseCache.mockReset();
    invalidateTeamMembershipCache.mockReset();
    vi.restoreAllMocks();
  });

  it("invalidates the matching team cache for hackathon_teams rows", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");

    const response = await POST(
      createWebhookRequest({
        type: "UPDATE",
        schema: "public",
        table: "hackathon_teams",
        record: { id: "team-123" },
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateTeamCache).toHaveBeenCalledWith("team-123");
    expect(invalidatePhaseCache).not.toHaveBeenCalled();
  });

  it("invalidates the matching phase cache for hackathon_program_phases rows", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");

    const response = await POST(
      createWebhookRequest({
        type: "INSERT",
        schema: "public",
        table: "hackathon_program_phases",
        record: { id: "phase-456" },
      })
    );

    expect(response.status).toBe(200);
    expect(invalidatePhaseCache).toHaveBeenCalledWith("phase-456");
  });

  it("invalidates team and membership caches for hackathon_team_members rows", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");

    const response = await POST(
      createWebhookRequest({
        type: "DELETE",
        schema: "public",
        table: "hackathon_team_members",
        record: { team_id: "team-789", participant_id: "participant-001" },
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateTeamCache).toHaveBeenCalledWith("team-789");
    expect(invalidateTeamMembershipCache).toHaveBeenCalledWith("participant-001");
  });

  it("invalidates the hackathon home bundle for hackathon_programs rows", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");

    const response = await POST(
      createWebhookRequest({
        type: "UPDATE",
        schema: "public",
        table: "hackathon_programs",
        record: { id: "program-111" },
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateHackathonHomeCache).toHaveBeenCalledTimes(1);
  });

  it("ignores non-hackathon tables and still returns ok", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");

    const response = await POST(
      createWebhookRequest({
        type: "UPDATE",
        schema: "public",
        table: "profiles",
        record: { id: "profile-1" },
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateHackathonHomeCache).not.toHaveBeenCalled();
    expect(invalidateTeamCache).not.toHaveBeenCalled();
    expect(invalidatePhaseCache).not.toHaveBeenCalled();
    expect(invalidateTeamMembershipCache).not.toHaveBeenCalled();
  });

  it("logs invalidation failures without failing the webhook", async () => {
    const { POST } = await import("../app/api/hackathon/webhook/cache-invalidate+api");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    invalidateTeamCache.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const response = await POST(
      createWebhookRequest({
        type: "UPDATE",
        schema: "public",
        table: "hackathon_teams",
        record: { id: "team-123" },
      })
    );

    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalled();
  });
});
