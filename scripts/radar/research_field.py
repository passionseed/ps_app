#!/usr/bin/env python3
"""
Career Radar — run one field through the Gemini Deep Research Agent.

OFFLINE content-generation tool. NOT a production/runtime dependency
(Gemini Deep Research is Pre-GA: not for commercial/production use).

Auth: Application Default Credentials. Never pass a key literal.
    gcloud auth application-default login
    export GOOGLE_CLOUD_PROJECT=your-project-id

Usage:
    python scripts/radar/research_field.py ai-business "AI x Business"

Output:
    scripts/radar/output/<slug>.report.md   raw cited report (audit trail)
    scripts/radar/output/<slug>.json        structured per CAREER_RADAR_RESEARCH_BRIEF.md

Deps:
    pip install google-genai
"""

import json
import os
import re
import sys
import time
from pathlib import Path

try:
    from google import genai
except ImportError:
    sys.exit("Missing dep. Run: pip install google-genai")

AGENT = "deep-research-preview-04-2026"
OUT_DIR = Path(__file__).parent / "output"

# Collection keys the field's `tags` must come from (keep in sync with lib/radar.ts COLLECTIONS).
COLLECTION_KEYS = ["high-pay", "ai-proof", "trending", "creative", "global"]


def build_prompt(slug: str, name: str) -> str:
    # Mirrors docs/CAREER_RADAR_RESEARCH_BRIEF.md. Edit the brief, keep this in sync.
    return f"""You are a career research analyst. Research the career path "{name}"
(slug: {slug}) for Thai students aged 15-18 deciding their future. Produce a deep,
fully-cited profile, then emit it as a single JSON object.

PRINCIPLES
1. Depth over fluff. Real numbers, real Thai companies, real day-to-day, real entry routes.
2. Every factual/numeric claim cites a source. No source -> omit or mark "confidence":"low".
3. Thailand-first, global second. Salaries in THB/month. Name Thai companies hiring.
4. Honest. Include downsides and who this path is NOT for.
5. Bilingual. Every student-facing string has `th` and `en`. Thai must read naturally
   for a teenager, not stiff translation.
6. Image direction. Hero + each major section gets an `image_prompt`; add `image_source`
   (url + license) only when a strong real/licensed image exists.

SOURCING
- Prefer primary (gov labor stats, official salary reports, company pages) and reputable
  secondary (JobsDB/LinkedIn/WEF/McKinsey, major news). Avoid SEO blog spam / undated pages.
- Salary & demand sources must be <= 24 months old; record the date.
- Per job: openings = rough # of live listings (e.g. "120+ ตำแหน่งเปิดรับ"), growth_pct =
  YoY demand growth as a number (e.g. 18), listing_source = where counted (JobsDB/LinkedIn).
  All three need source_refs. salary_progression levels: note = what the band is made of
  (e.g. "ฐานเงินเดือน + โบนัส") + per-level source_refs.
- Per job listings[] = 1-3 EXACT real postings (company + exact title + url + source like
  JobsDB/LinkedIn/JobThai). Real openings only — never invent a company or url. Omit if none found.
- salary_global = same role's pay abroad in USD/month equivalent (currency:"USD"), so Thai
  students see the 🇹🇭-vs-🌏 gap. Cite it.
- entry_routes[].archetype must be one of: degree | fast | self.
- Thai sources encouraged: สำนักงานสถิติแห่งชาติ, กระทรวงแรงงาน, สภาพัฒน์ (NESDC),
  JobsDB Thailand, JobThai, LinkedIn Talent, SET-listed company reports.
- 8-15 sources, numbered ref:1..N, each tagged tier (primary|secondary|tertiary) with a short quote.
- Cite every claim-bearing section via "source_refs":[ref,...].
- If a number is an estimate, say so. Never invent precision.
- tags must be a subset of: {COLLECTION_KEYS}

OUTPUT
Return ONLY the JSON object, no surrounding prose, matching this shape (keys exact):
{{
  "slug","name":{{"th","en"}},"tagline":{{"th","en"}},"emoji","color","tags":[],"tile_size",
  "hero_image":{{"image_prompt","image_source":{{"url","license","credit"}},"alt":{{"th","en"}}}},
  "summary":{{"th","en"}},
  "what_it_is":{{"th","en","source_refs":[],"image_prompt"}},
  "fantasy_vs_reality":{{"fantasy":{{"th","en"}},"reality":{{"th","en"}},"source_refs":[]}},
  "day_in_life":{{"steps":[{{"time","label":{{"th","en"}}}}],"image_prompt"}},
  "jobs":[{{"title","salary_thb_month":{{"min","max"}},"salary_global":{{"min","max","currency"}},"salary_note":{{"th","en"}},"demand","openings":{{"th","en"}},"growth_pct","listing_source","listings":[{{"company","title","url","source"}}],"source_refs":[]}}],
  "salary_progression":{{"levels":[{{"level","years","thb_month":{{"min","max"}},"note":{{"th","en"}},"source_refs":[]}}],"source_refs":[]}},
  "skills":[{{"skill":{{"th","en"}},"why":{{"th","en"}}}}],
  "ai_impact":{{"augmented":[{{"th","en"}}],"automated":[{{"th","en"}}],"verdict":{{"th","en"}},"source_refs":[]}},
  "market_thailand":{{"body":{{"th","en"}},"hiring_companies":[],"openings_estimate":{{"th","en"}},"source_refs":[]}},
  "market_global":{{"body":{{"th","en"}},"remote_friendly":true,"source_refs":[]}},
  "proof_to_build":[{{"project":{{"th","en"}},"difficulty"}}],
  "entry_routes":[{{"route":{{"th","en"}},"cost","time","archetype"}}],
  "risks":[{{"th","en"}}],
  "not_for_you_if":[{{"th","en"}}],
  "real_people":[{{"role","background":{{"th","en"}},"source_ref"}}],
  "sources":[{{"ref","title","publisher","url","published_at","tier","quote":{{"th","en"}}}}]
}}
GATES: risks>=3, not_for_you_if>=2, sources 8-15, color is a dark hex, every salary/demand
field has source_refs, every source_refs number exists in sources."""


def extract_json(text: str):
    """Pull the field JSON out of the report.

    Deep Research interleaves many thought-summary JSON blocks before the final
    payload, so a naive first/last-brace grab fails. Scan every balanced {...}
    object, parse each, and return the one shaped like our field (has "slug" +
    "sources"). Picks the largest such object if several match.
    """
    best = None
    i, n = 0, len(text)
    while i < n:
        if text[i] != "{":
            i += 1
            continue
        depth = 0
        j = i
        instr = esc = False
        while j < n:
            c = text[j]
            if instr:
                if esc:
                    esc = False
                elif c == "\\":
                    esc = True
                elif c == '"':
                    instr = False
            else:
                if c == '"':
                    instr = True
                elif c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        break
            j += 1
        chunk = text[i : j + 1]
        i = j + 1
        try:
            o = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        if isinstance(o, dict) and "slug" in o and "sources" in o:
            if best is None or len(chunk) > best[1]:
                best = (o, len(chunk))
    return best[0] if best else None


def main():
    if len(sys.argv) < 3:
        sys.exit('Usage: research_field.py <slug> "<Display Name>"')
    slug, name = sys.argv[1], sys.argv[2]

    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        sys.exit("Set GOOGLE_CLOUD_PROJECT and run `gcloud auth application-default login`.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(enterprise=True, project=project, location="global")

    print(f"[radar] researching {slug} ({name}) ...")
    # background=True + stream=False -> returns an Interaction with .id to poll.
    interaction = client.interactions.create(
        input=build_prompt(slug, name),
        agent=AGENT,
        tools=[{"type": "google_search"}],
        background=True,
        agent_config={"type": "deep-research", "thinking_summaries": "auto"},
    )
    iid = interaction.id
    print(f"[radar] interaction {iid} — polling (minutes)...")

    TERMINAL = {"completed", "failed", "cancelled", "incomplete", "budget_exceeded"}
    it = interaction
    while it.status not in TERMINAL:
        time.sleep(15)
        it = client.interactions.get(id=iid)
        print(f"[radar] status: {it.status}", flush=True)

    if it.status != "completed":
        # No `error` field on Interaction; dump steps for debugging.
        dbg = OUT_DIR / f"{slug}.failed.json"
        dbg.write_text(it.model_dump_json(indent=2), encoding="utf-8")
        sys.exit(f"[radar] ended status={it.status}; see {dbg}")

    # Concatenate text from model_output steps (skip thoughts/tool-call steps).
    parts = []
    for step in it.steps or []:
        if getattr(step, "type", None) == "model_output" and step.content:
            for c in step.content:
                if getattr(c, "type", None) == "text":
                    parts.append(c.text)
    report = "\n".join(parts).strip()
    if not report:
        sys.exit(f"[radar] completed but no model_output text. Inspect interaction {iid}.")
    (OUT_DIR / f"{slug}.report.md").write_text(report, encoding="utf-8")
    print(f"[radar] saved {slug}.report.md")

    data = extract_json(report)
    if data is None:
        print(f"[radar] WARN: could not parse JSON from report. Inspect {slug}.report.md "
              f"and run a structuring pass manually.")
        return
    (OUT_DIR / f"{slug}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[radar] saved {slug}.json — feed to scripts/radar/seed-from-research.ts")


if __name__ == "__main__":
    main()
