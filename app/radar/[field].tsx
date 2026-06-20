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
  TextInput,
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
  logReflection,
  SQUAD_SIGNUP_URL,
  type RadarCard,
  type RadarField,
} from "../../lib/radar";
import { useAuth } from "../../lib/auth";
import { Accent } from "../../lib/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

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
type SourceItem = { ref: number; title: string; publisher: string; url: string };
type SourceMap = Record<number, SourceItem>;

function themeFor(card: RadarCard, index: number): CardTheme {
  if (card.kind === "cta") {
    return { bg: LIME, fg: "#111827", accent: "#111827" };
  }
  return { bg: PALETTE[index % PALETTE.length], fg: "#FFFFFF", accent: LIME };
}

function reflectionKey(card: RadarCard, index: number): string {
  return card.kind === "reflection" ? `${index}:${card.chapterKey}` : `${index}`;
}

function uniqueRefs(refs: Array<number | undefined | null>): number[] {
  return Array.from(
    new Set(refs.filter((ref): ref is number => typeof ref === "number" && Number.isFinite(ref))),
  );
}

function getCardSourceRefs(card: RadarCard): number[] {
  const rootRefs = Array.isArray((card as any).source_refs) ? (card as any).source_refs : [];

  if (card.kind === "jobs") {
    return uniqueRefs([
      ...rootRefs,
      ...card.jobs.flatMap((job) => (Array.isArray(job.source_refs) ? job.source_refs : [])),
    ]);
  }

  if (card.kind === "salaryProgression") {
    return uniqueRefs([
      ...rootRefs,
      ...card.levels.flatMap((level) =>
        Array.isArray(level.source_refs) ? level.source_refs : [],
      ),
    ]);
  }

  if (card.kind === "realPeople") {
    return uniqueRefs([
      ...rootRefs,
      ...card.people.map((person) => person.source_ref),
    ]);
  }

  return uniqueRefs(rootRefs);
}

function progressIconFor(card: RadarCard): string {
  switch (card.kind) {
    case "reflection":
      return "?";
    case "jobs":
    case "salaryProgression":
      return "$";
    case "sources":
      return "i";
    case "cta":
      return "↗";
    default:
      return "•";
  }
}

export default function RadarCarousel() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { field: slug } = useLocalSearchParams<{ field: string }>();
  const { appLanguage } = useAuth();
  const lang = appLanguage === "th" ? "th" : "en";
  const [field, setField] = useState<RadarField | null | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answeredReflections, setAnsweredReflections] = useState<Set<string>>(() => new Set());
  const listRef = useRef<FlatList<RadarCard>>(null);
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

  const onReflectionAnswered = useCallback((key: string, answered: boolean) => {
    setAnsweredReflections((prev) => {
      const next = new Set(prev);
      if (answered) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
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
  const sourceMap: SourceMap = Object.fromEntries(
    cards
      .flatMap((card) => (card.kind === "sources" ? card.items : []))
      .map((source) => [source.ref, source]),
  );
  const firstBlockingIndex = cards.findIndex(
    (card, index) =>
      card.kind === "reflection" &&
      !answeredReflections.has(reflectionKey(card, index)),
  );
  const activeCard = cards[activeIndex];
  const activeReflectionLocked =
    activeCard?.kind === "reflection" &&
    !answeredReflections.has(reflectionKey(activeCard, activeIndex));
  const maxReachableIndex = firstBlockingIndex === -1 ? cards.length - 1 : firstBlockingIndex;

  const goToIndex = (index: number) => {
    if (index > maxReachableIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(_, i) => `card-${i}`}
        horizontal
        pagingEnabled
        scrollEnabled={!activeReflectionLocked}
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
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "rgba(0,0,0,0)", "rgba(0,0,0,0.45)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {false && item.image && (
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
                <CardBody
                  card={item}
                  index={index}
                  theme={t}
                  fieldSlug={slug ?? ""}
                  lang={lang}
                  sourceMap={sourceMap}
                  onReflectionAnswered={onReflectionAnswered}
                />
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
        style={[styles.pageControlWrap, { bottom: insets.bottom + 34 }]}
      >
        <View style={styles.dots}>
          {cards.map((card, i) => {
            const locked = i > maxReachableIndex;
            const active = i === activeIndex;
            const reflectionAnswered =
              card.kind !== "reflection" ||
              answeredReflections.has(reflectionKey(card, i));
            return (
              <Pressable
                key={i}
                onPress={() => goToIndex(i)}
                disabled={locked}
                hitSlop={8}
                style={[
                  styles.dotTap,
                  active && styles.dotTapActive,
                  locked && styles.dotTapLocked,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                    card.kind === "reflection" &&
                      !reflectionAnswered &&
                      styles.dotReflection,
                    locked && styles.dotLocked,
                  ]}
                >
                  {active && (
                    <AppText
                      style={styles.dotIcon}
                    >
                      {progressIconFor(card)}
                    </AppText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        {activeReflectionLocked && (
          <AppText style={styles.unlockHint}>
            {lang === "th" ? "ตอบ reflection ก่อน เพื่อไปต่อ" : "Answer this reflection to continue"}
          </AppText>
        )}
      </View>
    </View>
  );
}

// Cost level -> money icons; job demand -> fire badge. Bare "High"/"Low" read as
// quality/ranking, so show icons instead.
const norm = (s: any) => String(s || "").toLowerCase().replace(/[\s_-]/g, "");
const renderStr = (val: any) => typeof val === "object" ? (val?.th || val?.en || "") : val;
const COST_ICON: Record<string, string> = { low: "💰", medium: "💰💰", high: "💰💰💰" };
const DEMAND: Record<string, { icon: string; th: string }> = {
  veryhigh: { icon: "🔥🔥🔥", th: "ต้องการสูงมาก" },
  high: { icon: "🔥🔥", th: "ต้องการสูง" },
  medium: { icon: "🔥", th: "ต้องการปานกลาง" },
  low: { icon: "•", th: "ต้องการต่ำ" },
};

// Emoji 1-5 want-to-try scale. Index 0 = least, 4 = most → stored as 1..5.
const RATING_EMOJI = ["😴", "😐", "🙂", "😍", "🔥"];

const REFLECT_COPY = {
  th: { save: "บันทึก", saved: "บันทึกแล้ว แก้ไขได้", saving: "กำลังบันทึก...", more: "อยากบอกเพิ่ม?" },
  en: { save: "Save", saved: "Saved. Editable.", saving: "Saving...", more: "Want to add more?" },
};

function ReflectionCard({
  card,
  index,
  theme,
  fieldSlug,
  lang,
  onAnsweredChange,
}: {
  card: Extract<RadarCard, { kind: "reflection" }>;
  index: number;
  theme: CardTheme;
  fieldSlug: string;
  lang: "th" | "en";
  onAnsweredChange: (key: string, answered: boolean) => void;
}) {
  const { fg, accent, bg } = theme;
  const copy = REFLECT_COPY[lang];
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const hasAnswer =
    (card.rating ? rating != null : false) ||
    tags.length > 0 ||
    text.trim().length > 0;
  const answerSignature = JSON.stringify({ rating, tags, text: text.trim() });
  const isSaved = hasAnswer && lastSavedSignature === answerSignature;

  useEffect(() => {
    onAnsweredChange(reflectionKey(card, index), hasAnswer);
  }, [card, hasAnswer, index, onAnsweredChange]);

  const toggleTag = (t: string) => {
    Haptics.selectionAsync();
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const pickRating = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(i + 1);
  };

  const canSubmit = hasAnswer && !saving && !isSaved;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logReflection({
      fieldSlug,
      chapterKey: card.chapterKey,
      lang,
      wantToTry: card.rating ? rating ?? undefined : undefined,
      tags,
      responseText: text,
    });
    setLastSavedSignature(answerSignature);
    setSaving(false);
  };

  return (
    <View style={{ marginTop: 12, gap: 18 }}>
      {card.rating && (
        <View style={styles.emojiRow}>
          {RATING_EMOJI.map((e, i) => (
            <Pressable key={i} onPress={() => pickRating(i)} hitSlop={6}>
              <AppText
                style={[
                  styles.emojiFace,
                  { opacity: rating == null || rating === i + 1 ? 1 : 0.35 },
                  rating === i + 1 && styles.emojiFaceActive,
                ]}
              >
                {e}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {!!card.chips?.length && (
        <View style={styles.chipWrap}>
          {card.chips.map((c) => {
            const on = tags.includes(c);
            return (
              <Pressable
                key={c}
                onPress={() => toggleTag(c)}
                style={[
                  styles.reflectChip,
                  { borderColor: on ? accent : "rgba(255,255,255,0.3)" },
                  on && { backgroundColor: accent },
                ]}
              >
                <AppText style={[styles.reflectChipText, { color: on ? bg : fg }]}>{c}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      {card.allowText && (
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={card.placeholder ?? copy.more}
          placeholderTextColor="rgba(255,255,255,0.5)"
          multiline
          maxLength={500}
          style={[styles.reflectInput, { color: fg, borderColor: "rgba(255,255,255,0.25)" }]}
        />
      )}

      <Pressable
        disabled={!canSubmit}
        style={[styles.reflectBtn, { backgroundColor: fg, opacity: canSubmit ? 1 : 0.55 }]}
        onPress={onSubmit}
      >
        <AppText style={[styles.reflectBtnText, { color: bg }]}>
          {saving ? copy.saving : isSaved ? copy.saved : copy.save}
        </AppText>
      </Pressable>
    </View>
  );
}

function SourceRefChips({
  refs,
  sourceMap,
  accent,
  fg,
  lang,
}: {
  refs: number[];
  sourceMap: SourceMap;
  accent: string;
  fg: string;
  lang: "th" | "en";
}) {
  const sources = refs.map((ref) => sourceMap[ref]).filter(Boolean);
  if (!sources.length) return null;

  return (
    <View style={styles.sourceChipBlock}>
      <AppText style={[styles.sourceChipLabel, { color: "rgba(255,255,255,0.55)" }]}>
        {lang === "th" ? "อ้างอิง" : "Credits"}
      </AppText>
      <View style={styles.sourceChipRow}>
        {sources.map((source) => (
          <Pressable
            key={source.ref}
            onPress={() => Linking.openURL(source.url).catch(() => {})}
            style={[styles.sourceChip, { borderColor: accent }]}
          >
            <AppText style={[styles.sourceChipText, { color: fg }]}>
              Ref {source.ref} ↗
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CardBody({
  card,
  index,
  theme,
  fieldSlug,
  lang,
  sourceMap,
  onReflectionAnswered,
}: {
  card: RadarCard;
  index: number;
  theme: CardTheme;
  fieldSlug: string;
  lang: "th" | "en";
  sourceMap: SourceMap;
  onReflectionAnswered: (key: string, answered: boolean) => void;
}) {
  const { fg, accent } = theme;
  const sourceRefs = getCardSourceRefs(card);
  return (
    <View style={styles.body}>
      <AppText style={[styles.eyebrow, { color: accent }]}>
        {card.eyebrow}
      </AppText>
      <AppText style={[styles.title, { color: fg }]}>{card.title}</AppText>

      {card.kind === "reflection" && (
        <ReflectionCard
          card={card}
          index={index}
          theme={theme}
          fieldSlug={fieldSlug}
          lang={lang}
          onAnsweredChange={onReflectionAnswered}
        />
      )}

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
              <AppText style={[styles.frText, { color: fg, marginTop: 10 }]}>{renderStr(rt.route)}</AppText>
              {(rt.cost || rt.time) && (
                <View style={[styles.metaWrap, { marginTop: 10 }]}>
                  {!!rt.time && (
                    <View style={styles.metaChip}>
                      <AppText style={styles.metaText}>⏱ {renderStr(rt.time)}</AppText>
                    </View>
                  )}
                  {!!rt.cost && (
                    <View style={styles.metaChip}>
                      <AppText style={styles.metaText}>
                        {COST_ICON[norm(renderStr(rt.cost))] ? `${COST_ICON[norm(renderStr(rt.cost))]} ค่าเรียน` : renderStr(rt.cost)}
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

      <SourceRefChips
        refs={sourceRefs}
        sourceMap={sourceMap}
        accent={accent}
        fg={fg}
        lang={lang}
      />
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
  sourceChipBlock: { marginTop: 18, gap: 8 },
  sourceChipLabel: { fontSize: 12, fontWeight: "700" },
  sourceChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sourceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sourceChipText: { fontSize: 12, fontWeight: "800" },
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
  pageControlWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 8,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(20,20,20,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  dotTap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  dotTapActive: { width: 28, height: 20, borderRadius: 10 },
  dotTapLocked: { opacity: 0.45 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  dotActive: {
    width: 24,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dotReflection: {
    backgroundColor: Accent.yellow,
  },
  dotLocked: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  dotIcon: { fontSize: 10, fontWeight: "900", lineHeight: 12 },
  unlockHint: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
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
  // reflection checkpoint
  emojiRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  emojiFace: { fontSize: 40 },
  emojiFaceActive: { transform: [{ scale: 1.25 }] },
  reflectChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reflectChipText: { fontSize: 16, fontWeight: "700" },
  reflectInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    fontSize: 17,
    fontWeight: "500",
    minHeight: 80,
    textAlignVertical: "top",
  },
  reflectBtn: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  reflectBtnText: { fontSize: 17, fontWeight: "800" },
});
