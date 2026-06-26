import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppText } from "../../components/AppText";
import {
  COLLECTIONS,
  fetchRadarFields,
  type RadarField,
  type TileSize,
} from "../../lib/radar";
import { useAuth } from "../../lib/auth";
import { PageBg, Text as ThemeText } from "../../lib/theme";
import { Image } from "expo-image";

const SIZE_H: Record<TileSize, number> = { sm: 150, md: 200, lg: 250 };
const GAP = 14;
const H_PAD = 20;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { appLanguage } = useAuth();
  const lang = appLanguage === "th" ? "th" : "en";
  const [collection, setCollection] = useState("all");
  const [fields, setFields] = useState<RadarField[] | null>(null);

  const tileWidth = (width - H_PAD * 2 - GAP) / 2;

  useEffect(() => {
    let alive = true;
    fetchRadarFields(lang).then((f) => {
      if (alive && f.length) setFields(f);
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    if (!fields) return [];
    if (collection === "all") return fields;
    return fields.filter((f) => f.tags.includes(collection));
  }, [collection, fields]);

  // Greedy masonry: drop each tile into the shorter column.
  const columns = useMemo(() => {
    const cols: RadarField[][] = [[], []];
    const heights = [0, 0];
    for (const f of filtered) {
      const c = heights[0] <= heights[1] ? 0 : 1;
      cols[c].push(f);
      heights[c] += SIZE_H[f.size] + GAP;
    }
    return cols;
  }, [filtered]);

  const onOpen = useCallback((f: RadarField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/radar/${f.slug}`);
  }, []);

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 130,
        }}
      >
        {/* header */}
        <View style={styles.header}>
          <AppText style={styles.title}>สำรวจเส้นทาง</AppText>
          <AppText style={styles.subtitle}>
            ค้นพบอาชีพที่คู่แข่งน้อย รายได้ดี และอาจใช่สำหรับเธอ
          </AppText>
        </View>

        {/* collection chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {COLLECTIONS.map((c) => {
            const active = c.key === collection;
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCollection(c.key);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* masonry */}
        {fields ? (
          <View style={styles.masonry}>
            {columns.map((col, ci) => (
              <View key={ci} style={{ width: tileWidth, gap: GAP }}>
                {col.map((f) => (
                  <Tile
                    key={f.slug}
                    field={f}
                    height={SIZE_H[f.size]}
                    onPress={() => onOpen(f)}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <SkeletonMasonry tileWidth={tileWidth} />
        )}
      </ScrollView>
    </View>
  );
}

function SkeletonMasonry({ tileWidth }: { tileWidth: number }) {
  const heights: TileSize[][] = [
    ["lg", "sm", "md"],
    ["md", "lg", "sm"],
  ];

  return (
    <View style={styles.masonry}>
      {heights.map((col, ci) => (
        <View key={ci} style={{ width: tileWidth, gap: GAP }}>
          {col.map((size, i) => (
            <View key={`${size}-${i}`} style={[styles.skeletonTile, { height: SIZE_H[size] }]}>
              <View style={styles.skeletonTopRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonPill} />
              </View>
              <View style={styles.skeletonTextGroup}>
                <View style={[styles.skeletonLine, { width: "74%" }]} />
                <View style={[styles.skeletonLine, { width: "56%" }]} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Tile({
  field,
  height,
  onPress,
}: {
  field: RadarField;
  height: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { height, backgroundColor: field.color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {false && field.heroImage && (
        <>
          <Image
            source={{ uri: field.heroImage }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0, 0, 0, 0.45)" },
            ]}
          />
        </>
      )}
      <View style={styles.tileTop}>
        <AppText style={styles.tileEmoji}>{field.emoji}</AppText>
        {field.ready ? (
          <View style={styles.liveBadge}>
            <AppText style={styles.liveBadgeText}>เปิดแล้ว</AppText>
          </View>
        ) : (
          <View style={styles.soonBadge}>
            <AppText style={styles.soonBadgeText}>เร็วๆ นี้</AppText>
          </View>
        )}
      </View>
      <View>
        <AppText style={styles.tileName}>{field.name}</AppText>
        <AppText style={styles.tileTagline}>{field.tagline}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: PageBg.default },
  header: { paddingHorizontal: H_PAD, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: "800", color: ThemeText.primary },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: ThemeText.secondary,
    marginTop: 6,
    lineHeight: 22,
  },
  chipsRow: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 18 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 14, fontWeight: "700", color: ThemeText.secondary },
  chipTextActive: { color: "#FFFFFF" },
  masonry: {
    flexDirection: "row",
    paddingHorizontal: H_PAD,
    gap: GAP,
  },
  tile: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    justifyContent: "space-between",
  },
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tileEmoji: { fontSize: 38 },
  liveBadge: {
    backgroundColor: "#BFFF00",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveBadgeText: { fontSize: 11, fontWeight: "800", color: "#111827" },
  soonBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  soonBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  tileName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  tileTagline: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 19,
  },
  skeletonTile: {
    borderRadius: 22,
    padding: 16,
    justifyContent: "space-between",
    backgroundColor: "#EEF1F5",
    borderWidth: 1,
    borderColor: "#E3E7EE",
  },
  skeletonTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  skeletonCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DDE3EC",
  },
  skeletonPill: {
    width: 58,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#DDE3EC",
  },
  skeletonTextGroup: { gap: 8 },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#DDE3EC",
  },
});
