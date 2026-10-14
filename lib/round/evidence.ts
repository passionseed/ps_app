/** Display helpers for evidence items and local drafts (log, mission and detail screens). */
import type { CopyKey } from "./copy";
import type { RoundDraft } from "./drafts";
import type { EvidenceItem } from "./types";

export type EvidenceStatusKind =
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "not_counted"
  | "invalidated";

export function evidenceStatusKind(item: EvidenceItem): EvidenceStatusKind {
  if (item.status === "rejected") return "rejected";
  if (item.status === "withdrawn") return "withdrawn";
  if (item.invalidated) return "invalidated";
  if (!item.counted || item.after_close) return "not_counted";
  return item.status === "accepted" ? "accepted" : "submitted";
}

export function statusCopyKey(kind: EvidenceStatusKind): CopyKey {
  return `evidence.status.${kind}` as CopyKey;
}

/** One short line of the student's own content (never translated, DS17). */
export function evidenceSummary(payload: Record<string, unknown>): string {
  const pick = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string).trim() : "");
  // ideas: the picked idea (a draft keeps rows with ids; a sent payload keeps an index)
  if (Array.isArray(payload.ideas)) {
    const ideas = payload.ideas as { id?: unknown; text?: unknown; who?: unknown }[];
    const picked =
      typeof payload.picked === "number"
        ? ideas[payload.picked]
        : typeof payload.picked_id === "string"
          ? ideas.find((i) => i?.id === payload.picked_id)
          : undefined;
    const idea = picked ?? ideas.find((i) => typeof i?.text === "string" && i.text.trim());
    const text = typeof idea?.text === "string" ? idea.text.trim() : "";
    const who = typeof idea?.who === "string" ? idea.who.trim() : "";
    return text && who ? `${text} · ${who}` : text;
  }
  if (pick("built")) return pick("built");
  if (pick("user_group") && pick("text")) return `${pick("user_group")}: ${pick("text")}`;
  const who = pick("who_label");
  const main = pick("key_point") || pick("text") || pick("what") || pick("note") || pick("url") || pick("link");
  if (who && main) return `${who}: ${main}`;
  return who || main;
}

export type DraftStatusKind = "draft" | "sending" | "unknown";

export function draftStatusKind(draft: RoundDraft): DraftStatusKind {
  const state = draft.attempt?.state;
  if (!state || state === "failed") return "draft";
  if (state === "sending") return "sending";
  return "unknown";
}

export function draftStatusCopyKey(kind: DraftStatusKind): CopyKey {
  return kind === "draft" ? "log.draft" : kind === "sending" ? "log.sending" : "log.unknown";
}
