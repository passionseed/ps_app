// Career Radar — content for the Explore discovery feed + swipe carousels.
// Tile metadata drives the masonry grid; cards[] drives the TikTok carousel.
// Live content comes from Supabase (radar_fields/radar_cards); the hardcoded
// RADAR_FIELD_LIST below is the offline fallback.
import { supabase } from "./supabase";
import { getSessionId, formatSupabaseError, logEvent } from "./eventLogger";

export type RadarLang = "th" | "en";

// Where "join 7-day squad" sends students. Swap for your LINE OA / Google Form.
export const SQUAD_SIGNUP_URL = "https://forms.gle/REPLACE_ME";

export type RadarCard = (
  | { kind: "hook"; eyebrow: string; title: string; body: string; stat?: string; statLabel?: string }
  | { kind: "fantasyReality"; eyebrow: string; title: string; fantasy: string; reality: string; source_refs?: number[] }
  | { kind: "text"; eyebrow: string; title: string; body: string; source_refs?: number[] }
  | { kind: "jobs"; eyebrow: string; title: string; jobs: { title: string; salary: string; salaryGlobal?: string; salaryGlobalThb?: string; jobsdbUrl?: string; demand?: string; openings?: string; growth?: string; listingSource?: string; listings?: { company: string; title: string; url?: string; source?: string }[]; note?: string; source_refs?: number[] }[]; note?: string; source_refs?: number[] }
  | { kind: "growthCompare"; eyebrow: string; title: string; unit: string; items: { label: string; growth: number; self?: boolean }[] }
  | { kind: "list"; eyebrow: string; title: string; items: string[] }
  | { kind: "cta"; eyebrow: string; title: string; body: string; button: string; pathlabSeedId?: string; pathlabTitle?: string }
  | { kind: "salaryProgression"; eyebrow: string; title: string; levels: { level: string; years: string; salary: string; note?: string; source_refs?: number[] }[]; source_refs?: number[] }
  | { kind: "aiImpact"; eyebrow: string; title: string; augmented: string[]; automated: string[]; verdict: string; source_refs?: number[] }
  | { kind: "marketThailand"; eyebrow: string; title: string; body: string; companies: string[]; openings: string; source_refs?: number[] }
  | { kind: "dayInLife"; eyebrow: string; title: string; steps: { time: string; label: string }[] }
  | { kind: "entryRoutes"; eyebrow: string; title: string; routes: { route: string; cost: string; time: string; icon?: string; tag?: string; subtitle?: string }[] }
  | { kind: "risks"; eyebrow: string; title: string; risks: string[]; notForYou: string[] }
  | { kind: "realPeople"; eyebrow: string; title: string; people: { role: string; background: string; source_ref?: number; url?: string; publisher?: string }[] }
  | { kind: "sources"; eyebrow: string; title: string; items: { ref: number; title: string; publisher: string; url: string }[] }
  // End-of-chapter reflection checkpoint. `rating` shows the emoji 1-5 scale;
  // `chips` are tappable reasons; `allowText` adds an optional free-text box.
  | {
      kind: "reflection";
      eyebrow: string;
      title: string;
      chapterKey: string;
      rating?: boolean;
      chips?: string[];
      allowText?: boolean;
      placeholder?: string;
    }
) & { image?: string };

export type TileSize = "sm" | "md" | "lg";

export interface RadarField {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  color: string; // tile background
  tags: string[]; // collection keys
  size: TileSize; // masonry height
  ready: boolean; // has full carousel content
  cards?: RadarCard[];
  heroImage?: string;
}

// Collection chips (Pinterest-style lists / IG filters).
export const COLLECTIONS: { key: string; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "high-pay", label: "💰 รายได้ดี" },
  { key: "ai-proof", label: "🤖 รอดยุค AI" },
  { key: "trending", label: "🔥 มาแรง" },
  { key: "creative", label: "🎨 สายครีเอทีฟ" },
  { key: "global", label: "🌏 ทำงานทั่วโลก" },
];

const AI_BUSINESS_CARDS: RadarCard[] = [
  {
    kind: "hook",
    eyebrow: "สาย Transforming ที่น่าจับตา",
    title: "AI x ธุรกิจ",
    body: "คู่แข่งน้อย รายได้มั่นคง ใช้ทั้งหัวคิดและความครีเอทีฟ\nนี่อาจเป็นทางของเธอ",
    stat: "30k–150k+",
    statLabel: "บาท/เดือน",
    image: "https://cdn.passionseed.org/pretotype-1781659400219-radar-images/ai-business/hero-1781659399780.webp",
  },
  {
    kind: "fantasyReality",
    eyebrow: "ภาพในหัว vs ของจริง",
    title: "มันไม่ใช่แค่สั่ง AI แล้วรวย",
    fantasy: "นั่งพิมพ์สั่ง AI ทำงานแทนหมด รวยเร็ว นอนอยู่บ้าน",
    reality: "เอา AI ไปแก้ปัญหาธุรกิจจริง — เข้าใจลูกค้า ลดต้นทุน ทำให้ทีมตัดสินใจเร็วขึ้น",
  },
  {
    kind: "text",
    eyebrow: "มันคืออะไรกันแน่",
    title: "คนตรงกลางระหว่างธุรกิจกับ AI",
    body: "เธอไม่ต้องเขียนโค้ดเก่งที่สุดในห้อง แต่เธอรู้ว่าจะเอา AI ไปสร้างมูลค่าตรงไหน นั่นคือสกิลที่หายากและมีค่า",
    image: "https://cdn.passionseed.org/pretotype-1781659432694-radar-images/ai-business/card-pos-2-1781659432204.webp",
  },
  {
    kind: "reflection",
    eyebrow: "ลองถามใจตัวเองดู",
    title: "อยากลองทางนี้แค่ไหน?",
    chapterKey: "what-it-is",
    rating: true,
  },
  {
    kind: "jobs",
    eyebrow: "ทางนี้พาไปไหนได้บ้าง",
    title: "งานจริง + เงินจริง",
    jobs: [
      { title: "AI Product Manager", salary: "60k–150k+" },
      { title: "AI Business Analyst", salary: "35k–80k" },
      { title: "Automation Consultant", salary: "40k–100k" },
      { title: "AI Marketing Strategist", salary: "30k–90k" },
    ],
    note: "จบใหม่เริ่ม ~30–45k โตเร็วมากถ้าทำของจริงได้",
  },
  {
    kind: "list",
    eyebrow: "ต้องมีสกิลอะไร",
    title: "5 อย่างที่ทำให้เธอเก่งทางนี้",
    items: [
      "เข้าใจปัญหาธุรกิจ ไม่ใช่แค่เทค",
      "ใช้ AI tools คล่อง (GPT, automation)",
      "อ่านข้อมูลและตัวเลขเป็น",
      "เล่าเรื่องให้คนตัดสินใจตาม",
      "อยากรู้อยากลองตลอดเวลา",
    ],
  },
  {
    kind: "reflection",
    eyebrow: "ลองถามใจตัวเองดู",
    title: "อะไรที่ดึงดูดเธอในทางนี้?",
    chapterKey: "money-jobs",
    chips: ["เงินดี", "ดูสนุก", "ท้าทาย", "อิสระ", "ได้ช่วยคน", "มาแรง"],
    allowText: true,
  },
  {
    kind: "text",
    eyebrow: "ทำไมต้องตอนนี้",
    title: "ช่องนี้เพิ่งเปิด",
    body: "งานออฟฟิศเดิมๆ AI แทนได้เยอะขึ้นทุกวัน แต่คนที่ 'สั่ง AI เป็น' กลับยิ่งมีค่า เข้าตอนนี้คือมาก่อนคนอื่น",
  },
  {
    kind: "text",
    eyebrow: "โอกาสในไทย + ทั่วโลก",
    title: "บริษัทอยากได้ แต่หาคนไม่ได้",
    body: "ไทยเพิ่งเริ่ม บริษัทอยากใช้ AI แต่หาคนเชื่อมธุรกิจกับ AI แทบไม่เจอ และสกิลนี้ทำงาน remote ให้ทั่วโลกได้ด้วย",
  },
  {
    kind: "text",
    eyebrow: "พิสูจน์ตัวเองยังไง",
    title: "ไม่ต้องรอจบมหาลัย",
    body: "เอา AI ไปช่วยร้าน/เพจจริง 1 ที่ ทำ automation ลดงาน 1 อย่าง แล้วเล่าเป็นเคส นั่นคือพอร์ตของเธอตั้งแต่วันนี้",
  },
  {
    kind: "reflection",
    eyebrow: "ลองถามใจตัวเองดู",
    title: "ทำไมเธอถึงสนใจทางนี้?",
    chapterKey: "you-in-it",
    chips: ["ตรงกับตัวฉัน", "อยากเก่งด้านนี้", "อนาคตดี", "ยังไม่แน่ใจ"],
    allowText: true,
    placeholder: "เขียนสั้นๆ ก็ได้...",
  },
  {
    kind: "cta",
    eyebrow: "ลองของจริง 7 วัน",
    title: "ทางนี้ใช่เธอจริงไหม?",
    body: "เข้า squad 8–12 คน ทำภารกิจทดสอบเส้นทางนี้ จบแล้วได้ Career Evidence Report ของตัวเอง",
    button: "เข้าร่วม 7-Day Squad",
  },
];

// Ordered for the masonry feed. Only `ready` fields open a full carousel.
export const RADAR_FIELD_LIST: RadarField[] = [
  {
    slug: "ai-business",
    name: "AI x ธุรกิจ",
    tagline: "คู่แข่งน้อย รายได้มั่นคง",
    emoji: "🤖",
    color: "#1E1B4B",
    tags: ["high-pay", "ai-proof", "trending", "global"],
    size: "lg",
    ready: true,
    cards: AI_BUSINESS_CARDS,
    heroImage: "https://cdn.passionseed.org/pretotype-1781659400219-radar-images/ai-business/hero-1781659399780.webp",
  },
  {
    slug: "ux-design",
    name: "UX / UI ดีไซน์",
    tagline: "สายครีเอทีฟที่บริษัทแย่งตัว",
    emoji: "🎨",
    color: "#7C2D12",
    tags: ["creative", "high-pay", "global"],
    size: "md",
    ready: false,
    heroImage: "https://cdn.passionseed.org/pretotype-1781659499468-radar-images/ux-design/hero-1781659499058.webp",
  },
  {
    slug: "data-analyst",
    name: "Data Analyst",
    tagline: "ตัวเลขเล่าเรื่องได้เงิน",
    emoji: "📊",
    color: "#0F766E",
    tags: ["high-pay", "ai-proof", "trending"],
    size: "sm",
    ready: false,
  },
  {
    slug: "fintech",
    name: "การเงิน x เทค",
    tagline: "เงินไหลผ่านมือคนเข้าใจระบบ",
    emoji: "💸",
    color: "#064E3B",
    tags: ["high-pay", "trending", "global"],
    size: "md",
    ready: false,
  },
  {
    slug: "cybersecurity",
    name: "ความปลอดภัยไซเบอร์",
    tagline: "โลกยิ่งออนไลน์ ยิ่งต้องการ",
    emoji: "🛡️",
    color: "#1E3A8A",
    tags: ["ai-proof", "high-pay", "global"],
    size: "lg",
    ready: false,
  },
  {
    slug: "content-creator",
    name: "คอนเทนต์มืออาชีพ",
    tagline: "ครีเอเตอร์ที่อยู่รอดระยะยาว",
    emoji: "🎬",
    color: "#831843",
    tags: ["creative", "trending"],
    size: "sm",
    ready: false,
  },
  {
    slug: "supply-chain",
    name: "โลจิสติกส์ / ซัพพลายเชน",
    tagline: "เส้นเลือดของทุกธุรกิจ",
    emoji: "🚚",
    color: "#4C1D95",
    tags: ["ai-proof", "global"],
    size: "md",
    ready: false,
  },
  {
    slug: "biotech",
    name: "เทคโนโลยีชีวภาพ",
    tagline: "วิทย์ + ธุรกิจแห่งอนาคต",
    emoji: "🧬",
    color: "#134E4A",
    tags: ["trending", "global"],
    size: "sm",
    ready: false,
  },
];

export const RADAR_FIELDS: Record<string, RadarField> = Object.fromEntries(
  RADAR_FIELD_LIST.map((f) => [f.slug, f]),
);

export function getRadarField(slug: string): RadarField | undefined {
  return RADAR_FIELDS[slug];
}

// ── Supabase-backed fetches ──────────────────────────────────────────────────

function isLocalizedObject(value: unknown): value is Record<RadarLang, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return "th" in record || "en" in record;
}

function localizeValue(value: unknown, lang: RadarLang): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => localizeValue(item, lang));
  }
  if (!value || typeof value !== "object") return value;

  if (isLocalizedObject(value)) {
    return localizeValue(value[lang] ?? value.th ?? value.en ?? "", lang);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, localizeValue(nested, lang)]),
  );
}

function rowToField(row: any, lang: RadarLang): RadarField {
  return {
    slug: row.slug,
    name: lang === "th" ? row.name_th : row.name_en,
    tagline: lang === "th" ? row.tagline_th : row.tagline_en,
    emoji: row.emoji,
    color: row.color,
    tags: row.tags ?? [],
    size: (row.tile_size ?? "md") as TileSize,
    ready: !!row.has_content,
    heroImage: row.hero_image_url ?? undefined,
  };
}

function rowToCard(row: any, lang: RadarLang): RadarCard {
  const content = (lang === "en" ? row.content_en : null) ?? row.content_th;
  const localized = localizeValue(content, lang);
  return {
    kind: row.kind,
    ...(localized && typeof localized === "object" ? localized : {}),
    image: row.image_url ?? undefined,
  } as RadarCard;
}

// Feed tiles. Falls back to the hardcoded list on any error/empty.
export async function fetchRadarFields(lang: RadarLang): Promise<RadarField[]> {
  try {
    const { data, error } = await supabase
      .from("radar_fields")
      .select("*")
      .order("sort_order");
    if (error || !data?.length) return RADAR_FIELD_LIST;
    return data.map((r) => rowToField(r, lang));
  } catch {
    return RADAR_FIELD_LIST;
  }
}

// One field + its carousel cards. null = not found; falls back to hardcoded.
export async function fetchRadarField(
  slug: string,
  lang: RadarLang,
): Promise<RadarField | null> {
  try {
    const { data: f, error } = await supabase
      .from("radar_fields")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !f) return getRadarField(slug) ?? null;
    const { data: cards } = await supabase
      .from("radar_cards")
      .select("*")
      .eq("field_id", f.id)
      .order("position");
    return {
      ...rowToField(f, lang),
      cards: (cards ?? []).map((c) => rowToCard(c, lang)),
    };
  } catch {
    return getRadarField(slug) ?? null;
  }
}

// ── Reflection capture ───────────────────────────────────────────────────────

export interface ReflectionInput {
  fieldSlug: string;
  chapterKey: string;
  lang: RadarLang;
  wantToTry?: number; // 1-5; omitted on text-only chapters
  tags?: string[]; // tapped reason chips
  responseText?: string;
}

/**
 * Persist a chapter-checkpoint reflection for logged-in users. Guest answers
 * still unlock the carousel locally; this is a no-op without a Supabase user.
 * Reuses the eventLogger session id + error formatting; fail-silent.
 */
export async function logReflection(input: ReflectionInput): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // logged-in only

    const sessionId = await getSessionId();

    // Clamp score into 1-5; drop if out of range / absent.
    const wantToTry =
      typeof input.wantToTry === "number" && Number.isFinite(input.wantToTry)
        ? Math.min(5, Math.max(1, Math.round(input.wantToTry)))
        : null;

    const responseText = input.responseText?.trim().slice(0, 500) || null;
    const tags = (input.tags ?? []).filter((t) => !!t).slice(0, 12);

    const { error } = await supabase.from("radar_reflections").insert({
      user_id: user.id,
      session_id: sessionId,
      field_slug: input.fieldSlug,
      chapter_key: input.chapterKey,
      want_to_try: wantToTry,
      tags,
      response_text: responseText,
      lang: input.lang,
    });

    if (error) {
      console.warn("[radar] reflection insert failed:", formatSupabaseError(error));
    }

    // Mirror into the analytics pipeline (user_events) so reflections show up in
    // funnels / journey alongside everything else. No free text — signal only.
    await logEvent("radar_reflection_submitted", {
      field_slug: input.fieldSlug,
      chapter_key: input.chapterKey,
      want_to_try: wantToTry,
      tag_count: tags.length,
      has_text: !!responseText,
    });
  } catch (e) {
    console.warn("[radar] reflection unexpected error:", formatSupabaseError(e));
    // Fail-silent: never block the carousel.
  }
}
