# Planning Feature — Career Research Data Prefill

**Date**: 2026-03-22
**Goal**: Pre-populate career database with viability data, skills, salary ranges, and demand trends

---

## Why Prefill Career Data?

**Problem**: Students can't research careers that don't exist in the database yet. Every new career lookup hits the API, causing:
- Slow response times
- Rate limit costs
- Inconsistent data (same career researched twice = different results)

**Solution**: Pre-populate the `jobs` table with 50-100 common career paths that Thai students care about:
- Software Engineer, Data Scientist, UX Designer, Product Manager
- Doctor, Nurse, Pharmacist, Medical Technician
- Lawyer, Accountant, Marketing Manager, HR Specialist
- Architect, Civil Engineer, Electrical Engineer
- Teacher, Professor, Education Administrator
- Artist, Designer, Content Creator, Musician
- Entrepreneur, Business Analyst, Financial Analyst
- etc.

---

## Career Data Structure

Each career in the `jobs` table should have:

```typescript
Job {
  id: uuid
  title_en: string           // "Software Engineer"
  title_th: string           // "วิศวกรซอฟต์แวร์"
  category: string           // "Technology"
  
  // Viability Metrics
  viability_score: number    // 0-100 (overall viability)
  demand_trend: string       // "growing" | "stable" | "declining"
  automation_risk: number    // 0-100 (higher = more at risk)
  
  // Compensation
  salary_range_thb: {
    entry: number            // 25000
    mid: number              // 60000
    senior: number           // 150000
  }
  
  // Requirements
  required_skills: string[]  // ["JavaScript", "React", "Node.js"]
  recommended_degrees: string[]  // ["Computer Science", "Software Engineering"]
  experience_years: number   // 0-2 for entry
  
  // Market Data
  total_jobs_thailand: number    // 15000
  remote_friendly: boolean       // true
  top_hiring_companies: string[] // ["Agoda", "Grab", "Sea"]
  
  // AI-Generated Content
  day_in_life_th: string     // Thai description
  day_in_life_en: string     // English description
  career_path_description: string
  
  // Metadata
  data_source: string        // "viability_agent" | "manual" | "api"
  last_updated: timestamptz
  confidence: string         // "high" | "medium" | "low"
}
```

---

## Data Sources

### 1. Viability Agent (Primary)
**Location**: `apps/viability-agent/`

**What it does**:
- Crawls LinkedIn Jobs, JobThai, JobsDB
- Extracts: job count, salary ranges, required skills, companies hiring
- Computes: demand trend, automation risk, viability score

**How to use**:
```bash
# Run Viability Agent for a career title
cd apps/viability-agent
node index.js --career "Software Engineer" --location "Thailand"

# Output: JSON with all viability metrics
```

### 2. Manual Curation (Fallback)
For careers where Viability Agent returns sparse data:
- Use O*NET (US Dept of Labor) data as baseline
- Adjust for Thai market manually
- Mark confidence as "medium"

### 3. API Enrichment (Supplementary)
- **Exa API**: News, notable people, companies
- **LinkedIn API**: Professional profiles
- **JobThai/JobsDB APIs**: Local salary data

---

## Implementation Plan

### Phase A: Infrastructure Setup
1. Verify `jobs` table schema matches requirements
2. Create seed script runner
3. Set up Viability Agent batch processing
4. Add error handling + retry logic

### Phase B: Career List Curation
1. Identify 50-100 priority careers for Thai students
2. Group by category (Technology, Healthcare, Business, etc.)
3. Prioritize by search volume (most common first)

### Phase C: Batch Data Collection
1. Run Viability Agent for each career
2. Store results in `jobs` table
3. Log failures for manual review
4. Add progress tracking (N/100 careers completed)

### Phase D: Data Enrichment
1. Run Exa API for news + people + companies
2. Generate Thai/English descriptions via Gemini
3. Add skills taxonomy (categorize skills)
4. Compute viability scores from raw data

### Phase E: Quality Assurance
1. Spot-check 10 careers manually
2. Verify salary ranges are realistic for Thailand
3. Check Thai translations are accurate
4. Add confidence scores based on data quality

---

## Seed Script Structure

```typescript
// scripts/prefill-career-data.ts

const PRIORITY_CAREERS = [
  // Technology
  { en: "Software Engineer", th: "วิศวกรซอฟต์แวร์", category: "Technology" },
  { en: "Data Scientist", th: "นักวิทยาศาสตร์ข้อมูล", category: "Technology" },
  { en: "UX Designer", th: "นักออกแบบประสบการณ์ผู้ใช้", category: "Technology" },
  { en: "Product Manager", th: "ผู้จัดการผลิตภัณฑ์", category: "Technology" },
  { en: "DevOps Engineer", th: "วิศวกรเดฟออฟส์", category: "Technology" },
  
  // Healthcare
  { en: "Doctor", th: "แพทย์", category: "Healthcare" },
  { en: "Nurse", th: "พยาบาล", category: "Healthcare" },
  { en: "Pharmacist", th: "เภสัชกร", category: "Healthcare" },
  
  // ... 50-100 total
];

async function prefillCareerData() {
  for (const career of PRIORITY_CAREERS) {
    console.log(`Processing: ${career.en} (${career.th})`);
    
    // 1. Check if exists
    const exists = await checkCareerExists(career.en);
    if (exists) {
      console.log("  → Skipping (already exists)");
      continue;
    }
    
    // 2. Run Viability Agent
    const viabilityData = await runViabilityAgent(career.en);
    
    // 3. Enrich with Exa API
    const enrichment = await enrichWithExa(career.en);
    
    // 4. Generate descriptions via Gemini
    const descriptions = await generateDescriptions(career.en, career.th);
    
    // 5. Insert into database
    await insertCareer({
      ...career,
      ...viabilityData,
      ...enrichment,
      ...descriptions,
    });
    
    console.log("  → Done");
    
    // Rate limiting
    await sleep(1000);
  }
}
```

---

## Acceptance Criteria

- [ ] 50+ careers prefilled with viability data
- [ ] All careers have Thai + English titles
- [ ] Salary ranges present for all careers
- [ ] Skills lists populated (5-15 skills per career)
- [ ] Demand trend (growing/stable/declining) set
- [ ] Viability score (0-100) calculated
- [ ] Top hiring companies listed (3-10 companies)
- [ ] Day-in-life descriptions in Thai + English
- [ ] Confidence scores assigned based on data quality
- [ ] Seed script can re-run without duplicates

---

## Verification

### Database Checks
```sql
-- Count careers by category
SELECT category, COUNT(*) as count
FROM jobs
GROUP BY category
ORDER BY count DESC;

-- Check data quality
SELECT title_en, viability_score, demand_trend, confidence, last_updated
FROM jobs
WHERE confidence = 'low'
ORDER BY last_updated DESC;

-- Sample careers
SELECT title_en, title_th, viability_score, salary_range_thb, required_skills
FROM jobs
LIMIT 10;
```

### Manual Spot Checks
1. Pick 5 random careers
2. Compare salary ranges to JobThai/JobsDB
3. Verify skills match actual job postings
4. Check Thai translations are accurate

---

## Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| A: Infrastructure | 1-2 hours | Seed script ready |
| B: Career List | 1 hour | 50-100 careers identified |
| C: Batch Collection | 2-3 hours | Raw viability data |
| D: Enrichment | 2 hours | Full career profiles |
| E: QA | 1 hour | Verified data |
| **Total** | **7-9 hours** | **50-100 careers ready** |

---

## Related Files

- `apps/viability-agent/` — Viability Agent implementation
- `types/journey.ts` — `Job` type definition
- `supabase/migrations/20260309072643_create_jobs.sql` — Jobs table schema
- `lib/journey.ts` — Journey CRUD (may need career lookup functions)

---

## Next Steps After Prefill

1. **Career Search UI** — Add search + filter to `app/career/`
2. **Career Detail Page** — Show full career profile with viability metrics
3. **Related Careers** — "People who viewed this also viewed..."
4. **Trending Careers** — Show careers with highest demand growth
5. **Salary Comparison** — Compare salaries across careers

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Viability Agent rate limits | Slow data collection | Add retry + exponential backoff |
| Thai translations poor | Bad UX for Thai users | Manual review of top 20 careers |
| Salary data inaccurate | Misleading students | Mark confidence, add disclaimer |
| Careers become outdated | Stale data | Add `last_updated` + refresh monthly |

---
