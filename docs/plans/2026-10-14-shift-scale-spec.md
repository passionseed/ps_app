# SHIFT app v2: one app for SHIFT, built to scale (build spec)

Date: 2026-10-14. Extends `2026-10-13-shift-build-spec.md` (read it for the error envelope, RPC
conventions, evidence state machine, drafts and certificates; everything there still holds unless
this document changes it). Mockups: `~/.gstack/projects/passionseed-ps_app/designs/season-home-20261012/`
`shift-app-v5.html` (home states, steps, guide) and `depth-v4.html` (sign-in, depth language).
Rendered: `/tmp/shots/v5.png`, `/tmp/shots/depth.png`.

## 0. Why this change

The user asked: hide PathLab, Build and Discover; build the home page and everything else; read the
company brain and make the app scale SHIFT; and the UI must not be flat (depth, subtle gradients,
tasty buttons).

What the company brain says (`/Users/bunyasit/dev/passionseed/company-brain`: shift.md, shift2.md,
shift1-results.md, numbers.md, decisions/log.md):

- SHIFT is a 7-day program (shift[2] runs 14 to 20 Oct 2026). Mentor sessions 19:00 to 21:00 on
  days 1, 2, 4, 6, 7; days 3 and 5 have no session. Every day has a goal and a mission after the day.
- A student must do 9 steps (the refund steps, `pseed lib/content/shift-refund.ts`):
  1 at least 3 ideas, pick one; 2 talk to at least 3 people before building; 3 one problem and one
  user group; 4 a prototype others can try; 5 at least 3 outside testers, note what they said;
  6 change at least one thing from what testers said; 7 present on day 7; 8 post progress every day;
  9 join every mentor session (a make-up class counts).
- Mentors count these by hand from Discord #progress on day 6 and day 7, and step in on day 1 (no
  topic), day 3 (no interview or tester evidence) and whenever someone goes quiet. shift[1] showed
  students who fall behind go quiet and nobody catches it; getting real users is the bottleneck.
- Mentors already keep the curriculum (days, goals, missions, interview guide) in the
  `shift_curriculum` table, edited at `/shift/curriculum` on the web.

Scaling SHIFT therefore means the app and web admin do the counting, the reminders and the
"who needs help" list automatically, students carry the day plan and the interview guide in their
pocket, and starting a new shift (shift[3], shift[4], ...) is a template, not a rebuild.

## 1. Decisions (made by the lead; report them, do not re-ask)

| # | Decision |
|---|---|
| D1 | The app is SHIFT. Tabs: หน้าแรก (Home, route `shift`), สควอด (only while the user has an entry in a round), โปรไฟล์. PathLab (Discover, Explore, My Paths, seed/path entry points), Build, and the old interactive-camp tabs (Today, Projects, My group) are hidden: files stay, routes get `href: null`, no entry points. Hackathon flows are untouched. |
| D2 | A round is one shift. Display name `SHIFT[N]` (N = `shift_rounds.number`). Default template: 7 days, sessions on days 1,2,4,6,7 at 19:00 to 21:00 Asia/Bangkok, invite join, mentor-led. `duration_days` stays configurable (5 to 28) for later formats (always-on, university). |
| D3 | Missions come from per-round config (`shift_rounds.missions`), default = SHIFT steps 1 to 7. Steps 8 (daily progress) and 9 (sessions) are computed habits. Certificate eligibility = all missions complete (habits not required). The app shows all 9 as "9 ขั้นของ SHIFT". No refund or money wording in the app. |
| D4 | New log types `ideas` (step 1) and `daily` (step 8, the Daily Show: built / broke / heard). `contact` stays as a free log (Day 1 first contact) that counts for the daily habit and people talked to, not for a mission. `problem_statement` gains `user_group`. |
| D5 | The student day plan and interview guide are read from the mentors' `shift_curriculum` (one source of truth). Mentor-only fields (`schedule`, `mentorChecks`, `date`) never reach students. Session days come from the round (`session_days`), not from the curriculum. |
| D6 | Accepted applications join automatically: a round has `application_cohort` (e.g. `SHIFT[3]`); a user whose `shift_applications` row for that cohort is `accepted` and linked (`user_id`) may join an invite round without a manual allowlist entry. |
| D7 | Discord stays the live community. The app does not post to Discord. After a log, the receipt offers "คัดลอกไปโพสต์ใน #progress" (formatted text to the clipboard). |
| D8 | Applying stays on the website: the landing opens `${web_base_url}/shift/apply?round=N` in the in-app browser. No payment in the app. |
| D9 | Design v4 "Depth": layered lavender canvas with soft orbs, glass cards, one raised hero card per screen, glowing progress, Pillow button glossier. Replaces v3 principle 6 ("flat surfaces"). Contrast rules stay. |
| D10 | `shift_round.tab_enabled` keeps meaning "in-round features on". When false (or the SHIFT RPCs are missing, e.g. production before migrations), Home shows the landing with built-in content and the apply button, never an error screen. |

## 2. Database and RPCs (lane A, repo `/Users/bunyasit/dev/pseed-shift`, branch `feat/shift-scale`)

The SHIFT migrations `20261014090000` to `20261014090400` are NOT applied to production yet: edit
them in place (keep file names) rather than adding fix-up migrations, except where noted. Run
`supabase db reset` locally after each change. `20261013090000_shift_curriculum.sql` (from main)
creates `shift_curriculum`; it now runs before the SHIFT migrations.

### 2.1 Rounds

Add to `shift_rounds`:

- `missions jsonb not null default <SHIFT default>` with `check (shift_round_private.valid_missions(missions))`.
- `session_days int[] not null default '{1,2,4,6,7}'` (each between 1 and `duration_days`, distinct).
- `session_start time not null default '19:00'`, `session_end time not null default '21:00'` (Bangkok; end > start).
- `curriculum_key text` (nullable; matches `shift_curriculum.round`, soft reference).
- `application_cohort text` (nullable, 1 to 40 chars).
- Change default `duration_days` to 7, `join_cutoff_day` default 2, `nudge_local_time` default '21:15'
  (after the session), `review_window_hours` stays 48.

`valid_missions(jsonb)`: array of 1 to 10 objects `{key, parts, title_th?, title_en?}`; `key`
matches `^[a-z_]{2,32}$` and is unique; `parts` is 1 to 3 objects `{type, need, distinct?}` with
`type` in the evidence types except `contact` and `daily`, `need` 1 to 20, `distinct` boolean
(only allowed for `interview` and `tester`); each evidence type appears in at most one mission
(the app maps type to mission); titles at most 80 chars.

SHIFT default (also exported as `shift_round_private.default_missions()`):

```json
[
 {"key":"ideas","parts":[{"type":"ideas","need":1}]},
 {"key":"interviews","parts":[{"type":"interview","need":3,"distinct":true}]},
 {"key":"problem","parts":[{"type":"problem_statement","need":1}]},
 {"key":"prototype","parts":[{"type":"mvp","need":1}]},
 {"key":"testers","parts":[{"type":"tester","need":3,"distinct":true}]},
 {"key":"change","parts":[{"type":"change","need":1}]},
 {"key":"demo","parts":[{"type":"demo_post","need":1}]}
]
```

Old mission keys (`first_contact`, `interviews_problem`, `mvp`, `demo_post` as a key) are gone.

### 2.2 Evidence types

Types: `contact, ideas, interview, problem_statement, mvp, tester, change, demo_post, daily`.
SQL validation in `shift_round_submit_evidence` must match the app's zod schemas exactly (unknown
keys rejected, strings trimmed, who labels pass the personal-data rule):

- `ideas`: `{ideas: [{text 3..120, who 2..60 (who rule)}] (3 to 6 items), picked int (0-based, < len), reachable boolean optional, note string <=280 optional}`.
- `daily`: `{built 1..500, broke <=500 optional, heard <=500 optional, link https optional}`.
- `problem_statement`: add `user_group` 2..60 (who rule), required for new submissions.
- Others unchanged. Photos allowed on every type as before; audio only on interview/tester.

Squad feed summaries (generated server-side, no free text): add lines for `ideas` ("picked an idea"),
`daily` ("posted today's update"), and keep the rest.

### 2.3 Counting

`mission_counts(entry_id)` reads the round's `missions` config and returns:

```json
{"missions":[{"key":"interviews","n":2,"complete":false,"title_th":null,"title_en":null,
  "parts":[{"type":"interview","have":2,"need":3}]}],
 "missions_complete":3,"missions_total":7,"people_talked_to":5,"eligible":false,
 "daily":{"days":2,"need":7,"today_logged":true},
 "sessions":{"attended":1,"held":1,"total":5}}
```

- `n` is the 1-based position in the config. Counting predicate per evidence row unchanged
  (2.4 of the old spec, including grace and the change-source rule). `distinct` parts count distinct
  `who_key`; others count rows.
- `people_talked_to` = distinct `who_key` across counted contact, interview, tester.
- `daily.days` = distinct round days (Bangkok date mapped to day 1..duration) with at least one
  counted log of any type; `need` = `duration_days`; `today_logged` for the current round day.
- `sessions`: `total` = cardinality of `session_days`; `held` = session days whose `session_end`
  (Bangkok) has passed; `attended` = attendance rows with status present or makeup on session days.
- `eligible` = every mission complete.

### 2.4 Attendance

```sql
create table public.shift_round_attendance (
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  day int not null check (day between 1 and 28),
  status text not null check (status in ('present','makeup','absent')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (entry_id, day)
);
```

RLS on, no direct student access (counts come through RPCs). Admin RPC
`shift_round_admin_mark_attendance(p_round_id uuid, p_day int, p_marks jsonb)` where `p_marks` is
`[{"entry_id": uuid, "status": "present"|"makeup"|"absent"|null}]` (null deletes). Same staff gate
as the other admin RPCs (round roles, global staff, web admins). `p_day` must be a session day of
the round. Writes a `shift_round_events` audit row. Included in delete-my-data and retention purge.

### 2.5 Plan (student-safe curriculum)

The home bundle (`shift_round_home`) gains `plan` and the round gains the new fields:

```json
"round": {..., "session_days":[1,2,4,6,7], "session_start":"19:00", "session_end":"21:00",
          "application_cohort":"SHIFT[3]"},
"plan": {"source":"curriculum"|"default",
  "rules":["..."],
  "interview":{"intro":"...","dm":"...","questions":["..."],"dos":["..."],"donts":["..."]},
  "days":[{"day":1,"name":"...","goal":"...","mission":"...","steps":[1,8,9]}]}
```

Built by `shift_round_private.student_plan(round)` from `shift_curriculum.content` where
`round = shift_rounds.curriculum_key`, else the row `round = 'default'`, else `null`. Copy only
`rules`, `interview` and per day `day, name, goal, mission, refundSteps -> steps`; never
`schedule`, `mentorChecks`, `date`, `sessionTime`. Clamp strings (2000 chars) and arrays (20).
Days beyond `duration_days` are dropped. A new migration (timestamp after `20261014090400`)
inserts the `default` row with the SHIFT2 defaults (`pseed lib/content/shift2-curriculum.ts`
`SHIFT2_DEFAULT_DOC`, Thai) using `on conflict (round) do nothing`.

`shift_round_joinable` rows also carry `session_days, session_start, session_end, duration_days`,
so the landing can describe the next shift before join.

### 2.6 Join from accepted applications (D6)

In the join eligibility check, an invite round also admits a user when
`exists (select 1 from shift_applications a where a.user_id = auth.uid() and a.status = 'accepted'
and a.cohort = r.application_cohort)`. `can_join` and `shift_round_join` both use it.
`shift_round_joinable` reports `reason = null` for such users.

### 2.7 Session reminder push

Jobs (`shift-round-jobs` edge function + job RPCs): on each session day, at `session_start - 30
minutes` Bangkok, push to every active entry of the round that has not opted out:
TH "เซสชันวันที่ {day} เริ่ม {time} บน Discord" / EN "Day {day} session starts at {time} on
Discord", `data.url = passionseed://round`. Ledger category `session` (separate from the daily
no-log nudge, at most one per entry per day). Idempotent per (entry, day, category).

### 2.8 Admin read model

`shift_round_admin_steps(p_round_id)` returns one row per entry: `entry_id, user_id, handle,
display_name (if staff may see it), squad_id, squad_name, joined_day, last_log_at, counts (the
2.3 json), attendance: [{day,status}]`. Same staff gate.

### 2.9 Tests and seed

- Update every pgTAP file that uses mission keys or the 6-mission shape; add tests for
  `valid_missions`, ideas/daily/problem validation (SQL and app fixtures must agree), daily habit
  counting across Bangkok midnight, sessions held/attended, attendance RPC (staff only, session
  days only, null deletes, audit), plan sanitization (assert no `mentorChecks`/`schedule` leak,
  fallback to `default`, null when neither), joinable for accepted applicants, session reminder
  idempotency. Race tests and Deno tests updated.
- `pnpm shift:seed --state=day1|day2|day3|day7|review|issued|rejected`: seed a 7-day round with
  `curriculum_key` set and a curriculum row, squads, attendance, logs of every type. `day2` is the
  QA state for the home screen. The seed also creates a local-only test student
  `shift.student@example.test` / `shift-local-only` and a non-enrolled user
  `shift.new@example.test` / `shift-local-only` (local database only).

## 3. Web (lane B, repo `/Users/bunyasit/dev/pseed-shift`)

- Round dashboard: "9 ขั้น" table (one row per student: steps 1 to 7 from missions, step 8 as
  `days/need`, step 9 as `attended/held`), sorted by risk. "ต้องดูแล" list with the curriculum's
  mentor checks automated:
  - after day 1 session: no `ideas` log -> "ยังไม่เลือกไอเดีย";
  - day 3 or later: no interview and no tester -> "ยังไม่มีหลักฐานคุยกับคน";
  - no log for 2 round days (or none since joining) -> "เงียบ 2 วัน";
  - day 6 or later: list missing steps -> "ขาดขั้น 4, 5";
  - after close: full 9-step checklist per student, CSV export (handles only, no legal names).
- Attendance page `/admin/shift/rounds/[roundId]/attendance`: students x session days, cycle
  present / makeup / absent / unset, "mark all present" per day, optimistic with rollback.
- Round create/edit: defaults from the SHIFT template (D2); edit `session_days`, session times,
  `curriculum_key` (link to `/shift/curriculum?round=<key>`), `application_cohort` (pick from
  `SHIFT_COHORTS` names); show the missions config read-only.
- `/shift/curriculum`: support `?round=<key>` with a round picker (keys from `shift_curriculum`
  rows plus rounds' `curriculum_key`), default to the latest; when a round has no row, offer
  "start from default" or "copy from round X". Saving keeps the existing admin check.
- Certificate page `/c/[publicId]` and image renderer: list the missions from the snapshot (any
  count, titles from config or the known-key copy), not a fixed 6.
- Admin types, normalizers and fixtures follow the new counts json. Jest tests for the dashboard
  steps, mentor-check rules (pure function with fixed clocks), attendance cycling.

## 4. App (repo `ps_app`, branch `feat/shift-rounds`)

### 4.1 Lane C: navigation, data, Home and new screens

Owns: `lib/round/**` (except design files), `app/_layout.tsx`, `app/(tabs)/_layout.tsx`,
`app/(tabs)/shift.tsx`, `app/round/capture.tsx`, `app/round/log.tsx`, `app/round/mission/[key].tsx`,
new `app/round/steps.tsx`, `app/round/guide.tsx`, `app/round/day/[day].tsx`,
new `components/round/composers/**`, `tests/round-*.test.ts` (flat files, e.g. `tests/round-next.test.ts`).

- Navigation (D1): `decideRoute` sends every signed-in non-hackathon user to `/(tabs)/shift`
  (no onboarding, no discover). Guests land on `/(tabs)/shift`. Tabs as D1. Remove the floating
  progress button and the Build tab. Old deep links to hidden tabs redirect to Home.
- Types and missions: mission keys are dynamic strings from the server; known keys
  (`ideas, interviews, problem, prototype, testers, change, demo`) have copy, unknown keys use
  `title_th/title_en`. `EVIDENCE_TYPES` adds `ideas`, `daily`. `MissionCounts` gains
  `missions_total, daily, sessions`. `HomeBundle` gains `plan`, round session fields. Keep
  `emptyMissionCounts()` (SHIFT default) for before-join previews.
- Steps model (pure, tested): `steps(counts)` returns 9 items: missions 1..n (n = config length),
  then daily, then sessions, each `{n, title, state: done|current|todo, trailing}`; "current" is the
  first incomplete mission. Day chips: `plan.days[d].steps` mapped onto the same model.
- Home (`app/(tabs)/shift.tsx`), one screen, state machine (pure, tested):
  1. Guest: landing + Pillow "เข้าสู่ระบบ".
  2. Signed in, no entry (mockup A): orb hero, next joinable round card (SHIFT[N], dates,
     "ทุกเย็น 19:00 บน Discord" from session fields), "สิ่งที่จะได้" (3 outcomes from shift.md),
     "รุ่นก่อนสร้างอะไร" (public titles only: Magnified Lens, TradBid, ปฏิทิน กสพท70),
     Pillow "สมัคร SHIFT[N]" (D8) or "เข้าร่วม SHIFT[N]" when `can_join`; text link
     "มีคำเชิญแล้ว? เข้าร่วมรอบ" to `/round/join`. No joinable round: "รอบถัดไปกำลังจะประกาศ" +
     "แจ้งเตือนฉัน" (waitlist). Flag off or RPC missing: same landing with built-in content (D10).
  3. Joined, before day 1: countdown to the first session, "การบ้านก่อนวันแรก: นึกปัญหาที่เห็น
     สัปดาห์นี้ 3 ข้อ และใครเจอบ้าง", Discord button, squad status.
  4. Active (mockup B): tag `SHIFT[N] · DAY d`, Thai date; title = `plan.days[d].name` (fallback
     round title); DayStrip (7 cells, session dots, past days done, today highlighted, tap opens
     `/round/day/[day]`); SessionCard: session day before start "เซสชันกับพี่ 19:00 · เริ่มในอีก
     …", during "กำลังเซสชัน · เข้า Discord" (live), after "จบแล้ว"; non-session day "วันนี้ไม่มี
     เซสชัน · ทำเองแล้วอัปเดตใน #progress"; HeroCard "ภารกิจก่อน Day d+1" with the plan mission
     text and step chips with live progress (day 7: "หลัง SHIFT"); needs-attention banner (rejected
     log, check-in due) as before; steps ring card "9 ขั้นของ SHIFT · ถัดไป: …" to `/round/steps`;
     guide card "วิธีคุยกับคน" (days 1 to 4 or while interviews/testers incomplete) to
     `/round/guide`; squad card; Discord footer. Pillow = next action (next incomplete mission's
     type; if all missions done or today's daily not logged after the session: "อัปเดตวันนี้").
  5. Review / finished / certificate states: as before, in the new design.
- `/round/steps` (mockup C), `/round/guide` (mockup D: intro, DM card with "คัดลอกข้อความ"
  (expo-clipboard, toast "คัดลอกแล้ว"), 5 questions, do / don't), `/round/day/[day]` (name, goal,
  mission, session line, step chips). Plan missing: guide falls back to built-in copy of
  `SHIFT2_INTERVIEW`; day screen shows only the session line.
- Composers: `ideas` (3 to 6 rows "ไอเดีย" + "ใครเจอ", radio "เลือกอันนี้", switch "ทักกลุ่มนี้ได้เอง
  โดยไม่ต้องขอครูหรือผู้ใหญ่", add/remove rows), `daily` (three prompts "วันนี้ทำอะไรไป",
  "อะไรพัง", "คนใช้พูดว่าอะไร" + optional link), `problem_statement` adds "กลุ่มคนใช้" and the
  template hint "[ใคร] ลำบากกับ [อะไร] ตอน [สถานการณ์] เพราะ [ทำไม จากที่คุยมา]". Receipt adds
  "คัดลอกไปโพสต์ใน #progress" (D7) with a formatted text per type (no photos, no audio).
- Copy: Thai default, every new key in TH and EN (`lib/round/copy.ts`). Display `SHIFT[N]`.
- Vitest: decideRoute matrix, home state machine, steps model, day chip mapping, nextAction with
  config missions, ideas/daily/problem zod parity fixtures (same fixtures lane A uses), Discord
  text formatter, plan fallback.

### 4.2 Lane D: design v4 kit, sign-in, profile, other screens

Owns: `lib/theme.ts`, `docs/DESIGN.md`, `components/round/*` existing kit files and new kit files,
`app/sign-in.tsx`, `app/index.tsx`, `app/(tabs)/profile.tsx` (+ new `components/round/ShiftProfile.tsx`),
`app/(tabs)/squad.tsx`, `app/round/{join,checkin,certificate,summary,delete-data}.tsx`,
`app/round/evidence/[id].tsx`.

Build the kit first (lane C codes against these names and props):

| Component | Props | Look |
|---|---|---|
| `RoundShell` (update) | existing + `orbs?: boolean = true` | canvas: vertical `#F1ECFF -> #F4F2FB -> #F7F5FC`, top-right wash `#E0D3FF`, left wash `#F7EAFF`; 1 or 2 soft orbs (react-native-svg radial gradients, opacity falloff, no blur filter); dock fade as today |
| `GlassCard` | `children, style?, onPress?, accessibilityLabel?, padding?` | `rgba(255,255,255,0.66)`, 1pt `rgba(255,255,255,0.95)` border, radius 22, shadow violet `0 10 26 -14 rgba(109,63,240,.35)`; pressable sinks 1pt |
| `HeroCard` | `children, watermark?: string, style?` | gradient `#FFFFFF -> #FBF9FF -> #F1EBFF` (160deg), inner top highlight, shadow `0 18 40 -12 rgba(109,63,240,.28)`, big faded numeral top-right |
| `DayStrip` | `days: {day, label, state: 'done'|'today'|'future'|'missed', session}[], onPress?(day)` | 7 cells 44pt, today = violet gem gradient with glow, done = violet-50, session dot |
| `SessionCard` | `state: 'upcoming'|'live'|'ended'|'none', title, subtitle, actionLabel?, onAction?` | glass, 42pt violet gem tile with icon, small pill action; live state pulses gently (respect reduce motion) |
| `ProgressRing` | `value, total, size? = 46` | svg ring, violet gradient arc, white centre, `value/total` label |
| `StepChip` | `label, state: 'done'|'progress'|'todo'` | done = success bg + check, progress = violet-50 + violet-700, todo = white + line |
| `StepRow` | `n, title, state: 'done'|'current'|'todo', trailing, onPress?` | mockup C rows; current = raised gradient + gem number |
| `GemIcon` | `icon, size? = 30` | glossy violet gem (gradient + highlight), white icon |
| `GlowProgress` | `value 0..1` | violet gradient fill with soft glow on a recessed track |
| `AvatarStack` | `people: {label, tone?: 'violet'|'ink'}[]` | gradient gems, white ring, overlap |
| `Toast` | `useToast()` -> `show(text)` | small glass pill above the dock |

Restyle existing kit with the same language, keeping their APIs: `Card` (glass), `Tag` (glass pill),
`PillowButton` (inner top highlight, inner bottom violet glow, radial-looking gem, deeper violet
shadow, press sinks 2pt with haptic), `ShiftTabBar` (floating frosted glass, sliding selection pill,
labels หน้าแรก / สควอด / โปรไฟล์, line icons, no emoji), `MissionTrail`, `SquadCard`,
`NextMissionCard`, `StatusTag`, `ChipPicker` (selected = violet gradient), `Banner`, `Skeleton`
(lavender shimmer), inputs (white, control border, focus glow), `IconButton`, `TextButton`.

Screens:
- Sign-in and `/` (signed-out welcome), from `depth-v4.html` middle phone: orb hero with SHIFT
  wordmark and three floating glass chips ("6 ภารกิจ" becomes "9 ขั้น", "สควอด 3 คน + พี่",
  "ใบรับรองจริง"), headline "ลงมือแก้ปัญหาจริง กับเพื่อนในสควอด", Pillow "เข้าสู่ระบบด้วย Google",
  dark Apple button on iOS, "ใช้อีเมลแทน" expanding the email form, hackathon note. Fix the web
  text overflow seen in `/tmp/shots/signin.png`.
- Profile tab becomes `ShiftProfile`: avatar gem with initial, name, handle; "SHIFT ของฉัน"
  (current round line, certificates with share/open), settings (language TH/EN, notifications),
  admins see "เปิดหน้าแอดมิน (เว็บ)" opening `${web_base_url}/admin/shift/rounds`, sign out,
  delete SHIFT data, delete account (existing flows), version footer from
  `Constants.expoConfig.version`. Move the legacy profile to `components/legacy/LegacyProfile.tsx`
  (unused, not deleted).
- Squad tab and the round screens listed above restyled with the kit.
- `docs/DESIGN.md` v4: principle 6 becomes "Depth everywhere, gloss where you press"; document
  the canvas, glass, hero, gem and glow tokens; contrast table unchanged (text on glass over the
  canvas measures as on white); one Pillow per screen still holds.

### 4.3 Shared rules for C and D

- `lib/round/copy.ts` is shared: re-read before every edit, add keys at the end of each language
  block under a `// lane C` or `// lane D` comment.
- No new native modules (the next build must not need anything beyond what 1.4.0 has).
- Thai first; Bai Jamjuree; break long Thai titles by hand; no emoji as icons.
- Touch targets 44pt; Dynamic Type safe; reduce-motion respected.
- Run `pnpm exec vitest run tests/round- tests/shift tests/supabase-proxy` and `pnpm typecheck:app` before reporting; no new type errors (30 pre-existing errors are known).

## 5. QA (lead)

Local Supabase from `pseed-shift`, `supabase db reset`, `pnpm shift:seed --state=day2`, Expo web
pointed at local Supabase, sign in as the seed student, screenshot every Home state and new screen
at 390x844 against the mockups; then iOS build and TestFlight.
