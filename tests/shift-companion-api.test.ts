import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanionServiceError, requiresCompanionSignIn, sendEmailOtp, verifyEmailOtp, claimLinkCode, companionStatus, loadHistory, previewLinkCode, saveDailyUpdate, uploadDailyImage, requestCompanionEmailChange, syncCompanionEmail } from "../lib/shiftCompanion";
const mocked = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), otp: vi.fn(), verify: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), refresh: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { rpc: mocked.rpc,
  storage: { from: () => ({ upload: mocked.upload }) },
  auth: { signInWithOtp: mocked.otp, verifyOtp: mocked.verify, getUser: mocked.getUser, updateUser: mocked.updateUser, refreshSession: mocked.refresh },
} }));
beforeEach(() => {
  vi.clearAllMocks(); mocked.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  mocked.getUser.mockResolvedValue({ data: { user: { id: "a", email: "old@example.com", email_confirmed_at: "2026-10-01" } }, error: null });
  mocked.updateUser.mockResolvedValue({ data: { user: { id: "a", email: "old@example.com", new_email: "new@example.com" } }, error: null });
  mocked.refresh.mockResolvedValue({ data: {}, error: null });
});
describe("companion API", () => {
  it("validates without consuming a linking code and sends identity/contact only on claim", async () => {
    await previewLinkCode("ABCD-EFGH-JKLM");
    expect(mocked.rpc).toHaveBeenLastCalledWith("shift_companion_action", { p_action: "preview_code", p_payload: { code: "ABCD-EFGH-JKLM" } });
    await claimLinkCode({ code: "ABCD-EFGH-JKLM", email: "me@example.com", countryCode: "66", mobile: "0812345678" });
    expect(mocked.rpc).toHaveBeenLastCalledWith("shift_companion_action", { p_action: "claim", p_payload: { code: "ABCD-EFGH-JKLM", email: "me@example.com", country_code: "66", mobile: "0812345678" } });
  });
  it("does not interpret a failed status request as an unlinked identity", async () => {
    mocked.rpc.mockResolvedValue({ data: null, error: { message: "Network request failed" } });
    await expect(companionStatus()).rejects.toThrow("Network request failed");
    mocked.rpc.mockResolvedValue({ data: null, error: { message: "Could not find function public.shift_companion_action in the schema cache" } });
    expect(await companionStatus()).toBeNull();
  });
  it("keeps the same original date, revision and retry key on a repeated send", async () => {
    const input = { cohortId: "cohort", updateDate: "2026-10-01", expectedRevision: 2, idempotencyKey: "retry", tried: "Tested", learned: "", help: "", link: "", imagePath: null };
    await saveDailyUpdate(input); await saveDailyUpdate(input);
    expect(mocked.rpc.mock.calls[0]).toEqual(mocked.rpc.mock.calls[1]);
    expect(mocked.rpc.mock.calls[0][1].p_payload).toMatchObject({ update_date: "2026-10-01", expected_revision: 2, idempotency_key: "retry" });
  });
  it("requests a bounded earlier-history cursor and surfaces server errors", async () => {
    mocked.rpc.mockResolvedValue({ data: { ok: true, updates: [] }, error: null });
    expect(await loadHistory("cohort", "2026-10-01")).toEqual([]);
    expect(mocked.rpc.mock.calls[0][1].p_payload).toEqual({ cohort_id: "cohort", before: "2026-10-01" });
    mocked.rpc.mockResolvedValue({ data: { ok: false, error: "not_linked" }, error: null });
    await expect(loadHistory("cohort")).rejects.toThrow("not_linked");
  });
  it("rejects unsupported images before upload and upload failures preserve caller data", async () => {
    await expect(uploadDailyImage("c", "u", "local", "image/heic")).rejects.toThrow("image_type");
    expect(mocked.upload).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(6 * 1024 * 1024) }));
    await expect(uploadDailyImage("c", "u", "local")).rejects.toThrow("image_size");
    expect(mocked.upload).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
  it("distinguishes expired authentication from offline sending failures", () => {
    expect(requiresCompanionSignIn(new CompanionServiceError("JWT expired", "PGRST301"))).toBe(true);
    expect(requiresCompanionSignIn(new CompanionServiceError("Network request failed"))).toBe(false);
  });
  it("reauthenticates with an email code without creating another participant or requiring a linking code", async () => {
    mocked.otp.mockResolvedValue({ error: null });
    await sendEmailOtp("me@example.com", false);
    expect(mocked.otp.mock.calls[0][0]).toMatchObject({ email: "me@example.com", options: { shouldCreateUser: false } });
    mocked.verify.mockResolvedValue({ data: { session: { user: { id: "a" } } }, error: null });
    expect(await verifyEmailOtp("me@example.com", "123456")).toBe("a");
    mocked.verify.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyEmailOtp("me@example.com", "123456")).rejects.toThrow("did not establish a session");
  });

  it("requests an email change without treating the request as a confirmed SHIFT contact", async () => {
    await requestCompanionEmailChange("a", " NEW@example.com ");
    expect(mocked.updateUser.mock.calls[0][0]).toEqual({ email: "new@example.com" });
    expect(mocked.rpc).not.toHaveBeenCalled();
    await expect(requestCompanionEmailChange("a", "bad")).rejects.toThrow("email");
    await expect(requestCompanionEmailChange("a", "old@example.com")).rejects.toThrow("email_unchanged");
    expect(mocked.updateUser).toHaveBeenCalledTimes(1);
  });
  it("does not change or sync contacts after an account switch or for an unverified account", async () => {
    await expect(requestCompanionEmailChange("other", "new@example.com")).rejects.toThrow("verify_email");
    await expect(syncCompanionEmail("other", "new@example.com")).rejects.toThrow("verify_email");
    mocked.getUser.mockResolvedValue({ data: { user: { id: "a", email: "new@example.com", confirmed_at: "phone-confirmation" } }, error: null });
    await expect(syncCompanionEmail("a", "new@example.com")).rejects.toThrow("verify_email");
    expect(mocked.updateUser).not.toHaveBeenCalled(); expect(mocked.rpc).not.toHaveBeenCalled();
  });
  it("keeps the original contact when either email confirmation is incomplete", async () => {
    expect(await syncCompanionEmail("a", "new@example.com")).toEqual({ confirmed: false });
    expect(mocked.rpc).not.toHaveBeenCalled(); expect(mocked.refresh).not.toHaveBeenCalled();
  });
  it("syncs only a server-verified email and verifies the returned account and address", async () => {
    mocked.getUser.mockResolvedValue({ data: { user: { id: "a", email: "new@example.com", email_confirmed_at: "2026-10-02" } }, error: null });
    mocked.rpc.mockResolvedValue({ data: { ok: true, user_id: "a", email: "new@example.com" }, error: null });
    expect(await syncCompanionEmail("a", " NEW@example.com ")).toEqual({ confirmed: true, email: "new@example.com" });
    expect(mocked.rpc).toHaveBeenCalledWith("shift_companion_action", { p_action: "sync_contact_email", p_payload: {} });
    mocked.rpc.mockResolvedValue({ data: { ok: true, user_id: "other", email: "new@example.com" }, error: null });
    await expect(syncCompanionEmail("a", "new@example.com")).rejects.toThrow("email_sync_failed");
  });
  it("preserves the verified contact receipt if refreshing the local session fails", async () => {
    mocked.rpc.mockResolvedValue({ data: { ok: true, user_id: "a", email: "old@example.com" }, error: null });
    mocked.refresh.mockRejectedValue(new Error("Network request failed"));
    expect(await syncCompanionEmail("a")).toEqual({ confirmed: true, email: "old@example.com" });
  });

});
