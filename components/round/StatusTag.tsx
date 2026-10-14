import React from "react";
import { Tag } from "./primitives";

export type StatusKind =
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "not_counted"
  | "invalidated"
  | "draft"
  | "sending"
  | "unknown";

/** Status pill: every state has a word, never colour alone (DESIGN.md principle 1). */
export function StatusTag({ kind, label }: { kind: StatusKind; label: string }) {
  const tone =
    kind === "accepted" ? "success" : kind === "rejected" || kind === "invalidated" ? "warning" : kind === "withdrawn" || kind === "not_counted" ? "neutral" : "violet";
  return <Tag label={label} tone={tone} />;
}
