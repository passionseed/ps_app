import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  const insert = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "hackathon_journey_alien_clicks") {
      return {
        insert,
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    from,
    insert,
    reset() {
      from.mockClear();
      insert.mockReset();
    },
  };
});

const readHackathonParticipant = vi.fn();
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("../lib/hackathon-mode", () => ({
  readHackathonParticipant,
}));

describe("trackHackathonAlienButtonClick", () => {
  beforeEach(() => {
    supabaseState.reset();
    readHackathonParticipant.mockReset();
    warnSpy.mockClear();
    supabaseState.insert.mockResolvedValue({ error: null });
  });

  it("logs the click against the current participant", async () => {
    readHackathonParticipant.mockResolvedValue({
      id: "participant-1",
      name: "Beam",
    });

    const { trackHackathonAlienButtonClick } = await import(
      "../lib/hackathonAlienClicks"
    );

    await trackHackathonAlienButtonClick({
      teamId: "team-1",
      targetUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    expect(supabaseState.from).toHaveBeenCalledWith(
      "hackathon_journey_alien_clicks",
    );
    expect(supabaseState.insert).toHaveBeenCalledWith({
      participant_id: "participant-1",
      participant_name: "Beam",
      team_id: "team-1",
      source: "journey_header_alien_button",
      target_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("skips logging when there is no active hackathon participant", async () => {
    readHackathonParticipant.mockResolvedValue(null);

    const { trackHackathonAlienButtonClick } = await import(
      "../lib/hackathonAlienClicks"
    );

    await trackHackathonAlienButtonClick({
      teamId: "team-1",
      targetUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    expect(supabaseState.from).not.toHaveBeenCalled();
  });
});
