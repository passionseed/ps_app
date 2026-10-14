/**
 * Evidence payload schema v1 (spec 2.3, X6; scale spec 2.2 adds `ideas`, `daily` and
 * `problem_statement.user_group`). Mirrors lane A's SQL validation in
 * `shift_round_submit_evidence`. Unknown keys are rejected (also inside idea items); strings are
 * trimmed first. Media (photo/audio) are not part of the payload; they travel in `p_media`.
 *
 * Error shape for nested idea items: `invalid_field` on field `ideas` with `index` and `key`
 * (`rule: personal_data` for a who label that carries contact details). `picked` outside the
 * list is `invalid_field` on `picked`.
 */
import { z } from "zod";
import type { EvidenceType } from "./types";

export const LINK_PATTERN = /^https:\/\/[^\s]{4,490}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A who label (and a user group) must be a role, not contact details (A8/A10). Same rule as
 * `shift_round_private.has_personal_data`: 9+ digits, an email, `@` followed by a handle
 * character anywhere, or a LINE/Facebook/Instagram/TikTok link.
 */
export function hasPersonalData(label: string): boolean {
  if ((label.match(/[0-9]/g) ?? []).length >= 9) return true;
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(label)) return true;
  if (/@[A-Za-z0-9_.]/.test(label)) return true;
  if (/(line\.me|facebook\.com|instagram\.com|fb\.com|tiktok\.com)/i.test(label)) return true;
  return false;
}

/** Same normalization as `shift_round_private.who_key` (E19). */
export function whoKey(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

const link = z.string().trim().regex(LINK_PATTERN, { message: "link_not_https" });
const date = z.string().regex(DATE_PATTERN, { message: "invalid_field" });
const whoLabel = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .refine((v) => !hasPersonalData(v), { message: "personal_data" });
const input = z.enum(["voice", "text"]);

/** One idea: what the problem is and who has it (who follows the personal-data rule). */
const ideaItem = z.strictObject({
  text: z.string().trim().min(3).max(120),
  who: whoLabel,
});

export const IDEAS_MIN = 3;
export const IDEAS_MAX = 6;

export const payloadSchemas = {
  contact: z.strictObject({
    who_label: whoLabel,
    channel: z.enum(["in_person", "chat", "call", "social", "other"]),
    occurred_on: date,
    link: link.optional(),
  }),
  ideas: z.strictObject({
    ideas: z.array(ideaItem).min(IDEAS_MIN).max(IDEAS_MAX),
    picked: z.number().int().min(0),
    reachable: z.boolean().optional(),
    note: z.string().trim().max(280).optional(),
  }),
  interview: z.strictObject({
    who_label: whoLabel,
    occurred_on: date,
    key_point: z.string().trim().min(1).max(500),
    transcript: z.string().trim().max(5000).optional(),
    planned_change: z.string().trim().max(280).optional(),
    input: input.optional(),
    link: link.optional(),
  }),
  problem_statement: z.strictObject({
    text: z.string().trim().min(20).max(500),
    user_group: whoLabel,
    link: link.optional(),
  }),
  mvp: z.strictObject({
    link: link.optional(),
    note: z.string().trim().max(280).optional(),
  }),
  tester: z.strictObject({
    who_label: whoLabel,
    occurred_on: date,
    key_point: z.string().trim().min(1).max(500),
    what_tried: z.string().trim().max(200).optional(),
    transcript: z.string().trim().max(5000).optional(),
    planned_change: z.string().trim().max(280).optional(),
    input: input.optional(),
    link: link.optional(),
  }),
  change: z.strictObject({
    kind: z.enum(["changed", "decided_not_to"]),
    what: z.string().trim().min(5).max(500),
    source_evidence_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    link: link.optional(),
  }),
  demo_post: z.strictObject({
    url: link,
    visibility: z.enum(["public", "reviewer_only"]),
    note: z.string().trim().max(280).optional(),
  }),
  daily: z.strictObject({
    built: z.string().trim().min(1).max(500),
    broke: z.string().trim().max(500).optional(),
    heard: z.string().trim().max(500).optional(),
    link: link.optional(),
  }),
} satisfies Record<EvidenceType, z.ZodTypeAny>;

export type MediaDraft = {
  kind: "photo" | "audio";
  consent: boolean;
  duration_ms?: number | null;
};

export type ValidationIssue = {
  code:
    | "invalid_field"
    | "missing_field"
    | "link_not_https"
    | "photo_consent_required"
    | "audio_consent_required"
    | "invalid_change_source";
  field: string;
  /**
   * Same words as the server's `details.rule` where the UI or parity needs them: always for
   * personal data and date range, and for every problem inside the ideas list.
   */
  rule?: "personal_data" | "date_range" | "unknown_key" | "required" | "type" | "length" | "count" | "range";
  /** Item index inside an array field (`ideas`), 0-based like the server. */
  index?: number;
  /** Key inside that item (`text` or `who`, or the unknown key). */
  key?: string;
};

/** Server rule for a zod issue inside an idea item (`details.rule`, spec 2.2 / lane A). */
function itemRule(issue: z.core.$ZodIssue, item: unknown): ValidationIssue["rule"] {
  if (issue.code === "unrecognized_keys") return "unknown_key";
  if (issue.message === "personal_data") return "personal_data";
  if (issue.code === "too_small" || issue.code === "too_big") return "length";
  const key = issue.path[2];
  if (issue.code === "invalid_type" && key !== undefined && item && typeof item === "object") {
    const value = (item as Record<string, unknown>)[String(key)];
    return value === undefined || value === null ? "required" : "type";
  }
  return "type";
}

export type ValidationResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; issues: ValidationIssue[] };

/** Drops empty optional strings so `""` never reaches the server. */
export function cleanPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export function validateEvidence(
  type: EvidenceType,
  rawPayload: Record<string, unknown>,
  media: MediaDraft[] = [],
  ctx: { earliestDate?: string; today?: string } = {},
): ValidationResult {
  const schema = (payloadSchemas as Record<string, z.ZodTypeAny>)[type];
  if (!schema) return { ok: false, issues: [{ code: "invalid_field", field: "type" }] };
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return { ok: false, issues: [{ code: "invalid_field", field: "payload" }] };
  }
  const payload = cleanPayload(rawPayload);
  const issues: ValidationIssue[] = [];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "payload");
      const nested =
        issue.path.length > 1 && typeof issue.path[1] === "number"
          ? { index: issue.path[1] as number, ...(issue.path[2] !== undefined ? { key: String(issue.path[2]) } : {}) }
          : {};
      if (issue.path.length > 1 && typeof issue.path[1] === "number") {
        // Anything inside the ideas list (an idea's text, who, keys or the item itself) is
        // reported on the list with {rule, index, key}, like the server.
        const item = Array.isArray(payload[field]) ? (payload[field] as unknown[])[issue.path[1] as number] : undefined;
        const key = issue.code === "unrecognized_keys" ? (issue as { keys?: string[] }).keys?.[0] : undefined;
        issues.push({ code: "invalid_field", field, rule: itemRule(issue, item), ...nested, ...(key ? { key } : {}) });
        continue;
      }
      if (issue.code === "unrecognized_keys") {
        issues.push({ code: "invalid_field", field: (issue as { keys?: string[] }).keys?.[0] ?? "payload" });
        continue;
      }
      if (issue.message === "personal_data") {
        issues.push({ code: "invalid_field", field, rule: "personal_data" });
      } else if (field === "ideas" && payload.ideas !== undefined) {
        issues.push({ code: "invalid_field", field, rule: Array.isArray(payload.ideas) ? "count" : "type" });
      } else if (issue.message === "link_not_https") {
        issues.push({ code: "link_not_https", field });
      } else if (payload[field] === undefined) {
        issues.push({ code: "missing_field", field });
      } else if (field === "source_evidence_id") {
        issues.push({ code: "invalid_change_source", field });
      } else {
        issues.push({ code: "invalid_field", field });
      }
    }
  }
  const occurred = payload.occurred_on;
  if (typeof occurred === "string" && DATE_PATTERN.test(occurred)) {
    if ((ctx.earliestDate && occurred < ctx.earliestDate) || (ctx.today && occurred > ctx.today)) {
      issues.push({ code: "invalid_field", field: "occurred_on", rule: "date_range" });
    }
  }
  const photos = media.filter((m) => m.kind === "photo");
  const audios = media.filter((m) => m.kind === "audio");
  if (photos.length > 1) issues.push({ code: "invalid_field", field: "photo" });
  if (audios.length > 1) issues.push({ code: "invalid_field", field: "audio" });
  if (audios.length && type !== "interview" && type !== "tester") {
    issues.push({ code: "invalid_field", field: "audio" });
  }
  if (photos.some((m) => !m.consent)) issues.push({ code: "photo_consent_required", field: "photo" });
  if (audios.some((m) => !m.consent)) issues.push({ code: "audio_consent_required", field: "audio" });
  if (audios.some((m) => (m.duration_ms ?? 0) > 180_000)) issues.push({ code: "invalid_field", field: "audio" });
  if (type === "mvp" && !payload.link && photos.length === 0) {
    issues.push({ code: "missing_field", field: "link" });
  }
  if (
    type === "ideas" &&
    Array.isArray(payload.ideas) &&
    typeof payload.picked === "number" &&
    Number.isInteger(payload.picked) &&
    payload.picked >= payload.ideas.length
  ) {
    issues.push({ code: "invalid_field", field: "picked", rule: "range" });
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true, payload: parsed.success ? (parsed.data as Record<string, unknown>) : payload };
}
