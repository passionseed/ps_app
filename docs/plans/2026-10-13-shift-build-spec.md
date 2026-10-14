# SHIFT rounds: consolidated build spec (beta)

Date: 2026-10-13. Status: build spec (E1). Source: [2026-10-12-always-on-challenge.md](2026-10-12-always-on-challenge.md)
(A1-A55, DS1-DS17, X1-X18, E1-E22, final gate, post-approval and design direction updates),
`docs/DESIGN.md` v3, `lib/theme.ts` v3, mockup `design-system-v3.html`, company-brain `shift.md`.

This document is the only input for the four build lanes. When it disagrees with the plan, this
document wins. Requirement IDs in brackets show where each rule comes from.

## 0. Vocabulary and resolved contradictions

| Plan term | Build term | Code prefix |
|---|---|---|
| Season | SHIFT round ("SHIFT · รอบที่ N", "SHIFT round N") | tables/RPCs `shift_round_*`, schema `shift_round_private` |
| Milestone | Mission (ภารกิจ), 6 per round | `mission` |
| Season entry | Entry (one student in one round) | `shift_round_entries` |
| Evidence log | Logs (บันทึก); voice capture = "เก็บสิ่งที่ได้ยิน" | `shift_round_evidence` |
| season_now() | `shift_round_private.round_now()` | |
| Season tools | Web admin `/admin/shift/rounds` | |

**Prefix check.** Existing SHIFT objects in the shared DB: `shift_camp_*` (8 tables), `shift_private`
schema (camp + companion helpers, `roster`, `link_codes`, `link_attempts`), `shift_daily_updates`,
`shift_daily_revisions`, `shift_applications`, `shift_students`, `shift_student_notes`,
`shift_feedback`, bucket `shift-camp`, RPCs `shift_camp_action`, `shift_companion_action`. Nothing
named `shift_round*` exists. New objects use `shift_round_` / `shift_round_private` / bucket
`shift-round-media`.

Resolutions (latest requirement wins):

| # | Conflict | Resolution |
|---|---|---|
| R1 | Tabs: A41/DS2 (Season, Evidence, Profile) vs mockup | Tabs are **Shift, สควอด, โปรไฟล์**. The log moves into the Shift stack (`/round/log`, per-mission screens). DS2 rules about flags and legacy still apply. |
| R2 | Staff tools: A22 `app/admin`, A36 `app/season-admin` | Staff tools live in the **web admin** at `pseed/app/admin/shift/rounds/*`. No staff UI in the app. |
| R3 | Solo beta (A12) vs squads | **DEFAULT, user may override:** squads of 3 students + 1 mentor, formed by staff in the web admin. Each student still runs their own project (entries stay individual); a squad is a peer group. Shared team projects stay deferred. |
| R4 | A34 multi-entry switcher vs taste T2 (cut) | T2 accepted at gate: a user may hold only one unfinished entry at a time (`already_in_active_round`). No switcher. A33 invite mode stays because SHIFT cohorts are invite-only. |
| R5 | Theme D-T6 / DS12 neon notes | v3 lavender + Pillow button (design direction update). DS13 is done: `docs/DESIGN.md` v3 already exists. |
| R6 | A4 new push-token table | X12/E16: reuse `profiles.expo_push_token` and `mobile_settings.push_enabled`; add `profiles.shift_round_nudges`. |
| R7 | A2 `milestone_progress` table | E2: derived by SQL function, no cache table. |
| R8 | A52 10/hour | E5: 30/hour (`rate_limit_per_hour` default 30). |
| R9 | X7 `client_draft_id` | E5: idempotency key is `submission_id`, frozen when the student taps Send. Drafts keep a separate `draft_id`. |
| R10 | A8 several required fields per type | DS7: at most one required free-text field per type (tester "what they tried" becomes optional). |
| R11 | A7/A17 public demo link | DS15: `demo_post` accepts a public or reviewer-only https link. |
| R12 | A29 birth year; A40 check-in at join | DS6: birth month + year; first check-in card appears after the first log. |
| R13 | A7 "What I changed" | Taste T3 accepted: a change may be "decided not to change, with a reason", still linked to a source log. |
| R14 | A20 questions | Taste T5 accepted: add a relatedness question (squad). Also adds shift.md's autonomy and satisfaction items. |
| R15 | Close time | Closes at 00:00 ICT on day `duration_days + 1`, shown as "23:59" on the last day (A19/A40). Grace 30 min for offline items (E17, T-E1). |
| R16 | Tracks | Taste T1 accepted: university track deferred past December. Column exists; beta rounds open `high_school` only. |
| R17 | A4 "24h before close" nudge | Sent at the round's nudge time on day `duration_days - 1` (about 29h before close) and replaces that day's no-log nudge. At most one nudge per user per day. |
| R18 | E6 path `season/{season}/{user}/{evidence}.jpg` | Evidence id does not exist at upload time. Path is `{round_id}/{user_id}/{draft_id}/photo.jpg` or `audio.m4a`; the RPC binds the path to the evidence row. |
| R19 | A16 "photo must be re-picked after kill" | Re-encoded photos and recorded audio are written to the app's document directory and survive a kill. The re-pick prompt appears only if the file is gone. |
| R20 | Mockup capture footer "สควอดและพี่เมนเทอร์จะเห็นบันทึกนี้" | The squad sees generated summaries only (no photos, audio, quotes or free text). Footer copy changes (key `capture.visibility`). |
| R21 | A27 web owner; A48 | A27 resolved (Claude agent, pseed). A48 withdrawn at gate. Certificates are Passion Seed-only (A15). |
| R22 | Score/leaderboard | Not in beta (A25). No score column or RPC. |
| R23 | X2 `pnpm season:seed` | `pnpm shift:seed --state=day1|day7|review|issued|rejected`. |
| R24 | CLAUDE.md says bump `app.json` | The app version lives in `app.config.js` (`version: "1.3.3"`). Bump to `1.4.0` there; fix CLAUDE.md. |

## 1. Scope

### Beta build (target: TestFlight + Play internal by Nov 3, beta round ~Nov 10)

1. Rounds with brief, Bangkok clock, join (3 screens), invite allowlist, policy columns.
2. Six Missions unlocked by logs; logs per type with voice-first capture for interviews and testers.
3. Squads (3 + mentor, staff-formed), squad intro card with ice-break question and one-line
   answer, read-only squad feed of generated summaries, cheers.
4. Review: staff/mentor reject, accept, spot-check; student withdraw; cascades.
5. Certificates issued 48h after close, snapshot, revoke/reinstate, tombstone; web verification
   page; server-rendered story and square images; share sheet.
6. Opt-in project summary with staff approval of a revision.
7. SDT check-ins (join card, midpoint, close).
8. Push: no-log nudge, closing-tomorrow nudge, rejection, certificate, squad assigned, summary
   decision, new round for waitlist.
9. Delete SHIFT data; retention purge; deletion queue for storage.
10. Flags (tab, enrollment, submissions kill switch, transcription, issuance, emergency message).
11. Web admin staff tools; ops runbook; pgTAP; seed states.
12. Legacy: interactive camp and companion become read-only; companion screens removed from the
    beta build.

### Non-goals (beta)

- Leaderboard, scores, ranking (A25).
- Shared team projects (squads are peer groups only).
- In-app chat or comments; conversation stays in Discord. Live icebreaker stays in Discord.
- Cross-season portfolio page, TCASfolio export, partner co-signing, paid entry (A26, E2, E3).
- University track in the beta round (R16).
- Multi-device push tokens (one token per user, documented limit, E16).
- Student evidence export; credential-free fixture mode.
- Any staff UI in the app; any change to `hackathon_*`, `hackathon_participants`, `user_roles`.
- Translation of student-written content (DS17).
- Server storage of transcripts outside the evidence payload; transcription of anything except
  the student's own recording.

## 2. Data model

All DDL lands in `pseed/supabase/migrations` with timestamps after `20261013090000`. All tables
have RLS enabled. Clients never write tables directly: every write is a SECURITY DEFINER RPC
(E8, E13). Timestamps are `timestamptz`; local dates are ICT (`Asia/Bangkok`).

### 2.1 Schema and helpers

```sql
create schema if not exists shift_round_private;
revoke all on schema shift_round_private from public, anon, authenticated;
grant usage on schema shift_round_private to authenticated;   -- only for policy helpers below
-- shift_round_private is never added to PostgREST exposed schemas.
```

| Helper (all `set search_path = ''`, owner postgres) | Purpose | execute granted to |
|---|---|---|
| `round_now() returns timestamptz` | X3 clock. Returns `current_setting('shift_round.now', true)::timestamptz` only when `current_setting('shift_round.allow_clock_override', true) = 'on'`, else `now()`. Local seed and staging set `alter database postgres set shift_round.allow_clock_override = 'on'`; production never does. pgTAP sets both with `set_config(..., true)`. Every time rule calls this. | definer functions only |
| `local_date(ts timestamptz) returns date` | `(ts at time zone 'Asia/Bangkok')::date` | definer only |
| `round_day(round_id uuid, ts timestamptz) returns int` | `local_date(ts) - local_date(starts_at) + 1` (may be <= 0 or > duration) | definer only |
| `round_phase(round_id uuid) returns text` | `upcoming` (now < starts_at), `active` (< closes_at), `review` (< review_ends_at), `finished` | definer only |
| `is_global_staff(uid uuid)` | role `staff` with `round_id is null` | authenticated (policies) |
| `is_staff(round_id uuid, uid uuid)` | global staff or staff of that round | authenticated (policies) |
| `can_review(round_id uuid, uid uuid)` | staff or `mentor` of that round | authenticated (policies) |
| `can_upload(object_name text)` | storage insert check, see 2.5 | authenticated (policies) |
| `can_read_media(object_name text)` | storage select check | authenticated (policies) |
| `flag(key text) returns jsonb` | reads `public.app_config` | definer only |
| `ok(data jsonb)` / `err(code text, category text, field text default null, retry_after int default null, details jsonb default '{}')` | X5 envelopes, add `request_id = gen_random_uuid()` | definer only |
| `who_key(label text) returns text` | `lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))` | definer only |
| `evidence_counts(e shift_round_evidence, r shift_rounds) returns boolean` | counting predicate, 2.4 | definer only |
| `mission_counts(entry_id uuid) returns jsonb` | E2 derived missions, 2.4 | definer only |
| `lock_entry(entry_id uuid) returns shift_round_entries` | E3 lock order, 2.6 | definer only |
| `emit(name text, round_id uuid, entry_id uuid, user_id uuid, actor_id uuid, props jsonb)` | inserts `shift_round_events` | definer only |
| `invoke_job(job text)` | pg_net call to the jobs edge function, 4.1 | postgres (cron) only |

### 2.2 Tables

```sql
-- Remote config (X18, A54, E18). Generic name: no app_config table exists today.
create table public.app_config (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
-- RLS: select to anon, authenticated using (is_public). No write policies.
-- Seeded rows (migration):
--  shift_round.tab_enabled            false   -- A54: show SHIFT tabs to users without an entry
--  shift_round.enrollment_enabled     true    -- new joins (server-enforced)
--  shift_round.submissions_enabled    true    -- X18 kill switch (server-enforced: RPC + storage)
--  shift_round.transcription_enabled  true    -- server-enforced in transcription check
--  shift_round.issuance_enabled       true    -- ops pause for the issue job
--  shift_round.nudges_enabled         false   -- A43: nudges switched on after the binary ships
--  shift_round.emergency_message      null    -- {"th": "...", "en": "...", "url": "https://..."} banner
--  shift_round.web_base_url           "https://www.passionseed.org"  -- verify + transcribe base

alter table public.profiles
  add column if not exists shift_round_nudges boolean not null default true;   -- X12/E16 opt-out

create table public.shift_rounds (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),                       -- "รอบที่ N"
  title_th text not null check (char_length(title_th) between 1 and 80),
  title_en text not null check (char_length(title_en) between 1 and 80),
  brief_th text not null check (char_length(brief_th) between 1 and 400),
  brief_en text not null check (char_length(brief_en) between 1 and 400),
  tracks_open text[] not null default '{high_school}'
    check (cardinality(tracks_open) > 0 and tracks_open <@ array['high_school','university']),
  starts_at timestamptz not null,               -- must be 00:00 ICT (checked in RPC)
  duration_days int not null default 14 check (duration_days between 5 and 28),
  closes_at timestamptz not null,               -- starts_at + duration_days; moved only by extend
  review_window_hours int not null default 48 check (review_window_hours between 0 and 336),
  review_ends_at timestamptz not null,          -- closes_at + review_window_hours; trigger-maintained
  join_cutoff_day int not null default 7,       -- check: between 1 and duration_days
  nudge_local_time time not null default '19:00',
  rate_limit_per_hour int not null default 30 check (rate_limit_per_hour between 1 and 120),
  grace_minutes int not null default 30 check (grace_minutes between 0 and 120),
  squad_size int not null default 3 check (squad_size between 2 and 6),
  retention_months int not null default 12 check (retention_months between 1 and 36),
  audio_retention_days int not null default 30 check (audio_retention_days between 1 and 400),
  join_mode text not null default 'invite' check (join_mode in ('open','invite')),
  mentor_led boolean not null default true,                            -- A14
  discord_url text check (discord_url ~ '^https://(discord\.gg|discord\.com)/'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  extended_days int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > starts_at),
  check (join_cutoff_day between 1 and duration_days)
);
create index on public.shift_rounds (status, starts_at);
-- Trigger before insert/update: review_ends_at := closes_at + review_window_hours * interval '1 hour'.
-- RLS select: status in ('published','archived') or shift_round_private.is_staff(id, auth.uid()).

create table public.shift_round_roles (                                 -- A23
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  round_id uuid references public.shift_rounds(id) on delete cascade,  -- null = all rounds
  role text not null check (role in ('staff','mentor')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (role = 'staff' or round_id is not null),                      -- mentors are always scoped
  unique nulls not distinct (user_id, round_id, role)
);
-- RLS select: user_id = auth.uid() or is_global_staff(auth.uid()). No writes.
-- Bootstrap (migration, E13): insert global staff for every user_roles.role = 'admin'.

create table public.shift_round_allowlist (                             -- A33
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  email text check (email = lower(email)),
  user_id uuid references auth.users(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','applications')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (email is not null or user_id is not null)
);
create unique index on public.shift_round_allowlist (round_id, email) where email is not null;
create unique index on public.shift_round_allowlist (round_id, user_id) where user_id is not null;
-- RLS: no client policies.

create table public.shift_round_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('high_school','university')),
  handle text not null check (char_length(handle) between 2 and 24),   -- RPC also rejects URLs/@handles/9+ digits
  birth_month smallint check (birth_month between 1 and 12),          -- nullable: retention clears (E21)
  birth_year smallint check (birth_year between 1950 and 2020),
  guardian_required boolean not null,
  guardian_consent_at timestamptz,
  joined_at timestamptz not null,
  joined_day int not null,
  beta_group text check (beta_group in ('alumni','new')),             -- A44, staff-set
  legal_name text check (legal_name is null or char_length(legal_name) between 2 and 80),
  name_display text not null default 'handle' check (name_display in ('handle','legal')),  -- A38
  summary_public boolean not null default false,
  outcome text not null default 'in_progress' check (outcome in ('in_progress','certified','not_eligible')),
  finalized_at timestamptz,
  retention_purged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (round_id, user_id),                                           -- A49
  check (not guardian_required or guardian_consent_at is not null or retention_purged_at is not null)
);
create index on public.shift_round_entries (user_id);
-- RLS select: user_id = auth.uid() or can_review(round_id, auth.uid()).
-- Trigger before delete: tombstone this entry's certificate (2.7).

create table public.shift_round_icebreaker_questions (                  -- seeded from shift.md
  id smallint primary key check (id between 1 and 50),
  text_th text not null, text_en text not null, active boolean not null default true
);
-- RLS select to authenticated using (true). Seed the 10 Thai questions from shift.md "Ice break"
-- with English translations (list in Appendix B).

create table public.shift_round_squads (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  mentor_user_id uuid references auth.users(id) on delete set null,   -- must hold mentor/staff role for the round (RPC)
  discord_url text check (discord_url ~ '^https://(discord\.gg|discord\.com)/'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (round_id, name)
);

create table public.shift_round_squad_members (
  squad_id uuid not null references public.shift_round_squads(id) on delete cascade,
  entry_id uuid not null unique references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null,
  icebreaker_question smallint not null references public.shift_round_icebreaker_questions(id),
  icebreaker_answer text check (icebreaker_answer is null or char_length(icebreaker_answer) between 1 and 140),
  answered_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (squad_id, entry_id)
);
-- Squads/members/cheers: RLS on, no client policies; read via RPCs only.

create table public.shift_round_evidence (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null,
  user_id uuid not null,
  submission_id uuid not null,
  type text not null check (type in ('contact','interview','problem_statement','mvp','tester','change','demo_post')),
  payload jsonb not null,
  payload_version smallint not null default 1,
  payload_hash text not null,                         -- md5(type || payload::text || sorted media paths)
  who_key text,                                       -- contact/interview/tester only (E19)
  source_evidence_id uuid references public.shift_round_evidence(id),
  replaces_evidence_id uuid references public.shift_round_evidence(id) on delete set null,  -- DS5
  client_created_at timestamptz not null,             -- clamped: <= submitted_at + 5 min, >= joined_at
  submitted_at timestamptz not null,                  -- server round_now(), authoritative (E3)
  local_date date not null,                           -- ICT date of submitted_at ("active days", E19)
  status text not null default 'submitted' check (status in ('submitted','rejected','accepted','withdrawn')),
  status_reason_code text check (status_reason_code in
    ('not_real_person','duplicate','missing_detail','wrong_mission','privacy','link_broken','other')),
  status_note text check (status_note is null or char_length(status_note) <= 500),
  status_changed_at timestamptz,
  status_changed_by uuid,
  reviewed_at timestamptz,                            -- spot-check pass (taste T4)
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  unique (entry_id, submission_id),                   -- E5
  check ((type = 'change') = (source_evidence_id is not null)),
  check ((type in ('contact','interview','tester')) = (who_key is not null))
);
create index on public.shift_round_evidence (entry_id, type, status);           -- A49
create index on public.shift_round_evidence (round_id, status, submitted_at);   -- review queue
create index on public.shift_round_evidence (source_evidence_id);
-- RLS select: user_id = auth.uid() or can_review(round_id, auth.uid()). No writes.
-- Trigger before update: raise if any of entry_id, round_id, user_id, submission_id, type, payload,
--   payload_hash, who_key, source_evidence_id, client_created_at, submitted_at changes (A24/E8).

create table public.shift_round_evidence_media (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.shift_round_evidence(id) on delete cascade,
  entry_id uuid not null,
  round_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('photo','audio')),
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(photo\.jpg|audio\.m4a)$'),
  bytes int not null check (bytes > 0),
  duration_ms int check (duration_ms is null or duration_ms <= 180000),
  consent_confirmed boolean not null check (consent_confirmed),       -- A10
  exif_checked_at timestamptz,
  exif_found boolean,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (evidence_id, kind)
);
-- RLS select: user_id = auth.uid() or can_review(round_id, auth.uid()).

create table public.shift_round_cheers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null, squad_id uuid not null references public.shift_round_squads(id) on delete cascade,
  from_entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  to_entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  evidence_id uuid references public.shift_round_evidence(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_entry_id <> to_entry_id)
);
create unique index on public.shift_round_cheers (from_entry_id, evidence_id) where evidence_id is not null;

create table public.shift_round_checkins (                              -- A20/A40/DS6/T5
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  checkpoint text not null check (checkpoint in ('join','midpoint','close')),
  answers jsonb not null,
  submitted_at timestamptz not null,
  primary key (entry_id, checkpoint)
);
-- RLS select: owner (via entry) or is_staff(round).

create table public.shift_round_summary_revisions (                     -- A35/E9
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  revision int not null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 600),
  demo_url text check (demo_url is null or demo_url ~ '^https://[^[:space:]]{4,490}$'),
  public_counts jsonb not null default '{"people_talked_to":true,"testers":true,"missions":true}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded','taken_down')),
  decided_by uuid, decided_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 300),
  created_at timestamptz not null default now(),
  unique (entry_id, revision)
);
create unique index on public.shift_round_summary_revisions (entry_id) where status = 'pending';
create unique index on public.shift_round_summary_revisions (entry_id) where status = 'approved';
-- RLS select: owner (via entry) or can_review(round).

create table public.shift_round_certificates (                          -- A30/E4/E10/A49
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^[0-9A-HJKMNP-TV-Z]{16}$'),  -- 80-bit Crockford base32
  round_id uuid not null references public.shift_rounds(id),
  entry_id uuid unique references public.shift_round_entries(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('issued','revoked')),
  snapshot jsonb,                                     -- null only when tombstoned
  snapshot_version smallint not null default 1,
  review_ends_at timestamptz not null,                -- copied from round at issue (E4)
  issued_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text check (revoke_reason in ('staff','holder_deleted')),
  revoke_note text check (revoke_note is null or char_length(revoke_note) <= 300),
  tombstoned_at timestamptz,
  render_version int not null default 1,              -- bumped on revoke/reinstate/name/summary change (E11)
  created_at timestamptz not null default now(),
  check ((tombstoned_at is null) = (snapshot is not null)),
  check (tombstoned_at is null or status = 'revoked'),
  check ((status = 'revoked') = (revoked_at is not null))
);
-- RLS select: user_id = auth.uid() or is_staff(round_id, auth.uid()). Public reads use the RPC only.

create table public.shift_round_events (                                -- A11/A39
  id bigint generated always as identity primary key,
  round_id uuid, entry_id uuid, user_id uuid, actor_id uuid,   -- no FKs: events outlive rows; anonymized on deletion
  name text not null check (name in (
    'round_published','round_joined','round_extended','waitlist_joined',
    'evidence_logged','evidence_withdrawn','evidence_rejected','evidence_accepted','evidence_reviewed',
    'mission_completed','checkin_submitted','squad_assigned','icebreaker_answered','cheer_sent',
    'summary_submitted','summary_approved','summary_rejected','summary_taken_down',
    'certificate_issued','certificate_not_eligible','certificate_revoked','certificate_reinstated',
    'certificate_name_changed','certificate_shared','certificate_visit',
    'transcription_requested','rate_limited','data_deleted')),
  props jsonb not null default '{}',   -- ids, codes, counts only; never student free text or third-party data
  created_at timestamptz not null default now()
);
create index on public.shift_round_events (round_id, created_at);   -- A49
create index on public.shift_round_events (name, created_at);
create index on public.shift_round_events (entry_id);
-- RLS: no client policies.

create table public.shift_round_waitlist (                              -- "notify me" (DS4 no-round state)
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.shift_round_nudge_ledger (                          -- E16
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  round_id uuid,
  kind text not null check (kind in ('no_evidence','closing_tomorrow','evidence_rejected',
    'certificate_issued','summary_decided','squad_assigned','round_published')),
  dedupe_key text not null,              -- ICT date for nudges; object id for event pushes
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped','abandoned')),
  attempts smallint not null default 0,
  expo_ticket_id text, expo_receipt_status text, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, kind, dedupe_key)
);

create table public.shift_round_deletion_requests (                     -- E7
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                 -- no FK: the auth user may already be gone
  round_id uuid,                         -- null = all rounds for the user
  reason text not null check (reason in ('holder_request','account_deleted','retention','audio_retention','orphan')),
  storage_paths text[] not null default '{}',     -- exact object names to remove
  storage_prefixes text[] not null default '{}',  -- folder prefixes to list and remove
  status text not null default 'queued' check (status in ('queued','storage_done','failed')),
  attempts smallint not null default 0, last_error text,
  requested_at timestamptz not null default now(), completed_at timestamptz
);
create index on public.shift_round_deletion_requests (status, requested_at);

create table public.shift_round_job_runs (                              -- A53/X10
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('issue','purge','nudges','pushes','media_scan','watchdog')),
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','failed')),
  due_count int, processed_count int, error text, details jsonb not null default '{}'
);
create index on public.shift_round_job_runs (job, started_at desc);
-- deletion_requests, nudge_ledger, job_runs, waitlist: RLS on, no client policies.
```

Grants: `revoke all on all tables in schema public` for these new tables `from anon, authenticated`;
then `grant select` to `authenticated` only on tables with a select policy (`shift_rounds`,
`shift_round_roles`, `shift_round_entries`, `shift_round_evidence`, `shift_round_evidence_media`,
`shift_round_checkins`, `shift_round_summary_revisions`, `shift_round_certificates`,
`shift_round_icebreaker_questions`) and `grant select on app_config to anon, authenticated`.
No insert/update/delete grants to clients on any new table.

No FK to `hackathon_participants`; no migration touches `hackathon_*` or `user_roles` (A2, A23).

### 2.3 Evidence payload schema v1 (X6)

Mirrored by `pseed/supabase` SQL validation (in `shift_round_submit_evidence`) and `ps_app/lib/round/schema.ts`
(zod). Shared fixtures: `pseed/supabase/tests/fixtures/shift_round_payloads.json` (valid + invalid cases).
Unknown keys are rejected. Strings are trimmed before length checks.

| Type | Mission | Required | Optional |
|---|---|---|---|
| `contact` | 1 | `who_label` (2-60), `channel` (`in_person`,`chat`,`call`,`social`,`other`), `occurred_on` (date) | `link`, photo |
| `interview` | 2 | `who_label`, `occurred_on`, `key_point` (1-500) | `transcript` (<=5000), `planned_change` (<=280), `input` (`voice`,`text`), `link`, photo, audio |
| `problem_statement` | 2 | `text` (20-500) | `link`, photo |
| `mvp` | 3 | `link` or a photo (at least one) | `note` (<=280) |
| `tester` | 4 | `who_label`, `occurred_on`, `key_point` (1-500; "what happened") | `what_tried` (<=200), `transcript`, `planned_change`, `input`, `link`, photo, audio |
| `change` | 5 | `kind` (`changed`,`decided_not_to`) (T3), `what` (5-500), source id (RPC arg in payload as `source_evidence_id`) | `link`, photo |
| `demo_post` | 6 | `url`, `visibility` (`public`,`reviewer_only`) (DS15) | `note` (<=280) |

Rules: every `link`/`url` matches `^https://[^[:space:]]{4,490}$` (E9). `occurred_on` is between
`local_date(starts_at) - 7` and today ICT. `who_label` is rejected (`invalid_field`, field `who_label`,
details `{"rule":"personal_data"}`) when it contains 9+ digits, an email, `@handle`, `line.me`,
`facebook.com`, `instagram.com` (A8/A10). At most one photo and one audio; audio only for
`interview`/`tester`. Photo or audio requires `consent: true` on that media item (A10).
`payload_version` is 1; a later version adds a new branch, never mutates v1.

### 2.4 Missions, counting and eligibility (E2, E17, E19, E8, DS3, DS15)

Counting predicate for evidence `e` of entry in round `r` (`evidence_counts`):

```
e.status in ('submitted','accepted')
and ( e.submitted_at < r.closes_at
      or (e.client_created_at < r.closes_at
          and e.submitted_at < r.closes_at + r.grace_minutes * interval '1 minute') )
and ( e.type <> 'change'
      or exists (source s: s.id = e.source_evidence_id and s.entry_id = e.entry_id
                 and s.type in ('interview','tester') and evidence_counts(s, r)) )
```

A rejected source that is re-accepted makes the change count again unless the change itself is
rejected or withdrawn (E8). A change is "invalidated" (UI state) when its own status counts but its
source does not.

| Mission | key | Complete when (counted evidence only) | Display |
|---|---|---|---|
| 1 | `first_contact` | >= 1 `contact` | ติดต่อคนแรก / First contact |
| 2 | `interviews_problem` | >= 3 distinct `who_key` among `interview` **and** >= 1 `problem_statement` | สัมภาษณ์ + โจทย์ / Interviews + problem |
| 3 | `mvp` | >= 1 `mvp` | สร้าง MVP / Build an MVP |
| 4 | `testers` | >= 3 distinct `who_key` among `tester` | ให้คนจริงลองใช้ / Real people try it |
| 5 | `change` | >= 1 `change` | เปลี่ยนตามที่ได้ยิน / Change what you heard |
| 6 | `demo_post` | >= 1 `demo_post` (public or reviewer-only) | โพสต์เดโม / Post your demo |

`mission_counts(entry_id)` returns:

```json
{"missions":[{"key":"first_contact","n":1,"complete":true,
  "parts":[{"type":"contact","have":1,"need":1}]}, ...],
 "missions_complete":4, "people_talked_to":7, "eligible":false}
```

`people_talked_to` = distinct `who_key` across counted contact/interview/tester (DS8). Missions are
met in any order; "next" = first incomplete in SHIFT order (DS3), computed on the client from this
JSON. `eligible` = all six complete (A7). Snapshots happen only at issue (A30).

### 2.5 Storage (A10, E6)

Bucket `shift-round-media`: `public = false`, `file_size_limit = 10485760`, `allowed_mime_types =
{image/jpeg, audio/mp4, audio/x-m4a, audio/m4a, audio/aac}`. Never Backblaze.

Object name: `{round_id}/{user_id}/{draft_id}/photo.jpg` or `.../audio.m4a` (R18).

Policies on `storage.objects` for this bucket:

| Op | Rule |
|---|---|
| insert | `bucket_id = 'shift-round-media' and shift_round_private.can_upload(name)`: name matches the regex in 2.2; folder 2 = `auth.uid()`; caller has an entry in round folder 1; round phase is `upcoming`/`active`/`review`; `submissions_enabled` is true (X18). |
| select | `can_read_media(name)`: folder 2 = `auth.uid()`, or `can_review(folder 1, auth.uid())`. Staff view through 5-minute signed URLs. |
| update | none (clients upload with `upsert: false`). |
| delete | owner only, and only while no `shift_round_evidence_media.path = name` (discarding a draft). |

Client: photos are re-encoded with `expo-image-manipulator` (max 1600px long edge, JPEG 0.8), which
drops EXIF/GPS. Server: the `media_scan` job re-checks each new object for an APP1 `Exif` segment and
rewrites the file without it if found (E6). Audio: AAC in m4a, mono, 64 kbps, max 180 s.

### 2.6 Evidence state machine and locks (E3, A9, A24, A32, E4)

```
submitted --reject (staff/mentor)--> rejected --accept (staff/mentor)--> accepted
submitted --withdraw (holder)-----> withdrawn (terminal)
accepted: final for review. No other transitions. No update RPC exists (A24).
Allowed only while round_now() < round.review_ends_at and the entry has no certificate (E4).
"Mark reviewed" sets reviewed_at/reviewed_by without changing status (T4 spot-check).
```

Lock order for every eligibility-affecting operation (submit, reject, accept, withdraw, extend,
reinstate, delete, issue):

1. `shift_rounds` row: `for share` (extend and policy update take `for update`).
2. `shift_round_entries` row: `for update` (`lock_entry`).
3. Evidence/certificate rows of that entry.

Server `submitted_at = round_now()` is authoritative. Race tests use two connections (7.1).

Entry outcome: `in_progress -> certified | not_eligible` (issue job). `not_eligible -> in_progress`
only via extend before any certificate in the round has issued.

### 2.7 Certificates (A18, A30, A38, E4, E10, A37, DS16)

State: `(none) -> issued -> revoked (staff) -> issued (reinstate)`; any state `-> revoked +
tombstoned` on holder deletion (terminal; reinstate refused with `certificate_tombstoned`).

Snapshot v1 (written once at issue; only `holder` may change later through
`shift_round_set_certificate_name`, which bumps `render_version`):

```json
{"v":1,"issuer":"Passion Seed","public_id":"7K2M9QX4T8HBN3PD",
 "round":{"number":4,"title_th":"...","title_en":"...","starts_on":"2026-11-10","closes_on":"2026-11-23"},
 "track":"high_school",
 "holder":{"handle":"ต้น","legal_name":null,"display":"handle"},
 "missions":["first_contact","interviews_problem","mvp","testers","change","demo_post"],
 "counts":{"people_talked_to":9,"interviews":4,"testers":3,"changes":2},
 "issued_at":"2026-11-26T00:05:00+07:00"}
```

Tombstone: trigger `before delete on shift_round_entries` sets the certificate `status = 'revoked'`,
`revoke_reason = 'holder_deleted'`, `revoked_at = round_now()`, `snapshot = null`,
`tombstoned_at = round_now()`, `user_id = null`, `render_version + 1` (E10). Retention purge never
deletes entry rows, so valid snapshots stay intact (A30).

### 2.8 Squads (DEFAULT, user may override)

- Staff create squads per round and assign entries (max `squad_size`, default 3) plus one mentor
  (must hold `mentor` for the round or be staff). One squad per entry.
- On assignment the RPC gives each member a distinct `icebreaker_question` (random among active
  questions not yet used in the squad) and emits `squad_assigned` (push).
- Members see: squad name, members' handles, mentor display name (from `profiles`), each member's
  question and one-line answer, squad Discord link (else round link), the feed, cheers.
- Feed = generated items from `shift_round_events` (`evidence_logged` with counted status and
  `mission_completed`) of squad members, newest 30, excluding withdrawn/rejected evidence. Items carry
  `{handle, kind, type, n, mission, at}` only: no payload text, photos, audio, quotes or labels.
- Cheer: on a feed item or a member; unique per (from, evidence); max 20 per sender per ICT day.
  In-app only in beta (no push).

### 2.9 Legacy SHIFT tables (A51, E15)

| Object | Status after this build |
|---|---|
| `shift_camp_cohorts`, `shift_camp_enrollments`, `shift_camp_invitations`, `shift_camp_updates`, `shift_camp_messages`, `shift_camp_requests`, `shift_camp_checkpoints`, `shift_camp_checkins`, bucket `shift-camp`, `shift_camp_action`, `shift_private.camp_action` and helpers, `map_nodes.shift_camp_day` | **Legacy, read-only.** Migration backfills `ends_on = starts_on + 6` where null and changes `shift_private.camp_action` so every write action on a cohort whose ICT today > `ends_on` returns `{ok:false, error:{code:'cohort_closed'}}`. Reads unchanged (old binaries degrade, E15). Not extended. |
| `shift_daily_updates`, `shift_daily_revisions`, `shift_private.roster`, `link_codes`, `link_attempts`, `shift_companion_action` (applied to prod) | **Legacy, frozen.** Companion write actions return `companion_retired`; reads stay for staff. |
| `shift_applications`, `shift_students`, `shift_student_notes`, `shift_feedback` | **Active, untouched** (recruiting, tracker, feedback). `shift_applications.user_id` feeds the allowlist import. |

## 3. RPC and error contract (X5, X7, E5, E13)

### 3.1 Conventions

- All RPCs are `public.shift_round_*`, `language plpgsql security definer set search_path = ''`.
  Each checks `auth.uid()` first (except public and job RPCs). `revoke execute ... from public, anon`;
  `grant execute ... to authenticated` (student/admin), `to anon, authenticated` (public RPCs),
  `to service_role` only (job RPCs).
- No RPC accepts a time argument; all time comes from `round_now()` (E13).
- Success: `{"ok": true, "data": {...}, "request_id": "uuid"}`.
- Business error (no writes made): `{"ok": false, "error": {"code": "...", "category": "...",
  "field": null|"name", "retry_after": null|seconds, "details": {}}, "request_id": "uuid"}`.
- Categories (X5): `validation`, `unauthenticated`, `forbidden`, `unavailable`, `retryable`.
- Unexpected SQL errors raise; the client maps them: HTTP 401/JWT error -> `unauthenticated`;
  PostgREST `PGRST202` or 404 (function missing) -> `unavailable` (never "not enrolled", X5);
  5xx/timeout -> `retryable`; no network -> client-only `offline`.
- `lib/supabase.ts` missing-config proxy must cover `.rpc` and `.storage` and surface `unavailable`.

### 3.2 Student RPCs (caller: authenticated)

| RPC | Args | `data` on success | Error codes | Idempotency | Rate limit |
|---|---|---|---|---|---|
| `shift_round_home` | `p_entry_id uuid default null` | E22 bundle, 3.6 | `unauthenticated`, `entry_not_found` | read | none |
| `shift_round_join` | `p_round_id uuid, p_track text, p_birth_month int, p_birth_year int, p_guardian_consent boolean, p_handle text` | `{entry_id, guardian_required}` | `round_not_found`, `round_not_open`, `join_closed`, `invite_only`, `enrollment_paused`, `already_in_active_round`, `track_not_open`, `invalid_field` (handle, birth), `guardian_consent_required` | replay returns existing entry (`already: true`) | 5/min/user |
| `shift_round_set_handle` | `p_entry_id, p_handle` | `{handle}` | `entry_not_found`, `invalid_field`, `certificate_issued` | natural | 10/hour |
| `shift_round_submit_evidence` | `p_entry_id uuid, p_submission_id uuid, p_type text, p_payload jsonb, p_media jsonb ([{kind, path, bytes, duration_ms, consent}]), p_client_created_at timestamptz, p_replaces_evidence_id uuid default null` | receipt, 3.7 | `entry_not_found`, `submission_conflict`, `media_in_use`, `submissions_paused`, `round_finished`, `rate_limited` (+`retry_after`), `invalid_field`/`missing_field` (+`field`), `link_not_https`, `photo_consent_required`, `audio_consent_required`, `media_missing`, `media_not_owned`, `invalid_change_source` | E5: unique `(entry_id, submission_id)`; replay with same `payload_hash` returns the original receipt **before** kill-switch, close and rate checks (ownership/deletion still checked); different hash -> `submission_conflict` | `rate_limit_per_hour` (30) counted on inserted rows of the entry in the last hour |
| `shift_round_withdraw_evidence` | `p_evidence_id uuid, p_dry_run boolean default true` | `{affected:[{mission, have_before, have_after}], invalidated_changes:[evidence_id], applied:bool, missions}` | `evidence_not_found`, `withdraw_after_issue`, `withdraw_not_allowed`, `review_closed` | repeat apply returns `applied:true, already:true` | 30/hour |
| `shift_round_submit_checkin` | `p_entry_id, p_checkpoint text, p_answers jsonb` | `{checkpoint}` | `checkin_not_due`, `checkin_already_submitted`, `invalid_field` | PK `(entry_id, checkpoint)` | 10/hour |
| `shift_round_squad` | `p_entry_id` | 3.6 squad bundle | `entry_not_found`, `squad_not_assigned` (data still returns waiting state) | read | none |
| `shift_round_set_icebreaker` | `p_entry_id, p_answer text` | `{answer}` | `squad_not_assigned`, `invalid_field` | overwrite | 20/hour |
| `shift_round_send_cheer` | `p_entry_id, p_to_entry_id, p_evidence_id default null` | `{cheer_id}` | `not_same_squad`, `cheer_limit` (+`retry_after` to ICT midnight), `invalid_field` | unique (from, evidence) returns existing | 20/ICT day |
| `shift_round_submit_summary` | `p_entry_id, p_title, p_description, p_demo_url, p_public_counts jsonb` | `{revision_id, revision, status:'pending'}` | `invalid_field`, `link_not_https`, `entry_not_found` | a new pending revision supersedes the previous pending one | 10/hour |
| `shift_round_set_summary_public` | `p_entry_id, p_public boolean` | `{summary_public}` | `entry_not_found` | natural | 20/hour |
| `shift_round_set_certificate_name` | `p_certificate_id, p_display text ('handle'|'legal'), p_legal_name text default null` | `{display, render_version}` | `certificate_not_found`, `certificate_revoked`, `invalid_field` | natural | 10/hour |
| `shift_round_log_share` | `p_certificate_id, p_format ('story'|'square'|'link'), p_target text ('instagram_story'|'share_sheet'|'copy')` | `{}` | `certificate_not_found` | none | 30/hour |
| `shift_round_join_waitlist` | none | `{}` | — | PK on user | 5/hour |
| `shift_round_delete_my_data` | `p_round_id uuid default null (all), p_confirm text ('DELETE')` | `{deleted_entries, certificates_revoked, deletion_request_id}` | `invalid_field` (confirm) | repeat returns zeros | 5/hour |
| `shift_round_transcription_check` | `p_path text` | `{max_seconds:180, language_hint}` | `transcription_paused`, `media_not_owned`, `round_finished`, `rate_limited` (20/hour) | logs `transcription_requested` | 20/hour |

Submit order of checks (E5): auth -> entry exists, owned, not deleted -> replay lookup ->
`submissions_enabled` -> phase (after `review_ends_at` -> `round_finished`) -> payload validation
(2.3) -> media checks (object exists in `storage.objects` with that name, `owner_id = auth.uid()`,
path folders match round/user, not already bound) -> change source (same entry, interview/tester,
currently counts) -> rate limit -> lock (2.6) -> insert evidence + media rows -> events
(`evidence_logged`, plus `mission_completed` for each mission that flipped to complete) -> receipt.
Submissions after close but before `review_ends_at` are stored with `counted:false`, `after_close:true`
unless the grace rule applies (A7, E17).

Join rules: round `published`; `enrollment_enabled`; phase `upcoming` or `active` with
`round_day <= join_cutoff_day` (A12); invite rounds require an allowlist row matching `auth.uid()` or
the caller's `auth.users.email` (lowercased) (A33, E14); `p_track` in `tracks_open`; no other entry of
the caller in a round with phase `upcoming|active` (R4); `guardian_required` when
`(year_now*12 + month_now) - (birth_year*12 + birth_month) <= 240` in ICT (DS6, conservative in the
birthday month); consent must be true then. `joined_day = max(round_day, 0)`.

Check-in due rules: `join` after the entry's first counted log until day 6; `midpoint` from day 7 to
day `duration_days` if `joined_day <= 5` (A40); `close` from day `duration_days` until
`review_ends_at`. Answer keys per checkpoint (all optional except at least one answered):

| Key | Type | join | midpoint | close |
|---|---|---|---|---|
| `ownership` | int 1-5 | yes | yes | yes |
| `why` | enum `had_to`,`portfolio`,`wanted_to`,`care_people` | "why join" | — | "why keep working" |
| `confidence` | int 1-5 | yes | — | yes |
| `squad` | int 1-5 (T5) | — | yes | yes |
| `decided_myself` | text <=500 | — | yes | — |
| `satisfied` | int 1-5 | — | — | yes |
| `can_do_now` | text <=500 | — | — | yes |

### 3.3 Public RPCs (caller: anon or authenticated) (E13, A5, A28, A39)

| RPC | Args | `data` | Errors | Notes |
|---|---|---|---|---|
| `shift_round_certificate_public` | `p_public_id text` | `{status:'valid'|'revoked', tombstone:bool, snapshot (null if tombstone), revoked_at, render_version, verify_url, summary: null | {title, description, demo_url, counts:{...only keys opted in}}}` | `certificate_not_found` (also for malformed ids) | Summary only when `entry.summary_public` and an `approved` revision exists and certificate is `issued`. Never returns evidence, labels, reviewer-only links, user ids, entry ids, birth data. |
| `shift_round_log_certificate_visit` | `p_public_id text, p_ref text` | `{}` | `certificate_not_found` | `p_ref` normalized to `share`,`qr`,`link`,`other`, or null. Max 500 visit events per certificate per ICT day (silent drop). |

### 3.4 Admin RPCs (caller: authenticated with `shift_round_roles`; web admin only)

"Staff" = `is_staff(round)`; "Reviewer" = `can_review(round)`; "Global" = `is_global_staff`.
All write `shift_round_events` with `actor_id` (X9). Errors not listed: `unauthenticated`, `forbidden`.

| RPC | Args | Role | `data` | Specific errors |
|---|---|---|---|---|
| `shift_round_admin_rounds` | — | any role | rounds visible to caller with counts | — |
| `shift_round_admin_create_round` | `p_round jsonb` (all policy columns) | Global | `{round_id}` | `invalid_field`, `round_number_taken` |
| `shift_round_admin_update_round` | `p_round_id, p_patch jsonb` | Staff | `{round}` | `policy_locked` (policy columns except `discord_url`, `brief_*`, `title_*`, `status`, `join_cutoff_day` before cutoff are locked after `starts_at`) |
| `shift_round_admin_extend_round` | `p_round_id, p_days int (1-7), p_reason text` | Staff | `{closes_at, review_ends_at}` | `extend_after_issue` (any certificate issued in round), `invalid_field`. Resets `not_eligible` outcomes to `in_progress`. |
| `shift_round_admin_set_role` | `p_email text, p_role text, p_round_id uuid, p_grant boolean` | Global | `{user_id, role, round_id}` | `user_not_found`, `invalid_field` |
| `shift_round_admin_allowlist` | `p_round_id, p_add text[] (emails), p_remove text[]` | Staff | `{count}` | `invalid_field` |
| `shift_round_admin_allowlist_import` | `p_round_id, p_cohort text` | Staff | `{added}` | — (imports `shift_applications` where `cohort = p_cohort and status = 'accepted' and user_id is not null`) |
| `shift_round_admin_entries` | `p_round_id` | Reviewer | entries + mission counts + squad + flags | — |
| `shift_round_admin_update_entry` | `p_entry_id, p_patch jsonb (track, beta_group)` | Staff | `{entry}` | `certificate_issued` (track locked after issue) |
| `shift_round_admin_upsert_squad` | `p_round_id, p_squad_id uuid null, p_name, p_mentor_user_id, p_discord_url` | Staff | `{squad_id}` | `mentor_not_in_round`, `invalid_field` |
| `shift_round_admin_assign_squad` | `p_entry_id, p_squad_id uuid null` | Staff | `{squad_id, icebreaker_question}` | `squad_full`, `wrong_round`, `round_finished` |
| `shift_round_admin_delete_squad` | `p_squad_id` | Staff | `{}` | — |
| `shift_round_admin_review_queue` | `p_round_id, p_filter jsonb {status, type, squad_id, unreviewed_only, sample}` | Reviewer | evidence with payload, media paths, entry handle, squad | — (`sample:true` returns, per entry, its oldest unreviewed interview and tester first, T4) |
| `shift_round_admin_entry_detail` | `p_entry_id` | Reviewer | entry, missions, evidence timeline, check-ins, events | — |
| `shift_round_admin_reject_evidence` | `p_evidence_id, p_reason_code, p_note, p_review_ms int` | Reviewer | `{missions, invalidated_changes}` | `review_closed`, `invalid_transition`, `invalid_field` |
| `shift_round_admin_accept_evidence` | `p_evidence_id, p_note, p_review_ms` | Reviewer | `{missions}` | `review_closed`, `invalid_transition` |
| `shift_round_admin_mark_reviewed` | `p_evidence_id, p_review_ms` | Reviewer | `{}` | — |
| `shift_round_admin_summaries` | `p_round_id, p_status text` | Reviewer | revisions | — |
| `shift_round_admin_decide_summary` | `p_revision_id, p_decision ('approve'|'reject'), p_reason` | Reviewer | `{status}` | `invalid_transition` (not pending), `invalid_field` (reason required to reject) |
| `shift_round_admin_take_down_summary` | `p_entry_id, p_reason` | Staff | `{}` | `invalid_transition` |
| `shift_round_admin_certificates` | `p_round_id` | Staff | certificates + outcomes | — |
| `shift_round_admin_revoke_certificate` | `p_certificate_id, p_reason` | Reviewer (A3) | `{status, render_version}` | `invalid_transition` |
| `shift_round_admin_reinstate_certificate` | `p_certificate_id, p_note` | Staff | `{status, render_version}` | `certificate_tombstoned`, `invalid_transition` |
| `shift_round_admin_dashboard` | `p_round_id` | Reviewer | 6.3 counts | — |
| `shift_round_admin_set_config` | `p_key, p_value jsonb` | Global | `{key, value}` | `invalid_field` (unknown key) |
| `shift_round_admin_jobs` | — | Global | last run per job, failures 7 days | — |

Reject cascade (A9, A32): the RPC returns which missions dropped and which change items became
invalidated, emits `evidence_rejected` (push), and never touches certificates already issued.

### 3.5 Job RPCs (caller: service_role only)

| RPC | Purpose |
|---|---|
| `shift_round_job_start(p_job)` / `shift_round_job_finish(p_run_id, p_status, p_due, p_processed, p_error, p_details)` | job_runs bookkeeping |
| `shift_round_job_due_entries(p_limit int)` | entries with `outcome = 'in_progress'` in rounds where `round_now() >= review_ends_at` and status `published` |
| `shift_round_job_issue_entry(p_entry_id)` | one transaction: lock round (share) + entry; skip if certificate exists or outcome final; recompute `mission_counts`; eligible -> insert certificate (`on conflict (entry_id) do nothing`), snapshot, `outcome = 'certified'`, event `certificate_issued`; else `outcome = 'not_eligible'`, event `certificate_not_eligible`. Returns `{result:'issued'|'not_eligible'|'skipped'}` (A18, A31, A50, E4). |
| `shift_round_job_push_candidates(p_job text ('nudges'|'pushes'), p_limit int)` | claims rows by inserting `shift_round_nudge_ledger` (`on conflict do nothing`) and returns `[{ledger_id, user_id, token, lang, kind, params}]`. Nudges: entries in `active` rounds whose `nudge_local_time` hour equals the current ICT hour; `no_evidence` if no evidence with `local_date = today`; on day `duration_days - 1` kind `closing_tomorrow` instead; skip when all 6 complete; require `profiles.expo_push_token`, `mobile_settings->>'push_enabled' = 'true'`, `shift_round_nudges`. Pushes: events since last 48h of names `evidence_rejected`, `certificate_issued`, `summary_approved|summary_rejected`, `squad_assigned`, `round_published` (to waitlist, then waitlist rows deleted); require token and `push_enabled` (not the nudge opt-out). |
| `shift_round_job_push_result(p_ledger_ids uuid[], p_status, p_ticket_ids text[], p_error)` | ledger update, `attempts + 1` |
| `shift_round_job_receipts_pending()` / `shift_round_job_receipt_result(p_ledger_id, p_status, p_clear_token boolean)` | receipt polling; `DeviceNotRegistered` clears `profiles.expo_push_token` if it still equals the sent token |
| `shift_round_job_enqueue_retention()` | rounds with `closes_at + retention_months < round_now()`: per entry delete evidence (cascade media rows), check-ins, cheers, squad membership, non-approved summary revisions; null `birth_month`, `birth_year`, `guardian_consent_at`; set `retention_purged_at`; queue storage prefixes `{round}/{user}/`. Audio: media rows with `kind = 'audio'` older than `review_ends_at + audio_retention_days` -> queue exact paths, set `purged_at`. Certificates and approved summaries untouched (A21, A30, E21). |
| `shift_round_job_next_deletions(p_limit)` / `shift_round_job_finish_deletion(p_id, p_status, p_error)` | E7 queue |
| `shift_round_job_media_to_scan(p_limit)` / `shift_round_job_media_scanned(p_media_id, p_exif_found)` | E6 scan |
| `shift_round_job_orphans(p_limit)` | objects in the bucket older than 24h with no media row -> names |
| `shift_round_job_delete_user(p_user_id)` | called by `delete-user-account` before deleting the auth user: same effect as `delete_my_data(all)` plus queue, reason `account_deleted` (E10) |
| `shift_round_job_watchdog()` | jobs with no `ok` run within: issue 2h, pushes 30m, nudges 2h, media_scan 1h, purge 26h |

### 3.6 Read bundles (E22)

`shift_round_home` data (one call per Shift-tab load; the log screen reuses it):

```json
{"now":"...","flags":{"tab_enabled":true,"enrollment_enabled":true,"submissions_enabled":true,
   "transcription_enabled":true,"emergency_message":null,"web_base_url":"https://www.passionseed.org"},
 "entry":null | {"id","round_id","track","handle","joined_at","joined_day","outcome",
   "name_display","has_legal_name","summary_public"},
 "round":null | {"id","number","title_th","title_en","brief_th","brief_en","starts_at","closes_at",
   "review_ends_at","duration_days","join_cutoff_day","day","phase","discord_url","join_mode",
   "mentor_led","grace_minutes"},
 "joinable":[{"round_id","number","title_th","title_en","starts_at","closes_at","join_by",
   "join_mode","can_join":true,"reason":null|"invite_only"|"join_closed"|"already_in_active_round"}],
 "next_round":null | {"number","starts_at"},
 "on_waitlist":false,
 "missions":{...mission_counts...},
 "evidence":[{"id","type","status","counted","after_close","invalidated","mission","submitted_at",
   "local_date","payload","media":[{"kind","path"}],"status_reason_code","status_note",
   "replaces_evidence_id","source_evidence_id","replaced_by"}],
 "checkins_due":["join"],"checkins_done":[],
 "squad":null | {"id","name","members":3,"latest":{"handle","kind","type","n","at"}},
 "certificate":null | {"id","public_id","status","issued_at","revoked_at","tombstone",
   "render_version","verify_url"},
 "summary":null | {"latest":{"revision","status","title","description","demo_url",
   "public_counts","decision_reason"},"public_revision":null},
 "past_certificates":[{"round_number","public_id","status","verify_url"}]}
```

Current entry = `p_entry_id` if given, else the caller's entry whose round phase is
`upcoming|active|review`, else the most recent. `round` = that entry's round, else the nearest
joinable round.

`shift_round_squad` data:

```json
{"state":"waiting"|"assigned"|"none",
 "squad":{"id","name","discord_url","mentor":{"display_name"}},
 "members":[{"entry_id","handle","is_me","question":{"id","th","en"},"answer","missions_complete"}],
 "feed":[{"evidence_id","entry_id","handle","kind":"evidence_logged"|"mission_completed",
   "type","n","mission","at","cheers","cheered_by_me"}]}
```

### 3.7 Submit receipt (X7)

```json
{"evidence_id","submission_id","submitted_at","replayed":false,"counted":true,"after_close":false,
 "duplicate_label":false,"missions":{...mission_counts...},"newly_completed":["testers"]}
```

### 3.8 Error code catalogue (X8)

| Code | Category | Cause |
|---|---|---|
| `unauthenticated` | unauthenticated | no or expired session |
| `forbidden` | forbidden | role/ownership check failed |
| `unavailable` | unavailable | RPC missing, server misconfigured, feature flag unreadable |
| `retryable` | retryable | timeout, 5xx |
| `offline` | (client) | no network |
| `entry_not_found` | validation | entry deleted or not owned |
| `round_not_found`, `round_not_open` | validation | draft/unknown round, or not yet joinable |
| `join_closed` | validation | `round_day > join_cutoff_day` (A12) |
| `invite_only` | forbidden | not on allowlist (A33) |
| `enrollment_paused` | unavailable | `enrollment_enabled = false` |
| `already_in_active_round` | validation | R4 |
| `track_not_open` | validation | R16 |
| `guardian_consent_required` | validation | DS6 |
| `invalid_field`, `missing_field` | validation | 2.3 (`field` set) |
| `link_not_https` | validation | E9 |
| `photo_consent_required`, `audio_consent_required` | validation | A10 |
| `media_missing`, `media_not_owned`, `media_in_use` | validation/forbidden/validation | upload incomplete, wrong owner, path already bound |
| `submissions_paused` | unavailable | X18 kill switch |
| `rate_limited` | retryable | E5, with `retry_after` |
| `submission_conflict` | validation | E5 same id, different payload |
| `round_finished` | validation | after `review_ends_at` |
| `invalid_change_source` | validation | E8 |
| `withdraw_after_issue`, `withdraw_not_allowed` | validation | A24 |
| `review_closed`, `invalid_transition`, `certificate_issued` | validation | E3/E4 |
| `checkin_not_due`, `checkin_already_submitted` | validation | A20/A40 |
| `squad_not_assigned`, `not_same_squad`, `cheer_limit` | validation/forbidden/retryable | 2.8 |
| `certificate_not_found`, `certificate_revoked`, `certificate_tombstoned` | validation | 2.7 |
| `transcription_paused`, `transcription_failed`, `audio_too_long` | unavailable/retryable/validation | 5.6 |
| staff only: `extend_after_issue`, `policy_locked`, `squad_full`, `wrong_round`, `mentor_not_in_round`, `round_number_taken`, `user_not_found` | validation | 3.4 |

Warnings (not errors) on a successful receipt: `after_close` (stored, not counted), `duplicate_label`.

## 4. Jobs

### 4.1 Scheduler and auth (E13, A31)

- One edge function `shift-round-jobs` in `pseed/supabase/functions/shift-round-jobs/`, body
  `{"job": "issue"|"purge"|"nudges"|"pushes"|"media_scan"|"watchdog"}`.
- `pg_cron` calls `shift_round_private.invoke_job(job)`, which reads Vault secrets
  `shift_round_jobs_url` and `shift_round_jobs_secret` and calls `net.http_post` with header
  `x-shift-round-jobs-secret`. The function compares it in constant time with env
  `SHIFT_ROUND_JOBS_SECRET` **before parsing the body or creating a client**; mismatch -> 401, no work.
- The function then uses the service-role client for `shift_round_job_*` RPCs and the Storage API.
- Each run calls `job_start`/`job_finish`. On failure, or when due work > 0 and processed = 0, it
  posts to Discord webhook env `SHIFT_ROUND_ALERT_WEBHOOK_URL` (named staff channel, X10) with job,
  error, last success time and due count. Sentry is not required server-side.

| Cron name | Schedule (UTC) | Job |
|---|---|---|
| `shift-round-issue` | `5 * * * *` | issue |
| `shift-round-pushes` | `*/5 * * * *` | pushes (+ receipts) |
| `shift-round-nudges` | `0 * * * *` | nudges (sends only for rounds whose `nudge_local_time` hour = current ICT hour; default 19:00 ICT = 12:00 UTC, E16) |
| `shift-round-media-scan` | `*/10 * * * *` | media_scan |
| `shift-round-purge` | `30 20 * * *` (03:30 ICT) | purge |
| `shift-round-watchdog` | `15 1 * * *` | watchdog |

Schedules are created idempotently (check `cron.job` by name, like
`20260813220000_meta_webhook_event_integration.sql`).

### 4.2 Issue certificates (A18, A31, A50, E4, E11)

1. If `issuance_enabled` is false: finish `ok` with `details.paused = true`.
2. Health gate (E11): `GET {web_base_url}/api/shift/cert-health` must return 200 `{ok:true}`; else
   finish `failed` with alert; no issuance.
3. Loop `job_due_entries(200)`; call `job_issue_entry` per entry (its own transaction). An exception
   for one entry is recorded in `details.errors` and the loop continues (E4).
4. Running twice issues nothing new (unique `entry_id`, outcome check).

### 4.3 Purge and deletion (A21, E7, E10, E21, E6)

1. `job_enqueue_retention()`.
2. Orphans: `job_orphans(500)` -> insert deletion request reason `orphan` with exact paths.
3. `job_next_deletions(50)`: for each, delete exact paths; for each prefix, list
   (`storage.from('shift-round-media').list(prefix, {limit: 1000})` recursively) and remove; list
   again and require empty; then `job_finish_deletion(id,'storage_done')`. Failure: `failed`,
   `attempts + 1`, retried next day; after 5 attempts alert.
4. Row deletion for holder requests happens synchronously in `shift_round_delete_my_data`; the queue
   only handles storage, so data disappears from the app and the web immediately.

### 4.4 Nudges and pushes (A4, DS4, DS5, E16, A43)

- Expo push API, messages chunked by 100, `channelId: "shift"`, `data.url` deep link (e.g.
  `passion-seed://round/evidence/{id}`). Copy from 5.8 in `profiles.preferred_language` (default th).
- Ticket errors: `DeviceNotRegistered` -> clear token. Receipts checked on the next `pushes` run
  (15+ min later).
- Retry: `failed` nudges retried up to 3 attempts within the same ICT day, then `abandoned`; event
  pushes up to 3 attempts within 24h. One token per user (documented beta limit).
- The app does not schedule its legacy local daily reminder while the user has an entry with phase
  `upcoming|active` (E16 no duplicate).
- Nudges can be enabled after the binary ships (A43): cron rows exist but the job no-ops until
  `app_config shift_round.nudges_enabled = true` (seeded false, 2.2).

### 4.5 Media scan (E6)

For each media row with `exif_checked_at is null`: download; photos: parse JPEG segments, if any
APP1 `Exif\0\0` segment exists, rewrite without APP1 and re-upload (`upsert: true`, service role),
`exif_found = true`; audio: no-op. Mark checked.

## 5. App (ps_app)

### 5.0 Before starting (lead, then lane C)

1. Commit the v3 theme work already in the tree (`lib/theme.ts`, `docs/DESIGN.md`, activity
   screens) to `main` separately.
2. X14: commit all companion work (staged `app/_layout.tsx`, `app/index.tsx`, `lib/auth.tsx`,
   `lib/supabase.ts`, and untracked `app/shift/{account,history,link,sign-in,today,update}.tsx`,
   `app/welcome.tsx`, `components/shift/{CompanionEmailEditor,CompanionUI,DailyUpdateDetail}.tsx`,
   `lib/hooks/useShiftCompanion.ts`, `lib/shiftCompanion*.ts`, `scripts/shift-companion/`,
   `tests/shift-companion*.test.ts`) to branch `archive/shift-companion-2026-10`. Record the test
   count (30 cases across 4 files).
3. Build branch `feat/shift-rounds` from `main`. Bring over only what the build reuses.

### 5.1 Routes

| Route | Screen | Notes |
|---|---|---|
| `app/(tabs)/shift.tsx` | Shift home | DS1 order; states 5.4 |
| `app/(tabs)/squad.tsx` | สควอด | 2.8 |
| `app/(tabs)/profile.tsx` (modify) | โปรไฟล์ | SHIFT section on top: handle, language, certificates, notifications (nudge toggle), delete SHIFT data, "เครื่องมือเดิม" (links to discover, my-paths, radar, plans routes) |
| `app/round/join.tsx` | Join, 3 steps in one route (track; birth month+year with guardian step if required and share-with-parent link; handle) | DS6, under 60 s |
| `app/round/capture.tsx` | Composer (modal), params `type`, `draftId`, `sourceId`, `replaces` | 5.5 |
| `app/round/log.tsx` | All logs grouped by mission, per-item status, local drafts first, "เพิ่มบันทึก" | DS2 log responsibilities; never auto-opens composer |
| `app/round/mission/[key].tsx` | One mission: requirement, parts, items, CTA | |
| `app/round/evidence/[id].tsx` | Item detail: status, reason + fix, linked change, withdraw with preview, "บันทึกใหม่แทน" | DS5 |
| `app/round/checkin.tsx` | Check-in, param `checkpoint` | |
| `app/round/certificate.tsx` | Certificate, share, name opt-in with preview | DS9, A38 |
| `app/round/summary.tsx` | Project summary editor + preview of the public page | A35, E9, A26 |
| `app/round/delete-data.tsx` | Delete SHIFT data with preview of what goes | A21, E10 |
| `app/sign-in.tsx` | Sign in (Google, Apple, email), params `next`, `reason=expired` | E14 |

Interactive camp routes in `app/shift/*` (tracked: `compose`, `intro`, `mentor`, `post/[id]`,
`profile`, `project`) stay reachable read-only: remove every write affordance and stop calling
write actions of `campAction` (E15 audit list goes in the PR). `lib/shift-context.tsx` keeps
`list`/`snapshot` only. Camp tabs `today`, `projects`, `group` are hidden in SHIFT mode.

### 5.2 Navigation and auth cutover (DS2, DS10, A13, A54, E14, X18)

Pure function `lib/round/navigation.ts#decideRoute(input)` (unit-tested), used by `app/_layout.tsx`
in place of the companion redirects:

| Input state | Destination |
|---|---|
| loading | splash |
| hackathon mode | `/(hackathon)/home` as today; hackathon home shows a "SHIFT ใช้บัญชี Passion Seed" card that exits hackathon mode and opens `/sign-in` |
| signed out, deep link or route under `/round/*` | store link in `shiftStorage` key `round:pending-link`, go `/sign-in?next=...` |
| signed out, root | landing `app/index.tsx` |
| session expired (auth `SIGNED_OUT` while drafts exist) | `/sign-in?reason=expired&next=<current>`; drafts kept (keyed by user id) |
| guest | `/(tabs)/shift` teaser (sign in to join); legacy tabs as today |
| signed in, pending link | go there, clear link |
| signed in, `tab_enabled` or has an entry (cached allowed) | `/(tabs)/shift`; tabs Shift, สควอด, โปรไฟล์; legacy tabs `href: null` |
| signed in, flag off, no entry | legacy (onboarded ? `/(tabs)/discover` : `/onboarding`) |

- SHIFT users never need the legacy PathLab onboarding.
- If `app_config` is unreadable, use the last cached value; an existing entry always keeps SHIFT
  tabs (X18). Flags are never authorization (E18): the server enforces enrollment, submissions,
  transcription.
- Tab bar: line pictogram icons from the mockup (house, people, person), visible labels
  "Shift" / "สควอด" / "โปรไฟล์" (EN "Shift" / "Squad" / "Profile"), `accessibilityRole="tab"`,
  `accessibilityState.selected`, active violet-700 with 3pt top indicator; no emoji (DS10).
- Deep links: `passion-seed://round/join?r=<round_id>`, `passion-seed://round/evidence/<id>`,
  `passion-seed://round/certificate`, `passion-seed://round/squad`.

### 5.3 Data layer

- `lib/round/api.ts`: one wrapper `callRound(name, args)` returning `{ok, data} | {ok:false, error}`
  with the mapping in 3.1; attaches `request_id` to Sentry breadcrumbs.
- React Query keys `round.home(userId, entryId)`, `round.squad(userId, entryId)`; these queries set
  `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `staleTime: 30s` (E18), with
  `focusManager` wired to `AppState` and `onlineManager` to `expo-network`.
- Times: all display via `lib/round/time.ts` with `timeZone: 'Asia/Bangkok'` regardless of device
  TZ (E17). Close shown as "{weekday} {date} 23:59 น." (closes_at minus 1 minute, ICT).
- Next action + needs-attention priority (DS1, DS3): `lib/round/next.ts`. Needs attention = newest
  rejected item without a replacement (last 7 days), else first due check-in, else nothing.

### 5.4 States table (DS4)

| Surface | Loading | Empty / none | Error | Success | Partial / other |
|---|---|---|---|---|---|
| Shift home | skeleton matching layout | `home.no_round.*` + waitlist; guest: `home.guest`; past certificates listed | cached view + `home.offline`; `unavailable` -> `error.unavailable` + retry | `home.next.*` + Pillow CTA, missions trail, squad card, closes line, `footer.discord` | `home.open.*` (not joined), `home.invite_only`, `home.join_closed`, `home.pre_start`, `home.last_hours`, `home.paused_submissions`, emergency banner, `home.review.*`, `home.not_eligible.*`, `home.cert.issued.*` (+ one-time celebration), `home.cert.revoked` |
| Mission | — | `mission.not_yet` + need | — | `mission.done` | `mission.needs_more`, `mission.credit_removed` (calm colour, no lock wording, no animation on decrement, DS8) |
| Log | skeleton | `log.empty` (first-log coaching) | cached + offline label | grouped list | drafts (`log.draft`, `log.sending`, `log.unknown`), statuses `evidence.status.*` |
| Composer | `capture.sending` | type preselected from next mission | field error inline, focus to first error; `error.*` by code; draft kept | receipt `receipt.*`, success haptic and counter animation only after a confirmed receipt (DS8) | `capture.offline_saved`, `capture.photo.repick`, `capture.closing_soon` (last 2h), after close `receipt.after_close`, `capture.unknown_outcome`, transcription states 5.6 |
| Squad | skeleton | `squad.not_in_round`, `squad.waiting` | cached + offline | intro card, feed, cheers | `squad.feed.empty`, round closed: feed read-only (`squad.closed`) |
| Review window | — | — | `home.review.overdue` (now > review_ends_at + 2h, no outcome) | `home.review.body` with exact ICT time | close check-in card |
| Not eligible | — | `home.not_eligible.*` | — | next round CTA | logs kept privately |
| Certificate | image skeleton at story ratio | — | `cert.render_failed` + retry | share story/square, copy link, verify URL | `cert.revoked.*` (no share), tombstone (not shown in app after deletion), name opt-in preview |
| Project summary | — | `summary.off` | `summary.rejected` | `summary.approved` | `summary.pending`, `summary.edit_pending`, `summary.taken_down`, hidden |
| Web verify page | — | `web.not_found` (404) | `web.error` (503, never shown as not found or revoked) | `web.valid` | `web.revoked`, tombstone |

### 5.5 Composer per type (DS7, voice-first)

Common: full-screen modal on canvas; tag `MISSION {n} · {part}` and close button (44pt); question as
title (26pt, 500); date chip defaults "วันนี้"; one Pillow "บันทึก" docked at the bottom with
`capture.visibility` under it; optional fields collapsed under "เพิ่มเติม"; consent checkbox appears
only when a photo/audio is attached; 560pt max column on tablets; keyboard-safe.

| Type | First view | Required | Collapsed optional | Target time |
|---|---|---|---|---|
| contact | who chips (recent labels + `ม.5 ห้องเดียวกัน`, `รุ่นน้อง`, `ครู`, `ผู้ปกครอง`, `+ เพิ่ม`), channel chips | who, channel | photo (consent), link | 10 s |
| interview | big record button (`capture.record`), then transcript card, then who chips, then `capture.change_plan` | who, key point (tap a segment or type) | link, photo | 30 s |
| tester | same as interview with `capture.q.tester` | who, key point | what they tried, link, photo | 10-30 s |
| problem_statement | text area with template `capture.template.problem` | text | link, photo | — |
| mvp | link field + "แนบรูป" | link or photo | note | — |
| change | kind toggle (`changed` / `decided_not_to`), "เพราะได้ยินจากใคร" picker of the last 5 counted interview/tester items, text | kind, source, what | link, photo | — |
| demo_post | url field + visibility toggle (public / staff only) | url, visibility | note | — |

- If the student typed a planned change on an interview/tester, its receipt offers "ทำแล้ว? บันทึกสิ่งที่เปลี่ยน", opening a `change` draft with that source and text prefilled.
- Duplicate label: if `who_key` matches an earlier label of the same type, show `capture.who.duplicate` inline before Send (E19).
- Replacement (DS5): "บันทึกใหม่แทน" opens a draft of the same type with `replaces` set.
- Reuse from companion `app/shift/update.tsx` (archive branch): field validation pattern, duplicate-send guard (disable while an attempt is `sending`), receipt confirmation.
- After the first confirmed receipt ever, show the push opt-in sheet (`push.prompt`) and only then call `requestPushPermissions` (X16).
- The first-log receipt also surfaces the `join` check-in card on home (DS6).

### 5.6 Voice capture and transcription

- Record with `expo-audio` (installed): m4a AAC mono 64 kbps, max 180 s with visible timer; file at
  `${documentDirectory}round-drafts/{draft_id}/audio.m4a`. Play back with waveform.
- When online and `transcription_enabled`: upload to `{round}/{uid}/{draft_id}/audio.m4a`, then
  `POST {web_base_url}/api/shift/transcribe` with `Authorization: Bearer <supabase access token>`,
  body `{path, lang}`. Response `{text, segments:[{id, start_ms, end_ms, text}], language}`.
- Segments render as tappable spans (`capture.tap_key`); tapping selects up to 3 adjacent segments;
  the selection fills `key_point` (editable); the whole text goes to `transcript`; `input: 'voice'`.
- Failure, timeout (25 s), offline or flag off: show `capture.transcript_failed` / `capture.type_instead`;
  the typed `key_point` is enough to save; audio stays attached; "แปลงเสียงตอนนี้" retries later.
- Audio requires `capture.consent.audio` checked. Audio is private like photos (2.5) and is deleted
  `audio_retention_days` (30) after `review_ends_at`; the transcript stays in the payload under the
  12-month evidence retention.

### 5.7 Drafts, offline, frozen submission attempts (A16, A42, E5, E10, E17)

- `lib/drafts/store.ts`: generic store refactored from `shiftCompanionDrafts.ts` and
  `shiftCompanionRecovery.ts` (A42): key `round-draft:{user_id}:{draft_id}`, serialized writer
  (from `DailyDraftWriter`), list by user, delete, `clearUser(user_id)`. Port the 30 companion cases
  to run against the generic store (X14 count).
- Draft shape: `{draft_id, user_id, round_id, entry_id, type, fields, photo?: {local_uri, consent},
  audio?: {local_uri, duration_ms, uploaded_path?, transcript?, segments?, selected?, consent},
  source_evidence_id?, replaces_evidence_id?, created_at, updated_at, attempt?}`.
- Send freezes an attempt `{submission_id: uuid, frozen_payload, payload_hash, client_created_at:
  now, state: 'sending'}`. Editing after Send creates a new draft revision and drops the old attempt
  only if its state is `failed` with a non-retryable code; otherwise the edit waits (E5).
- Replay: on reconnect or foreground, drafts with `attempt.state in ('sending','unknown','retryable')`
  resend the same `submission_id` and frozen payload; the server returns the original receipt
  (reconciles lost responses). Never auto-send a draft without a frozen attempt.
- Media files live in the document directory; on restore, a missing photo file shows
  `capture.photo.repick` (A16).
- Delete SHIFT data or sign-out of a different user: `clearUser`, delete media folders, clear
  `round.*` queries (E10).

### 5.8 Flags, kill switch, push

- `lib/round/flags.ts`: read `app_config` (public rows), cache in `shiftStorage`, refresh on focus.
- Kill switch on: composer opens read-only with `home.paused_submissions`; drafts stay editable and
  saved; Send disabled; uploads blocked server-side too.
- `profiles.shift_round_nudges` toggle in Profile (`profile.notifications.shift`). Token save uses
  existing `savePushToken`.
- Push taps route via `data.url`.

### 5.9 Copy keys (X8, DS17; Thai default, one language at a time)

File `lib/round/copy.ts` exports `{th: {...}, en: {...}}` with identical keys; `{param}`
placeholders; numbers render in Libre Franklin. Student content is never translated.

| Key | TH | EN |
|---|---|---|
| tab.shift | Shift | Shift |
| tab.squad | สควอด | Squad |
| tab.profile | โปรไฟล์ | Profile |
| round.tag | SHIFT · รอบที่ {n} | SHIFT · Round {n} |
| home.guest | เข้าสู่ระบบเพื่อเข้าร่วม SHIFT | Sign in to join SHIFT |
| home.no_round.title | ยังไม่มีรอบที่เปิดอยู่ | No SHIFT is open right now |
| home.no_round.body | รอบถัดไปเริ่ม {date} | The next round starts {date} |
| home.no_round.body_unknown | ยังไม่ได้ประกาศรอบถัดไป | The next round hasn't been announced yet |
| home.no_round.notify | แจ้งเตือนเมื่อเปิดรับ | Notify me when it opens |
| home.no_round.notified | เราจะแจ้งเตือนคุณ | We'll let you know |
| home.open.title | SHIFT รอบที่ {n} เปิดรับแล้ว | SHIFT round {n} is open |
| home.open.join_by | เข้าร่วมได้ถึง {date} | Join by {date} |
| home.open.cta | เข้าร่วมรอบนี้ | Join this round |
| home.invite_only | รอบนี้สำหรับคนที่ได้รับเชิญ ถ้าคิดว่าควรได้รับเชิญ ถามใน Discord | This round is invite-only. If you think you should be on the list, ask in Discord |
| home.join_closed | รอบนี้ปิดรับคนใหม่หลังวันที่ {day} แล้ว | This round stopped taking new people after day {day} |
| home.pre_start | วันที่ 1 เริ่มใน {countdown} | Day 1 starts in {countdown} |
| home.day | วันที่ {d} จาก {total} | Day {d} of {total} |
| home.closes | ปิด {weekday} {date} 23:59 น. | Closes {weekday} {date}, 23:59 |
| home.last_hours | ปิดใน {h} ชม. {m} นาที | Closes in {h}h {m}m |
| home.missions_done | {n} จาก 6 สำเร็จ | {n} of 6 done |
| home.people | คุยกับคนจริงมาแล้ว {n} คน | Talked to {n} real people |
| home.review_note | ทีมงานอาจสุ่มตรวจบันทึก | Staff may spot-check your logs |
| home.next.contact | ทักคนแรกที่อาจมีปัญหานี้ | Message the first person who might have this problem |
| home.next.interview | สัมภาษณ์คนที่ {n} จาก 3 | Interview person {n} of 3 |
| home.next.problem_statement | เขียนโจทย์ของคุณ | Write your problem statement |
| home.next.mvp | บันทึก MVP ของคุณ | Log your MVP |
| home.next.tester | ให้ผู้ทดสอบคนที่ {n} จาก 3 ลองใช้ | Get tester {n} of 3 to try it |
| home.next.change | บอกว่าคุณเปลี่ยนอะไรตามที่ได้ยิน | Log what you changed because of what you heard |
| home.next.demo_post | โพสต์เดโมแล้วแปะลิงก์ | Post your demo and add the link |
| home.next.all_done | ครบ 6 ภารกิจแล้ว บันทึกเพิ่มได้จนถึงวันปิด | All 6 Missions done. You can keep logging until the round closes |
| home.cta.voice | เก็บสิ่งที่ได้ยิน | Capture what you heard |
| home.cta.log | บันทึก | Log it |
| home.offline | ออฟไลน์อยู่ ข้อมูลอาจไม่ใช่ล่าสุด | You're offline. This may not be up to date |
| home.paused_submissions | ตอนนี้ปิดรับบันทึกชั่วคราว ร่างของคุณยังอยู่ครบ | Logging is paused for now. Your drafts are safe |
| home.review.title | รอบนี้ปิดแล้ว | This round has closed |
| home.review.body | ใบรับรองจะมาถึง {date} {time} น. หลังทีมงานตรวจบันทึกเสร็จ | Your certificate arrives {date} at {time}, after staff finish reviewing |
| home.review.incomplete | ปิดรอบแล้ว ทำได้ {n} จาก 6 ภารกิจ ผลจะยืนยัน {date} {time} น. | The round has closed with {n} of 6 Missions. Results are confirmed {date} at {time} |
| home.review.overdue | ใบรับรองช้ากว่ากำหนด ทีมงานกำลังดูอยู่ | Your certificate is running late. Staff are on it |
| home.not_eligible.title | รอบนี้ทำได้ {n} จาก 6 ภารกิจ | You finished {n} of 6 Missions this round |
| home.not_eligible.body | คุณคุยกับคนจริง {people} คน นั่นคือของจริง บันทึกของคุณยังอยู่ | You talked to {people} real people. That's real. Your logs are kept |
| home.not_eligible.cta | ดูรอบถัดไป | See the next round |
| home.cert.issued.title | ใบรับรองของคุณมาแล้ว | Your certificate is here |
| home.cert.issued.cta | ดูและแชร์ | View and share |
| home.cert.revoked | ใบรับรองนี้ถูกเพิกถอนเมื่อ {date} | This certificate was revoked on {date} |
| footer.discord | ติดขัด? ถามใน Discord | Stuck? Ask in Discord |
| attention.rejected | บันทึก{type}ถูกตีกลับ: {reason} | Your {type} log was sent back: {reason} |
| attention.replace | บันทึกใหม่แทน | Log a replacement |
| attention.checkin | ตอบคำถามสั้น ๆ 3 ข้อ (ไม่บังคับ) | Answer 3 quick questions (optional) |
| mission.1 … mission.6 | ติดต่อคนแรก / สัมภาษณ์ + โจทย์ / สร้าง MVP / ให้คนจริงลองใช้ / เปลี่ยนตามที่ได้ยิน / โพสต์เดโม | First contact / Interviews + problem / Build an MVP / Real people try it / Change what you heard / Post your demo |
| mission.tag | MISSION {n} | MISSION {n} |
| mission.done | เสร็จแล้ว | Done |
| mission.not_yet | ยังไม่ถึง | Not yet |
| mission.needs_more | อีก {n} | {n} more |
| mission.credit_removed | ขาดอีก {n} หลังบันทึกถูกตีกลับ | Needs {n} more after a log was sent back |
| type.contact … type.demo_post | ทักคนแรก / สัมภาษณ์ / โจทย์ / MVP / ผู้ทดสอบ / สิ่งที่เปลี่ยน / โพสต์เดโม | Contact / Interview / Problem statement / MVP / Tester / Change / Demo post |
| log.title | บันทึกของฉัน | My logs |
| log.empty | เริ่มจากทักคนหนึ่งคนที่อาจมีปัญหานี้ | Start by messaging one person who might have this problem |
| log.add | เพิ่มบันทึก | Add a log |
| log.draft | ร่าง | Draft |
| log.sending | กำลังส่ง | Sending |
| log.unknown | กำลังตรวจว่าส่งถึงหรือยัง | Checking if it went through |
| evidence.status.submitted | นับแล้ว | Counted |
| evidence.status.accepted | ทีมงานยืนยันแล้ว | Confirmed by staff |
| evidence.status.rejected | ถูกตีกลับ | Sent back |
| evidence.status.withdrawn | ถอนแล้ว | Withdrawn |
| evidence.status.not_counted | ไม่นับ (หลังปิดรอบ) | Not counted (after close) |
| evidence.status.invalidated | ไม่นับ เพราะบันทึกต้นทางถูกตีกลับ | Not counted because its source was sent back |
| withdraw.cta | ถอนบันทึกนี้ | Withdraw this log |
| withdraw.preview | ถ้าถอน {mission} จะเหลือ {have}/{need} | If you withdraw, {mission} drops to {have}/{need} |
| withdraw.preview_change | และสิ่งที่เปลี่ยนที่อ้างถึงบันทึกนี้จะไม่นับด้วย | and the change linked to it stops counting too |
| withdraw.confirm | ถอนเลย | Withdraw |
| withdraw.cancel | ไม่ถอน | Keep it |
| reason.not_real_person | ดูไม่เหมือนการคุยกับคนจริง | This doesn't look like a real conversation |
| fix.not_real_person | คุยกับคนจริงแล้วบันทึกสิ่งที่เขาพูดจริง ๆ | Talk to a real person and log what they actually said |
| reason.duplicate | ซ้ำกับบันทึกก่อนหน้า | Same as an earlier log |
| fix.duplicate | คุยกับคนใหม่แล้วบันทึกอีกครั้ง | Talk to someone new and log it |
| reason.missing_detail | ข้อมูลยังไม่พอให้เข้าใจ | Not enough detail to follow |
| fix.missing_detail | เพิ่มว่าเขาพูดหรือทำอะไร | Add what they said or did |
| reason.wrong_mission | ไม่ตรงกับภารกิจนี้ | Doesn't fit this Mission |
| fix.wrong_mission | เลือกประเภทให้ตรงแล้วบันทึกใหม่ | Pick the right type and log it again |
| reason.privacy | มีข้อมูลส่วนตัวของคนอื่น | Contains someone's personal details |
| fix.privacy | บันทึกใหม่โดยไม่ใส่ชื่อ เบอร์ หรือหน้า | Log it again without names, numbers or faces |
| reason.link_broken | เปิดลิงก์ไม่ได้ | The link doesn't open |
| fix.link_broken | ตรวจลิงก์แล้วบันทึกใหม่ | Check the link and log it again |
| reason.other | ทีมงานฝากบอก: {note} | Note from staff: {note} |
| capture.q.contact | คุณทักใครไป? | Who did you reach out to? |
| capture.q.interview | เขาเล่าอะไรให้ฟัง? | What did they tell you? |
| capture.q.tester | เขาลองใช้แล้ว เกิดอะไรขึ้น? | They tried it. What happened? |
| capture.q.problem_statement | ใครเจอปัญหาอะไร ตอนไหน เพราะอะไร? | Who struggles with what, when, and why? |
| capture.template.problem | [ใคร] ลำบากกับ [อะไร] ตอน [สถานการณ์] เพราะ [เหตุผลจากที่สัมภาษณ์] | [Who] struggles with [what] when [situation], because [why, from an interview] |
| capture.q.mvp | MVP ของคุณอยู่ไหน? | Where's your MVP? |
| capture.q.change | คุณเปลี่ยนอะไรเพราะสิ่งที่ได้ยิน? | What did you change because of what you heard? |
| capture.change.changed | เปลี่ยนแล้ว | I changed it |
| capture.change.decided_not_to | ตัดสินใจไม่เปลี่ยน พร้อมเหตุผล | Decided not to change it, with a reason |
| capture.change.source | เพราะได้ยินจากใคร? | Because of which conversation? |
| capture.q.demo_post | แปะลิงก์โพสต์เดโมของคุณ | Paste the link to your demo post |
| capture.demo.public | ใครก็ดูได้ | Anyone can see it |
| capture.demo.reviewer_only | ให้ทีมงานดูเท่านั้น | Staff only |
| capture.record | แตะเพื่ออัดเสียง | Tap to record |
| capture.recording | กำลังอัด {time} / 3:00 | Recording {time} / 3:00 |
| capture.transcribing | กำลังแปลงเสียงเป็นข้อความ… | Turning your voice into text… |
| capture.tap_key | แตะประโยคที่สำคัญที่สุด | Tap the sentence that matters most |
| capture.transcript_failed | แปลงเสียงไม่สำเร็จ พิมพ์สั้น ๆ แทนได้ เสียงยังแนบอยู่ | Couldn't turn that into text. Type a short note instead; your recording stays attached |
| capture.type_instead | พิมพ์แทน | Type instead |
| capture.transcribe_now | แปลงเสียงตอนนี้ | Transcribe now |
| capture.who | เขาเป็นใคร | Who are they |
| capture.who.hint | บอกแค่บทบาทให้เฉพาะพอ เช่น "ม.5 ห้อง 2 ชมรมดนตรี" ไม่ต้องใส่ชื่อหรือเบอร์ | Just a specific role, like "Grade 11, room 2, music club". No names or numbers |
| capture.who.duplicate | คุณบันทึก "{label}" ไปแล้ว คนเดิมจะไม่นับซ้ำ | You already logged "{label}". The same person won't count twice |
| capture.change_plan | แล้วเราจะเปลี่ยนอะไร? (ไม่บังคับ) | So what will you change? (optional) |
| capture.channel | ทักทางไหน | How did you reach them |
| capture.channel.in_person / chat / call / social / other | เจอตัว / แชต / โทร / โซเชียล / อื่น ๆ | In person / Chat / Call / Social / Other |
| capture.date.today | วันนี้ | Today |
| capture.more | เพิ่มเติม | More |
| capture.photo.add | แนบรูป | Add a photo |
| capture.consent.photo | คนในรูปรู้และยอมให้ใช้รูปนี้ | Everyone in this photo knows and agreed |
| capture.consent.audio | คนที่พูดในเสียงนี้รู้ว่ากำลังอัด | Everyone in this recording knew it was being recorded |
| capture.photo.repick | รูปที่เลือกไว้หายไปตอนปิดแอป เลือกใหม่อีกครั้ง | Your photo was lost when the app closed. Pick it again |
| capture.save | บันทึก | Save |
| capture.sending | กำลังส่ง… | Sending… |
| capture.visibility | สควอดเห็นแค่สรุปสั้น ๆ (ไม่มีรูป เสียง หรือคำพูด) พี่เมนเทอร์เห็นทั้งหมด | Your squad sees a short summary only (no photos, audio or quotes). Mentors see everything |
| capture.offline_saved | บันทึกไว้ในเครื่องแล้ว จะส่งเมื่อออนไลน์ | Saved on this phone. It'll send when you're online |
| capture.closing_soon | ปิดรอบใน {h} ชม. {m} นาที | Round closes in {h}h {m}m |
| capture.unknown_outcome | ไม่แน่ใจว่าส่งถึงหรือยัง กำลังตรวจ… | Not sure it went through. Checking… |
| capture.read_only | ตอนนี้ปิดรับบันทึก ร่างนี้ยังเก็บไว้ | Logging is paused. This draft is kept |
| receipt.title | บันทึกแล้ว | Saved |
| receipt.count | {mission}: {have}/{need} | {mission}: {have}/{need} |
| receipt.mission_complete | ภารกิจ {n} สำเร็จ! | Mission {n} done! |
| receipt.after_close | บันทึกไว้แล้ว แต่รอบปิดตอน 23:59 อันนี้จะไม่นับ | Saved, but the round closed at 23:59, so this one won't count |
| receipt.duplicate_label | บันทึกแล้ว แต่ไม่นับเพิ่มเพราะเป็นคนเดิม | Saved, but it doesn't add to the count because it's the same person |
| receipt.make_change | ทำแล้ว? บันทึกสิ่งที่เปลี่ยน | Done it? Log the change |
| receipt.add_another | บันทึกอีก | Add another |
| receipt.back | กลับไปหน้า Shift | Back to Shift |
| push.prompt.title | ให้เราเตือนตอนเย็นไหม? | Want an evening reminder? |
| push.prompt.body | เราจะเตือนเฉพาะวันที่ยังไม่ได้บันทึก และตอนใบรับรองมา | Only on days you haven't logged, and when your certificate arrives |
| push.prompt.yes / no | เปิดการแจ้งเตือน / ไว้ทีหลัง | Turn on / Not now |
| squad.title | สควอดของคุณ | Your squad |
| squad.waiting | กำลังจัดสควอด คุณจะได้เพื่อนอีก 2 คนกับพี่เมนเทอร์ 1 คน | We're forming squads. You'll get 2 squadmates and a mentor |
| squad.not_in_round | เข้าร่วม SHIFT เพื่อเจอสควอดของคุณ | Join a SHIFT to meet your squad |
| squad.mentor | พี่เมนเทอร์ | Mentor |
| squad.icebreaker.title | ทำความรู้จักกัน | Get to know each other |
| squad.icebreaker.your_q | คำถามของคุณ | Your question |
| squad.icebreaker.answer | ตอบสั้น ๆ 1 บรรทัด | Answer in one line |
| squad.icebreaker.live | วันแรกคุยกันสด ๆ ใน Discord | On day 1 we talk live on Discord |
| squad.feed.title | ความคืบหน้า | Progress |
| squad.feed.empty | ยังไม่มีใครบันทึก เริ่มเป็นคนแรกเลย | No one has logged yet. Be the first |
| squad.feed.contact | ทักคนแรกแล้ว | reached out to someone |
| squad.feed.interview | สัมภาษณ์คนที่ {n} แล้ว | interviewed person {n} |
| squad.feed.problem_statement | เขียนโจทย์แล้ว | wrote a problem statement |
| squad.feed.mvp | บันทึก MVP แล้ว | logged an MVP |
| squad.feed.tester | คุยกับผู้ทดสอบคนที่ {n} แล้ว | talked to tester {n} |
| squad.feed.change | เปลี่ยนตามที่ได้ยินแล้ว | changed something after feedback |
| squad.feed.demo_post | โพสต์เดโมแล้ว | posted a demo |
| squad.feed.mission | ภารกิจ {n} สำเร็จ | finished Mission {n} |
| squad.cheer | ส่งกำลังใจ | Send a cheer |
| squad.cheer.sent | ส่งแล้ว | Sent |
| squad.cheer.count | {n} กำลังใจ | {n} cheers |
| squad.discord | คุยกันต่อใน Discord | Keep talking on Discord |
| squad.closed | รอบนี้ปิดแล้ว | This round has closed |
| join.track.q | คุณเรียนอยู่ระดับไหน | Where do you study? |
| join.track.high_school / university | ม.ปลาย / มหาวิทยาลัย | High school / University |
| join.birth.q | เกิดเดือนและปีอะไร | Birth month and year |
| join.birth.why | ใช้ดูว่าต้องขอความยินยอมจากผู้ปกครองไหม ไม่แสดงต่อสาธารณะ | Only used to check if a parent needs to agree. Never shown publicly |
| join.guardian.title | ผู้ปกครองรู้และยินยอม | A parent or guardian knows and agrees |
| join.guardian.body | คุณอายุยังไม่ถึง 20 ปี ให้ผู้ปกครองอ่านเรื่องนี้ก่อน | You're under 20, so please have a parent or guardian read this first |
| join.guardian.share | ส่งให้ผู้ปกครองอ่าน | Send to a parent |
| join.guardian.check | ผู้ปกครองของฉันอ่านแล้วและยินยอม | My parent or guardian has read this and agrees |
| join.handle.q | ให้คนอื่นเห็นคุณเป็นชื่ออะไร | What name should others see? |
| join.handle.hint | ชื่อเล่น 2–24 ตัวอักษร ไม่ต้องใช้ชื่อจริง | A nickname, 2–24 characters. Not your legal name |
| join.next / join.done | ต่อไป / เข้าร่วมแล้ว! | Next / You're in! |
| checkin.optional | ไม่บังคับ และไม่มีผลกับใบรับรอง | Optional. It doesn't affect your certificate |
| checkin.ownership | โปรเจกต์นี้รู้สึกเป็นของคุณแค่ไหน? | How much does this project feel like yours? |
| checkin.why_join | ทำไมถึงเข้าร่วม SHIFT? | Why did you join SHIFT? |
| checkin.why_keep | ทำไมถึงทำโปรเจกต์ต่อ? | Why did you keep working on your project? |
| checkin.why.had_to / portfolio / wanted_to / care_people | เพราะต้องทำ / เพื่อพอร์ต / เพราะอยากทำ / เพราะแคร์คนที่จะได้ประโยชน์ | Because I had to / For my portfolio / Because I wanted to / Because I care about the people it helps |
| checkin.confidence | มั่นใจแค่ไหนที่จะเริ่มโปรเจกต์ใหม่เองโดยไม่มีพี่เมนเทอร์? | How confident are you to start a new project on your own, without mentors? |
| checkin.squad | รู้สึกว่าสควอดอยู่ข้างคุณแค่ไหน? | How much do you feel your squad has your back? |
| checkin.decided_myself | ช่วงนี้มีตอนไหนที่คุณตัดสินใจเองบ้าง? | When did you decide something yourself? |
| checkin.satisfied | พอใจกับสิ่งที่ทำได้ในรอบนี้แค่ไหน? | How satisfied are you with what you made this round? |
| checkin.can_do_now | ตอนนี้ทำอะไรได้ ที่วันแรกยังทำไม่ได้? | What can you do now that you couldn't on day 1? |
| checkin.skip / submit | ข้ามไปก่อน / ส่งคำตอบ | Skip for now / Send answers |
| cert.celebrate | ทำครบ 6 ภารกิจแล้ว! | All 6 Missions done! |
| cert.rendering | กำลังสร้างใบรับรอง… | Making your certificate… |
| cert.render_failed | โหลดรูปใบรับรองไม่สำเร็จ | Couldn't load the certificate image |
| cert.retry | ลองอีกครั้ง | Try again |
| cert.share.story | แชร์ลงสตอรี่ | Share to story |
| cert.share.square | บันทึกแบบสี่เหลี่ยม | Save square version |
| cert.share.copy | คัดลอกลิงก์ | Copy link |
| cert.share.copied | คัดลอกลิงก์แล้ว | Link copied |
| cert.share.tip | ในสตอรี่ ใส่สติกเกอร์ลิงก์แล้ววางลิงก์ที่คัดลอกไว้ ให้คนกดเข้าไปตรวจได้ | In your story, add a Link sticker and paste the copied link so people can tap through |
| cert.name.title | ชื่อบนใบรับรอง | Name on the certificate |
| cert.name.handle | ใช้ชื่อเล่น {handle} | Use my handle {handle} |
| cert.name.legal | ใช้ชื่อจริง (สำหรับยื่นพอร์ต) | Use my legal name (for portfolios) |
| cert.name.legal_note | ชื่อจริงจะแสดงบนหน้าตรวจสอบสาธารณะด้วย | Your legal name will also show on the public verification page |
| cert.name.preview | ตัวอย่าง | Preview |
| cert.verify_url | ตรวจสอบได้ที่ {url} | Verify at {url} |
| cert.revoked.title | ใบรับรองนี้ถูกเพิกถอน | This certificate was revoked |
| cert.revoked.body | เพิกถอนเมื่อ {date} ถ้าคิดว่าผิดพลาด ถามใน Discord | Revoked on {date}. If you think this is a mistake, ask in Discord |
| summary.off | หน้าตรวจสอบตอนนี้แสดงแค่ว่าใบรับรองเป็นของจริง | Your verification page only shows that the certificate is real |
| summary.cta | เพิ่มสรุปโปรเจกต์ (ไม่บังคับ) | Add a project summary (optional) |
| summary.title / description / demo_url / counts | ชื่อโปรเจกต์ / เล่าสั้น ๆ ว่าทำอะไรให้ใคร / ลิงก์เดโม (https) / แสดงตัวเลขไหนบ้าง | Project title / In a paragraph: what you made and for whom / Demo link (https) / Which numbers to show |
| summary.submit | ส่งให้ทีมงานอนุมัติ | Send for approval |
| summary.pending | รอทีมงานอนุมัติ | Waiting for staff approval |
| summary.approved | สาธารณะแล้ว | Public |
| summary.edit_pending | ฉบับแก้ไขรออนุมัติ ฉบับเดิมยังแสดงอยู่ | Your edit is waiting for approval. The previous version stays public |
| summary.rejected | ยังไม่อนุมัติ: {reason} | Not approved: {reason} |
| summary.taken_down | ทีมงานนำสรุปลงแล้ว: {reason} | Staff took your summary down: {reason} |
| summary.hide / show | ซ่อนจากหน้าสาธารณะ / แสดงบนหน้าสาธารณะ | Hide from public page / Show on public page |
| profile.certificates | ใบรับรองของฉัน | My certificates |
| profile.notifications.shift | เตือนตอนเย็นเมื่อยังไม่ได้บันทึก | Evening reminder when I haven't logged |
| profile.language | ภาษา | Language |
| profile.delete | ลบข้อมูล SHIFT | Delete SHIFT data |
| profile.legacy | เครื่องมือเดิม | Earlier tools |
| delete.title | ลบข้อมูล SHIFT ของคุณ | Delete your SHIFT data |
| delete.body | จะลบบันทึก รูป เสียง คำตอบ และสรุปโปรเจกต์ทั้งหมด และเพิกถอนใบรับรอง บัญชี Passion Seed ของคุณยังอยู่ | This deletes all your logs, photos, recordings, answers and project summaries, and revokes your certificates. Your Passion Seed account stays |
| delete.confirm | พิมพ์ DELETE เพื่อยืนยัน | Type DELETE to confirm |
| delete.done | ลบแล้ว | Deleted |
| signin.title | เข้าสู่ระบบเพื่อไปต่อ | Sign in to continue |
| signin.expired | เซสชันหมดอายุ ร่างของคุณยังอยู่ เข้าสู่ระบบอีกครั้งเพื่อส่งต่อ | Your session expired. Your drafts are safe; sign in again to send them |
| signin.hackathon | เคยใช้บัญชีแฮกกาธอน? SHIFT ใช้บัญชี Passion Seed สมัครด้วยอีเมลเดิมได้เลย | Used a hackathon login? SHIFT uses a Passion Seed account. Sign up with the same email |
| error.unauthenticated | กรุณาเข้าสู่ระบบอีกครั้ง ร่างของคุณยังอยู่ | Please sign in again. Your drafts are safe |
| error.forbidden | คุณไม่มีสิทธิ์ทำสิ่งนี้ ถ้าคิดว่าผิดพลาด ถามใน Discord | You don't have access to this. If that seems wrong, ask in Discord |
| error.unavailable | SHIFT ยังไม่พร้อมตอนนี้ ลองใหม่อีกสักพัก ร่างของคุณยังอยู่ | SHIFT isn't available right now. Try again soon; your drafts are safe |
| error.retryable | เชื่อมต่อไม่สำเร็จ กำลังลองใหม่ | Couldn't connect. Trying again |
| error.offline | ออฟไลน์อยู่ บันทึกไว้ในเครื่องแล้ว | You're offline. Saved on this phone |
| error.entry_not_found | ไม่พบข้อมูล SHIFT ของคุณ อาจถูกลบไปแล้ว | We can't find your SHIFT data. It may have been deleted |
| error.round_not_found | ไม่พบรอบนี้ | We can't find this round |
| error.round_not_open | รอบนี้ยังไม่เปิด | This round isn't open yet |
| error.join_closed | = home.join_closed | = home.join_closed |
| error.invite_only | = home.invite_only | = home.invite_only |
| error.enrollment_paused | ปิดรับคนใหม่ชั่วคราว | Joining is paused for now |
| error.already_in_active_round | คุณอยู่ในรอบที่ {n} แล้ว ทำรอบนั้นให้จบก่อนนะ | You're already in round {n}. Finish it first |
| error.track_not_open | รอบนี้ยังไม่เปิดสำหรับระดับนี้ | This round isn't open for your level yet |
| error.guardian_consent_required | ต้องให้ผู้ปกครองยินยอมก่อน | A parent or guardian needs to agree first |
| error.invalid_field | ตรวจช่อง "{field}" อีกครั้ง | Check "{field}" |
| error.invalid_field.personal_data | ใส่แค่บทบาท ไม่ใส่ชื่อ เบอร์ หรือบัญชีโซเชียล | Just a role: no names, numbers or social accounts |
| error.missing_field | ยังขาด "{field}" | "{field}" is missing |
| error.link_not_https | ลิงก์ต้องขึ้นต้นด้วย https:// | Links must start with https:// |
| error.photo_consent_required | ติ๊กว่าคนในรูปยินยอมก่อนส่ง | Confirm everyone in the photo agreed |
| error.audio_consent_required | ติ๊กว่าคนในเสียงรู้ว่ากำลังอัดก่อนส่ง | Confirm everyone in the recording knew |
| error.media_missing | ไฟล์แนบอัปโหลดไม่ครบ ลองส่งอีกครั้ง | Your attachment didn't finish uploading. Send again |
| error.media_not_owned | ไฟล์แนบนี้ใช้ไม่ได้ แนบใหม่อีกครั้ง | This attachment can't be used. Attach it again |
| error.media_in_use | บันทึกนี้ส่งไปแล้ว เปิดดูในบันทึกของฉัน | This was already sent. Check My logs |
| error.submissions_paused | = home.paused_submissions | = home.paused_submissions |
| error.rate_limited | บันทึกเร็วไปหน่อย ลองอีกครั้งใน {minutes} นาที ร่างยังอยู่ | That's a lot at once. Try again in {minutes} min; your draft is kept |
| error.submission_conflict | บันทึกนี้ถูกส่งไปแล้วด้วยเนื้อหาอื่น เปิดดูบันทึกล่าสุดก่อน | This was already sent with different content. Check your latest logs |
| error.round_finished | รอบนี้จบแล้ว เพิ่มบันทึกไม่ได้ | This round has ended; logs can't be added |
| error.invalid_change_source | เลือกบทสัมภาษณ์หรือผู้ทดสอบที่ยังนับอยู่ | Pick an interview or tester log that still counts |
| error.withdraw_after_issue | ใบรับรองออกแล้ว ถอนบันทึกไม่ได้ | Your certificate has been issued, so logs can't be withdrawn |
| error.withdraw_not_allowed | ถอนบันทึกนี้ไม่ได้ | This log can't be withdrawn |
| error.review_closed | ช่วงตรวจของรอบนี้จบแล้ว | The review window for this round has ended |
| error.certificate_issued | ใบรับรองออกแล้ว แก้ส่วนนี้ไม่ได้ | Your certificate is issued, so this can't change |
| error.checkin_not_due | ยังไม่ถึงเวลาตอบคำถามชุดนี้ | These questions aren't open yet |
| error.checkin_already_submitted | ตอบไปแล้ว ขอบคุณ | Already answered, thanks |
| error.squad_not_assigned | = squad.waiting | = squad.waiting |
| error.not_same_squad | ส่งกำลังใจได้เฉพาะคนในสควอด | You can only cheer your own squad |
| error.cheer_limit | วันนี้ส่งกำลังใจครบแล้ว พรุ่งนี้ส่งใหม่ได้ | You've sent today's cheers. More tomorrow |
| error.certificate_not_found | ไม่พบใบรับรองนี้ | We can't find this certificate |
| error.certificate_revoked | ใบรับรองนี้ถูกเพิกถอนแล้ว | This certificate has been revoked |
| error.transcription_paused | ตอนนี้แปลงเสียงไม่ได้ พิมพ์สั้น ๆ แทนได้ | Voice-to-text is off right now. Type a short note instead |
| error.transcription_failed | = capture.transcript_failed | = capture.transcript_failed |
| error.audio_too_long | อัดได้ไม่เกิน 3 นาที | Recordings can be up to 3 minutes |
| push.no_evidence | วันนี้ยังไม่ได้บันทึกเลย คุยกับใครมาบ้างไหม? | Nothing logged today. Talked to anyone? |
| push.no_evidence_last_day | ปิดคืนนี้ 23:59 เหลืออีก {n} ภารกิจ | Closes tonight at 23:59. {n} Missions to go |
| push.closing_tomorrow | พรุ่งนี้ 23:59 ปิดรอบ เหลืออีก {n} ภารกิจ | The round closes tomorrow at 23:59. {n} Missions to go |
| push.rejected | บันทึก{type}ถูกตีกลับ แตะเพื่อดูวิธีแก้ | A {type} log was sent back. Tap to see how to fix it |
| push.certificate | ใบรับรอง SHIFT รอบที่ {n} ของคุณมาแล้ว | Your SHIFT round {n} certificate is here |
| push.summary_approved | สรุปโปรเจกต์ของคุณสาธารณะแล้ว | Your project summary is now public |
| push.summary_rejected | สรุปโปรเจกต์ยังไม่ผ่าน แตะเพื่อดูเหตุผล | Your project summary wasn't approved. Tap to see why |
| push.squad_assigned | เจอสควอดของคุณแล้ว มาทำความรู้จักกัน | You have a squad. Come say hi |
| push.round_published | SHIFT รอบที่ {n} เปิดรับแล้ว | SHIFT round {n} is open |

Push copy is duplicated in the edge function (`supabase/functions/shift-round-jobs/copy.ts`) with
the same keys; a test compares both against Appendix C.

### 5.10 Components, design, a11y (X15, DS12, DS14, v3)

- `components/round/`: `PillowButton`, `MissionTrail`, `NextMissionCard` (with slots),
  `SquadCard`, `EvidenceRow`, `VoiceRecorder`, `TranscriptPicker`, `ChipPicker`, `NeedsAttention`,
  `DiscordFooter`, `RoundShell` (canvas + wash, 560pt column), `StatusTag`, `Skeleton`. Props-only;
  no imports from `lib/hackathon*` types (X15). Tokens from `lib/theme.ts` v3 only.
- Pillow button: white -> violet-50 pill, violet-700 text, 32pt gem, sinks 2pt with
  `Haptics.impactAsync(Light)` on press; success haptic only after a confirmed receipt.
- Contrast per DESIGN.md (body >= 7:1, secondary >= 4.5:1, controls >= 3:1); never grey on lavender.
- 44pt minimum targets (48pt for dismiss, attachment, record); 200% text without clipping Thai
  marks; mission trail switches to a vertical list at accessibility sizes; VoiceOver labels,
  `busy` state while sending, announcement on receipt, focus to first error; reduced motion
  disables counter animation.
- Version `1.4.0` in `app.config.js`; profile footer keeps reading `Constants.expoConfig.version`.
- New deps: `zod`, `expo-image-manipulator`, `expo-network` (native build required).

## 6. Web (pseed)

### 6.1 Verification page (A5, A28, A38, A39, DS4, DS11, DS16, E11, E13)

- Route `app/c/[publicId]/page.tsx` (short URL for QR: `https://www.passionseed.org/c/7K2M9QX4T8HBN3PD`).
  Add `"/c"` to `utils/supabase/public-routes.ts`.
- Server component calls `shift_round_certificate_public` with the anon/server client (never
  service role, E13), then `shift_round_log_certificate_visit(publicId, searchParams.ref)` unless the
  user agent is a known bot.
- Metadata: `robots: noindex, nofollow`; `og:image` = square image for valid certificates only.
- States: valid, revoked (status, round number and title, revoke date; holder name hidden), tombstone (status only, no handle/name/round title
  beyond round number), not found (HTTP 404), service failure (HTTP 503, `web.error`, never shown as
  not found or revoked). Bilingual layout, Thai first.
- Content: issuer "Passion Seed", holder per `snapshot.holder.display`, "SHIFT รอบที่ N" + title,
  dates, track, six missions with checks, status line, statement (below), "สถานะปัจจุบันตรวจได้ที่หน้านี้".
  Opt-in summary block (title, description, https demo link `rel="noopener nofollow ugc"`, chosen
  counts). React escaping only; no `dangerouslySetInnerHTML` (A49).
- Calm light credential style (DS11): white page, ink text, violet-700 accents, Bai Jamjuree +
  Libre Franklin; reflows at 320 CSS px and 200% zoom; visible keyboard focus.

Web copy:

| Key | TH | EN |
|---|---|---|
| web.valid | ใบรับรองนี้ใช้ได้ | This certificate is valid |
| web.statement | ใบรับรองนี้บันทึกว่า {name} ทำภารกิจครบทั้ง 6 ใน SHIFT รอบที่ {n} ({dates}) กับ Passion Seed | This certificate records that {name} completed all 6 Missions of SHIFT round {n} ({dates}) with Passion Seed |
| web.disclaimer | ใบรับรองนี้บันทึกกิจกรรมที่ทำครบ ไม่ได้รับรองผลลัพธ์ของโปรเจกต์หรือการรับเข้าศึกษา | This records completed activities. It does not certify project outcomes or imply any admissions endorsement |
| web.live | สถานะปัจจุบันตรวจได้ที่หน้านี้เท่านั้น | Current status is confirmed only on this page |
| web.revoked | ใบรับรองนี้ถูกเพิกถอนเมื่อ {date} | This certificate was revoked on {date} |
| web.not_found | ไม่พบใบรับรองนี้ | We couldn't find this certificate |
| web.error | ตรวจสอบไม่ได้ในขณะนี้ ลองใหม่อีกครั้ง (ไม่ได้แปลว่าใบรับรองไม่ถูกต้อง) | We can't check this right now. Please try again. (This doesn't mean the certificate is invalid.) |
| web.summary | เกี่ยวกับโปรเจกต์ | About the project |

### 6.2 Image renderer (A5, DS9, DS11, E11, E12)

- Route `app/c/[publicId]/image/[format]/route.ts`, `format` in `story` (1080x1920) and `square`
  (1080x1080); `runtime = 'nodejs'`. Query `v` = `render_version`: matching `v` -> `Cache-Control:
  public, max-age=31536000, immutable`; missing or old `v` -> 302 to current `v`. Revoked/tombstone/not
  found -> 410/404 JSON (app hides share).
- Content: issuer, holder name, "SHIFT รอบที่ N" + title, dates, six missions, bilingual statement,
  short verify URL text and a QR code (package `qrcode`, SVG) inside a 120px safe margin (story top
  250px and bottom 340px kept clear for Instagram UI).
- Thai: pre-segment every Thai string with `Intl.Segmenter('th', {granularity: 'word'})` and join
  with U+200B; embed TTFs from `lib/shift-round/certificate/fonts/` (Bai Jamjuree 400/500/700, Libre
  Franklin 500/700, OFL). Server-side caps: handle 24, legal name 60, title 80 chars; longer
  strings are truncated with an ellipsis at a segment boundary.
- Engine: `next/og` `ImageResponse` (already used in `lib/og/poster.tsx`). Day-1 spike: render the
  golden strings; if Thai tone marks or vowels are misplaced, switch to `@napi-rs/canvas` with the
  same layout module. The decision and golden PNGs are committed.
- `app/api/shift/cert-health/route.ts`: renders a fixture snapshot in memory and calls the public RPC
  with a known-missing id (expects `certificate_not_found`); returns 200 `{ok:true}` or 503. Add
  `"/api/shift/cert-health"` to public routes.

### 6.3 Transcription route (5.6)

- `app/api/shift/transcribe/route.ts` (add `"/api/shift/transcribe"` to public routes; the route
  authenticates the bearer itself).
- Steps: read `Authorization: Bearer`; create a Supabase client with that token; `getUser()` else
  401 `unauthenticated`; call `shift_round_transcription_check(path)` (ownership, round window,
  flag, 20/hour) and map its error; download the object with the user's client (storage policy
  allows the owner; no service role); reject > 5 MB (`audio_too_long`); send to Groq
  `whisper-large-v3` with `response_format: verbose_json`, `language` = request `lang` (`th`
  default); return `{text, segments:[{id,start_ms,end_ms,text}], language}`. Never store audio or
  text server-side; never log transcript text. Timeout 25 s -> 504 `transcription_failed`.
- Env: existing `GROQ_API_KEY`.

### 6.4 Staff tools in web admin (A3, A35, A53, X9, T4; supersedes A22/A36)

Gate: existing `app/admin/layout.tsx` (`requireAdmin`, `user_roles.role = 'admin'`) plus RPC role
checks. Data access through server actions using the signed-in user's session (no service role).
Media via `createSignedUrl(path, 300)` with the user's session.

| Route | Content |
|---|---|
| `/admin/shift/rounds` | Rounds list (number, title, phase, entrants, pending review) + "New round" form (all policy columns with defaults, `starts_at` date picker producing 00:00 ICT) |
| `/admin/shift/rounds/[roundId]` | Dashboard: entrants by track and `beta_group`; joins per day; logs per day by type; pending review (submitted and unreviewed); rejection rate; mission distribution 0-6; entrants with >= 4 active days (beta metric); certificates issued/revoked; share visits with `ref=share`; staff review minutes per entrant (sum `review_ms` / entrants); next-round joins; non-alumni with >= 4 missions (A45); job health strip (A53) |
| `.../entrants` | Table: handle, track (editable), group (editable), squad, missions, last log, outcome; link to entry detail |
| `.../entrants/[entryId]` | Entry detail timeline (logs with media, status changes, check-ins, events) |
| `.../squads` | Unassigned entrants; squads with up to 3 members; create/rename/delete; set mentor (from round mentors); "suggest" button groups unassigned by track in 3s (client-side, staff confirms); shows each member's icebreaker question |
| `.../review` | Queue with filters (status, type, squad, unreviewed only, sample mode T4); card shows payload, transcript, key point, signed photo/audio, who label, linked source; actions Accept (rejected only), Reject (reason code + note), Mark reviewed; keyboard shortcuts; measures `review_ms` from open to action |
| `.../summaries` | Pending revisions with diff against the public revision; Approve, Reject (reason), Take down |
| `.../certificates` | Issued/revoked list with verify link; Revoke (reason), Reinstate; outcomes per entry; issue-run status |
| `.../settings` | Policy columns (locked ones read-only after start), Discord URL, status publish/archive, Extend (days + reason), allowlist (paste emails, import from `shift_applications` cohort), mentors and round staff (by email) |
| `/admin/shift/rounds/ops` | `app_config` flags (tab, enrollment, submissions, transcription, issuance, nudges, emergency message, web base URL), global staff roles, job runs (last 7 days, failures) |

`components/admin/ShiftAdminTabs.tsx`: add "Rounds" (`/admin/shift/rounds`) first; relabel
"Interactive camp" and "Companion" with "(legacy)".

## 7. Test plan

### 7.1 pgTAP (`pseed/supabase/tests/`, run `pnpm test:db` = `supabase test db`) (X4)

| File | Covers |
|---|---|
| `shift_round_schema.test.sql` | tables, indexes (A49), RLS enabled on all new tables, no FK to `hackathon_participants` and no `hackathon_*` changes (A2), no score column/RPC (A25), app_config seed rows |
| `shift_round_grants.test.sql` | every `public.shift_round_*` function is SECURITY DEFINER with `search_path=''`; anon executes only the 2 public RPCs; job RPCs service_role only; authenticated has no insert/update/delete on new tables; no RPC has a timestamptz "now" arg (E13, A1) |
| `shift_round_clock.test.sql` | `round_now` override honoured only with allow flag; day numbers; 23:59:59 vs 00:00 ICT close boundary; UTC input (X3, A19, A40) |
| `shift_round_join.test.sql` | cutoff day 7 (A12), invite allowlist by user and email (A33, E14), `already_in_active_round` (R4), month-based guardian rule incl. birthday month (DS6), enrollment flag, track_not_open (R16), idempotent rejoin, handle rules, hackathon-only identity cannot own an entry (A2) |
| `shift_round_submit.test.sql` | per-type validation incl. fixtures (A8, A17, DS7, X6), personal-data label rejection (A10), https (E9), consent, media existence/ownership/in-use, kill switch (X18), rate limit 30/h with `retry_after` (E5), replay same id -> same receipt with no new row (X7, E5), replay after kill switch and after close returns receipt, different payload -> conflict, after close stored not counted (A7), grace 30 min both sides (E17), after `review_ends_at` -> `round_finished`, events `evidence_logged` + `mission_completed` (A11) |
| `shift_round_missions.test.sql` | each mission threshold via `mission_counts` (E2, A7), distinct `who_key` (E19), any order (DS3), change validity, cross-entry source rejected, re-accept restores change, rejected change stays out (E8, A32), reviewer-only demo completes mission 6 (DS15), `people_talked_to` |
| `shift_round_review.test.sql` | transitions allowed/denied (E3), mentor scoped to assigned round (A23), reject cascade re-locks testers (A9), withdraw cascade (A24), review closed after `review_ends_at` even with no certificate yet (E4), blocked after issue, events with actor (X9) |
| `shift_round_issue.test.sql` | nothing before review end (A18), eligible issued with snapshot (A30, A38), not eligible outcome, run twice no duplicates (A31), broken entry doesn't stop others (E4), extend moves close and review end and resets not_eligible (X9), extend refused after issue (E4), reinstate restores snapshot, tombstone cannot be reinstated |
| `shift_round_deletion.test.sql` | delete my data removes entries/evidence/media rows/check-ins/summaries/squad rows, tombstones certificate, anonymizes events, enqueues storage prefixes, auth user and profile intact (A21, A37, E10); `job_delete_user`; retention purge removes evidence/check-ins/birth fields, keeps valid snapshot and approved summary (A30, E21); audio retention |
| `shift_round_storage.test.sql` | insert path rules, other user cannot select, reviewer can, kill switch blocks upload, delete only unbound objects (A10, E6, X18) |
| `shift_round_summary.test.sql` | revisions, approve a specific revision, edit keeps previous public, one pending, take down, non-https rejected (A35, E9) |
| `shift_round_public_cert.test.sql` | anon access; valid/revoked/tombstone/not_found shapes; no evidence or ids leaked; summary only when opted in and approved; reviewer-only links never returned; visit logging with `ref=share` and daily cap (A5, A28, A39, E13) |
| `shift_round_squads.test.sql` | size cap, one squad per entry, distinct icebreaker questions, feed only for own squad, feed excludes rejected/withdrawn and contains no free text, cheer uniqueness and daily limit (2.8) |
| `shift_round_checkins.test.sql` | once per checkpoint, due windows, midpoint skipped for joined_day >= 6 (A20, A40, DS6, T5) |
| `shift_round_nudges.test.sql` | candidate rules: opt-out, `push_enabled` false, logged today, all missions done, `closing_tomorrow` replaces no-log on day 13, ledger dedupe on rerun, ICT hour matching, waitlist push then cleared (A4, E16, R17) |
| `shift_round_legacy.test.sql` | `shift_camp_action` writes on closed cohort -> `cohort_closed`, reads ok; companion writes -> `companion_retired` (E15, A51) |
| `supabase/tests/race/shift_round_race.ts` (`pnpm test:db:race`, two `pg` connections) | reject committing before vs after `job_issue_entry` (A50, E3); concurrent same `submission_id`; withdraw vs issue |

### 7.2 Edge function (Deno tests in `supabase/functions/shift-round-jobs/`)

Missing/wrong secret -> 401 before any client is created (E13); chunks of 100 and ticket handling,
`DeviceNotRegistered` clears token (E16); health gate blocks issuance (E11); deletion lists the
bucket and requires empty (E7); EXIF segment stripped (E6); alert posted on failure and on zero
processed with due work (A53, X10); copy keys match Appendix C.

### 7.3 App (vitest, `ps_app/tests/`)

| File | Covers |
|---|---|
| `round-drafts.test.ts` | generic store passes the 30 ported companion cases (A42, X14); text restore after kill; missing photo -> re-pick (A16); per-user isolation; `clearUser` (E10) |
| `round-submission.test.ts` | attempt frozen on Send; edit after Send -> new attempt; replay same id; unknown outcome reconciles via replay (E5, X7) |
| `round-schema.test.ts` | zod accepts/rejects shared fixtures (X6) |
| `round-api.test.ts` | error envelope mapping; `PGRST202`/404 -> `unavailable`, never "not enrolled"; 401 -> sign-in with drafts kept (X5, E14) |
| `round-copy.test.ts` | every key has non-empty th and en; every error code in 3.8 has `error.*` copy; every reason code has reason + fix (X8) |
| `round-next.test.ts` | next action wording and order, testers-first student (DS3), needs-attention priority (DS1, DS5) |
| `round-time.test.ts` | ICT display with `TZ=UTC` and `TZ=America/New_York`, close shown 23:59, countdowns (E17, A19) |
| `round-navigation.test.ts` | `decideRoute` matrix 5.2: flag on/off, entry/no entry, guest, hackathon, signed out with pending link, expired session, unreadable flags (DS2, A54, X18, E14) |
| `round-push.test.ts` | permission prompt only after first receipt (X16); legacy local reminder cancelled while active entry (E16) |
| `round-media.test.ts` | re-encode called, path format, consent required, audio max 180 s (E6, A10) |
| `round-query.test.ts` | round queries refetch on focus/reconnect (E18) |
| `supabase-proxy.test.ts` | missing-config proxy covers `rpc` and `storage` (X5) |

Manual checklist before TestFlight (recorded in the PR): VoiceOver/TalkBack and 200% text on all
round screens (DS14, DS10 "Shift, tab, selected"); story share on iOS and Android with and without
Instagram (DS9); kill-app draft test (A16); timed composer usability with 3 students (DS7);
join under 60 s (DS6); contrast audit (DS12); legacy deep links open (A13).

### 7.4 Web (jest, pseed)

| File | Covers |
|---|---|
| `lib/shift-round/certificate/__tests__/thai.test.ts` | segmenter inserts ZWSP at word boundaries; truncation at segment boundary (E12) |
| `lib/shift-round/certificate/__tests__/render.test.ts` | golden PNGs (pixelmatch threshold) for story/square with long Thai, English and mixed strings, legal name and handle (E12, DS11, A38) |
| `app/c/__tests__/page.test.tsx` | valid, revoked, tombstone, 404, 503-not-404 on RPC failure, summary only when present, escaping of `<script>` in title/handle (A5, A49, DS4) |
| `app/c/__tests__/image-route.test.ts` | version redirect, immutable cache header, 410 for revoked (E11) |
| `app/api/shift/__tests__/transcribe.test.ts` | 401 without bearer; check RPC errors mapped; size cap; Groq failure -> `transcription_failed`; no transcript logged |
| `app/api/shift/__tests__/cert-health.test.ts` | 200 when renderer + RPC ok, 503 otherwise |
| `components/admin/shift-rounds/__tests__/*.test.tsx` | review actions call the right RPC and show error codes; reject requires reason; squads UI blocks a 4th member; settings shows locked columns; dashboard renders counts (A3, A53, X9) |

### 7.5 Staging end-to-end (X17, E20)

On a Supabase staging project with Auth, RLS, Storage, Edge Functions and cron: seed `--state=day7`,
submit each type from a device, reject one, withdraw one, move to review (`--state=review`), run
issue, open `/c/<id>`, share, revoke, reinstate, delete data, confirm bucket empty.

## 8. Work split (4 parallel lanes)

Contract = sections 2-4 of this document. Lanes B, C and D build against it with mocks until lane A
lands on local/staging. Nobody edits another lane's paths; shared files list the exact keys allowed.

### Lane A: database, RPCs, jobs, pgTAP (repo `pseed`)

Owned paths:
- `supabase/migrations/20261014090000_shift_rounds_schema.sql` (2.1-2.5, app_config, profiles column, bucket, policies, triggers, bootstrap roles, icebreaker seed)
- `supabase/migrations/20261014090100_shift_rounds_student_rpc.sql` (3.2, 3.3)
- `supabase/migrations/20261014090200_shift_rounds_admin_rpc.sql` (3.4)
- `supabase/migrations/20261014090300_shift_rounds_jobs.sql` (3.5, cron, `invoke_job`)
- `supabase/migrations/20261014090400_shift_legacy_readonly.sql` (2.9)
- `supabase/functions/shift-round-jobs/**`
- `supabase/tests/shift_round_*.test.sql`, `supabase/tests/race/**`, `supabase/tests/fixtures/shift_round_payloads.json`
- `supabase/seed.sql` (new; sets `shift_round.allow_clock_override = on` for local), `scripts/shift-round-seed.ts`
- `package.json`: scripts `test:db`, `test:db:race`, `shift:seed` only
- `docs/shift-round-ops.md` (X10 runbook: role bootstrap, mentor assignment, allowlist, squads, rejection, summary approval, revocation, extend, flags, safe job replay, alerts, Vault secrets)
- Cross-repo exception: `ps_app/supabase/functions/delete-user-account/index.ts` (add `shift_round_job_delete_user` call before the auth deletion)

Inputs: none (owns the contract). Must publish changes to the contract back into this spec.

Done when: all migrations apply on a fresh `supabase db reset`; every 7.1 file passes; race script
passes; edge function deployed to staging with Vault secrets and cron rows; `pnpm shift:seed
--state=day1|day7|review|issued|rejected` prints a login and produces the matching home state;
ops doc reviewed by a staff member; migration revision tagged `shift-rounds-v1` (E20). Target:
schema + student RPCs + pgTAP by Oct 22; admin RPCs Oct 24; jobs Oct 28.

### Lane B: web verification page, image renderer, transcription route (repo `pseed`)

Owned paths:
- `app/c/[publicId]/page.tsx`, `app/c/[publicId]/image/[format]/route.ts`, `app/c/__tests__/**`
- `app/api/shift/transcribe/route.ts`, `app/api/shift/cert-health/route.ts`, `app/api/shift/__tests__/**`
- `lib/shift-round/certificate/**` (layout, Thai segmentation, fonts, QR, snapshot types, RPC fetch), `lib/shift-round/transcribe/**`
- `utils/supabase/public-routes.ts` (add `/c`, `/api/shift/transcribe`, `/api/shift/cert-health` only)
- `package.json`: dependencies `qrcode`, `@types/qrcode`, `pixelmatch`, `pngjs` (+ `@napi-rs/canvas` only if the spike requires it)

Inputs from A: `shift_round_certificate_public`, `shift_round_log_certificate_visit`,
`shift_round_transcription_check` signatures and shapes (3.2, 3.3); snapshot v1 (2.7).

Done when: renderer spike decision recorded (day 1); 7.4 B-owned tests pass incl. golden images;
page and image deployed to production and `cert-health` returns 200 there **before the first
`review_ends_at`** of the beta round (E11); transcription works from a device on staging. Target:
spike Oct 20, page + renderer Oct 30, transcribe route Oct 27.

### Lane C: mobile app (repo `ps_app`)

Owned paths: everything under `ps_app` except `supabase/functions/delete-user-account/`. In
particular `app/(tabs)/_layout.tsx`, `app/(tabs)/shift.tsx`, `app/(tabs)/squad.tsx`,
`app/(tabs)/profile.tsx`, `app/round/**`, `app/sign-in.tsx`, `app/_layout.tsx`, `app/index.tsx`,
`app/shift/*` (read-only audit), `components/round/**`, `lib/round/**`, `lib/drafts/**`,
`lib/supabase.ts`, `lib/queryClient.ts`, `lib/notifications.ts`, `lib/shift-context.tsx`,
`lib/shift.ts`, removal of companion files, `tests/round-*.test.ts`, `tests/supabase-proxy.test.ts`,
`app.config.js` (1.4.0), `package.json`, `eas.json` (TestFlight/Play internal profiles, E20),
`scripts/link-migrations.sh` + replacing the absolute `supabase/migrations` symlink (X1),
`package.json` script `shift:seed` delegating to `$PSEED_DIR` (X2), `README.md` and `CLAUDE.md`
(X11, version file note), `docs/DESIGN.md` only for component additions.

Inputs from A: 3.2 RPCs, 3.6/3.7 shapes, 3.8 codes, 2.3 payload schema and fixtures, bucket rules
2.5. From B: `POST /api/shift/transcribe` contract (6.3) and image URLs (6.2).

Done when: 7.3 tests pass and `pnpm typecheck:app` is clean; manual checklist recorded; companion
archive branch exists; no write calls to `shift_camp_action`/`shift_companion_action` remain
(grep in PR); app runs end-to-end against seeded local DB for every `--state`; 1.4.0 in TestFlight
and Play internal by **Nov 3** (A46 go/no-go). Target: nav/auth cutover + drafts Oct 24, composer +
home Oct 30, squad/certificate/summary/profile Nov 1.

### Lane D: web admin staff tools (repo `pseed`)

Owned paths:
- `app/admin/shift/rounds/**` (pages, `actions.ts` server actions)
- `components/admin/shift-rounds/**` (+ `__tests__`)
- `lib/shift-round/admin/**` (types and RPC wrappers)
- `components/admin/ShiftAdminTabs.tsx` (add Rounds link, legacy labels)

Inputs from A: 3.4 admin RPCs, dashboard shape, bucket rules for signed URLs.

Done when: 7.4 admin tests pass; on staging a staff user can create and publish a round, add the
allowlist (incl. import), assign mentors, form squads, review/reject/accept with media, approve a
summary revision, extend, revoke and reinstate, toggle flags, and see job health. Target: rounds +
allowlist + squads by **Nov 5** (squads must exist before beta day 1); review, summaries,
certificates, dashboard by Nov 7.

Merge order: A first to a shared staging branch; B, C, D rebase on it. `pseed/package.json` is
touched by A (scripts) and B (deps) only.

## 9. Open questions for the user

1. **Mentor access:** the web admin requires `user_roles` admin. Give beta mentors the admin role
   (default), or build a mentor-only page outside `/admin`?
2. **Transcription privacy:** sending students' recordings (which include other teens' voices) to
   Groq Whisper (US). OK for beta, or text-only for under-18s? Audio is kept 30 days after review
   ends by default; shorter?
3. **Squad defaults** (3 + mentor, staff-formed, read-only feed with cheers, live icebreaker in
   Discord): confirm or change.
4. **Round length:** app rounds are 14 days (plan and mockup); SHIFT camps in shift.md are 7 days.
   Keep 14 for the Nov 10 beta?
5. **Staging:** who creates the Supabase staging project (X17), and has the old Timescale password
   been rotated (X13)?
6. **Verify domain:** is `www.passionseed.org/c/<id>` the URL to print on certificates?

## Appendix A. Requirement map (superseded items)

Superseded or withdrawn, do not build: A4 token table (R6), A12 solo (R3), A22/A36 app staff routes
(R2), A25-replaced score parts of A1, A29 year-only (R12), A34 switcher (R4), A41/DS2 tab names (R1),
A48 (withdrawn), A52 limit (R8), X7 key name (R9), D-T6/DS12 neon notes (R5), A2
`milestone_progress` (R7).

## Appendix B. Ice-break questions (seed for `shift_round_icebreaker_questions`)

| id | TH (from shift.md) | EN |
|---|---|---|
| 1 | มีเรื่องอะไรที่คุณอยากให้คนอื่นถามคุณบ่อยกว่านี้? | What do you wish people asked you about more often? |
| 2 | มีเรื่องอะไรที่คุณคิดว่าคนเราควรให้ความสำคัญมากกว่านี้? | What do you think people should care about more? |
| 3 | ถ้าคุณรวยแบบไม่ต้องกังวลเรื่องเงินอีกแล้ว คุณจะยังทำงานอยู่ไหม? ถ้ายังทำ คุณอยากทำงานอะไร? ถ้าไม่ทำ คุณอยากใช้ชีวิตแบบไหน? | If money were never a worry again, would you still work? If yes, at what? If not, how would you live? |
| 4 | มีเรื่องอะไรที่คุณคิดว่าตัวเองเก่งกว่าคนทั่วไปเป็นพิเศษ? | What are you unusually good at? |
| 5 | มีหัวข้ออะไรที่คุณสามารถพูดเกี่ยวกับมันได้นานเป็นชั่วโมงโดยไม่รู้สึกเบื่อ? | What topic could you talk about for an hour without getting bored? |
| 6 | มีเรื่องอะไรเกี่ยวกับตัวคุณที่คนอื่นมักเข้าใจผิด? | What do people often get wrong about you? |
| 7 | คุณมักจะรู้สึกสนุกหรือสบายใจเวลาอยู่กับคนแบบไหน? | What kind of people do you feel most at ease with? |
| 8 | มีเรื่องเล็ก ๆ หรือเรื่องเฉพาะเจาะจงอะไรที่ทำให้คุณมีความสุขแบบแปลก ๆ? | What small, specific thing makes you oddly happy? |
| 9 | ถ้าปีหน้าคุณสามารถเก่งขึ้นอย่างมากในเรื่องหนึ่ง คุณอยากเก่งเรื่องอะไร? | If you could get much better at one thing next year, what would it be? |
| 10 | มีอะไรที่คุณรู้สึกว่า "มันถูกออกแบบมาได้แย่มาก" หรือ "มันไม่ควรจะเป็นแบบนี้" จนทุกครั้งที่เห็นแล้วรู้สึกหงุดหงิด? | What is so badly designed, or so "it shouldn't be like this", that it annoys you every time you see it? |

## Appendix C. Push copy keys

`push.no_evidence`, `push.no_evidence_last_day`, `push.closing_tomorrow`, `push.rejected`,
`push.certificate`, `push.summary_approved`, `push.summary_rejected`, `push.squad_assigned`,
`push.round_published` (text in 5.9). `data.url` targets: rejection -> `passion-seed://round/evidence/{id}`;
certificate -> `passion-seed://round/certificate`; summary -> `passion-seed://round/summary`; squad ->
`passion-seed://round/squad`; nudges and round published -> `passion-seed://round`.
