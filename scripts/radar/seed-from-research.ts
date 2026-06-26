#!/usr/bin/env tsx
/**
 * Seed Career Radar from a research JSON blob.
 *
 * Reads scripts/radar/output/<slug>.json (produced by research_field.py,
 * shaped per docs/CAREER_RADAR_RESEARCH_BRIEF.md), then upserts:
 *   radar_fields (1) + radar_sources (N) + radar_cards (M, generated).
 *
 * Cards are generated for the kinds the carousel renders today
 * (hook, fantasyReality, text, jobs, list, cta). Deeper kinds
 * (dayInLife, salaryProgression, ...) are archived in radar_fields.research
 * and become cards once their renderers exist.
 *
 * Usage:
 *   npx tsx scripts/radar/seed-from-research.ts ai-business
 *   npx tsx scripts/radar/seed-from-research.ts path/to/custom.json
 *
 * Env (.env / .env.local): EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join, isAbsolute } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });
// .env.local overrides .env so scripts target LOCAL Supabase by default.
// Pass --remote (or RADAR_SEED_REMOTE=1) to target CLOUD (.env values only).
const REMOTE =
  process.argv.includes("--remote") || process.env.RADAR_SEED_REMOTE === "1";
if (!REMOTE) {
  dotenv.config({ path: join(__dirname, "..", "..", ".env.local"), override: true });
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Need EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

type Lang = "th" | "en";
type Loc = { th?: string; en?: string };
const L = (o: Loc | undefined, lang: Lang) => o?.[lang] ?? o?.th ?? "";
const k = (n: number) => `${Math.round(n / 1000)}k`;
// Global salaries arrive as {min,max,currency} (usually USD/mo) — symbolize.
const CUR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", THB: "฿" };
const moneyG = (m: any) =>
  m ? `${CUR_SYM[m.currency] ?? ""}${k(m.min)}–${CUR_SYM[m.currency] ?? ""}${k(m.max)}` : "";
// Approx FX so Thai students can compare global pay in ฿. Rough, label as "≈".
const FX: Record<string, number> = { USD: 36, EUR: 39, GBP: 46, THB: 1 };
const moneyGThb = (m: any) => {
  if (!m) return "";
  const r = FX[m.currency] ?? 36;
  return `≈฿${k(m.min * r)}–${k(m.max * r)}`;
};
// Real JobsDB search link per role (English title -> slug). Always valid even
// when the agent found no exact posting URL.
const jobsdbUrl = (title: string) =>
  `https://th.jobsdb.com/${String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-jobs`;
// Max YoY demand growth across a field's jobs — the field's headline growth.
const fieldGrowth = (res: any) =>
  Math.max(0, ...((res?.jobs ?? []).map((j: any) => num(j.growth_pct))));
// Research values arrive as Loc, string, or number — flatten to a display string.
const asText = (v: any, lang: Lang) =>
  v == null ? "" : typeof v === "object" ? L(v, lang) : String(v);
// Agents sometimes wrap numbers as {value,source_refs} — extract the number.
const num = (v: any): number =>
  v == null ? 0 : typeof v === "object" ? Number(v.value) || 0 : Number(v) || 0;
// growth_pct: number 18 -> "+18%"; tolerate {value} / strings.
const pct = (v: any) => {
  const n = num(v);
  return n ? `+${n}%` : typeof v === "string" ? v : "";
};

// "GEN Zify" the entry routes: each route gets an archetype with a punchy
// bilingual tag + icon, so the card reads as a hierarchy of vibes, not a table.
const ROUTE_ARCHETYPE: Record<string, { icon: string; tag: Loc; sub: Loc }> = {
  degree: {
    icon: "🎓",
    tag: { th: "สายปริญญา", en: "The Degree Path" },
    sub: { th: "ทางการ มั่นคง แต่ใช้เวลานาน", en: "Official, stable, slow burn" },
  },
  fast: {
    icon: "⚡",
    tag: { th: "ทางลัดสายเร่ง", en: "The Fast Track" },
    sub: { th: "คอร์ส + ลงมือทำจริง", en: "Courses + real reps" },
  },
  self: {
    icon: "🛠️",
    tag: { th: "สายลุยเอง", en: "Self-Made" },
    sub: { th: "ฟรี/ถูก ขยันเอาเอง", en: "Cheap, DIY, self-driven" },
  },
};
function routeArchetype(rt: any): "degree" | "fast" | "self" {
  const a = String(rt.archetype ?? "").toLowerCase();
  if (a in ROUTE_ARCHETYPE) return a as "degree" | "fast" | "self";
  const t = String(rt.time ?? "").toLowerCase();
  const yrs = parseFloat(t);
  if (/year|ปี/.test(t) && yrs >= 3) return "degree";
  if (String(rt.cost ?? "").toLowerCase() === "low") return "self";
  return "fast";
}

// Agents say "large"/"medium"/"small"; the CHECK wants sm/md/lg.
const TILE: Record<string, string> = {
  large: "lg", lg: "lg", medium: "md", md: "md", small: "sm", sm: "sm",
};
const tileSize = (v: string | undefined) => TILE[(v ?? "md").toLowerCase()] ?? "md";

// Sources arrive as "2026", "2026-01", or "2026-01-15" — coerce to a valid date or null.
function toDate(s: string | undefined): string | null {
  if (!s) return null;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// Bilingual eyebrows for generated cards.
const T = (th: string, en: string, lang: Lang) => (lang === "th" ? th : en);
const CTA_BTN = { th: "เข้าร่วม 7-Day Squad", en: "Join the 7-Day Squad" };

function pathTypeLabel(r: any, lang: Lang): string {
  const tags = new Set((r.tags ?? []).map((tag: string) => String(tag).toLowerCase()));
  const growth = fieldGrowth(r);
  if (tags.has("trending") || growth >= 20) return T("สาย Rising ที่กำลังมา", "Rising path", lang);
  if (tags.has("ai-proof")) return T("สาย Transforming ในยุค AI", "Transforming path", lang);
  if (tags.has("creative")) return T("สาย Mainstream ที่ยังมีช่องว่าง", "Mainstream path", lang);
  if (tags.has("global")) return T("สาย Emerging ที่เปิดสู่โลก", "Emerging path", lang);
  return T("สาย Underrated ที่น่าจับตา", "Underrated path", lang);
}

// Link a radar field to an existing PathLab seed (matched by seed title).
// Edit here to point a field at its deep-dive PathLab. null = no pathlab.
const PATHLAB_LINKS: Record<string, string> = {
  "ai-business": "AI 101",
  // "ux-design": "...",  // no UX pathlab yet
};
const LEVEL: Record<string, Loc> = {
  junior: { th: "เริ่มต้น", en: "Junior" },
  entry: { th: "เริ่มต้น", en: "Entry" },
  mid: { th: "ระดับกลาง", en: "Mid" },
  senior: { th: "ระดับสูง", en: "Senior" },
  lead: { th: "ระดับนำ", en: "Lead" },
};

interface CardOut {
  position: number;
  kind: string;
  content_th: any;
  content_en: any;
  image_url?: string | null;
  image_license?: string | null;
  image_credit?: string | null;
}

type GrowthCmp = { self: number; others: { name_th: string; name_en: string; growth: number }[] };

// Build the full carousel from the research blob. Skips sections the agent omitted.
function buildCards(r: any, growth?: GrowthCmp): CardOut[] {
  const cards: CardOut[] = [];
  let pos = 0;
  const push = (kind: string, build: (lang: Lang) => any, imgSource?: any) =>
    cards.push({
      position: pos++,
      kind,
      content_th: build("th"),
      content_en: build("en"),
      image_url: imgSource?.url || null,
      image_license: imgSource?.license || null,
      image_credit: imgSource?.credit || null,
    });

  // 0 hook
  const topJob = r.jobs?.[0];
  push("hook", (lang) => ({
    eyebrow: pathTypeLabel(r, lang),
    title: L(r.name, lang),
    body: L(r.summary ?? r.tagline, lang),
    ...(topJob?.salary_thb_month && {
      stat: `${k(topJob.salary_thb_month.min)}–${k(topJob.salary_thb_month.max)}+`,
      statLabel: T("บาท/เดือน", "THB/mo", lang),
    }),
  }), r.hero_image?.image_source);

  // 1 fantasy vs reality
  if (r.fantasy_vs_reality)
    push("fantasyReality", (lang) => ({
      eyebrow: T("ภาพในหัว vs ของจริง", "Fantasy vs reality", lang),
      title: T("มันไม่ใช่แบบที่คิด", "Not what you think", lang),
      fantasy: L(r.fantasy_vs_reality.fantasy, lang),
      reality: L(r.fantasy_vs_reality.reality, lang),
      source_refs: r.fantasy_vs_reality.source_refs ?? [],
    }));

  // 2 what it is
  if (r.what_it_is)
    push("text", (lang) => ({
      eyebrow: T("มันคืออะไรกันแน่", "What it actually is", lang),
      title: T("ทางนี้คืออะไร", "What this path is", lang),
      body: L(r.what_it_is, lang),
      source_refs: r.what_it_is.source_refs ?? [],
    }), r.what_it_is?.image_source);

  // 3 jobs + salary
  if (r.jobs?.length)
    push("jobs", (lang) => ({
      eyebrow: T("ทางนี้พาไปไหนได้บ้าง", "Where it leads", lang),
      title: T("งานจริง + เงินจริง", "Real jobs, real pay", lang),
      jobs: r.jobs.map((j: any) => ({
        // title may be a plain string or {th,en}
        title: typeof j.title === "object" ? L(j.title, lang) : String(j.title ?? ""),
        salary: j.salary_thb_month
          ? `${k(j.salary_thb_month.min)}–${k(j.salary_thb_month.max)}`
          : "",
        salaryGlobal: moneyG(j.salary_global), // 🌏 USD/mo equivalent
        salaryGlobalThb: moneyGThb(j.salary_global), // ≈ ฿/mo so students can compare
        jobsdbUrl: jobsdbUrl(
          typeof j.title === "object" ? j.title.en ?? j.title.th ?? "" : j.title,
        ),
        demand: j.demand ?? "",
        // where it leads: live demand signals so each title is evidence, not vibes
        openings: asText(j.openings, lang), // "120+ ตำแหน่งเปิดรับ"
        growth: pct(j.growth_pct), // "+18%"
        listingSource: j.listing_source ?? "", // "JobsDB" / "LinkedIn"
        // exact real postings as proof — company + link
        listings: (j.listings ?? []).map((li: any) => ({
          company: li.company ?? "",
          title: li.title ?? "",
          url: li.url ?? "",
          source: li.source ?? "",
        })),
        note: L(j.salary_note, lang),
        source_refs: j.source_refs ?? [],
      })),
      note: L(r.jobs[0]?.salary_note, lang),
      source_refs: r.jobs[0]?.source_refs ?? [],
    }));

  // 4 salary progression
  if (r.salary_progression?.levels?.length)
    push("salaryProgression", (lang) => ({
      eyebrow: T("เงินเดือนโตแค่ไหน", "How pay grows", lang),
      title: T("ยิ่งเก่ง ยิ่งได้", "Grow, earn more", lang),
      levels: r.salary_progression.levels.map((lv: any) => ({
        level: L(LEVEL[String(lv.level).toLowerCase()] ?? { th: lv.level, en: lv.level }, lang),
        years: lv.years,
        salary: lv.thb_month ? `${k(lv.thb_month.min)}–${k(lv.thb_month.max)}` : "",
        // break the number down: where this band comes from + per-level citation
        note: L(lv.note, lang), // "ฐานเงินเดือน + โบนัสตามผลงาน"
        source_refs: lv.source_refs ?? [],
      })),
      source_refs: r.salary_progression.source_refs ?? [],
    }));

  // 4.5 growth vs other careers we track (cross-field comparison)
  if (growth && growth.self > 0 && growth.others.length) {
    const rows = [
      { name_th: L(r.name, "th"), name_en: L(r.name, "en"), growth: growth.self, self: true },
      ...growth.others.map((o) => ({ ...o, self: false })),
    ]
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 7);
    push("growthCompare", (lang) => ({
      eyebrow: T("โตเร็วแค่ไหน", "How fast it's growing", lang),
      title: T("เทียบการเติบโตกับสายอื่น", "Growth vs other paths", lang),
      unit: T("ความต้องการ/ปี", "demand/yr", lang),
      items: rows.map((x) => ({
        label: lang === "th" ? x.name_th : x.name_en,
        growth: x.growth,
        self: x.self,
      })),
    }));
  }

  // 5 skills
  if (r.skills?.length)
    push("list", (lang) => ({
      eyebrow: T("ต้องมีสกิลอะไร", "Skills you need", lang),
      title: T("สกิลที่ทำให้เธอเก่งทางนี้", "Skills that make you strong", lang),
      items: r.skills.map((s: any) => L(s.skill, lang)),
    }));

  // 6 ai impact (augmented / automated / verdict)
  if (r.ai_impact)
    push("aiImpact", (lang) => ({
      eyebrow: T("AI จะแทนเธอไหม", "Will AI replace you", lang),
      title: T("AI ช่วย vs AI แทน", "AI helps vs replaces", lang),
      augmented: (r.ai_impact.augmented ?? []).map((x: Loc) => L(x, lang)),
      automated: (r.ai_impact.automated ?? []).map((x: Loc) => L(x, lang)),
      verdict: L(r.ai_impact.verdict, lang),
      source_refs: r.ai_impact.source_refs ?? [],
    }));

  // 7 market thailand
  if (r.market_thailand)
    push("marketThailand", (lang) => ({
      eyebrow: T("ตลาดในไทย", "Thailand market", lang),
      title: T("บริษัทอยากได้ แต่หาคนไม่ได้", "Companies want this skill", lang),
      body: L(r.market_thailand.body, lang),
      companies: r.market_thailand.hiring_companies ?? [],
      openings: L(r.market_thailand.openings_estimate, lang),
      source_refs: r.market_thailand.source_refs ?? [],
    }));

  // 8 day in life
  if (r.day_in_life?.steps?.length)
    push("dayInLife", (lang) => ({
      eyebrow: T("วันนึงทำอะไรบ้าง", "A day in the life", lang),
      title: T("ชีวิตจริงของสายนี้", "What the day looks like", lang),
      steps: r.day_in_life.steps.map((s: any) => ({ time: s.time, label: L(s.label, lang) })),
    }), r.day_in_life?.image_source);

  // 9 entry routes (GEN Zified — archetype tag + icon per route)
  if (r.entry_routes?.length)
    push("entryRoutes", (lang) => ({
      eyebrow: T("เข้าสายนี้ยังไง", "How to get in", lang),
      title: T("เลือกทางที่เหมาะ", "Pick the path that fits", lang),
      routes: r.entry_routes.map((rt: any) => {
        const a = ROUTE_ARCHETYPE[routeArchetype(rt)];
        return {
          route: L(rt.route, lang),
          cost: rt.cost ?? "",
          time: rt.time ?? "",
          icon: a.icon,
          tag: L(a.tag, lang),
          subtitle: L(a.sub, lang),
        };
      }),
    }));

  // 10 risks + not-for-you (honesty)
  if (r.risks?.length || r.not_for_you_if?.length)
    push("risks", (lang) => ({
      eyebrow: T("ความจริงที่ต้องรู้", "The honest part", lang),
      title: T("ข้อเสีย + ใครไม่เหมาะ", "Downsides + who it's not for", lang),
      risks: (r.risks ?? []).map((x: Loc) => L(x, lang)),
      notForYou: (r.not_for_you_if ?? []).map((x: Loc) => L(x, lang)),
    }));

  // 11 real people (resolve source_ref -> link to the article/profile)
  if (r.real_people?.length) {
    const srcOf = (ref: number) => (r.sources ?? []).find((s: any) => s.ref === ref);
    push("realPeople", (lang) => ({
      eyebrow: T("รุ่นพี่ที่เดินทางนี้จริง", "Real people in this path", lang),
      title: T("เขาเริ่มยังไง", "How they started", lang),
      people: r.real_people.map((p: any) => {
        const s = srcOf(p.source_ref);
        return {
          role: p.role,
          background: L(p.background, lang),
          source_ref: p.source_ref,
          url: s?.url ?? "",
          publisher: s?.publisher ?? "",
        };
      }),
    }));
  }

  // 12 proof to build
  if (r.proof_to_build?.length)
    push("text", (lang) => ({
      eyebrow: T("พิสูจน์ตัวเองยังไง", "Proof to build", lang),
      title: T("ไม่ต้องรอจบมหาลัย", "Start before you graduate", lang),
      body: r.proof_to_build.map((p: any) => `• ${L(p.project, lang)}`).join("\n"),
    }));

  // 13 cta
  push("cta", (lang) => ({
    eyebrow: T("ลองของจริง 7 วัน", "Test it for 7 days", lang),
    title: T("ทางนี้ใช่เธอจริงไหม?", "Is this really your path?", lang),
    body: T(
      "เข้า squad 8–12 คน ทำภารกิจทดสอบเส้นทางนี้ จบแล้วได้ Career Evidence Report",
      "Join a squad of 8–12. Test the path. Leave with your Career Evidence Report.",
      lang,
    ),
    button: L(CTA_BTN, lang),
  }));

  // 14 sources (so citations travel with the carousel — no extra fetch)
  if (r.sources?.length)
    push("sources", (lang) => ({
      eyebrow: T("ที่มาของข้อมูล", "Where this comes from", lang),
      title: T("อ้างอิงจริง ตรวจสอบได้", "Real, checkable sources", lang),
      items: r.sources.map((s: any) => ({
        ref: s.ref,
        title: s.title,
        publisher: s.publisher ?? "",
        url: s.url,
      })),
    }));

  return cards;
}

function validate(r: any) {
  const warn = (m: string) => console.warn(`⚠️  ${m}`);
  if ((r.risks?.length ?? 0) < 3) warn("risks < 3 (honesty gate)");
  if ((r.not_for_you_if?.length ?? 0) < 2) warn("not_for_you_if < 2");
  const n = r.sources?.length ?? 0;
  if (n < 8 || n > 15) warn(`sources = ${n} (want 8–15)`);
  if (!/^#[0-9a-fA-F]{6}$/.test(r.color ?? "")) warn(`color not a hex: ${r.color}`);
}

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!arg) {
    console.error("Usage: seed-from-research.ts <slug | path/to.json> [--remote]");
    process.exit(1);
  }
  if (REMOTE) console.log("[radar] targeting REMOTE (cloud) Supabase");
  const path = arg.endsWith(".json")
    ? isAbsolute(arg)
      ? arg
      : join(process.cwd(), arg)
    : join(__dirname, "output", `${arg}.json`);

  const r = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`[radar] seeding ${r.slug} from ${path}`);
  validate(r);

  // 1 — upsert field
  const fieldRow = {
    slug: r.slug,
    name_th: L(r.name, "th"),
    name_en: L(r.name, "en"),
    tagline_th: L(r.tagline, "th"),
    tagline_en: L(r.tagline, "en"),
    emoji: r.emoji ?? "✨",
    color: r.color,
    tile_size: tileSize(r.tile_size),
    tags: r.tags ?? [],
    is_published: true,
    has_content: true,
    hero_image_prompt: r.hero_image?.image_prompt ?? null,
    hero_image_url: r.hero_image?.image_source?.url ?? null,
    hero_image_credit: r.hero_image?.image_source?.credit ?? null,
    hero_image_license: r.hero_image?.image_source?.license ?? null,
    hero_image_alt_th: L(r.hero_image?.alt, "th") || null,
    hero_image_alt_en: L(r.hero_image?.alt, "en") || null,
    research: r,
    researched_at: new Date().toISOString(),
    research_model: "deep-research-preview",
  };
  const { data: field, error: fErr } = await supabase
    .from("radar_fields")
    .upsert(fieldRow, { onConflict: "slug" })
    .select("id")
    .single();
  if (fErr) throw fErr;
  const fieldId = field.id;

  // 2 — replace sources
  await supabase.from("radar_sources").delete().eq("field_id", fieldId);
  if (r.sources?.length) {
    const rows = r.sources.map((s: any) => ({
      field_id: fieldId,
      ref: s.ref,
      title: s.title,
      publisher: s.publisher ?? null,
      url: s.url,
      published_at: toDate(s.published_at),
      tier: s.tier ?? null,
      quote_th: L(s.quote, "th") || null,
      quote_en: L(s.quote, "en") || null,
    }));
    const { error } = await supabase.from("radar_sources").insert(rows);
    if (error) throw error;
  }

  // 3 — replace cards (with cross-field growth comparison from already-seeded fields)
  const { data: peers } = await supabase
    .from("radar_fields")
    .select("slug,name_th,name_en,research");
  const growth: GrowthCmp = {
    self: fieldGrowth(r),
    others: (peers ?? [])
      .filter((p: any) => p.slug !== r.slug)
      .map((p: any) => ({
        name_th: p.name_th,
        name_en: p.name_en,
        growth: fieldGrowth(p.research),
      }))
      .filter((p: any) => p.growth > 0),
  };
  await supabase.from("radar_cards").delete().eq("field_id", fieldId);
  const cards = buildCards(r, growth).map((c) => ({ ...c, field_id: fieldId }));

  // Link the CTA card to a PathLab seed (matched by title).
  const pathlabTitle = PATHLAB_LINKS[r.slug];
  if (pathlabTitle) {
    const { data: seed } = await supabase
      .from("seeds")
      .select("id,title")
      .eq("title", pathlabTitle)
      .eq("seed_type", "pathlab")
      .maybeSingle();
    if (seed) {
      for (const c of cards) {
        if (c.kind === "cta") {
          c.content_th = { ...c.content_th, pathlabSeedId: seed.id, pathlabTitle: seed.title };
          c.content_en = { ...c.content_en, pathlabSeedId: seed.id, pathlabTitle: seed.title };
        }
      }
      console.log(`[radar] linked PathLab: ${seed.title}`);
    } else {
      console.warn(`⚠️  PathLab "${pathlabTitle}" not found — skipping link`);
    }
  }
  const { error: cErr } = await supabase.from("radar_cards").insert(cards);
  if (cErr) throw cErr;

  console.log(
    `✅ ${r.slug}: field + ${r.sources?.length ?? 0} sources + ${cards.length} cards`,
  );
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
