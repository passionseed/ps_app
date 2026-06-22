# Metric Details — Research & Population Guide

How to write and populate the `metric_details` / `global_metric_details` JSONB columns on `career_survival`. These power the expandable explanation panels in the Career Metrics card (radar page).

## Current Status

- **6 careers fully researched** (detailed bilingual explanations + source URLs for every metric):
  `software-engineer`, `data-scientist`, `product-manager`, `ux-designer`, `financial-analyst`, `content-writer`
- **14 careers need full research**:
  `graphic-designer`, `marketing-specialist`, `accountant`, `nurse`, `teacher`, `lawyer`, `electrician`, `truck-driver`, `customer-service-representative`, `hr-recruiter`, `journalist`, `paralegal`, `photographer`, `translator`

## JSONB Structure

Each career has two JSONB columns: `metric_details` (Thai market) and `global_metric_details` (Global market).

```json
{
  "demand_growth": {
    "th": "Thai language explanation of why this score...",
    "en": "English explanation...",
    "sources": [
      { "title": "Source Name", "url": "https://..." }
    ]
  },
  "grad_employment_pct": { "th": "...", "en": "...", "sources": [...] },
  "saturation_level": { "th": "...", "en": "...", "sources": [...] },
  "progression_difficulty": { "th": "...", "en": "...", "sources": [...] },
  "salary_floor": { "th": "...", "en": "...", "sources": [...] },
  "salary_ceiling": { "th": "...", "en": "...", "sources": [...] }
}
```

## Metric Definitions & How to Research

### demand_growth (1-10)
How fast demand for this career is growing. 1 = shrinking fast, 5 = stable, 10 = explosive growth.

| Market | Sources to use |
|--------|---------------|
| Thai | JobsDB TH demand trends, Jobthai job posting volume, DEPA digital economy reports, BOT labor stats, NESDC reports |
| Global | BLS Occupational Outlook Handbook (projected growth 2023-2033), WEF Future of Jobs Report 2025, LinkedIn Workforce Report |

### grad_employment_pct (0-100)
% of new graduates employed in-field within 6 months.

| Market | Sources to use |
|--------|---------------|
| Thai | NESDC labor market surveys, university placement reports (Chula, Thammasat, KMITL), OHEC graduate tracking |
| Global | NCES employment outcomes, HESA Graduate Outcomes (UK), PayScale/Glassdoor first destination surveys |

### saturation_level (1-10)
How crowded the job market is. 1 = severe shortage, 5 = balanced, 10 = oversaturated. **High = bad.**

| Market | Sources to use |
|--------|---------------|
| Thai | JobsDB applicant-to-job ratio, LinkedIn talent pool size vs openings, NESDC labor surplus data |
| Global | LinkedIn Talent Insights, Indeed hiring demand index, BLS employment projections |

### progression_difficulty (1-10)
How hard it is to advance in the career. 1 = fast/easy, 10 = very hard/slow. **High = bad.**

| Market | Sources to use |
|--------|---------------|
| Thai | Typical career ladder, credential/licensing requirements (e.g. lawyer bar exam, nurse license), years to senior |
| Global | Same + Glassdoor career path data, PayScale years-to-promotion |

### salary_floor / salary_ceiling
Entry-level vs senior salary ranges.

| Market | Currency | Sources to use |
|--------|----------|---------------|
| Thai | THB/month | JobsDB salary survey, Jobthai salary data, Robert Half/Adecco salary guides TH |
| Global | USD/month | BLS OES P10 (floor) and P90 (ceiling), Glassdoor, Levels.fyi (for tech) |

## Quality Standards

1. **Each explanation**: 1-3 sentences, specific to the career (not generic)
2. **Thai text**: Natural Thai, not machine-translated. Should feel like a career counselor explaining to a student
3. **Sources**: At least 1-2 credible sources per metric. Use real URLs from government stats, major job platforms, or industry reports
4. **Justify the score**: Explanation must make clear WHY the number is what it is

## Example (software-engineer, Thai market)

```json
{
  "demand_growth": {
    "th": "ตลาดไทยต้องการ software engineer สูงมาก โดยเฉพาะสาย backend, cloud และ mobile โตขึ้น 15-20% ต่อปีตาม digital transformation ของธนาคารและ e-commerce",
    "en": "Thai market demand for software engineers remains very high, especially backend, cloud, and mobile. Growth of 15-20% annually driven by banking and e-commerce digital transformation.",
    "sources": [
      {"title": "JobsDB Thailand IT Salary Report 2024", "url": "https://th.jobsdb.com/th/career-advice/article/it-salary-report"},
      {"title": "DEPA Thailand Digital Economy Report", "url": "https://www.depa.or.th/en/digitaleconomy"}
    ]
  }
}
```

## How to Write the Migration SQL

Create a new migration file in `/Users/pine/Documents/web/supabase/migrations/`:

```sql
-- Example: 20260624_populate_remaining_metric_details.sql
UPDATE career_survival SET
  metric_details = '{
    "demand_growth": { "th": "...", "en": "...", "sources": [...] },
    "grad_employment_pct": { "th": "...", "en": "...", "sources": [...] },
    ...
  }'::jsonb,
  global_metric_details = '{
    "demand_growth": { "th": "...", "en": "...", "sources": [...] },
    ...
  }'::jsonb
WHERE slug = 'career-slug';
```

Then push to production:
```bash
cd /Users/pine/Documents/web && npx supabase db push
```

## Existing Migration Files

| File | What it does |
|------|-------------|
| `20260622120000_populate_global_metrics.sql` | Global metric scores (numbers only) |
| `20260622130000_populate_thai_metrics.sql` | Thai metric scores (numbers only) |
| `20260623010000_add_metric_details.sql` | Added the JSONB columns |
| `20260623010100_populate_metric_details.sql` | Populated details for 6 careers fully + 14 with short placeholders |

## App Code References

- `lib/careerSurvival.ts` — Types (`MetricDetail`, `MetricDetailsMap`), parsing (`parseMetricDetails`), getter (`getMetricDetails`)
- `components/CareerMetricsCard.tsx` — Renders expandable detail panels with bilingual text + clickable source links
- `app/radar/[field].tsx` — Passes `metricDetails` prop to the card
