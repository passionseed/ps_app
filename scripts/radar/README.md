# Career Radar research pipeline

Offline content generation for the Explore feed. See
`docs/CAREER_RADAR_RESEARCH_BRIEF.md` (what to research) and
`docs/CAREER_RADAR_SCHEMA.md` (where it lands).

> Gemini Deep Research is **Pre-GA**: not for commercial/production runtime.
> Use here as a one-time, offline batch tool only.

## Setup (no key literals — ADC only)

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project-id
pip install google-genai
```

## Run one field

```bash
python scripts/radar/research_field.py ai-business "AI x Business"
# -> output/ai-business.report.md   (cited report, audit trail)
# -> output/ai-business.json        (structured per the brief)
```

`output/` is git-ignored (reports are large, may contain unverified claims).

## Batch all fields

```bash
while IFS='|' read -r slug name; do
  python scripts/radar/research_field.py "$slug" "$name"
done <<'EOF'
ai-business|AI x Business
ux-design|UX/UI Design
data-analyst|Data Analyst
fintech|Fintech
cybersecurity|Cybersecurity
content-creator|Professional Content Creator
supply-chain|Supply Chain & Logistics
biotech|Biotechnology
EOF
```

## Human review gate (required)

Deep Research citations are good but not infallible. Before seeding:
- Spot-check every salary number against its source.
- Confirm `hiring_companies` are real and Thai-relevant.
- Confirm `risks` / `not_for_you_if` are honest, not filler.
- Verify source URLs resolve and are <= 24 months old where required.

## Next: seed into Supabase

`scripts/radar/seed-from-research.ts` (to build) reads `output/*.json` and
upserts `radar_fields`, `radar_sources`, `radar_cards` per the schema doc.

## If JSON parse fails

Deep Research sometimes wraps the JSON in report prose. The runner extracts the
largest `{...}` block. If that fails, open the `.report.md`, and run a cheap
structuring pass (standard Gemini) to coerce the report into the brief's schema.
