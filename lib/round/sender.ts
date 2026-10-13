/**
 * Single entry point for sending a frozen draft, shared by the composer and the background
 * replay (duplicate-send guard: one in-flight send per draft).
 */
import { pendingReplays, roundDrafts, type RoundDraft } from "./drafts";
import { deleteDraftMedia } from "./media";
import { defaultSendDeps, sendAttempt, type SendDeps, type SendResult } from "./submission";

const inflight = new Map<string, Promise<SendResult>>();

export function isSending(draftId: string): boolean {
  return inflight.has(draftId);
}

export function sendDraft(draft: RoundDraft, deps: SendDeps = defaultSendDeps): Promise<SendResult> {
  const existing = inflight.get(draft.draft_id);
  if (existing) return existing;
  const run = (async () => {
    await roundDrafts.save(draft).catch(() => {});
    const result = await sendAttempt(draft, deps);
    if (result.kind === "receipt") {
      await roundDrafts.remove(draft.user_id, draft.draft_id).catch(() => {});
      await deleteDraftMedia(draft.draft_id);
    } else {
      await roundDrafts.save(result.draft).catch(() => {});
    }
    return result;
  })().finally(() => inflight.delete(draft.draft_id));
  inflight.set(draft.draft_id, run);
  return run;
}

/** Resend drafts whose attempt is sending/unknown/retryable with the same submission_id. */
export async function replayPending(userId: string, deps: SendDeps = defaultSendDeps): Promise<SendResult[]> {
  if (!userId) return [];
  const drafts = pendingReplays(await roundDrafts.list(userId));
  const results: SendResult[] = [];
  for (const draft of drafts) {
    results.push(await sendDraft(draft, deps));
  }
  return results;
}
