import { t, type CopyKey } from "./copy";
import { missionNumber } from "./missions";
import type { EvidenceType, Lang, MissionCounts, MissionKey } from "./types";

/**
 * Generated squad line (2.8): handle + kind/type/n only, never student free text. Mission keys
 * are dynamic (scale spec 2.1): the number comes from the viewer's counts (same round config),
 * then the SHIFT default order, then the item's own `n`.
 */
export function feedLine(
  lang: Lang,
  item: { handle: string; kind: "evidence_logged" | "mission_completed"; type: EvidenceType | null; n: number | null; mission?: MissionKey | null },
  counts?: MissionCounts | null,
): string {
  let text: string;
  if (item.kind === "mission_completed") {
    const n = missionNumber(counts, item.mission) ?? item.n ?? "";
    text = t(lang, "squad.feed.mission", { n });
  } else if (item.type) {
    text = t(lang, `squad.feed.${item.type}` as CopyKey, { n: item.n ?? 1 });
  } else {
    text = "";
  }
  return lang === "th" ? `${item.handle}: ${text}` : `${item.handle} ${text}`;
}
