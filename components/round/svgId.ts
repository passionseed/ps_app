import { useId } from "react";

/**
 * SVG gradient ids must be unique per document on web (stacked screens stay in the DOM), and
 * React ids contain characters that break `url(#id)`. Native scopes ids per <Svg>, so this is
 * only about web, but it is harmless everywhere.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
