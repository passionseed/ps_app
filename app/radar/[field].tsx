import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  useWindowDimensions,
  FlatList,
  ScrollView,
  ActivityIndicator,
  ViewToken,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { AppText } from "../../components/AppText";
import { ViewShot, type ViewShotRef } from "../../lib/hooks/useWrappedShareImage";
import {
  fetchRadarField,
  SQUAD_SIGNUP_URL,
  type RadarCard,
  type RadarField,
} from "../../lib/radar";
import { useAuth } from "../../lib/auth";
import { Accent } from "../../lib/theme";
import { Image } from "expo-image";

// Dark poster backgrounds — each card a distinct screenshottable slide.
const PALETTE = [
  "#1E1B4B", // hook — deep indigo
  "#7C2D12", // fantasy vs reality — burnt
  "#0F766E", // what it is — teal
  "#064E3B", // jobs — emerald
  "#4C1D95", // skills — violet
  "#1E3A8A", // why now — blue
  "#134E4A", // opportunity — dark teal
  "#831843", // proof — magenta
];

const LIME = Accent.yellow; // #BFFF00

type CardTheme = { bg: string; fg: string; accent: string };

function themeFor(card: RadarCard, index: number): CardTheme {
  if (card.kind === "cta") {
    return { bg: LIME, fg: "#111827", accent: "#111827" };
  }
  return { bg: PALETTE[index % PALETTE.length], fg: "#FFFFFF", accent: LIME };
}

export default function RadarCarousel() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { field: slug } = useLocalSearchParams<{ field: string }>();
  const { appLanguage } = useAuth();
  const lang = appLanguage === "th" ? "th" : "en";
  const [field, setField] = useState<RadarField | null | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const shotRefs = useRef<Record<number, ViewShotRef | null>>({});

  useEffect(() => {
    let alive = true;
    fetchRadarField(slug ?? "", lang).then((f) => {
      if (alive) setField(f);
    });
    return () => {
      alive = false;
    };
  }, [slug, lang]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setActiveIndex(first.index);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const ref = shotRefs.current[activeIndex];
      if (!ref) return;
      const uri = await ref.capture();
      const can = await Sharing.isAvailableAsync();
      if (can) await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e) {
      console.warn("[radar] share failed", e);
    }
  }, [activeIndex]);

  const onJoin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(SQUAD_SIGNUP_URL).catch(() => {});
  }, []);

  if (field === undefined) {
    return (
      <View style={[styles.fill, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!field || !field.cards || field.cards.length === 0) {
    return (
      <View style={[styles.fill, styles.center]}>
        <StatusBar style="light" />
        <AppText style={{ color: "#fff", fontSize: 18 }}>เร็วๆ นี้</AppText>
        <Pressable style={styles.comingBack} onPress={() => router.back()}>
          <AppText style={{ color: "#fff", fontWeight: "700" }}>← กลับ</AppText>
        </Pressable>
      </View>
    );
  }

  const cards = field.cards;

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <FlatList
        data={cards}
        keyExtractor={(_, i) => `card-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => {
          const t = themeFor(item, index);
          return (
            <ViewShot
              ref={(r) => {
                shotRefs.current[index] = r;
              }}
              options={{ format: "png", quality: 0.95, result: "tmpfile" }}
              style={{ width, height, backgroundColor: t.bg }}
            >
              {item.image && (
                <>
                  <Image
                    source={{ uri: item.image }}
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
              <ScrollView
                style={{ width, height }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.cardContent,
                  {
                    minHeight: height,
                    paddingTop: insets.top + 56,
                    paddingBottom: insets.bottom + 90,
                  },
                ]}
              >
                <CardBody card={item} theme={t} />
                {item.kind === "cta" && (
                  <View style={{ gap: 12, marginTop: 8 }}>
                    <Pressable
                      style={[styles.joinBtn, { backgroundColor: t.fg }]}
                      onPress={onJoin}
                    >
                      <AppText style={[styles.joinText, { color: t.bg }]}>
                        {item.button}
                      </AppText>
                    </Pressable>
                    {!!item.pathlabSeedId && (
                      <Pressable
                        style={[styles.pathlabBtn, { borderColor: t.fg }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/seed/${item.pathlabSeedId}`);
                        }}
                      >
                        <AppText style={[styles.pathlabText, { color: t.fg }]}>
                          🧪 เริ่ม PathLab{item.pathlabTitle ? `: ${item.pathlabTitle}` : ""}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                )}
              </ScrollView>
            </ViewShot>
          );
        }}
      />

      {/* back button */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <AppText style={styles.backIcon}>✕</AppText>
      </Pressable>

      {/* right action rail — TikTok style */}
      <View style={[styles.rail, { bottom: insets.bottom + 110 }]}>
        <Pressable style={styles.railBtn} onPress={onShare} hitSlop={10}>
          <View style={styles.railIconCircle}>
            <AppText style={styles.railIcon}>↗</AppText>
          </View>
          <AppText style={styles.railLabel}>แชร์</AppText>
        </Pressable>
      </View>

      {/* progress dots — bottom */}
      <View
        style={[styles.dots, { bottom: insets.bottom + 44 }]}
        pointerEvents="none"
      >
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === activeIndex ? 22 : 6,
                backgroundColor:
                  i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.4)",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// Cost level -> money icons; job demand -> fire badge. Bare "High"/"Low" read as
// quality/ranking, so show icons instead.
const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
const COST_ICON: Record<string, string> = { low: "💰", medium: "💰💰", high: "💰💰💰" };
const DEMAND: Record<string, { icon: string; th: string }> = {
  veryhigh: { icon: "🔥🔥🔥", th: "ต้องการสูงมาก" },
  high: { icon: "🔥🔥", th: "ต้องการสูง" },
  medium: { icon: "🔥", th: "ต้องการปานกลาง" },
  low: { icon: "•", th: "ต้องการต่ำ" },
};

function CardBody({ card, theme }: { card: RadarCard; theme: CardTheme }) {
  const { fg, accent } = theme;
  return (
    <View style={styles.body}>
      <AppText style={[styles.eyebrow, { color: accent }]}>
        {card.eyebrow}
      </AppText>
      <AppText style={[styles.title, { color: fg }]}>{card.title}</AppText>

      {card.kind === "hook" && (
        <>
          <AppText style={[styles.bodyText, { color: fg }]}>{card.body}</AppText>
          {!!card.stat && (
            <View style={styles.statWrap}>
              <AppText style={[styles.stat, { color: accent }]}>
                {card.stat}
              </AppText>
              {!!card.statLabel && (
                <AppText style={[styles.statLabel, { color: fg }]}>
                  {card.statLabel}
                </AppText>
              )}
            </View>
          )}
        </>
      )}

      {card.kind === "text" && (
        <AppText style={[styles.bodyText, { color: fg }]}>{card.body}</AppText>
      )}

      {card.kind === "cta" && (
        <AppText style={[styles.bodyText, { color: fg }]}>{card.body}</AppText>
      )}

      {card.kind === "fantasyReality" && (
        <View style={{ gap: 16, marginTop: 8 }}>
          <View style={[styles.frBox, { borderColor: "rgba(255,255,255,0.25)" }]}>
            <AppText style={[styles.frLabel, { color: "rgba(255,255,255,0.6)" }]}>
              ภาพในหัว
            </AppText>
            <AppText style={[styles.frText, { color: fg }]}>
              {card.fantasy}
            </AppText>
          </View>
          <View style={[styles.frBox, { borderColor: accent }]}>
            <AppText style={[styles.frLabel, { color: accent }]}>ของจริง</AppText>
            <AppText style={[styles.frText, { color: fg }]}>
              {card.reality}
            </AppText>
          </View>
        </View>
      )}

      {card.kind === "jobs" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.jobs.map((j, i) => (
            <View key={i} style={styles.jobCard}>
              <AppText style={[styles.jobTitle, { color: fg }]}>{j.title}</AppText>
              {/* 🇹🇭 Thai vs 🌏 global pay side by side */}
              <View style={styles.payWrap}>
                <View style={styles.payCol}>
                  <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.55)" }]}>
                    🇹🇭 ไทย ฿/เดือน
                  </AppText>
                  <AppText style={[styles.jobSalary, { color: accent }]}>{j.salary}</AppText>
                </View>
                {!!j.salaryGlobal && (
                  <View style={styles.payCol}>
                    <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.55)" }]}>
                      🌏 โลก /เดือน
                    </AppText>
                    <AppText style={[styles.jobSalary, { color: fg }]}>{j.salaryGlobal}</AppText>
                    {!!j.salaryGlobalThb && (
                      <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.45)" }]}>
                        {j.salaryGlobalThb}฿
                      </AppText>
                    )}
                  </View>
                )}
              </View>
              {/* live demand signals — each title is evidence, not vibes */}
              <View style={styles.metaWrap}>
                {!!j.demand && DEMAND[norm(j.demand)] && (
                  <View style={styles.metaChip}>
                    <AppText style={styles.metaText}>
                      {DEMAND[norm(j.demand)].icon} {DEMAND[norm(j.demand)].th}
                    </AppText>
                  </View>
                )}
                {!!j.growth && (
                  <View style={[styles.metaChip, { borderColor: accent }]}>
                    <AppText style={[styles.metaText, { color: accent }]}>📈 {j.growth}</AppText>
                  </View>
                )}
                {!!j.openings && (
                  <View style={styles.metaChip}>
                    <AppText style={styles.metaText}>🟢 {j.openings}</AppText>
                  </View>
                )}
              </View>
              {!!j.listingSource && (
                <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.45)" }]}>
                  📋 จาก {j.listingSource}
                  {j.source_refs?.length ? `  ${j.source_refs.map((n) => `[${n}]`).join(" ")}` : ""}
                </AppText>
              )}
              {!!j.jobsdbUrl && (
                <Pressable
                  onPress={() => Linking.openURL(j.jobsdbUrl!).catch(() => {})}
                  style={[styles.jobsdbBtn, { borderColor: accent }]}
                >
                  <AppText style={[styles.metaText, { color: accent }]}>
                    🔎 ดูตำแหน่งบน JobsDB ↗
                  </AppText>
                </Pressable>
              )}
              {/* exact real postings as proof */}
              {j.listings?.length ? (
                <View style={styles.listingWrap}>
                  <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.5)" }]}>
                    ตัวอย่างประกาศจริง
                  </AppText>
                  {j.listings.map((li, li2) => (
                    <Pressable
                      key={li2}
                      disabled={!li.url}
                      onPress={() => li.url && Linking.openURL(li.url).catch(() => {})}
                      style={styles.listingRow}
                    >
                      <AppText style={[styles.listingText, { color: fg }]}>
                        • {li.title}{li.company ? ` @ ${li.company}` : ""}
                        {li.url ? " ↗" : ""}
                      </AppText>
                      {!!li.source && (
                        <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.4)" }]}>
                          {li.source}
                        </AppText>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {!!card.note && (
            <AppText style={[styles.note, { color: "rgba(255,255,255,0.7)" }]}>
              {card.note}
            </AppText>
          )}
        </View>
      )}

      {card.kind === "list" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.items.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <AppText style={[styles.listNum, { color: accent }]}>
                {i + 1}
              </AppText>
              <AppText style={[styles.listText, { color: fg }]}>{item}</AppText>
            </View>
          ))}
        </View>
      )}

      {card.kind === "salaryProgression" && (
        <View style={{ gap: 12, marginTop: 8 }}>
          {card.levels.map((lv, i) => (
            <View key={i} style={styles.salaryCard}>
              <View style={styles.jobRow}>
                <View style={{ flex: 1 }}>
                  {/* money-icon scale grows with seniority */}
                  <AppText style={styles.moneyScale}>
                    {"💰".repeat(Math.min(i + 1, 3))}
                  </AppText>
                  <AppText style={[styles.jobTitle, { color: fg }]}>{lv.level}</AppText>
                  <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.6)" }]}>
                    ⏳ {lv.years} ปี
                  </AppText>
                </View>
                <AppText style={[styles.jobSalary, { color: accent }]}>{lv.salary}</AppText>
              </View>
              {!!lv.note && (
                <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.55)", marginTop: 8 }]}>
                  💡 {lv.note}
                  {lv.source_refs?.length ? `  ${lv.source_refs.map((n) => `[${n}]`).join(" ")}` : ""}
                </AppText>
              )}
            </View>
          ))}
        </View>
      )}

      {card.kind === "growthCompare" && (() => {
        const max = Math.max(...card.items.map((x) => x.growth), 1);
        return (
          <View style={{ gap: 14, marginTop: 8 }}>
            {card.items.map((x, i) => (
              <View key={i} style={{ gap: 6 }}>
                <View style={styles.growthHead}>
                  <AppText
                    style={[
                      styles.growthLabel,
                      { color: x.self ? accent : fg, fontWeight: x.self ? "800" : "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {x.self ? "★ " : ""}{x.label}
                  </AppText>
                  <AppText style={[styles.growthPct, { color: x.self ? accent : fg }]}>
                    +{x.growth}%
                  </AppText>
                </View>
                <View style={styles.growthTrack}>
                  <View
                    style={[
                      styles.growthBar,
                      {
                        width: `${Math.max(8, (x.growth / max) * 100)}%`,
                        backgroundColor: x.self ? accent : "rgba(255,255,255,0.35)",
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
            <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.5)", marginTop: 4 }]}>
              {card.unit}
            </AppText>
          </View>
        );
      })()}

      {card.kind === "aiImpact" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          <View style={[styles.frBox, { borderColor: accent }]}>
            <AppText style={[styles.frLabel, { color: accent }]}>AI ช่วยให้เก่งขึ้น</AppText>
            {card.augmented.map((x, i) => (
              <AppText key={i} style={[styles.frText, { color: fg }]}>• {x}</AppText>
            ))}
          </View>
          <View style={[styles.frBox, { borderColor: "rgba(255,255,255,0.25)" }]}>
            <AppText style={[styles.frLabel, { color: "rgba(255,255,255,0.6)" }]}>AI แทนที่</AppText>
            {card.automated.map((x, i) => (
              <AppText key={i} style={[styles.frText, { color: fg }]}>• {x}</AppText>
            ))}
          </View>
          {!!card.verdict && (
            <AppText style={[styles.bodyText, { color: fg, fontSize: 16 }]}>{card.verdict}</AppText>
          )}
        </View>
      )}

      {card.kind === "marketThailand" && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <AppText style={[styles.bodyText, { color: fg }]}>{card.body}</AppText>
          {!!card.openings && (
            <AppText style={[styles.jobSalary, { color: accent }]}>{card.openings}</AppText>
          )}
          {card.companies?.length > 0 && (
            <View style={styles.chipWrap}>
              {card.companies.map((c, i) => (
                <View key={i} style={styles.companyChip}>
                  <AppText style={[styles.companyText, { color: fg }]}>{c}</AppText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {card.kind === "dayInLife" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.steps.map((s, i) => (
            <View key={i} style={styles.listRow}>
              <AppText style={[styles.timeTag, { color: accent }]}>{s.time}</AppText>
              <AppText style={[styles.listText, { color: fg }]}>{s.label}</AppText>
            </View>
          ))}
        </View>
      )}

      {card.kind === "entryRoutes" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.routes.map((rt, i) => (
            <View key={i} style={[styles.routeCard, { borderColor: "rgba(255,255,255,0.22)" }]}>
              {/* archetype header: icon + Gen Z tag → instant hierarchy */}
              <View style={styles.routeHead}>
                <AppText style={styles.routeIcon}>{rt.icon ?? "🚪"}</AppText>
                <View style={{ flex: 1 }}>
                  {!!rt.tag && (
                    <AppText style={[styles.routeTag, { color: accent }]}>{rt.tag}</AppText>
                  )}
                  {!!rt.subtitle && (
                    <AppText style={[styles.miniLabel, { color: "rgba(255,255,255,0.6)" }]}>
                      {rt.subtitle}
                    </AppText>
                  )}
                </View>
              </View>
              <AppText style={[styles.frText, { color: fg, marginTop: 10 }]}>{rt.route}</AppText>
              {(rt.cost || rt.time) && (
                <View style={[styles.metaWrap, { marginTop: 10 }]}>
                  {!!rt.time && (
                    <View style={styles.metaChip}>
                      <AppText style={styles.metaText}>⏱ {rt.time}</AppText>
                    </View>
                  )}
                  {!!rt.cost && (
                    <View style={styles.metaChip}>
                      <AppText style={styles.metaText}>
                        {COST_ICON[norm(rt.cost)] ? `${COST_ICON[norm(rt.cost)]} ค่าเรียน` : rt.cost}
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {card.kind === "risks" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.risks.map((x, i) => (
            <AppText key={`r${i}`} style={[styles.frText, { color: fg }]}>⚠️ {x}</AppText>
          ))}
          {card.notForYou.length > 0 && (
            <View style={[styles.frBox, { borderColor: "rgba(255,255,255,0.25)", marginTop: 4 }]}>
              <AppText style={[styles.frLabel, { color: "rgba(255,255,255,0.6)" }]}>
                อาจไม่เหมาะ ถ้า
              </AppText>
              {card.notForYou.map((x, i) => (
                <AppText key={`n${i}`} style={[styles.frText, { color: fg }]}>• {x}</AppText>
              ))}
            </View>
          )}
        </View>
      )}

      {card.kind === "realPeople" && (
        <View style={{ gap: 14, marginTop: 8 }}>
          {card.people.map((p, i) => (
            <Pressable
              key={i}
              disabled={!p.url}
              onPress={() => p.url && Linking.openURL(p.url).catch(() => {})}
              style={[styles.frBox, { borderColor: accent }]}
            >
              <AppText style={[styles.jobTitle, { color: accent }]}>{p.role}</AppText>
              <AppText style={[styles.frText, { color: fg, marginTop: 6 }]}>{p.background}</AppText>
              {!!p.url && (
                <AppText style={[styles.note, { color: accent, marginTop: 10 }]}>
                  อ่านเรื่องของเขา{p.publisher ? ` · ${p.publisher}` : ""} ↗
                </AppText>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {card.kind === "sources" && (
        <View style={{ gap: 10, marginTop: 8 }}>
          {card.items.map((s) => (
            <Pressable
              key={s.ref}
              onPress={() => s.url && Linking.openURL(s.url).catch(() => {})}
              style={styles.sourceRow}
            >
              <AppText style={[styles.listNum, { color: accent }]}>{s.ref}</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.sourceTitle, { color: fg }]}>{s.title}</AppText>
                <AppText style={[styles.note, { color: "rgba(255,255,255,0.55)" }]}>
                  {s.publisher} ↗
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {Array.isArray((card as any).source_refs) &&
        (card as any).source_refs.length > 0 && (
          <AppText style={[styles.srcRef, { color: "rgba(255,255,255,0.5)" }]}>
            ที่มา {(card as any).source_refs.map((n: number) => `[${n}]`).join(" ")}
          </AppText>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#111827" },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  comingBack: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cardContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingLeft: 28,
    paddingRight: 80,
  },
  body: { justifyContent: "center" },
  eyebrow: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 14,
  },
  title: { fontSize: 34, fontWeight: "800", lineHeight: 42, marginBottom: 18 },
  bodyText: { fontSize: 19, fontWeight: "500", lineHeight: 30 },
  statWrap: { marginTop: 28, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  stat: { fontSize: 52, fontWeight: "800", lineHeight: 56 },
  statLabel: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  frBox: { borderWidth: 1.5, borderRadius: 18, padding: 18 },
  frLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8, letterSpacing: 0.5 },
  frText: { fontSize: 18, fontWeight: "500", lineHeight: 27 },
  jobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: 12,
  },
  jobTitle: { fontSize: 19, fontWeight: "700", flex: 1 },
  jobSalary: { fontSize: 18, fontWeight: "800" },
  note: { fontSize: 15, fontWeight: "500", marginTop: 6, lineHeight: 22 },
  jobCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  salaryCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
  },
  moneyScale: { fontSize: 15, marginBottom: 4 },
  payWrap: { flexDirection: "row", gap: 20, marginTop: 8 },
  payCol: { gap: 2 },
  listingWrap: {
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  listingRow: { gap: 1 },
  listingText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  jobsdbBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  growthHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  growthLabel: { fontSize: 16, flex: 1 },
  growthPct: { fontSize: 17, fontWeight: "800" },
  growthTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  growthBar: { height: 12, borderRadius: 6 },
  miniLabel: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  routeCard: { borderWidth: 1.5, borderRadius: 18, padding: 18 },
  routeHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: { fontSize: 28 },
  routeTag: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  listNum: { fontSize: 24, fontWeight: "800", width: 28 },
  listText: { fontSize: 19, fontWeight: "600", lineHeight: 28, flex: 1 },
  timeTag: { fontSize: 15, fontWeight: "800", width: 56 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  companyChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  companyText: { fontSize: 14, fontWeight: "700" },
  sourceRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sourceTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  srcRef: { fontSize: 12, fontWeight: "600", marginTop: 16 },
  joinBtn: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  joinText: { fontSize: 18, fontWeight: "800" },
  pathlabBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  pathlabText: { fontSize: 16, fontWeight: "800" },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  rail: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: 22,
  },
  railBtn: { alignItems: "center", gap: 6 },
  railIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  railIcon: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  railLabel: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
});
