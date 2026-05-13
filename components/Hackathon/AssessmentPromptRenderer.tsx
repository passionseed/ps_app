import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";

const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const CARD_BG = "rgba(13,18,25,0.95)";

interface AssessmentPromptRendererProps {
  prompt: string;
}

/* ------------------------------------------------------------------ */
/*  Table parser                                                       */
/* ------------------------------------------------------------------ */
function parseMarkdownTable(tableText: string): { headers: string[]; rows: string[][] } | null {
  const lines = tableText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.includes("|"));

  if (lines.length < 2) return null;

  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const rowLines = lines.slice(2);

  const rows = rowLines.map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
  );

  return { headers, rows };
}

/* ------------------------------------------------------------------ */
/*  Table grid renderer                                                */
/* ------------------------------------------------------------------ */
function MarkdownTable({ tableText }: { tableText: string }) {
  const parsed = useMemo(() => parseMarkdownTable(tableText), [tableText]);
  if (!parsed) return null;
  const { headers, rows } = parsed;

  return (
    <View style={tableStyles.container}>
      <View style={tableStyles.headerRow}>
        {headers.map((h, i) => (
          <View key={`h-${i}`} style={[tableStyles.cell, tableStyles.headerCell]}>
            <AppText style={tableStyles.headerText}>{h}</AppText>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View
          key={`r-${ri}`}
          style={[
            tableStyles.dataRow,
            ri % 2 === 0 ? tableStyles.dataRowEven : tableStyles.dataRowOdd,
          ]}
        >
          {row.map((cell, ci) => (
            <View key={`c-${ci}`} style={tableStyles.cell}>
              <AppText style={tableStyles.cellText}>{cell}</AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Split prompt into text chunks + table chunks                       */
/* ------------------------------------------------------------------ */
function splitPromptParts(text: string): Array<{ type: "text" | "table"; content: string }> {
  const result: Array<{ type: "text" | "table"; content: string }> = [];
  const lines = text.split("\n");
  let buffer: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const isSeparator = line.trim().match(/^\|[\s\-:|]+\|$/);

    if (line.trim().startsWith("|")) {
      if (!inTable) {
        if (buffer.length > 0) {
          result.push({ type: "text", content: buffer.join("\n") });
          buffer = [];
        }
        inTable = true;
      }
      buffer.push(line);
    } else if (isSeparator && inTable) {
      buffer.push(line);
    } else if (inTable && line.trim().length === 0) {
      result.push({ type: "table", content: buffer.join("\n") });
      buffer = [];
      inTable = false;
    } else {
      if (inTable) {
        result.push({ type: "table", content: buffer.join("\n") });
        buffer = [];
        inTable = false;
      }
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    result.push({ type: inTable ? "table" : "text", content: buffer.join("\n") });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Markdown style config                                              */
/* ------------------------------------------------------------------ */
const markdownStyles = {
  body: { fontFamily: "BaiJamjuree_400Regular", fontSize: 14, color: WHITE75, lineHeight: 22, marginBottom: -10 },
  strong: { fontFamily: "BaiJamjuree_700Bold", color: WHITE },
  em: { fontFamily: "BaiJamjuree_400Regular", fontStyle: "italic" as const },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 3 },
  code_inline: {
    fontFamily: "BaiJamjuree_400Regular",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: CYAN,
    paddingHorizontal: 5,
    borderRadius: 4,
    fontSize: 13,
  },
  link: { color: CYAN },
  heading1: { fontFamily: "BaiJamjuree_700Bold", fontSize: 18, color: WHITE, marginTop: 12, marginBottom: 6 },
  heading2: { fontFamily: "BaiJamjuree_700Bold", fontSize: 16, color: WHITE, marginTop: 10, marginBottom: 5 },
  heading3: { fontFamily: "BaiJamjuree_700Bold", fontSize: 14, color: CYAN, marginTop: 8, marginBottom: 4 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: CYAN, paddingLeft: 12, marginVertical: 8 },
};

/* ------------------------------------------------------------------ */
/*  Main renderer — ONE card, tables inline                            */
/* ------------------------------------------------------------------ */
export default function AssessmentPromptRenderer({ prompt }: AssessmentPromptRendererProps) {
  const parts = useMemo(() => splitPromptParts(prompt), [prompt]);

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        {parts.map((part, i) =>
          part.type === "table" ? (
            <MarkdownTable key={`t-${i}`} tableText={part.content} />
          ) : (
            <Markdown key={`m-${i}`} style={markdownStyles}>
              {part.content}
            </Markdown>
          )
        )}
      </View>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardBody: {
    padding: Space.lg,
    gap: Space.sm,
  },
});

const tableStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: Space.sm,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "rgba(145,196,227,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.3)",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.15)",
  },
  dataRowEven: {
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  dataRowOdd: {
    backgroundColor: "transparent",
  },
  cell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "rgba(74,107,130,0.15)",
    justifyContent: "center",
  },
  headerCell: {
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 11,
    color: CYAN45,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 13,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 18,
  },
});
