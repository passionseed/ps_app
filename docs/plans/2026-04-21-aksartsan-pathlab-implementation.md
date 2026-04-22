# อักษรศาสตร์ PathLab Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create a 5-day อักษรศาสตร์ PathLab seed in Supabase for high school students to explore Arts/Humanities through text analysis, translation, and creative writing.

**Architecture:** Single SQL seed file that inserts seed → path → path_days → path_activities → path_content in correct dependency order. Thai language only. No NPC conversations (simple text/prompt/reflection activities only).

**Tech Stack:** Supabase SQL, TypeScript types (already exist)

---

## Pre-requisites

- Verify Supabase is running locally (`cd /Documents/pseed && npx supabase start`)
- Or connect to target Supabase project
- Confirm `learning_maps` table has the default map at `00000000-0000-0000-0000-000000000001`

---

## Task 1: Create SQL Seed File

**File:**
- Create: `supabase/seed/aksartsan-pathlab-seed.sql`

**Step 1: Write the SQL file**

Create the complete seed file with all records. Follow the exact structure of `web-developer-pathlab-seed.sql` but Thai-only, no NPC avatars, no NPC conversations.

Key IDs to use:
- Seed ID: `a0000001-0000-0000-0000-000000000001`
- Path ID: `b0000001-0000-0000-0000-000000000001`
- Day 1: `c0000001-0000-0000-0000-000000000001`
- Day 2: `c0000002-0000-0000-0000-000000000001`
- Day 3: `c0000003-0000-0000-0000-000000000001`
- Day 4: `c0000004-0000-0000-0000-000000000001`
- Day 5: `c0000005-0000-0000-0000-000000000001`

Seed details:
```sql
-- Title: "ทดลองอักษรศาสตร์: ค้นหาตัวเองว่าเหมาะกับมันไหม"
-- Description: "5 วันทดลองทำกิจกรรมของนักอักษรศาสตร์ — วิเคราะห์ตัวบท แปลภาษา เขียนงานสร้างสรรค์ — ก่อนตัดสินใจเลือกคณะ"
-- seed_type: 'pathlab'
-- visibility: 'visible'
```

Day 1 content:
- text: "ทำความรู้จักอักษรศาสตร์" — อธิบายว่าอักษรศาสตร์คืออะไร มีสาขาอะไรบ้าง
- daily_prompt: "วิเคราะห์บทกวี" — อ่านบทกลอนสุนทรภู่แล้วตอบคำถาม 3 ข้อ
- daily_prompt: "บทกวีกับชีวิตจริง" — วิเคราะห์ว่าบทกลอนสะท้อนอะไร
- reflection_card: Day 1 Reflection

Day 2 content:
- text: "ภาษากับอักษรศาสตร์" — อธิบายว่าทำไมนักอักษรศาสตร์ต้องรู้ภาษาหลายภาษา
- daily_prompt: "ลองแปลเล็กน้อย" — แปลประโยคไทย↔อังกฤษ
- text: "ถ้าแปลผิด?" — อ่านตัวอย่างการแปลที่ต่างกัน
- daily_prompt: "ภาษากับวัฒนธรรม" — คำไทยที่แปลอังกฤษไม่ได้ตรงๆ
- reflection_card: Day 2 Reflection

Day 3 content:
- text: "งานเขียนกับอักษรศาสตร์" — อธิบายว่าทำไมนักอักษรศาสตร์ต้องเขียนเยอะ
- daily_prompt: "ลองเขียนงานสั้น" — เขียนเรื่องสั้น 200-300 คำ
- daily_prompt: "ถ้าเป็นบทความ?" — เขียนบทความสั้น 200 คำ
- daily_prompt: "เขียนบทกวี" — ลองเขียน haiku 5-7-5
- reflection_card: Day 3 Reflection

Day 4 content:
- text: "5 อาชีพของคนจบอักษรศาสตร์" — นักเขียน, นักแปล, ครู, นักวิจัย, PR/Content
- daily_prompt: "สำรวจอาชีพที่สนใจ" — เลือก 1 อาชีพแล้วหาข้อมูลเพิ่มเติม
- daily_prompt: "เปรียบเทียบกับสิ่งที่ทำ" — อาชีพที่สนใจคล้ายกิจกรรมไหน
- reflection_card: Day 4 Reflection

Day 5 content:
- text: "รีวิว 5 วัน" — สรุปกิจกรรมที่ทำแต่ละวัน
- reflection_card: Ikigai Mapping
- daily_prompt: "วิเคราะห์ตัวเอง" — ตอบคำถาม 3 ข้อ
- daily_prompt: "คำตอบสุดท้าย" — ตัดสินใจ + แผน 30 วัน

**Step 2: Verify the SQL runs without errors**

```bash
# Dry run — validate SQL syntax
cd /Users/bunyasit/dev/passionseed/ps_app
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed/aksartsan-pathlab-seed.sql --set ON_ERROR_STOP=1
```

Expected: No output (silent success) or "INSERT 0 1" messages.

**Step 3: Commit**

```bash
git add supabase/seed/aksartsan-pathlab-seed.sql
git commit -m "feat: add อักษรศาสตร์ PathLab seed data (5-day quest)"
```

---

## Task 2: Verify in Supabase

**Step 1: Query the seed**

```sql
SELECT id, title, seed_type, visibility FROM public.seeds WHERE title LIKE '%อักษรศาสตร์%';
```

Expected: 1 row with seed_type='pathlab', visibility='visible'

**Step 2: Query the path**

```sql
SELECT p.id, p.total_days, s.title
FROM public.paths p
JOIN public.seeds s ON s.id = p.seed_id
WHERE s.title LIKE '%อักษรศาสตร์%';
```

Expected: 1 row with total_days=5

**Step 3: Query all path_days**

```sql
SELECT day_number, title FROM public.path_days
WHERE path_id = 'b0000001-0000-0000-0000-000000000001'
ORDER BY day_number;
```

Expected: 5 rows, day 1-5, with Thai titles

**Step 4: Count activities and content**

```sql
SELECT
  pd.day_number,
  COUNT(pa.id) as activity_count
FROM public.path_days pd
LEFT JOIN public.path_activities pa ON pa.path_day_id = pd.id
WHERE pd.path_id = 'b0000001-0000-0000-0000-000000000001'
GROUP BY pd.day_number
ORDER BY pd.day_number;
```

Expected: 4-5 activities per day

---

## Task 3: Update Design Doc

**File:**
- Modify: `docs/plans/2026-04-21-aksartsan-pathlab-design.md`

**Step 1: Add seed IDs and content type counts**

Update the design doc to include the actual UUIDs and confirm content type mapping matches the SQL.

---

## Task 4: Test in App (Manual QA)

**Step 1: Build and run app**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
pnpm start
```

**Step 2: Navigate to Discover tab and find the seed**

The seed should appear in Discover if visibility='visible' and seed_type='pathlab'.

**Step 3: Enroll and complete Day 1**

Verify activities load, daily prompts accept input, and reflection works.

---

## Summary

| Task | File | Status |
|------|------|--------|
| Create SQL seed | `supabase/seed/aksartsan-pathlab-seed.sql` | ⬜ |
| Verify in Supabase | Query | ⬜ |
| Update design doc | `docs/plans/2026-04-21-aksartsan-pathlab-design.md` | ⬜ |
| Manual QA in app | Build + navigate | ⬜ |

**Plan complete and saved to `docs/plans/2026-04-21-aksartsan-pathlab-implementation.md`.**
**Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.**
