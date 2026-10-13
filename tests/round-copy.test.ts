import { describe, expect, it } from "vitest";
import { copy, errorCopy, t } from "../lib/round/copy";
import { REASON_CODES } from "../lib/round/types";

// Every code in spec 3.8 (student-facing; staff-only codes are web admin).
const ERROR_CODES = [
  "unauthenticated", "forbidden", "unavailable", "retryable", "offline", "entry_not_found", "round_not_found",
  "round_not_open", "join_closed", "invite_only", "enrollment_paused", "already_in_active_round", "track_not_open",
  "guardian_consent_required", "invalid_field", "missing_field", "link_not_https", "photo_consent_required",
  "audio_consent_required", "media_missing", "media_not_owned", "media_in_use", "submissions_paused", "rate_limited",
  "submission_conflict", "round_finished", "invalid_change_source", "withdraw_after_issue", "withdraw_not_allowed",
  "review_closed", "invalid_transition", "certificate_issued", "checkin_not_due", "checkin_already_submitted",
  "squad_not_assigned", "not_same_squad", "cheer_limit", "certificate_not_found", "certificate_revoked",
  "certificate_tombstoned", "transcription_paused", "transcription_failed", "audio_too_long",
];

const PUSH_KEYS = [
  "push.no_evidence", "push.no_evidence_last_day", "push.closing_tomorrow", "push.rejected", "push.certificate",
  "push.summary_approved", "push.summary_rejected", "push.squad_assigned", "push.round_published",
];

describe("round copy (X8, DS17)", () => {
  it("has identical, non-empty keys in Thai and English", () => {
    const th = Object.keys(copy.th).sort();
    const en = Object.keys(copy.en).sort();
    expect(en).toEqual(th);
    for (const key of th) {
      expect(copy.th[key as keyof typeof copy.th].trim(), key).not.toBe("");
      expect(copy.en[key as keyof typeof copy.en].trim(), key).not.toBe("");
    }
  });

  it("has error copy for every error code in the catalogue", () => {
    for (const code of ERROR_CODES) {
      expect(Object.prototype.hasOwnProperty.call(copy.th, `error.${code}`), code).toBe(true);
    }
  });

  it("has a reason and a fix for every reason code", () => {
    for (const code of REASON_CODES) {
      expect(copy.th[`reason.${code}` as keyof typeof copy.th], code).toBeTruthy();
      expect(copy.th[`fix.${code}` as keyof typeof copy.th], code).toBeTruthy();
    }
  });

  it("has all Appendix C push keys", () => {
    for (const key of PUSH_KEYS) expect(copy.en[key as keyof typeof copy.en], key).toBeTruthy();
  });

  it("uses the same placeholders in both languages", () => {
    const names = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    for (const key of Object.keys(copy.th) as (keyof typeof copy.th)[]) {
      expect(names(copy.en[key]), key).toBe(names(copy.th[key]));
    }
  });

  it("fills placeholders and maps codes to copy, falling back by category", () => {
    expect(t("th", "round.tag", { n: 4 })).toBe("SHIFT · รอบที่ 4");
    expect(t("en", "home.closes", { weekday: "Sun", date: "26 Oct" })).toBe("Closes Sun 26 Oct, 23:59");
    expect(errorCopy("en", { code: "rate_limited", category: "retryable", retry_after: 150 })).toContain("3 min");
    expect(errorCopy("en", { code: "invalid_field", category: "validation", details: { rule: "personal_data" } })).toBe(
      t("en", "error.invalid_field.personal_data"),
    );
    expect(errorCopy("th", { code: "something_new", category: "unavailable" })).toBe(t("th", "error.unavailable"));
  });

  it("uses the R20 visibility footer, not the old mockup line", () => {
    expect(copy.th["capture.visibility"]).not.toContain("สควอดและพี่เมนเทอร์จะเห็นบันทึกนี้");
  });
});
