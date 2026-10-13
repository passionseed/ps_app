import { t, type CopyKey } from "./copy";
import { MISSION_NUMBER } from "./missions";
import type { EvidenceType, Lang, MissionKey } from "./types";

/** Generated squad line (2.8): handle + kind/type/n only, never student free text. */
export function feedLine(
  lang: Lang,
  item: { handle: string; kind: "evidence_logged" | "mission_completed"; type: EvidenceType | null; n: number | null; mission?: MissionKey | null },
): string {
  let text: string;
  if (item.kind === "mission_completed") {
    const n = item.mission ? MISSION_NUMBER[item.mission] : item.n ?? "";
    text = t(lang, "squad.feed.mission", { n });
  } else if (item.type) {
    text = t(lang, `squad.feed.${item.type}` as CopyKey, { n: item.n ?? 1 });
  } else {
    text = "";
  }
  return lang === "th" ? `${item.handle}: ${text}` : `${item.handle} ${text}`;
}
