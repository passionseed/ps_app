import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

const OUTER_KEYS = new Set<string>([
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "zIndex",
  "opacity",
  "transform",
]);

/**
 * Cards draw their surface in an inner clipped view and their shadow on an outer view. Callers
 * pass one `style`; outer-box keys (margins, size, flex, position) go to the shadow view and the
 * rest (padding, gap, alignment, direction) to the content view.
 */
export function splitCardStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (OUTER_KEYS.has(key)) outer[key] = value;
    else inner[key] = value;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}
