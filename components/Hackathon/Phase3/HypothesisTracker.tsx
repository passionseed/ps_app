import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import type { Phase3CycleTrackerEntry } from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const CYAN08 = "rgba(145,196,227,0.08)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE20 = "rgba(255,255,255,0.20)";
const RED = "#FF6B6B";
const RED15 = "rgba(255,107,107,0.15)";
const GREEN = "#4ECDC4";
const GREEN15 = "rgba(78,205,196,0.15)";
const YELLOW = "#FFA500";
const YELLOW15 = "rgba(255,165,0,0.15)";

interface HypothesisTrackerProps {
  cycles: Phase3CycleTrackerEntry[];
  activeCycleNumber?: number;
  onCyclePress?: (cycleNumber: number) => void;
  lang?: "th" | "en";
  compact?: boolean;
}

type ResultColor = { solid: string; dim: string };

function resultColors(result: string | null, isActive: boolean): ResultColor {
  if (isActive) return { solid: CYAN, dim: CYAN08 };
  if (result === "confirmed") return { solid: GREEN, dim: GREEN15 };
  if (result === "killed") return { solid: RED, dim: RED15 };
  if (result === "unclear") return { solid: YELLOW, dim: YELLOW15 };
  return { solid: "rgba(74,107,130,0.4)", dim: "rgba(74,107,130,0.06)" };
}

function ScoreBar({ score, max = 15 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 70 ? GREEN : pct >= 45 ? YELLOW : RED;
  return (
    <View style={scoreBarStyles.wrap}>
      <View style={scoreBarStyles.track}>
        <View style={[scoreBarStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <AppText style={[scoreBarStyles.label, { color }]}>{score}/{max}</AppText>
    </View>
  );
}

const scoreBarStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  track: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: 3, borderRadius: 2 },
  label: { fontSize: 10, fontFamily: "BaiJamjuree_700Bold", minWidth: 28, textAlign: "right" },
});

export default function HypothesisTracker({
  cycles,
  activeCycleNumber,
  onCyclePress,
  lang = "th",
  compact = false,
}: HypothesisTrackerProps) {
  const [expandedCycle, setExpandedCycle] = React.useState<number | null>(null);

  const extractWillDo = (hypothesis: string | null): string => {
    if (!hypothesis) return lang === "th" ? "ยังไม่มี hypothesis" : "No hypothesis yet";
    const afterWill = hypothesis.split(" will ")[1];
    if (!afterWill) return hypothesis;
    return afterWill.split(" because ")[0] ?? afterWill;
  };

  const resultLabel = (r: string) => {
    if (lang === "th") {
      return r === "confirmed" ? "ยืนยัน" : r === "killed" ? "ไม่ผ่าน" : "ไม่ชัดเจน";
    }
    return r === "confirmed" ? "Confirmed" : r === "killed" ? "Killed" : "Unclear";
  };

  const resultIcon = (r: string) =>
    r === "confirmed" ? "checkmark" : r === "killed" ? "close" : "remove";

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cycles.map((cycle, index) => {
          const isActive = cycle.cycleNumber === activeCycleNumber;
          const isExpanded = expandedCycle === cycle.cycleNumber;
          const colors = resultColors(cycle.result, isActive);
          const hasPendingResult = isActive && !cycle.result;

          return (
            <View key={cycle.cycleNumber} style={styles.cardWrapper}>
              {/* Timeline connector */}
              {index > 0 && (
                <View style={styles.connectorWrap}>
                  <View style={styles.connectorLine} />
                  <View style={styles.connectorArrow} />
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { borderLeftColor: colors.solid, backgroundColor: colors.dim },
                  isActive && styles.cardActive,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => {
                  setExpandedCycle(isExpanded ? null : cycle.cycleNumber);
                  onCyclePress?.(cycle.cycleNumber);
                }}
              >
                {/* Top row: cycle tag + active pulse */}
                <View style={styles.topRow}>
                  <View style={[styles.cycleTag, { borderColor: colors.solid }]}>
                    <AppText style={[styles.cycleTagText, { color: colors.solid }]}>
                      C{cycle.cycleNumber}
                    </AppText>
                  </View>

                  {hasPendingResult && (
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <AppText style={styles.liveText}>
                        {lang === "th" ? "กำลังทำ" : "LIVE"}
                      </AppText>
                    </View>
                  )}

                  {cycle.result && (
                    <View style={[styles.resultChip, { backgroundColor: colors.solid }]}>
                      <Ionicons name={resultIcon(cycle.result) as any} size={9} color={BG} />
                      <AppText style={styles.resultChipText}>{resultLabel(cycle.result)}</AppText>
                    </View>
                  )}
                </View>

                {/* Hypothesis body */}
                <View style={styles.body}>
                  {isExpanded ? (
                    <>
                      <AppText style={styles.hypothesisFull}>
                        {cycle.hypothesis || (lang === "th" ? "ยังไม่มี hypothesis" : "No hypothesis yet")}
                      </AppText>
                      {cycle.variableChanged && (
                        <View style={styles.variableRow}>
                          <View style={styles.variableDash} />
                          <AppText style={styles.variableText} numberOfLines={2}>
                            {cycle.variableChanged}
                          </AppText>
                        </View>
                      )}
                    </>
                  ) : (
                    <AppText style={styles.willDo} numberOfLines={3}>
                      {extractWillDo(cycle.hypothesis)}
                    </AppText>
                  )}
                </View>

                {/* Footer: score + expand toggle */}
                <View style={styles.footer}>
                  {cycle.score !== null && cycle.score !== undefined ? (
                    <ScoreBar score={cycle.score} />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <View style={[styles.expandToggle, { borderColor: colors.solid }]}>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={10}
                      color={colors.solid}
                    />
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}

        {/* "Next cycle" ghost card hint */}
        {cycles.length > 0 && activeCycleNumber !== undefined && (
          <View style={styles.cardWrapper}>
            <View style={styles.connectorWrap}>
              <View style={[styles.connectorLine, { opacity: 0.3 }]} />
              <View style={[styles.connectorArrow, { opacity: 0.3 }]} />
            </View>
            <View style={styles.ghostCard}>
              <Ionicons name="add" size={18} color="rgba(145,196,227,0.25)" />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CARD_W = 168;

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  containerCompact: { marginBottom: 0 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: "center",
    gap: 0,
  },

  cardWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* ── Timeline connector ── */
  connectorWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 20,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(145,196,227,0.3)",
  },
  connectorArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(145,196,227,0.3)",
  },

  /* ── Card ── */
  card: {
    width: CARD_W,
    borderLeftWidth: 3,
    borderRadius: 10,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    padding: 12,
    paddingLeft: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.18)",
  },
  cardActive: {
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderColor: "rgba(145,196,227,0.35)",
  },

  /* ── Top row ── */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cycleTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cycleTagText: {
    fontSize: 10,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(145,196,227,0.12)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: CYAN,
  },
  liveText: {
    fontSize: 9,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
  },
  resultChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  resultChipText: {
    fontSize: 9,
    color: BG,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.4,
  },

  /* ── Body ── */
  body: { gap: 6 },
  willDo: {
    color: WHITE75,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "BaiJamjuree_400Regular",
  },
  hypothesisFull: {
    color: WHITE75,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  variableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  variableDash: {
    width: 12,
    height: 1,
    backgroundColor: WHITE20,
    marginTop: 8,
  },
  variableText: {
    flex: 1,
    color: WHITE55,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },

  /* ── Footer ── */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandToggle: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Ghost card ── */
  ghostCard: {
    width: CARD_W * 0.5,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(145,196,227,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
