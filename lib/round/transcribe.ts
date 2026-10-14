/**
 * Voice-to-text via the web route (spec 5.6, 6.3). Behind `transcription_enabled` (default OFF
 * for beta per product decision); when off, the composer is text-first and fully works.
 */
import { makeError } from "./api";
import type { RoundError, Transcript, TranscriptSegment } from "./types";

export const TRANSCRIBE_TIMEOUT_MS = 25_000;

export type TranscribeResult = { ok: true; data: Transcript } | { ok: false; error: RoundError };

export async function transcribe(input: {
  webBaseUrl: string;
  path: string;
  lang: "th" | "en";
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<TranscribeResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), input.timeoutMs ?? TRANSCRIBE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${input.webBaseUrl.replace(/\/+$/, "")}/api/shift/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.accessToken}` },
      body: JSON.stringify({ path: input.path, lang: input.lang }),
      signal: controller?.signal,
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (response.ok && body && typeof body === "object" && typeof (body as Transcript).text === "string") {
      const t = body as Transcript;
      const segments: TranscriptSegment[] = Array.isArray(t.segments)
        ? t.segments.filter((s) => s && typeof s.text === "string").map((s, i) => ({
            id: typeof s.id === "number" ? s.id : i,
            start_ms: Number(s.start_ms) || 0,
            end_ms: Number(s.end_ms) || 0,
            text: s.text.trim(),
          }))
        : [];
      return { ok: true, data: { text: t.text, segments, language: t.language ?? input.lang } };
    }
    const code =
      body && typeof body === "object" && typeof (body as { error?: { code?: string } }).error?.code === "string"
        ? (body as { error: { code: string } }).error.code
        : response.status === 401
          ? "unauthenticated"
          : "transcription_failed";
    const category =
      code === "unauthenticated"
        ? "unauthenticated"
        : code === "transcription_paused"
          ? "unavailable"
          : code === "audio_too_long" || code === "media_not_owned" || code === "round_finished"
            ? "validation"
            : "retryable";
    return { ok: false, error: makeError(code, category) };
  } catch (e) {
    const aborted = e instanceof Error && /abort/i.test(e.name + e.message);
    return { ok: false, error: makeError(aborted ? "transcription_failed" : "offline", aborted ? "retryable" : "offline") };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tap selection (5.6): up to 3 adjacent segments. Tapping a neighbour extends the run,
 * tapping an end of the run shrinks it, tapping elsewhere starts a new run.
 */
export function toggleSegment(selected: number[], tappedIndex: number, max = 3): number[] {
  const sorted = [...selected].sort((a, b) => a - b);
  if (!sorted.length) return [tappedIndex];
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (sorted.includes(tappedIndex)) {
    if (tappedIndex === first) return sorted.slice(1);
    if (tappedIndex === last) return sorted.slice(0, -1);
    return [tappedIndex];
  }
  if ((tappedIndex === last + 1 || tappedIndex === first - 1) && sorted.length < max) {
    return [...sorted, tappedIndex].sort((a, b) => a - b);
  }
  return [tappedIndex];
}

export function keyPointFrom(segments: TranscriptSegment[], selected: number[]): string {
  return [...selected]
    .sort((a, b) => a - b)
    .map((i) => segments[i]?.text ?? "")
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}
