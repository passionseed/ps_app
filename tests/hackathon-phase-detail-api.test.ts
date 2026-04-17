import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = Promise<{ data: T; error: { code?: string; message: string } | null }>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const supabaseState = vi.hoisted(() => {
  const phaseSingle = vi.fn<() => QueryResult<Record<string, unknown> | null>>();
  const playlistsOrder = vi.fn<() => QueryResult<Record<string, unknown>[]>>();
  const modulesOrder = vi.fn<() => QueryResult<Record<string, unknown>[]>>();

  const from = vi.fn((table: string) => {
    if (table === "hackathon_program_phases") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: phaseSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_phase_playlists") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: playlistsOrder,
          })),
        })),
      };
    }

    if (table === "hackathon_phase_modules") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: modulesOrder,
          })),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    from,
    phaseSingle,
    playlistsOrder,
    modulesOrder,
    reset() {
      from.mockClear();
      phaseSingle.mockReset();
      playlistsOrder.mockReset();
      modulesOrder.mockReset();
    },
  };
});

const createClient = vi.fn(() => ({
  from: supabaseState.from,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("../lib/runtime-config", () => ({
  getSupabaseConfigErrorMessage: vi.fn(() => null),
  getSupabaseRuntimeConfig: vi.fn(() => ({
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
    anonKey: "anon-test",
  })),
}));

describe("GET /api/hackathon/phase/[phaseId]", () => {
  beforeEach(() => {
    supabaseState.reset();
    createClient.mockClear();
  });

  it("returns the phase with playlists and nested modules plus cache headers", async () => {
    supabaseState.phaseSingle.mockResolvedValue({
      data: {
        id: "phase-1",
        program_id: "program-1",
        slug: "customer-discovery",
        title: "Customer Discovery",
        description: "Validate the problem before building.",
        phase_number: 1,
        status: "released",
        starts_at: null,
        ends_at: null,
        due_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      error: null,
    });
    supabaseState.playlistsOrder.mockResolvedValue({
      data: [
        {
          id: "playlist-1",
          phase_id: "phase-1",
          slug: "discover",
          title: "Discover",
          description: null,
          display_order: 1,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
        {
          id: "playlist-2",
          phase_id: "phase-1",
          slug: "synthesize",
          title: "Synthesize",
          description: null,
          display_order: 2,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.modulesOrder.mockResolvedValue({
      data: [
        {
          id: "module-1",
          playlist_id: "playlist-1",
          seed_id: null,
          path_id: "path-1",
          slug: "interview-users",
          title: "Interview Users",
          summary: null,
          display_order: 1,
          workflow_scope: "individual",
          gate_rule: "complete",
          review_mode: "none",
          required_member_count: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
        {
          id: "module-2",
          playlist_id: "playlist-2",
          seed_id: null,
          path_id: "path-2",
          slug: "cluster-insights",
          title: "Cluster Insights",
          summary: null,
          display_order: 1,
          workflow_scope: "team",
          gate_rule: "all_members_complete",
          review_mode: "mentor",
          required_member_count: 4,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const { GET } = await import("../app/api/hackathon/phase/[phaseId]+api");

    const response = await GET(
      new Request("https://example.test/api/hackathon/phase/phase-1"),
      { phaseId: "phase-1" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=600",
    );
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      phase: expect.objectContaining({ id: "phase-1", title: "Customer Discovery" }),
      playlists: [
        expect.objectContaining({
          id: "playlist-1",
          modules: [expect.objectContaining({ id: "module-1", playlist_id: "playlist-1" })],
        }),
        expect.objectContaining({
          id: "playlist-2",
          modules: [expect.objectContaining({ id: "module-2", playlist_id: "playlist-2" })],
        }),
      ],
    });
  });

  it("returns 404 when the phase does not exist", async () => {
    supabaseState.phaseSingle.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
      },
    });
    supabaseState.playlistsOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    const { GET } = await import("../app/api/hackathon/phase/[phaseId]+api");

    const response = await GET(
      new Request("https://example.test/api/hackathon/phase/missing-phase"),
      { phaseId: "missing-phase" },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Phase not found" });
    expect(supabaseState.modulesOrder).not.toHaveBeenCalled();
  });

  it("starts the phase and playlist queries before awaiting either result", async () => {
    const phaseResult = deferred<{ data: Record<string, unknown> | null; error: { message: string } | null }>();
    const playlistsResult = deferred<{ data: Record<string, unknown>[]; error: { message: string } | null }>();
    const modulesResult = deferred<{ data: Record<string, unknown>[]; error: { message: string } | null }>();

    supabaseState.phaseSingle.mockReturnValue(phaseResult.promise);
    supabaseState.playlistsOrder.mockReturnValue(playlistsResult.promise);
    supabaseState.modulesOrder.mockReturnValue(modulesResult.promise);

    const { GET } = await import("../app/api/hackathon/phase/[phaseId]+api");

    const responsePromise = GET(
      new Request("https://example.test/api/hackathon/phase/phase-1"),
      { phaseId: "phase-1" },
    );

    expect(supabaseState.from).toHaveBeenNthCalledWith(1, "hackathon_program_phases");
    expect(supabaseState.from).toHaveBeenNthCalledWith(2, "hackathon_phase_playlists");
    expect(supabaseState.modulesOrder).not.toHaveBeenCalled();

    phaseResult.resolve({
      data: {
        id: "phase-1",
        program_id: "program-1",
        slug: "phase-1",
        title: "Phase 1",
        description: null,
        phase_number: 1,
        status: "released",
        starts_at: null,
        ends_at: null,
        due_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      error: null,
    });
    playlistsResult.resolve({
      data: [
        {
          id: "playlist-1",
          phase_id: "phase-1",
          slug: "playlist-1",
          title: "Playlist 1",
          description: null,
          display_order: 1,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(supabaseState.from).toHaveBeenNthCalledWith(3, "hackathon_phase_modules");

    modulesResult.resolve({
      data: [],
      error: null,
    });

    const response = await responsePromise;
    expect(response.status).toBe(200);
  });
});
