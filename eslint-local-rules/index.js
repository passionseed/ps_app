"use strict";

/**
 * ESLint rule: no-hardcoded-colors
 *
 * Flags hex colors (#rgb, #rrggbb, #rrggbbaa), rgba(), rgb(), hsl(), hsla()
 * literals used outside of lib/theme.ts.
 *
 * Allowed patterns:
 * - Strings matching "transparent", "inherit", "currentColor", "none"
 * - Any value inside lib/theme.ts (the source of truth file)
 * - Short numeric values that happen to start with # (e.g. `#fff` in font names are caught, but rare)
 */
const COLOR_REGEX =
  /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\(|^hsla?\(/;

const ALLOWED_KEYWORDS = new Set([
  "transparent",
  "inherit",
  "currentColor",
  "none",
  "initial",
  "unset",
]);

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow hardcoded color values outside of lib/theme.ts. Use Theme.colors.* instead.",
    },
    messages: {
      hardcodedColor:
        "Hardcoded color '{{value}}' found. Use Theme.colors.* or Theme.* tokens from lib/theme.ts instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";

    // The theme file itself is allowed to define colors
    if (filename.endsWith("lib/theme.ts") || filename.endsWith("lib/theme.tsx")) {
      return {};
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        const val = node.value.trim();
        if (ALLOWED_KEYWORDS.has(val.toLowerCase())) return;
        if (COLOR_REGEX.test(val)) {
          context.report({
            node,
            messageId: "hardcodedColor",
            data: { value: val },
          });
        }
      },
      TemplateLiteral(node) {
        // Skip template literals — too many false positives for dynamic values.
        // Template strings like `#${var}` or `rgba(${r},${g},${b})` are dynamic anyway.
      },
    };
  },
};
