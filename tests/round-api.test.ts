import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { rpc: mocked.rpc } }));

import { callRound, mapTransportError, needsSignIn, parseEnvelope, roundApi } from "../lib/round/api";

beforeEach(() => {
  mocked.rpc.mockReset();
});

describe("round RPC envelope mapping (X5)", () => {
  it("returns data and request_id on success", async () => {
    mocked.rpc.mockResolvedValue({ data: { ok: true, data: { entry_id: "e" }, request_id: "r1" }, error: null, status: 200 });
    const result = await callRound("shift_round_join", {});
    expect(result).toEqual({ ok: true, data: { entry_id: "e" }, request_id: "r1" });
  });

  it("passes business errors through with field and retry_after", async () => {
    mocked.rpc.mockResolvedValue({
      data: { ok: false, error: { code: "rate_limited", category: "retryable", field: null, retry_after: 120, details: {} }, request_id: "r2" },
      error: null,
      status: 200,
    });
    const result = await callRound("shift_round_submit_evidence", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: "rate_limited", category: "retryable", retry_after: 120, request_id: "r2" });
    }
  });

  it("maps a missing function (PGRST202) and 404 to unavailable, never to not enrolled", async () => {
    mocked.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function" }, status: 404 });
    const missing = await callRound("shift_round_home", {});
    expect(!missing.ok && missing.error).toMatchObject({ code: "unavailable", category: "unavailable" });
    expect(!missing.ok && missing.error.code).not.toBe("entry_not_found");
    expect(mapTransportError({ message: "Not found" }, 404).category).toBe("unavailable");
  });

  it("maps 401 / JWT errors to unauthenticated so the app signs in again with drafts kept (E14)", async () => {
    mocked.rpc.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" }, status: 401 });
    const result = await callRound("shift_round_home", {});
    expect(!result.ok && result.error.category).toBe("unauthenticated");
    expect(!result.ok && needsSignIn(result.error)).toBe(true);
  });

  it("maps 5xx and timeouts to retryable and network failures to offline", async () => {
    expect(mapTransportError({ message: "Internal" }, 503).category).toBe("retryable");
    expect(mapTransportError({ code: "57014", message: "canceling statement due to statement timeout" }).category).toBe("retryable");
    mocked.rpc.mockImplementation(async () => {
      throw new TypeError("Network request failed");
    });
    const result = await callRound("shift_round_home", {});
    expect(!result.ok && result.error.category).toBe("offline");
  });

  it("maps the missing-config proxy to unavailable", () => {
    expect(mapTransportError({ code: "CONFIG_MISSING", message: "Missing EXPO_PUBLIC_SUPABASE_URL" }, 0).category).toBe("unavailable");
  });

  it("treats malformed envelopes as unavailable", () => {
    expect(parseEnvelope(null)).toMatchObject({ ok: false, error: { code: "unavailable" } });
    expect(parseEnvelope({ hello: 1 })).toMatchObject({ ok: false, error: { code: "unavailable" } });
    expect(parseEnvelope({ ok: false, error: { code: "x", category: "nonsense" } })).toMatchObject({ ok: false, error: { category: "validation" } });
  });

  it("sends the frozen submission arguments with the spec argument names", async () => {
    mocked.rpc.mockResolvedValue({ data: { ok: true, data: {} }, error: null, status: 200 });
    await roundApi.submitEvidence({
      entryId: "e",
      submissionId: "s",
      type: "contact",
      payload: { who_label: "ครู" },
      media: [],
      clientCreatedAt: "2026-11-10T01:00:00.000Z",
    });
    expect(mocked.rpc).toHaveBeenCalledWith("shift_round_submit_evidence", {
      p_entry_id: "e",
      p_submission_id: "s",
      p_type: "contact",
      p_payload: { who_label: "ครู" },
      p_media: [],
      p_client_created_at: "2026-11-10T01:00:00.000Z",
      p_replaces_evidence_id: null,
    });
    await roundApi.home();
    expect(mocked.rpc).toHaveBeenLastCalledWith("shift_round_home", { p_entry_id: null });
  });
});
