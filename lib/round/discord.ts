/**
 * "คัดลอกไปโพสต์ใน #progress" (scale spec D7): plain text for the Discord #progress channel,
 * built from the payload the student just sent. The app never posts to Discord itself.
 * Never included: photos, audio, transcripts, and links that could point at other people
 * (contact, interview, tester) or that the student kept staff-only (reviewer-only demos).
 */
import { t, type CopyKey } from "./copy";
import { typeKey } from "./missions";
import type { EvidenceType, Lang } from "./types";

/** Discord's message length limit. */
export const DISCORD_LIMIT = 2000;

export type ProgressPostInput = {
  lang: Lang;
  type: EvidenceType;
  payload: Record<string, unknown>;
  roundNumber?: number | null;
  day?: number | null;
  /** Mission progress after this log, e.g. interviews 2/3. */
  progress?: { have: number; need: number } | null;
};

const LINK_TYPES: EvidenceType[] = ["daily", "problem_statement", "mvp", "change"];

export function progressPost(input: ProgressPostInput): string {
  const { lang, type, payload } = input;
  const s = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string).trim() : "");
  const line = (key: CopyKey, value: string, name = "text") => (value ? t(lang, key, { [name]: value }) : null);

  const title = t(lang, typeKey(type));
  const progress = input.progress && input.progress.need > 1 ? ` ${Math.min(input.progress.have, input.progress.need)}/${input.progress.need}` : "";
  const header = [
    input.roundNumber ? t(lang, "round.tag", { n: input.roundNumber }) : "SHIFT",
    input.day && input.day > 0 ? `Day ${input.day}` : null,
    `${title}${progress}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: (string | null)[] = [header];
  switch (type) {
    case "ideas": {
      const ideas = Array.isArray(payload.ideas) ? (payload.ideas as { text?: unknown; who?: unknown }[]) : [];
      ideas.forEach((idea, i) => {
        const text = typeof idea?.text === "string" ? idea.text.trim() : "";
        const who = typeof idea?.who === "string" ? idea.who.trim() : "";
        if (text) lines.push(t(lang, "post.ideas.item", { i: i + 1, text, who: who || "-" }));
      });
      if (typeof payload.picked === "number" && payload.picked >= 0 && payload.picked < ideas.length) {
        lines.push(t(lang, "post.ideas.picked", { i: payload.picked + 1 }));
      }
      if (payload.reachable === true) lines.push(t(lang, "post.ideas.reachable"));
      lines.push(line("post.note", s("note")));
      break;
    }
    case "daily":
      lines.push(line("post.daily.built", s("built")), line("post.daily.broke", s("broke")), line("post.daily.heard", s("heard")));
      break;
    case "interview":
      lines.push(line("post.who", s("who_label"), "who"), line("post.interview.point", s("key_point")), line("post.plan", s("planned_change")));
      break;
    case "tester":
      lines.push(
        line("post.who", s("who_label"), "who"),
        line("post.tester.tried", s("what_tried")),
        line("post.tester.point", s("key_point")),
        line("post.plan", s("planned_change")),
      );
      break;
    case "problem_statement":
      lines.push(line("post.problem.text", s("text")), line("post.problem.group", s("user_group")));
      break;
    case "mvp":
      lines.push(line("post.note", s("note")));
      break;
    case "change":
      lines.push(line(payload.kind === "decided_not_to" ? "post.change.kept" : "post.change.changed", s("what")));
      break;
    case "demo_post":
      lines.push(payload.visibility === "public" ? line("post.demo.public", s("url"), "url") : t(lang, "post.demo.private"));
      lines.push(line("post.note", s("note")));
      break;
    case "contact": {
      const channel = s("channel");
      const channelLabel = channel ? t(lang, `capture.channel.${channel}` as CopyKey) : "";
      lines.push(s("who_label") ? t(lang, "post.contact", { who: s("who_label"), channel: channelLabel || "-" }) : null);
      break;
    }
  }
  if (LINK_TYPES.includes(type)) lines.push(line("post.link", s("link"), "url"));

  return clampPost(lines.filter((l): l is string => !!l).join("\n"));
}

/** Keeps a post within Discord's limit, cutting at a line or word boundary with an ellipsis. */
export function clampPost(text: string, limit = DISCORD_LIMIT): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const at = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  return `${at > limit * 0.8 ? cut.slice(0, at) : cut}…`;
}
