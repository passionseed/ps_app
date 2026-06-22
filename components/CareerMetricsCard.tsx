import React, { useState } from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { AppText } from "./AppText";
import type { CareerMetrics, MarketRegion, MetricDetailsMap } from "../lib/careerSurvival";
import { Radius, Shadow, Space, Text as ThemeText } from "../lib/theme";

interface Props {
  metrics: CareerMetrics;
  market: MarketRegion;
  onToggleMarket: () => void;
  lang: "th" | "en";
  dark?: boolean;
  metricDetails?: MetricDetailsMap;
}

const METRIC_DEFS = [
  {
    key: "demand_growth" as const,
    emoji: "\uD83D\uDCC8",
    th: "\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E15\u0E25\u0E32\u0E14",
    en: "Demand Growth",
    max: 10,
    type: "bar" as const,
    colorHigh: "#10B981",
    colorLow: "#EF4444",
  },
  {
    key: "grad_employment_pct" as const,
    emoji: "\uD83C\uDF93",
    th: "\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E01\u0E32\u0E23\u0E08\u0E49\u0E32\u0E07\u0E08\u0E1A\u0E43\u0E2B\u0E21\u0E48",
    en: "Graduate Employment",
    max: 100,
    type: "pct" as const,
    colorHigh: "#10B981",
    colorLow: "#EF4444",
  },
  {
    key: "saturation_level" as const,
    emoji: "\uD83D\uDEA6",
    th: "\u0E04\u0E27\u0E32\u0E21\u0E2D\u0E34\u0E48\u0E21\u0E15\u0E31\u0E27",
    en: "Saturation Level",
    max: 10,
    type: "bar" as const,
    colorHigh: "#EF4444",
    colorLow: "#10B981",
    invert: true,
  },
  {
    key: "progression_difficulty" as const,
    emoji: "\uD83E\uDE9C",
    th: "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E01\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E15\u0E34\u0E1A\u0E42\u0E15",
    en: "Progression Difficulty",
    max: 10,
    type: "bar" as const,
    colorHigh: "#EF4444",
    colorLow: "#10B981",
    invert: true,
  },
  {
    key: "ai_impact_score" as const,
    emoji: "\uD83E\uDD16",
    th: "\u0E1C\u0E25\u0E01\u0E23\u0E30\u0E17\u0E1A\u0E08\u0E32\u0E01 AI",
    en: "AI Impact",
    max: 10,
    type: "bar" as const,
    colorHigh: "#EF4444",
    colorLow: "#10B981",
    invert: true,
  },
  {
    key: "salary_floor" as const,
    emoji: "\uD83D\uDCB0",
    th: "\u0E40\u0E07\u0E34\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19",
    en: "Salary Floor",
    max: 0,
    type: "salary" as const,
    colorHigh: "#10B981",
    colorLow: "#10B981",
  },
  {
    key: "salary_ceiling" as const,
    emoji: "\uD83D\uDE80",
    th: "\u0E40\u0E07\u0E34\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14",
    en: "Salary Ceiling",
    max: 0,
    type: "salary" as const,
    colorHigh: "#10B981",
    colorLow: "#10B981",
  },
] as const;

/** Map from CareerMetrics key to metric_details JSONB key */
const DETAIL_KEY_MAP: Record<string, string> = {
  demand_growth: "demand_growth",
  grad_employment_pct: "grad_employment_pct",
  saturation_level: "saturation_level",
  progression_difficulty: "progression_difficulty",
  ai_impact_score: "ai_impact_score",
  salary_floor: "salary_floor",
  salary_ceiling: "salary_ceiling",
};

function formatSalary(value: number, market: MarketRegion): string {
  if (market === "global") {
    return `$${value.toLocaleString()}/mo`;
  }
  return `${value.toLocaleString()}\u0E3F/mo`;
}

function getBarColor(def: (typeof METRIC_DEFS)[number], ratio: number): string {
  if (def.type === "salary") return def.colorHigh;
  if ("invert" in def && def.invert) {
    return ratio > 0.6 ? def.colorHigh : ratio > 0.3 ? "#F59E0B" : def.colorLow;
  }
  return ratio > 0.6 ? def.colorHigh : ratio > 0.3 ? "#F59E0B" : def.colorLow;
}

export function CareerMetricsCard({ metrics, market, onToggleMarket, lang, dark, metricDetails }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const hasAnyData = METRIC_DEFS.some((d) => metrics[d.key] != null);
  if (!hasAnyData) return null;

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      {/* Header with market toggle */}
      <View style={styles.headerRow}>
        <AppText variant="bold" style={[styles.title, dark && styles.titleDark]}>
          {lang === "th" ? "\u0E15\u0E31\u0E27\u0E0A\u0E35\u0E49\u0E27\u0E31\u0E14\u0E2D\u0E32\u0E0A\u0E35\u0E1E" : "Career Metrics"}
        </AppText>
        <View style={[styles.toggleWrap, dark && styles.toggleWrapDark]}>
          <Pressable
            onPress={onToggleMarket}
            style={[
              styles.toggleBtn,
              market === "th" && (dark ? styles.toggleBtnActiveDark : styles.toggleBtnActive),
            ]}
          >
            <AppText
              style={[
                styles.toggleText,
                dark && styles.toggleTextDark,
                market === "th" && styles.toggleTextActive,
              ]}
            >
              {"\uD83C\uDDF9\uD83C\uDDED"} TH
            </AppText>
          </Pressable>
          <Pressable
            onPress={onToggleMarket}
            style={[
              styles.toggleBtn,
              market === "global" && (dark ? styles.toggleBtnActiveDark : styles.toggleBtnActive),
            ]}
          >
            <AppText
              style={[
                styles.toggleText,
                dark && styles.toggleTextDark,
                market === "global" && styles.toggleTextActive,
              ]}
            >
              {"\uD83C\uDF10"} Global
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Metrics rows */}
      {METRIC_DEFS.map((def) => {
        const value = metrics[def.key];
        if (value == null) return null;

        const detailKey = DETAIL_KEY_MAP[def.key];
        const detail = detailKey && metricDetails?.[detailKey];
        const isExpanded = expanded === def.key;
        const hasDetail = !!detail;

        if (def.type === "salary") {
          return (
            <View key={def.key}>
              <Pressable
                onPress={hasDetail ? () => toggleExpand(def.key) : undefined}
                style={styles.row}
              >
                <View style={styles.labelRow}>
                  <AppText style={styles.emoji}>{def.emoji}</AppText>
                  <AppText style={[styles.label, dark && styles.labelDark]}>
                    {lang === "th" ? def.th : def.en}
                  </AppText>
                  {hasDetail && (
                    <AppText style={[styles.chevron, dark && styles.chevronDark]}>
                      {isExpanded ? "\u25B2" : "\u25BC"}
                    </AppText>
                  )}
                </View>
                <AppText variant="bold" style={styles.salaryValue}>
                  {formatSalary(value, market)}
                </AppText>
              </Pressable>
              {isExpanded && detail && (
                <DetailPanel detail={detail} lang={lang} dark={dark} />
              )}
            </View>
          );
        }

        const ratio = value / def.max;
        const color = getBarColor(def, ratio);
        const displayValue = def.type === "pct" ? `${value}%` : `${value}/${def.max}`;

        return (
          <View key={def.key}>
            <Pressable
              onPress={hasDetail ? () => toggleExpand(def.key) : undefined}
              style={styles.row}
            >
              <View style={styles.labelRow}>
                <AppText style={styles.emoji}>{def.emoji}</AppText>
                <AppText style={[styles.label, dark && styles.labelDark]}>
                  {lang === "th" ? def.th : def.en}
                </AppText>
                {hasDetail && (
                  <AppText style={[styles.chevron, dark && styles.chevronDark]}>
                    {isExpanded ? "\u25B2" : "\u25BC"}
                  </AppText>
                )}
              </View>
              <View style={styles.barRow}>
                <View style={[styles.barTrack, dark && styles.barTrackDark]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(ratio * 100, 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <AppText variant="bold" style={[styles.barValue, { color }]}>
                  {displayValue}
                </AppText>
              </View>
            </Pressable>
            {isExpanded && detail && (
              <DetailPanel detail={detail} lang={lang} dark={dark} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function DetailPanel({
  detail,
  lang,
  dark,
}: {
  detail: { th: string; en: string; sources: { title: string; url: string }[] };
  lang: "th" | "en";
  dark?: boolean;
}) {
  return (
    <View style={[styles.detailPanel, dark && styles.detailPanelDark]}>
      <AppText style={[styles.detailText, dark && styles.detailTextDark]}>
        {lang === "th" ? detail.th : detail.en}
      </AppText>
      {detail.sources.length > 0 && (
        <View style={styles.sourcesWrap}>
          <AppText style={[styles.sourcesLabel, dark && styles.sourcesLabelDark]}>
            {lang === "th" ? "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25:" : "Sources:"}
          </AppText>
          {detail.sources.map((src, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(src.url)}
              style={styles.sourceLink}
            >
              <AppText style={styles.sourceLinkText} numberOfLines={1}>
                {src.title}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.xl,
    padding: Space["2xl"],
    marginTop: Space.lg,
    ...Shadow.card,
  },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.xl,
  },
  title: {
    fontSize: 18,
    color: ThemeText.primary,
  },
  titleDark: {
    color: "#FFFFFF",
  },
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: Radius.full,
    padding: 2,
  },
  toggleWrapDark: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  toggleBtnActive: {
    backgroundColor: "#111827",
  },
  toggleBtnActiveDark: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: ThemeText.secondary,
  },
  toggleTextDark: {
    color: "rgba(255,255,255,0.7)",
  },
  toggleTextActive: {
    color: "#fff",
  },
  row: {
    marginBottom: Space.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.xs,
  },
  emoji: {
    fontSize: 16,
    marginRight: Space.sm,
  },
  label: {
    fontSize: 13,
    color: ThemeText.secondary,
    fontWeight: "600",
    flex: 1,
  },
  labelDark: {
    color: "rgba(255,255,255,0.7)",
  },
  chevron: {
    fontSize: 10,
    color: ThemeText.secondary,
    marginLeft: 4,
  },
  chevronDark: {
    color: "rgba(255,255,255,0.5)",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  barTrackDark: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 13,
    minWidth: 42,
    textAlign: "right",
  },
  salaryValue: {
    fontSize: 16,
    color: "#10B981",
    marginLeft: 24,
  },
  detailPanel: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: Radius.lg,
    padding: Space.lg,
    marginTop: -Space.sm,
    marginBottom: Space.lg,
  },
  detailPanelDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  detailText: {
    fontSize: 13,
    lineHeight: 20,
    color: ThemeText.secondary,
  },
  detailTextDark: {
    color: "rgba(255,255,255,0.8)",
  },
  sourcesWrap: {
    marginTop: Space.md,
  },
  sourcesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: ThemeText.secondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourcesLabelDark: {
    color: "rgba(255,255,255,0.5)",
  },
  sourceLink: {
    paddingVertical: 3,
  },
  sourceLinkText: {
    fontSize: 12,
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
});
