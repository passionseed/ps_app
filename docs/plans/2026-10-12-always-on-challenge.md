<!-- /autoplan restore point: "/Users/bunyasit/.gstack/projects/passionseed-ps_app/main-autoplan-restore-20261012-012442.md" -->
# Always-on Challenge: the app's next release

Date: 2026-10-12. Status: APPROVED via /autoplan (2026-10-12). Supersedes the release focus of
[2026-10-01-app-roadmap.md](2026-10-01-app-roadmap.md) Phase 1 (SHIFT companion
in the app); Phase 2/3 there remain directional.

## Context

- Company focus (company-brain `company.md`): SHIFT camp. Mission: improve students'
  SDT (autonomy, competence, relatedness). Pivoted away from Seed Camp/TechSeed career
  discovery, so Radar, PathLab and TCAS planning are legacy direction.
- Community lives in Discord (decision 2026-10-05). The app must not compete with it.
- shift[1] ended 2026-10-12. shift[2] starts 2026-10-14 and runs on Discord; the app
  will not ship for it.
- SHIFT judges progress by real-world evidence: real people talked to, real testers,
  changes made because of what users said. Nothing captures this durably today.
- Students want competitions because university portfolios need them. Passion Seed
  plans to scale the SDT mission to university students.
- Mobile app is at 1.3.3 in the stores. It already has hackathon infrastructure:
  `app/(hackathon)/` (home, journey, phases, submissions, teammates, mentor booking,
  reflection) and `app/hackathon/` (challenges, dashboard).
- Uncommitted SHIFT companion work (linking code, daily update, drafts, recovery) exists
  in the working tree with 38 passing unit tests; its backend SQL has never executed.

## Problem

The app has been delayed because it has no single job. Students need portfolio-grade
proof of real projects; Passion Seed needs a format that builds SDT without a mentor on
every day, and that works for high school and university students.

## Goal

Ship an always-on, async challenge ("Seasons") as the app's primary purpose. Students
enter for portfolio value; the format builds autonomy, competence and relatedness.
Scored by real-world evidence, not judges' taste.

## Implementation plan

### Product shape

1. **Seasons.** A new 2-week season opens every 2–4 weeks. Each season has a one-line
   open brief (example: "Fix something annoying at your school"). Students pick their
   own problem inside the brief.
2. **Entrants.** Thai high school students and university students, separate tracks
   per season. Solo or teams of up to 3 (decision pending).
3. **Milestones** mirror the SHIFT days: First contact, Interviews + problem statement,
   MVP, Testers, What I changed, Demo post. Each milestone is unlocked by submitting
   evidence, not by time.
4. **Evidence log** is the core interaction: log a person talked to, a tester, or a
   change-because-of-user in under 10 seconds, with optional photo/link/quote.
5. **Leaderboard** (stretch, not beta; see A6/A25) ranks by evidence, not polish.
   Mentor/staff spot checks flag fake evidence.
6. **Certificate + project page.** Completing a season produces a shareable certificate
   (Instagram story format) and a public-by-choice project page that becomes the
   student's portfolio across seasons.
7. **SDT check-ins** at start, midpoint and end of season, reusing the short questions
   in company-brain `shift.md` (ownership 1–5, "why did you join / keep going",
   confidence to start alone).
8. **Discord stays the community.** The app links to the season's Discord channel for
   questions and team-finding; no in-app feed or chat.
9. **SHIFT** becomes the mentored premium version of the same loop; SHIFT cohorts use
   the same evidence log.
10. Legacy tabs (Radar, PathLab, planning) stay installed, get no new work, and move out
    of the primary navigation.

### Design (top-tier bar)

Design four screens to a high bar before building full flows:

1. Season home: countdown, brief, your next milestone, one primary action.
2. Evidence log composer: 10-second entry, haptics, a counter that climbs.
3. Project page / portfolio: what a university admissions reader would see.
4. Certificate: shareable to Instagram story; this is the growth loop.

Start from the immersive hackathon sub-theme in `docs/DESIGN.md`. Thai and English
copy. Large text, VoiceOver/TalkBack, 48-point touch targets.

### Build

1. Reuse `app/(hackathon)/` UI components and screen patterns (phase list, submission
   cards, theme) for seasons and milestones. Season data lives in new tables (see A2).
2. Reuse the SHIFT companion's draft persistence, offline recovery and receipt logic
   (`lib/shiftCompanionDrafts.ts`, `lib/shiftCompanionRecovery.ts`) for the evidence
   composer. Drop the companion's free-text daily update as the primary flow.
3. Backend: new season/evidence tables in the shared Supabase project, written through
   RPCs, with RLS. Server-derive leaderboard scores and certificate eligibility; never
   client-writable.
4. Certificate rendering with Skia or a server-rendered image; verification URL per
   certificate.
5. Version bump to 1.4.0, native build (photo picker), TestFlight + Play internal for
   beta; store release before the December public season.

### Timeline

| When | What |
|---|---|
| Oct 14–20 | shift[2] on Discord. Mentors log evidence manually in a form (field research). Design the four screens. |
| Oct 20–Nov 7 | Build season tables, RPCs and screens (reusing hackathon UI patterns). Migrate staging, then production. |
| ~Nov 10 | Beta season with shift[0]–[2] alumni (~25 students), TestFlight + Play internal. |
| December | First public season, high school + university tracks. |

### Success metrics

- Beta: 70% of entrants log evidence on at least 4 distinct days of the season.
- Beta: 60% complete the season and share the certificate.
- SDT: shift in "why keep going" from portfolio toward "I wanted to / I care about the
  people it helps", read next to behavior.

### Open decisions

1. Partner co-signing of certificates after beta (TODO E3). Beta: Passion Seed only (A15).
2. Teams after beta (beta is solo, A12).
3. Pricing after beta (beta is free, A15).
4. Owner for the passionseed/web verification page (A27).


<!-- autoplan-accepted:ceo -->
- A1: Season score, milestone completion and certificate eligibility are computed server-side only; clients cannot write points or completion. Verify: RLS/RPC negative test where a client insert of points or completion is rejected.
- A2: Seasons get new tables keyed on Supabase Auth user IDs (seasons, season_entries, evidence, milestone_progress, certificates, sdt_checkins). The hackathon_* tables and the hackathon_participants identity are not re-keyed or modified; only hackathon UI components and patterns are reused. Replaces Build item 1's "reuse submissions and teammate infrastructure". Verify: schema review shows no FK to hackathon_participants and no migration touching hackathon_* tables; test that a hackathon_participants-only identity cannot own a season entry.
- A3: Staff and mentors (role season_staff or season_mentor) can spot-check and reject evidence and revoke a certificate; only season_staff can create a season. Revocation shows on the verification URL. Verify: admin flow test, verification page shows revoked state, non-staff call rejected.
- A4: Push nudges: (a) evening of any season day where the entrant logged no evidence, (b) 24h before the season closes. Requires a new main-app push token table on auth users (the only existing store is hackathon_participant_push_tokens) and a settings toggle to opt out. Scheduler: Supabase pg_cron calling an edge function. Verify: job test where an opted-out user and a user with evidence that day receive nothing.
- A5: One public web page per certificate in passionseed/web at a verification URL: holder display name, season, milestones met, status (valid/revoked) and, only if the entrant opts in, the project summary. Default private: without opt-in the page shows verification only. The certificate image is server-rendered on the web side and reused by the app share sheet (settles Build item 4). Verify: non-opted-in page shows no project content; revoked shows revoked; unknown ID returns not found.
- A6: Beta cut is fixed now, not on slip: evidence log, milestones, certificate + verification page, staff reject/revoke, push nudges, SDT check-ins. Stretch (ships only if ready by Nov 7, else next release): leaderboard, in-app project page polish beyond the design-reviewed screen. Verify: release checklist lists beta cut and stretch.
- A7: Certificate eligibility = all 6 milestones complete before season close. A milestone completes when accepted evidence exists: First contact (1 contact), Interviews + problem statement (3 interviews + problem statement text), MVP (link or photo), Testers (3 testers), What I changed (1 change linked to an interview or tester item), Demo post (public link). Evidence after season close is stored but does not count. Verify: server tests for each milestone threshold and the close time.
- A8: Evidence types and required fields: contact {who role, channel, date}; interview {who role, date, key quote or note}; tester {who role, what they tried, what happened}; change {what changed, source evidence id}; optional photo or link on any. No third-party names, phone numbers or faces required. Verify: RPC rejects missing required fields.
- A9: Rejection cascade: rejected evidence leaves the score and milestone counts; a milestone re-locks if it falls below threshold; before issue, eligibility recomputes; after issue, a certificate changes only by explicit staff revoke. Verify: rejecting the only tester items below 3 re-locks Testers.
- A10: Minors and PDPA: entrants confirm consent from anyone shown in a photo or quote before upload; evidence photos live in a private bucket readable by owner and staff only; public pages never show evidence photos or third-party details; display name is an entrant-chosen handle. Verify: storage policy negative test for another user reading a photo.
- A11: Instrumentation events: season_joined, evidence_logged (type), milestone_completed, certificate_issued, certificate_shared (share sheet completed), sdt_checkin_submitted. Success metrics are computed from these. Verify: events recorded for a test entrant.
- A12: Track (high school or university) is self-declared at join and editable by staff; joining allowed until day 7 of a season; beta entries are solo (teams deferred, taste decision). Verify: join after day 7 rejected.
- A13: Each season stores its Discord channel URL and season home links to it. Legacy tabs (Radar, PathLab, planning) move out of primary tab navigation into Profile; their routes stay reachable. Verify: deep links to legacy routes still open.
- A14: A SHIFT cohort is a season with mentor_led=true, using the same evidence log with no extra build. Verify: a mentor-led season can be created.
- A15: Beta certificates are Passion Seed-only (partner co-signing is TODO E3). Beta entry is free. Companion draft and recovery libraries are reused; companion screens and backend SQL are shelved, not shipped.
- A16: Composer text drafts persist offline; a pending photo must be re-picked after the app is killed, and the composer says so. Verify: kill-app test restores text and shows a photo re-pick prompt.
- A17: Evidence types add problem_statement {text}, mvp {link or photo}, demo_post {public url}. A7 milestones map to these types. Verify: RPC rejects a demo_post without a URL.
- A18: Evidence counts on submit. Staff/mentors may reject until the certificate issues. Certificates issue 48 hours after season close (review window), not at the sixth milestone. Verify: certificate absent before close+48h, present after for an eligible entrant.
- A19: Season clock is Asia/Bangkok. Day 1 is the local date of starts_at; days are local calendar days; a season closes 23:59 ICT on day 14; the no-evidence nudge sends at 19:00 ICT. Verify: boundary tests at 23:59 and 00:00 ICT.
- A20: SDT check-ins on day 1, day 7 and at close, optional and not required for the certificate. Questions: "How much does this project feel like yours?" (1-5); day 1 "Why did you join?" and close "Why did you keep working?" (had to / portfolio / wanted to / care about the people it helps); "How confident are you to start a new project on your own?" (1-5); close "What can you do now that you couldn't on day 1?" (open). Verify: check-in stored once per entrant per checkpoint.
- A21: Entrants under 20 confirm parent/guardian consent at join. Settings offers account and evidence deletion: evidence and photos are deleted and any certificate is revoked. Evidence is retained 12 months after season close, then deleted, except opt-in public project summaries. Verify: deletion test removes evidence rows and storage objects.
- A22: Beta staff surface is the existing `app/admin` route calling SECURITY DEFINER RPCs (create_season, reject_evidence, revoke_certificate); Supabase Studio is the fallback. Verify: RPCs reject callers without a season role.
- A23: Roles live in a new season_roles(season_id nullable, user_id, role staff or mentor) table; the shared user_roles table and its CHECK constraint are untouched. Mentors act only on seasons they are assigned to; staff with season_id null act on all. Supersedes A3's role names. Verify: a mentor cannot reject evidence in an unassigned season.
- A24: Evidence is immutable after submit; the entrant may withdraw it before certificate issue, which cascades like a rejection (A9). Verify: update RPC does not exist; withdraw re-locks milestones.
- A25: No score in beta. A1 applies to milestone completion and eligibility; the leaderboard score formula is defined when the stretch leaderboard is built. Supersedes the score part of A1. Verify: no score column or RPC in the beta migration.
- A26: The cross-season portfolio is out of beta (TODO). Design screen 3 is the in-app preview of the A5 opt-in project summary. Verify: design review covers screen 3 as that preview.
- A27: The web verification page and push nudges are server/web-only and can ship after the app binary without a store update. The web page needs a named owner before Oct 20 (unresolved, user decision). Verify: release checklist shows owner and independent deploy.
- A28: certificate_shared counts share-sheet opens; the success metric "share the certificate" uses verification-URL visits with ?ref=share, since Android share sheets do not confirm completion. Verify: visit with ref=share is attributed to the certificate.
- A29: Join collects birth year (stored on season_entries); the A21 guardian-consent step shows only for entrants under 20. Verify: birth year 2008 sees consent step in 2026, 2000 does not.
- A30: Certificates store a snapshot at issue: holder display name, season, track, milestones met, issued_at. The verification page reads the snapshot, so evidence purge (A21) never changes a valid certificate. Verify: deleting evidence after issue leaves the page unchanged.
- A31: pg_cron jobs: issue_certificates (hourly, issues for seasons past close+48h), purge_evidence (daily, A21 retention), send_nudges (A4). Each is idempotent. Verify: running each job twice produces no duplicates.
- A32: A change item stays valid only while its source evidence is accepted; rejecting or withdrawing the source cascades to the change (A9). Verify: rejecting the source interview re-locks What I changed when it was the only change.
- A33: Seasons have join_mode open or invite; mentor-led (SHIFT) seasons are invite-only via an allowlist managed by staff. Verify: a non-allowlisted user cannot join an invite season.
- A34: A user may hold several active entries; season home shows the entry with the nearest close date and a switcher. Verify: user in two seasons can switch.
- A35: Opt-in project summary = title, one-paragraph description, demo link, chosen public evidence counts (no evidence text). It is entrant-edited in the app and goes public only after a staff/mentor approve via an approve_summary RPC; staff can take it down. Verify: unapproved summary is not shown on the web page.
- A36: Season tools are a new route app/season-admin gated on season_roles (not the user_roles-gated app/admin). Supersedes the A22 route. Verify: a mentor without user_roles admin can open season tools for an assigned season.
- A37: An issued certificate changes by staff revoke or holder deletion (amends A9). Deletion in A21 removes season data only (entries, evidence, photos, check-ins, project summary) and revokes certificates; it never deletes the shared auth account. Verify: deletion leaves the auth user and web data intact.
- A38: Certificates show the entrant handle by default; the entrant may opt in to show their legal name for admissions verification. Verify: opt-in name appears on page and image; default shows handle.
- A39: Analytics sink: events go to a season_events table (server-written by the RPCs where possible); the web verification page logs visits with ref to the same table via a server route. Verify: events and visits queryable by season.
- A40: SDT check-in 1 fires at join; the day-7 check-in is skipped if the entrant joined on day 6 or later; close check-in always. Close time is before 00:00 ICT on day 15 (clarifies A19). Verify: day-7 joiner gets join and close check-ins only.
- A41: Beta primary tabs: Season (home), Evidence (log), Profile. Legacy Radar/PathLab/planning move under Profile. Companion screens in app/shift/* and app/welcome.tsx are not shipped: they are removed from the beta branch (kept in git history on a separate branch). Verify: tab bar shows exactly three tabs; app/shift companion routes absent from beta build.
- A42: Before reuse, the companion draft/recovery libraries are committed and refactored into a generic draft store keyed by draft id (removing daily-update type coupling). Budget 1 day. Verify: existing 38 companion tests pass against the generic store, plus evidence draft tests.
- A43: Push nudges may start after the Nov 10 beta begins (server-only deploy, A27); the app binary ships with token registration and the opt-out toggle. Verify: beta checklist marks nudges as server-deployable after launch.
- A44: The beta includes at least 5 high school students with no prior SHIFT, recruited cold, alongside alumni; results are reported separately for the two groups. Verify: beta roster shows group split.
- A45: Added metrics: staff review minutes per entrant, evidence rejection rate, entrants who join the next season, new entrants arriving via ?ref=share. Pre-registered December go/no-go: go only if at least 50% of non-alumni complete 4 or more milestones without staff help and staff time is at most 15 minutes per entrant. Verify: beta report computes each.
- A46: Build go/no-go on Nov 3: if the beta cut is not in TestFlight by then, the Nov 10 beta runs concierge-style (Discord + web form + manually issued certificates) and the app ships for the following season. Verify: Nov 3 checkpoint recorded.
- A47: The plan opens with a problem and bet statement: problem = students who finish SHIFT have no next step and Passion Seed cannot run mentored camps at scale; bet = an evidence-gated self-serve season gets non-alumni students to talk to real users. Verify: statement present at top of plan.
- A48: Before Nov 7, staff interview at least 5 school counselors or admissions readers with a sample certificate and project summary, and record whether it would count in a portfolio. Verify: interview notes saved (no student personal data).
- A49: Certificate public IDs are unguessable; project summary text is escaped on the web; the certificate snapshot format is versioned; indexes on evidence(entry_id,type,status), season_entries(season_id,user_id) unique, certificates(public_id) unique, season_events(season_id,created_at). Verify: schema review.
- A50: issue_certificates re-checks eligibility in the same transaction and locks season_entries; reject/withdraw takes the same lock. Verify: race test with reject committing before and after the issue job.
- A51: Seasons replace the interactive SHIFT camp schema for future cohorts; the existing interactive camp tables stay read-only for past cohorts and are not extended. Verify: no new writes to interactive camp tables from the beta build.
- A52: Rate limit evidence submission per entrant (e.g. 10 items per hour) in the RPC. Verify: 11th item in an hour rejected with a friendly error.
- A53: Staff dashboard counts (entrants, evidence per day, pending review, rejection rate, certificates issued) in season tools; alerts when a cron job fails or processes zero rows on a due day; Sentry captures RPC errors. Verify: forced job failure raises an alert.
- A54: The Season tab sits behind a remote flag so it can be hidden without a store update. Verify: flag off hides the tab and keeps legacy routes.
- A55: Rejected evidence shows the reason and how to fix it; every season screen has a "stuck? ask in Discord" link to the season channel. Verify: rejection state in design review.
<!-- /autoplan-accepted:ceo -->

<!-- autoplan-accepted:design -->
- DS1: Season home order: season name and track (switcher only with 2+ entries); one "needs attention" slot (rejection or check-in, max one); next action phrased with the requirement ("Log tester 2 of 3"); one primary button opening the composer with that type; six-milestone overview; closing time as a Bangkok date/time with countdown secondary; brief collapsed after day 1; "Stuck? Ask in Discord" as a persistent footer. Verify: design review of the home wireframe.
- DS2: Tabs: Season = guidance and progress; Evidence = the log grouped by milestone with per-item status and drafts, plus "Add evidence" (opening the tab never auto-opens the composer); Profile = handle, language, certificates, notifications, "Delete season data", legacy tools. When the A54 flag is off, new enrollment stops but existing entrants keep Season and Evidence; users with no entries see Profile and legacy home. Root redirects into companion routes in app/_layout.tsx are replaced. Verify: nav test with flag on/off and with/without entries.
- DS3: Milestones can be met in any order, displayed in SHIFT order; "next" = first incomplete in that order. Copy uses "not yet"/"complete"/"needs N more", never "locked". Verify: home shows next action for a student who logged testers first.
- DS4: The state table in Pass 2 is required scope for Season home, milestone, composer, review window, not eligible, certificate, project summary and web verify page. Add a push and in-app celebration on certificate issuance (amends A4). Verify: each state has a wireframe and Thai/English copy before build.
- DS5: Rejection shows the reason, the affected milestone and count, any linked change also invalidated, and a "Log a replacement" action creating a linked draft; withdrawal previews which milestones and changes it affects; a push is sent on rejection. Verify: rejection flow test.
- DS6: Join is 3 screens: track; birth month and year (age-20 rule computed from month) with guardian consent only if under 20, with a share-with-parent link; handle. The first SDT check-in appears after the first evidence item as a dismissible card; legal-name opt-in moves to certificate time with a preview. Amends A29/A40. Verify: join flow timed under 60s.
- DS7: Composer per type: type first (default next milestone's type); date defaults today; recent roles as chips; at most one required free-text field per type with optional fields collapsed; change source picker shows the last 5 interview/tester items; consent checkbox only when a photo is attached. Reuse validation, duplicate-send guard and receipt confirmation from app/shift/update.tsx. Success: draft cleared, item and new count shown, "Add another" / "Back to Season". Targets: 10s for contact and tester, 30s for interview. Verify: timed usability with 3 students.
- DS8: Progress shows per-requirement counts ("Interviews 2/3", "Milestones 4/6") and a secondary "people you've talked to" total; numbers animate and success haptics fire only after a confirmed receipt; decrements on rejection do not animate. Copy states that evidence can be reviewed. Verify: design review.
- DS9: Certificate share: 1080x1920 story image with short verify URL and QR inside safe margins, plus a 1:1 portfolio version; after sharing, a tip to add the Instagram link sticker with the URL copied; copy-link fallback; works without Instagram installed. Verify: share test on iOS and Android.
- DS10: Tab bar uses consistent pictogram icons with visible localized labels and accessibility tab role and selected state; no emoji in navigation. Verify: VoiceOver reads "Season, tab, selected".
- DS11: Certificate image and web verification page use a calm light credential style (light background, clear issuer, date, status, verify URL); fonts embedded server-side for Thai and Latin with Thai line breaking; max lengths and truncation rules for handle and title; tested with Thai, English and mixed strings. Verify: render tests with long Thai strings.
- DS12: Contrast: body text never uses Text.tertiary on white; text on Passion Neon is Obsidian; 4.5:1 body, 3:1 large text and controls. Verify: contrast audit of the four screens.
- DS13: Update docs/DESIGN.md to the current product (seasons, not career simulation) and reconcile Latin font (Libre Franklin per CLAUDE.md) with Bai Jamjuree for Thai. Verify: DESIGN.md diff reviewed.
- DS14: Responsive and a11y acceptance criteria as written in Pass 6 apply to all season screens and the web page. Verify: a11y checklist pass at 200% text and with VoiceOver/TalkBack.
- DS15: The demo_post milestone accepts either a public URL or a reviewer-only link (visible to staff/mentors only); public pages never require a public demo. Amends A7/A17. Verify: milestone 6 completes with a reviewer-only link.
- DS16: Certificate wording is a factual record of completed activities; it does not imply admissions endorsement or verified impact; the verify page explains that current validity is checked there. Verify: copy review.
- DS17: Thai is the default interface language with a persistent English preference; one language at a time; student-written content is never translated. The certificate is bilingual. Verify: language switch keeps entered drafts.
<!-- /autoplan-accepted:design -->

<!-- autoplan-accepted:dx -->
- X1: Replace the committed absolute `supabase/migrations` symlink with a portable setup (a `scripts/link-migrations.sh` reading `PSEED_DIR`, documented in README); `config.toml` seed path points at a file that exists. Verify: fresh clone on a second machine links migrations with one command.
- X2: `supabase/seed.sql` plus `pnpm season:seed --state=day1|day7|review|issued|rejected` create a season, entrant, assigned mentor, global staff role and evidence at each state, and print the test login. Verify: each state opens the matching Season home state from DS4.
- X3: Every time rule (A18, A19, A31, A40, A12) reads time through one `season_now()` SQL function that dev and test can override. Verify: pgTAP test moves season_now across the 23:59/00:00 ICT boundary.
- X4: A database test harness (`pnpm test:db`, pgTAP against local Supabase) exists before Oct 20; every A-item Verify that is SQL-level names its test file. Verify: CI or local run passes RLS, cascade, race and rate-limit tests.
- X5: One RPC and error contract table (name, args, return, error codes, caller role). Errors carry a stable code (validation, unauthenticated, forbidden, unavailable, retryable), field and retry_after where relevant, and a request id. Clients never treat a missing RPC as "not enrolled"; the missing-config proxy in lib/supabase.ts covers rpc and storage. Verify: contract table in the season handbook; test that a missing RPC surfaces "unavailable".
- X6: One versioned evidence payload schema per type (zod in lib/) mirrored by SQL validation. Verify: shared fixtures pass both validators.
- X7: submit_evidence takes client_draft_id for server-side idempotency and returns the evidence id, receipt id and updated milestone counts. Verify: replaying the same client_draft_id returns the same receipt with no duplicate row.
- X8: Error catalogue: code -> cause -> Thai/English student copy -> fix action -> Discord link, covering join after day 7, invite-only, submit after close ("Saved, but the season closed at 23:59; this won't count"), withdraw after issue, rate limit with retry time, missing field, invalidated change, offline. Verify: copy review and one test per code.
- X9: Season policy lives in season columns with defaults (duration_days, join_cutoff_day, review_window_hours, nudge_local_time, rate_limit_per_hour); staff RPCs extend_season, staff_accept_evidence and reinstate_certificate exist and write season_events. Verify: extend_season moves close and issue time; audit row written.
- X10: Cron alerts go to a named staff Discord channel and include last success time and due-work count; `docs/season-ops.md` covers role bootstrap, mentor assignment, allowlist, rejection, summary approval, revocation and safe job replay. Verify: forced failure posts to the channel; ops doc reviewed by a staff member.
- X11: README and CLAUDE.md describe seasons (tables, RPC table, cron jobs, seed commands, season_now, flag name); superseded amendments are consolidated into a final spec section; the command reference matches package.json scripts and deploy targets. Verify: a new intern finds setup in under 2 minutes.
- X12: Push nudges reuse the existing `profiles.expo_push_token` and `savePushToken` (lib/notifications.ts) instead of a new token table; an opt-out preference is added to profiles. Supersedes A4's "new main-app push token table". Verify: nudge job reads profiles token and respects opt-out.
- X13: Remove the hardcoded database credential from docs/GHOST_STAGING_SETUP.md and rotate it (owner: founder). Verify: grep finds no credential; old password rejected.
- X14: Before A41 removes companion screens, the untracked companion screens and libraries are committed to a separate branch; A42's test bar uses the actual companion test count (30 found, not 38). Verify: branch exists; recount recorded.
- X15: Hackathon UI pieces reused for seasons are extracted into components/season with props-only interfaces (budget 0.5 day). Verify: no components/season import from hackathon lib types.
- X16: The push permission prompt appears after the first evidence receipt, not at join. Verify: fresh install shows no permission prompt before first receipt.
- X17: Beta staging includes Auth, RLS, Storage and Edge Functions (the current staging guide omits them). Verify: staging run of submit -> reject -> issue -> verify.
- X18: The A54 flag lives in a Supabase app_config row with a cached value; if unreadable, existing entrants still see their season. A separate submissions kill switch disables new evidence while keeping logs and drafts readable. Verify: kill switch on shows read-only Evidence tab with drafts kept.
<!-- /autoplan-accepted:dx -->

<!-- autoplan-accepted:eng -->
- E1: Before Oct 20, write one consolidated final spec (folding A, DS and X supersessions) and build the schema and RPC/error contract (X5) only from it. Verify: spec section exists; no superseded item referenced by tasks.
- E2: Milestone progress is derived by a SQL function over accepted evidence submitted before close; no milestone_progress cache table (supersedes that table in A2). Snapshots happen only at issue (A30). Verify: pgTAP thresholds via the function.
- E3: One transactional transition model: evidence submitted -> rejected | withdrawn; rejected -> accepted by staff; withdrawn is terminal. All eligibility-affecting operations (submit, reject, withdraw, staff accept, extend, reinstate, delete, issue) take a lock on the entry row in one order. Server submitted_at is authoritative; evidence submitted after close never completes a milestone. Race tests use separate database connections. Verify: concurrency test harness with two connections.
- E4: Certificates store review_ends_at (close + review_window_hours) separately from issued_at; review actions are rejected after review_ends_at even if issuance is delayed. issue_certificates runs one transaction per entry with on conflict do nothing; extend_season is refused once any certificate in the season has issued; reinstate restores the original snapshot. Verify: delayed-job test keeps review closed; per-entry failure doesn't abort batch.
- E5: Submission idempotency: the client freezes a submission attempt with a submission_id when the student taps Send (edits after that create a new attempt). Unique (entry_id, submission_id); a replay with the same payload returns the original receipt before rate-limit and close checks (ownership and deletion still checked); a replay with a different payload returns a conflict. Rate limit 30 per hour with retry_after (amends A52). Verify: lost-response replay, edit-after-send, mismatch tests.
- E6: Photos use a private season bucket with path season/{season_id}/{user_id}/{evidence_id}.jpg; EXIF/GPS stripped on device (re-encode) and checked server-side; submission verifies object ownership; upload size limit; staff view via short-lived signed URLs; orphan uploads cleaned by the purge job; the kill switch also blocks uploads. Not Backblaze public URLs. Verify: EXIF-free stored file; other user denied; orphan cleanup test.
- E7: Purge and season-data deletion run in an edge function (pg_cron -> pg_net) using the Storage API with service role, driven by an idempotent deletion_requests queue. Verify: test checks bucket listing, not just rows.
- E8: A change item's source must be an interview or tester in the same entry; validity is computed from the source's status; if a rejected source is re-accepted the change counts again unless the change itself was rejected. Payloads are immutable and direct table writes are denied by RLS. Verify: cross-entry source rejected; re-accept test.
- E9: Project summaries are stored as revisions; staff approve a specific revision; editing creates a pending revision while the last approved revision stays public; a reviewer-only demo link never appears publicly; public links must be https. Verify: edit-after-approve test; non-https link rejected.
- E10: "Delete season data" is a new operation separate from the existing delete-user-account function (which deletes the shared account and must also be extended to delete season data). After holder deletion the certificate page shows a minimal revoked tombstone with no handle or name; retention purge leaves valid snapshots intact. Local drafts and caches are cleared; stale clients cannot recreate deleted entries. Verify: tombstone test; delete-user-account removes season rows.
- E11: The web verification page and image renderer must be live and tested before the first certificate issues (amends A27: they can deploy separately from the app but are a prerequisite for issuance). Render failure is retried separately from issuance; cached images are invalidated on revoke, summary change or name change. Verify: issuance blocked in staging until page health check passes.
- E12: Certificate renderer pre-segments Thai with Intl.Segmenter('th') and zero-width spaces, embeds Bai Jamjuree and Libre Franklin TTFs, caps handle/title length server-side, and has golden-image tests with long Thai strings. Budget 2 days. Verify: golden images pass.
- E13: Every SECURITY DEFINER RPC sets search_path to empty, checks auth.uid(), has execute revoked from public/anon and granted to authenticated; the web page reads through a narrow get_certificate_public(public_id) RPC, never service role in a page handler; season_roles is writable only by global staff and bootstrapped by migration; season_now override is not callable by clients in production; scheduled edge functions authenticate the scheduler before any work. Verify: pgTAP grants tests; unauthenticated call to job function rejected.
- E14: Replacing /shift/* includes a new sign-in and expired-session recovery flow (restoring evidence drafts), invitation deep-link preservation, explicit guest and hackathon-mode behavior, and a path for hackathon-only alumni and mentors to create a Supabase Auth account and receive season membership. Verify: cold start unauthenticated -> sign-in -> season; expired session restores draft.
- E15: Interactive SHIFT camp data becomes read-only: audit ShiftProvider (lib/shift-context.tsx) and routes so the new binary performs no camp writes; backend blocks camp writes for closed cohorts using expand/contract so old binaries degrade gracefully. Verify: route audit list; write attempt on closed cohort rejected with a clear error.
- E16: Nudges respect the existing mobile_settings.push_enabled master switch plus a season-specific opt-out, and do not duplicate the existing local daily reminder; Expo sends in chunks of 100 with receipt handling that clears DeviceNotRegistered tokens; cron schedule 12:00 UTC for 19:00 ICT; a nudge_ledger (user, season, local_date, kind) records delivery with a defined retry policy; one token per user is a documented beta limit. Amends X12. Verify: duplicate-run test; opt-out test.
- E17: Offline submissions near close are counted by server submitted_at with a grace rule: evidence whose client created time is before close and whose receipt arrives within 30 minutes after close counts (taste decision T-E1). All times display in ICT regardless of device timezone. Verify: UTC-device display test; grace boundary tests.
- E18: Season queries override the global no-refetch defaults (refetch on focus and reconnect); cached flags and metadata never act as authorization; enrollment shutdown, submission shutdown and emergency routing are separate controls. Verify: rejection visible after foregrounding.
- E19: Tester and interview thresholds count distinct people by a required short context label (e.g. "Grade 11 student, library") with a duplicate warning; spot-check limits documented; "active days" metric uses server receipt local date. Verify: duplicate-label warning test.
- E20: Gates before Nov 3, outside the screen budget: pinned canonical migration revision in pseed, EAS profiles for TestFlight/Play internal, credential rotation (X13), and a staging end-to-end run (X17). Verify: checklist complete.
- E21: Retention and deletion also cover season_entries birth fields and sdt_checkins free text; a short PDPA review happens before any public season. Verify: purge test covers those columns.
- E22: The Evidence tab and Season home read through one RPC returning entry, derived counts and items (no N+1). Verify: one network call per screen load.
<!-- /autoplan-accepted:eng -->
## Review record

### Phase 1: CEO review (autoplan, SELECTIVE EXPANSION, strategy-plus-capability depth)

#### Pre-review audit

- No stashes. Last 30 days touched SHIFT (`lib/shift*.ts`, `types/shift.ts`) and Radar.
- Existing `app/(hackathon)/` + `lib/hackathon*.ts` (30+ modules) cover programs, phases,
  modules, activities, teams, team scores, ranking, submissions, assessments, inbox,
  comments, push tokens, admin. Tables: `hackathon_programs`, `hackathon_program_phases`,
  `hackathon_teams`, `hackathon_team_members`, `hackathon_team_score_events`, etc.
- **Finding F1 (identity):** hackathon uses its own identity (`hackathon_participants` +
  `hackathon-login` edge function + `hackathon_token` in AsyncStorage,
  `lib/hackathon-mode.ts:6`), not Supabase Auth users. Seasons cannot reuse that identity
  if certificates and portfolios must follow the main account.
- **Finding F2 (forgeable scores):** `lib/hackathon-submit.ts:114` inserts
  `hackathon_team_score_events` with client-supplied `points_awarded`. A leaderboard
  built on this is forgeable. Matches prior learnings `gameable-progression-shared-badge`
  and `public-profiles-client-forgeable-badge` (confidence 8/10).
- Prior learning applied: mobile-rls-lock-breaks-binaries (9/10, 2026-06-13): any RLS
  tightening on reused hackathon tables must expand/contract.

#### Landscape

- Layer 1: async cohort build programs (Buildspace Nights & Weekends: 6-week seasons,
  build anything, demo day) proved the format draws builders; Buildspace shut down in
  2024 despite strong community ([Failory](https://newsletter.failory.com/p/hidden-struggles)).
  Format demand is not the risk; operating cost and business model are.
- Layer 2: TCAS portfolio rounds weight **regional/national awards** and academic
  competitions (Mahidol MU-Portfolio). TCAS69 introduced a standard digital portfolio,
  TCASfolio. A certificate from an unknown organizer likely carries little admissions
  weight on its own.
- Layer 3: SDT cognitive evaluation theory: rewards read as *control* undermine intrinsic
  motivation; rewards read as *competence feedback* can support it
  ([Deci, Koestner, Ryan 2001](https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf)).
  Leaderboard studies show effort stops at the reward threshold
  ([USQ EFL study](https://research.usq.edu.au/item/q7q7x/leaderboards-in-an-efl-course-student-performance-and-motivation)).
  A ranked count-based leaderboard is the controlling kind.

#### 0A. Premise challenges

| # | Premise | Verdict | Disposition |
|---|---|---|---|
| PC1 | Students will enter for portfolio value of a Passion Seed certificate | Questionable. Admissions weight regional/national awards; an unknown organizer's certificate is weak. | User Challenge candidate (needs outside voice). Keep as Open decision 1. |
| PC2 | Reuse `app/(hackathon)/` for seasons, milestones, teams | Partly valid. UI shells, phase/module models and push infra reuse well; identity (F1) and scoring (F2) cannot be reused as-is. | Auto-accepted amendment A1/A2 (mechanical, P4+P5). |
| PC3 | Rank a public leaderboard by evidence counts | Risky twice: counts are gameable (fake interviews), and count-ranking is a controlling reward under SDT. | TASTE: replace rank-by-count with evidence-bar completion + mentor-featured projects. Surfaced at final gate. |
| PC4 | Build + store release in Oct 20–Nov 7 | Aggressive for new backend + 4 top-tier screens + native build + review. | Kept; add scope fallback (A6). |
| PC5 | Needs a native app before the format is validated | A concierge Season 0 on Discord + form validates the format with zero build. | User Challenge candidate (needs outside voice). |

Do-nothing cost: the app stays at 1.3.3 with a legacy career-discovery purpose that no
longer matches the company; SHIFT evidence stays unrecorded; alumni have no next step
after day 7.

#### 0B. Existing code leverage

| Sub-problem | Existing code | Plan |
|---|---|---|
| Season / milestone structure | `hackathon_programs`, `hackathon_program_phases`, `app/(hackathon)/phase/[phaseId].tsx`, `lib/hackathonProgram.ts` | Reuse model and screens; seasons = programs, milestones = phases |
| Teams up to 3 | `hackathon_teams`, `hackathon_team_members`, `app/(hackathon)/` teammate submissions | Reuse after re-keying to auth users |
| Scoring / rank | `hackathon_team_score_events`, `lib/hackathonRanking.ts` | Do not reuse write path (F2); new server-derived score |
| Evidence composer drafts/offline | `lib/shiftCompanionDrafts.ts`, `lib/shiftCompanionRecovery.ts` (38 tests) | Reuse |
| Push nudges | `lib/hackathonPushTokens.ts`, `hackathon_participant_push_tokens` | Reuse pattern on auth users |
| Staff admin | `lib/hackathonAdmin.ts`, `app/admin/` | Extend |
| Portfolio / profile | `lib/portfolioFit.ts`, `app/portfolio/`, `public_profiles` | Extend; server-derive public fields |

#### 0C. Dream state

```
CURRENT                         THIS PLAN                            12-MONTH IDEAL
App 1.3.3 = legacy career  -->  Seasons + evidence log + cert   -->  Always-on seasons for HS + uni,
discovery; SHIFT on Discord     on hackathon infra; SHIFT uses       partner-backed briefs and certs
only; evidence unrecorded       the same evidence log                that admissions recognize;
                                                                     portfolio export to TCASfolio;
                                                                     SDT outcomes measured per season
```

#### 0D. Approach

A) Current plan with amendments (chosen, P1). B) Concierge Season 0 (Discord + form)
before any app build: queued as User Challenge candidate PC5. C) Web-first season app:
rejected as the primary surface (students live on phones; store app already exists) but
the public project page and certificate verification go web (A5).

#### 0G. Selective expansion candidates (auto-decided)

| # | Proposal | Effort | Decision | Principle / reasoning |
|---|---|---|---|---|
| E1 | Public web project page + certificate verification URL in `passionseed/web` | M | ACCEPTED (TASTE) | P1: admissions readers open links on web; borderline because it is a second repo |
| E2 | TCASfolio-ready one-page export of project evidence | M | DEFERRED | P3: outside blast radius; needs TCASfolio format research |
| E3 | Partner co-signed season briefs/certificates (university, company, NGO) | L (business) | DEFERRED | Not code; but tied to PC1 |
| E4 | Real-organization briefs (orgs post a real problem) | M | DEFERRED | P3 |
| E5 | Peer tester exchange counted as evidence | S | SKIPPED | Peers are not target users; inflates evidence |
| E6 | Staff tools: create season, spot-check evidence, revoke certificate | M | ACCEPTED | P2: operations cannot run without it; extends `lib/hackathonAdmin.ts` |
| E7 | Push nudges on no-mentor days and milestone deadlines | S | ACCEPTED | P2: existing push infra, <1 day |

#### Plan amendments accepted in CEO phase

- A1: Scores, milestone completion and certificate eligibility are derived server-side
  (RPC / trigger), never from client-written points (F2).
- A2: Seasons key on Supabase Auth users of the main app; no `hackathon_participants`
  token identity (F1).
- A3 (E6): staff tooling for season creation, evidence spot-checks and certificate revocation.
- A4 (E7): push nudges using existing push token infra.
- A5 (E1): public-by-choice web project page and certificate verification URL.
- A6: scope fallback: if Nov 7 slips, beta ships evidence log + milestones + certificate;
  leaderboard and project-page polish follow.

<!-- autoplan-baseline-edits:ceo {"sourceSha256":"21f0a83d62ed5167bd669b454c3997338ebb4ef68dddfa9b7b22bbe238c1fcb6","replacements":[{"oldText":"1. Reuse `app/(hackathon)/` phases, submissions and teammate infrastructure for seasons,\n   milestones and teams. Do not create a parallel system.","newText":"1. Reuse `app/(hackathon)/` UI components and screen patterns (phase list, submission\n   cards, theme) for seasons and milestones. Season data lives in new tables (see A2)."},{"oldText":"5. Version bump to 1.4.0, native build (photo picker), store release.","newText":"5. Version bump to 1.4.0, native build (photo picker), TestFlight + Play internal for\n   beta; store release before the December public season."},{"oldText":"| Oct 20–Nov 7 | Build on hackathon code. Migrate staging, then production. |","newText":"| Oct 20–Nov 7 | Build season tables, RPCs and screens (reusing hackathon UI patterns). Migrate staging, then production. |"},{"oldText":"5. **Leaderboard** ranks by evidence (counts weighted toward changes-made), not polish.\n   Mentor/staff spot checks flag fake evidence.","newText":"5. **Leaderboard** (stretch, not beta; see A6/A25) ranks by evidence, not polish.\n   Mentor/staff spot checks flag fake evidence."},{"oldText":"1. What does the certificate certify and who co-signs it (Passion Seed alone vs a\n   university or partner)?\n2. Solo, teams of 3, or both?\n3. Free or paid entry?\n4. Fate of the uncommitted SHIFT companion work: merge parts, shelve, or delete.","newText":"1. Partner co-signing of certificates after beta (TODO E3). Beta: Passion Seed only (A15).\n2. Teams after beta (beta is solo, A12).\n3. Pricing after beta (beta is free, A15).\n4. Owner for the passionseed/web verification page (A27)."}]} -->

<!-- autoplan-accepted:ceo -->
- A1: Season score, milestone completion and certificate eligibility are computed server-side only; clients cannot write points or completion. Verify: RLS/RPC negative test where a client insert of points or completion is rejected.
- A2: Seasons get new tables keyed on Supabase Auth user IDs (seasons, season_entries, evidence, milestone_progress, certificates, sdt_checkins). The hackathon_* tables and the hackathon_participants identity are not re-keyed or modified; only hackathon UI components and patterns are reused. Replaces Build item 1's "reuse submissions and teammate infrastructure". Verify: schema review shows no FK to hackathon_participants and no migration touching hackathon_* tables; test that a hackathon_participants-only identity cannot own a season entry.
- A3: Staff and mentors (role season_staff or season_mentor) can spot-check and reject evidence and revoke a certificate; only season_staff can create a season. Revocation shows on the verification URL. Verify: admin flow test, verification page shows revoked state, non-staff call rejected.
- A4: Push nudges: (a) evening of any season day where the entrant logged no evidence, (b) 24h before the season closes. Requires a new main-app push token table on auth users (the only existing store is hackathon_participant_push_tokens) and a settings toggle to opt out. Scheduler: Supabase pg_cron calling an edge function. Verify: job test where an opted-out user and a user with evidence that day receive nothing.
- A5: One public web page per certificate in passionseed/web at a verification URL: holder display name, season, milestones met, status (valid/revoked) and, only if the entrant opts in, the project summary. Default private: without opt-in the page shows verification only. The certificate image is server-rendered on the web side and reused by the app share sheet (settles Build item 4). Verify: non-opted-in page shows no project content; revoked shows revoked; unknown ID returns not found.
- A6: Beta cut is fixed now, not on slip: evidence log, milestones, certificate + verification page, staff reject/revoke, push nudges, SDT check-ins. Stretch (ships only if ready by Nov 7, else next release): leaderboard, in-app project page polish beyond the design-reviewed screen. Verify: release checklist lists beta cut and stretch.
- A7: Certificate eligibility = all 6 milestones complete before season close. A milestone completes when accepted evidence exists: First contact (1 contact), Interviews + problem statement (3 interviews + problem statement text), MVP (link or photo), Testers (3 testers), What I changed (1 change linked to an interview or tester item), Demo post (public link). Evidence after season close is stored but does not count. Verify: server tests for each milestone threshold and the close time.
- A8: Evidence types and required fields: contact {who role, channel, date}; interview {who role, date, key quote or note}; tester {who role, what they tried, what happened}; change {what changed, source evidence id}; optional photo or link on any. No third-party names, phone numbers or faces required. Verify: RPC rejects missing required fields.
- A9: Rejection cascade: rejected evidence leaves the score and milestone counts; a milestone re-locks if it falls below threshold; before issue, eligibility recomputes; after issue, a certificate changes only by explicit staff revoke. Verify: rejecting the only tester items below 3 re-locks Testers.
- A10: Minors and PDPA: entrants confirm consent from anyone shown in a photo or quote before upload; evidence photos live in a private bucket readable by owner and staff only; public pages never show evidence photos or third-party details; display name is an entrant-chosen handle. Verify: storage policy negative test for another user reading a photo.
- A11: Instrumentation events: season_joined, evidence_logged (type), milestone_completed, certificate_issued, certificate_shared (share sheet completed), sdt_checkin_submitted. Success metrics are computed from these. Verify: events recorded for a test entrant.
- A12: Track (high school or university) is self-declared at join and editable by staff; joining allowed until day 7 of a season; beta entries are solo (teams deferred, taste decision). Verify: join after day 7 rejected.
- A13: Each season stores its Discord channel URL and season home links to it. Legacy tabs (Radar, PathLab, planning) move out of primary tab navigation into Profile; their routes stay reachable. Verify: deep links to legacy routes still open.
- A14: A SHIFT cohort is a season with mentor_led=true, using the same evidence log with no extra build. Verify: a mentor-led season can be created.
- A15: Beta certificates are Passion Seed-only (partner co-signing is TODO E3). Beta entry is free. Companion draft and recovery libraries are reused; companion screens and backend SQL are shelved, not shipped.
- A16: Composer text drafts persist offline; a pending photo must be re-picked after the app is killed, and the composer says so. Verify: kill-app test restores text and shows a photo re-pick prompt.
- A17: Evidence types add problem_statement {text}, mvp {link or photo}, demo_post {public url}. A7 milestones map to these types. Verify: RPC rejects a demo_post without a URL.
- A18: Evidence counts on submit. Staff/mentors may reject until the certificate issues. Certificates issue 48 hours after season close (review window), not at the sixth milestone. Verify: certificate absent before close+48h, present after for an eligible entrant.
- A19: Season clock is Asia/Bangkok. Day 1 is the local date of starts_at; days are local calendar days; a season closes 23:59 ICT on day 14; the no-evidence nudge sends at 19:00 ICT. Verify: boundary tests at 23:59 and 00:00 ICT.
- A20: SDT check-ins on day 1, day 7 and at close, optional and not required for the certificate. Questions: "How much does this project feel like yours?" (1-5); day 1 "Why did you join?" and close "Why did you keep working?" (had to / portfolio / wanted to / care about the people it helps); "How confident are you to start a new project on your own?" (1-5); close "What can you do now that you couldn't on day 1?" (open). Verify: check-in stored once per entrant per checkpoint.
- A21: Entrants under 20 confirm parent/guardian consent at join. Settings offers account and evidence deletion: evidence and photos are deleted and any certificate is revoked. Evidence is retained 12 months after season close, then deleted, except opt-in public project summaries. Verify: deletion test removes evidence rows and storage objects.
- A22: Beta staff surface is the existing `app/admin` route calling SECURITY DEFINER RPCs (create_season, reject_evidence, revoke_certificate); Supabase Studio is the fallback. Verify: RPCs reject callers without a season role.
- A23: Roles live in a new season_roles(season_id nullable, user_id, role staff or mentor) table; the shared user_roles table and its CHECK constraint are untouched. Mentors act only on seasons they are assigned to; staff with season_id null act on all. Supersedes A3's role names. Verify: a mentor cannot reject evidence in an unassigned season.
- A24: Evidence is immutable after submit; the entrant may withdraw it before certificate issue, which cascades like a rejection (A9). Verify: update RPC does not exist; withdraw re-locks milestones.
- A25: No score in beta. A1 applies to milestone completion and eligibility; the leaderboard score formula is defined when the stretch leaderboard is built. Supersedes the score part of A1. Verify: no score column or RPC in the beta migration.
- A26: The cross-season portfolio is out of beta (TODO). Design screen 3 is the in-app preview of the A5 opt-in project summary. Verify: design review covers screen 3 as that preview.
- A27: The web verification page and push nudges are server/web-only and can ship after the app binary without a store update. The web page needs a named owner before Oct 20 (unresolved, user decision). Verify: release checklist shows owner and independent deploy.
- A28: certificate_shared counts share-sheet opens; the success metric "share the certificate" uses verification-URL visits with ?ref=share, since Android share sheets do not confirm completion. Verify: visit with ref=share is attributed to the certificate.
- A29: Join collects birth year (stored on season_entries); the A21 guardian-consent step shows only for entrants under 20. Verify: birth year 2008 sees consent step in 2026, 2000 does not.
- A30: Certificates store a snapshot at issue: holder display name, season, track, milestones met, issued_at. The verification page reads the snapshot, so evidence purge (A21) never changes a valid certificate. Verify: deleting evidence after issue leaves the page unchanged.
- A31: pg_cron jobs: issue_certificates (hourly, issues for seasons past close+48h), purge_evidence (daily, A21 retention), send_nudges (A4). Each is idempotent. Verify: running each job twice produces no duplicates.
- A32: A change item stays valid only while its source evidence is accepted; rejecting or withdrawing the source cascades to the change (A9). Verify: rejecting the source interview re-locks What I changed when it was the only change.
- A33: Seasons have join_mode open or invite; mentor-led (SHIFT) seasons are invite-only via an allowlist managed by staff. Verify: a non-allowlisted user cannot join an invite season.
- A34: A user may hold several active entries; season home shows the entry with the nearest close date and a switcher. Verify: user in two seasons can switch.
- A35: Opt-in project summary = title, one-paragraph description, demo link, chosen public evidence counts (no evidence text). It is entrant-edited in the app and goes public only after a staff/mentor approve via an approve_summary RPC; staff can take it down. Verify: unapproved summary is not shown on the web page.
- A36: Season tools are a new route app/season-admin gated on season_roles (not the user_roles-gated app/admin). Supersedes the A22 route. Verify: a mentor without user_roles admin can open season tools for an assigned season.
- A37: An issued certificate changes by staff revoke or holder deletion (amends A9). Deletion in A21 removes season data only (entries, evidence, photos, check-ins, project summary) and revokes certificates; it never deletes the shared auth account. Verify: deletion leaves the auth user and web data intact.
- A38: Certificates show the entrant handle by default; the entrant may opt in to show their legal name for admissions verification. Verify: opt-in name appears on page and image; default shows handle.
- A39: Analytics sink: events go to a season_events table (server-written by the RPCs where possible); the web verification page logs visits with ref to the same table via a server route. Verify: events and visits queryable by season.
- A40: SDT check-in 1 fires at join; the day-7 check-in is skipped if the entrant joined on day 6 or later; close check-in always. Close time is before 00:00 ICT on day 15 (clarifies A19). Verify: day-7 joiner gets join and close check-ins only.
- A41: Beta primary tabs: Season (home), Evidence (log), Profile. Legacy Radar/PathLab/planning move under Profile. Companion screens in app/shift/* and app/welcome.tsx are not shipped: they are removed from the beta branch (kept in git history on a separate branch). Verify: tab bar shows exactly three tabs; app/shift companion routes absent from beta build.
- A42: Before reuse, the companion draft/recovery libraries are committed and refactored into a generic draft store keyed by draft id (removing daily-update type coupling). Budget 1 day. Verify: existing 38 companion tests pass against the generic store, plus evidence draft tests.
- A43: Push nudges may start after the Nov 10 beta begins (server-only deploy, A27); the app binary ships with token registration and the opt-out toggle. Verify: beta checklist marks nudges as server-deployable after launch.
- A44: The beta includes at least 5 high school students with no prior SHIFT, recruited cold, alongside alumni; results are reported separately for the two groups. Verify: beta roster shows group split.
- A45: Added metrics: staff review minutes per entrant, evidence rejection rate, entrants who join the next season, new entrants arriving via ?ref=share. Pre-registered December go/no-go: go only if at least 50% of non-alumni complete 4 or more milestones without staff help and staff time is at most 15 minutes per entrant. Verify: beta report computes each.
- A46: Build go/no-go on Nov 3: if the beta cut is not in TestFlight by then, the Nov 10 beta runs concierge-style (Discord + web form + manually issued certificates) and the app ships for the following season. Verify: Nov 3 checkpoint recorded.
- A47: The plan opens with a problem and bet statement: problem = students who finish SHIFT have no next step and Passion Seed cannot run mentored camps at scale; bet = an evidence-gated self-serve season gets non-alumni students to talk to real users. Verify: statement present at top of plan.
- A48: Before Nov 7, staff interview at least 5 school counselors or admissions readers with a sample certificate and project summary, and record whether it would count in a portfolio. Verify: interview notes saved (no student personal data).
- A49: Certificate public IDs are unguessable; project summary text is escaped on the web; the certificate snapshot format is versioned; indexes on evidence(entry_id,type,status), season_entries(season_id,user_id) unique, certificates(public_id) unique, season_events(season_id,created_at). Verify: schema review.
- A50: issue_certificates re-checks eligibility in the same transaction and locks season_entries; reject/withdraw takes the same lock. Verify: race test with reject committing before and after the issue job.
- A51: Seasons replace the interactive SHIFT camp schema for future cohorts; the existing interactive camp tables stay read-only for past cohorts and are not extended. Verify: no new writes to interactive camp tables from the beta build.
- A52: Rate limit evidence submission per entrant (e.g. 10 items per hour) in the RPC. Verify: 11th item in an hour rejected with a friendly error.
- A53: Staff dashboard counts (entrants, evidence per day, pending review, rejection rate, certificates issued) in season tools; alerts when a cron job fails or processes zero rows on a due day; Sentry captures RPC errors. Verify: forced job failure raises an alert.
- A54: The Season tab sits behind a remote flag so it can be hidden without a store update. Verify: flag off hides the tab and keeps legacy routes.
- A55: Rejected evidence shows the reason and how to fix it; every season screen has a "stuck? ask in Discord" link to the season channel. Verify: rejection state in design review.
<!-- /autoplan-accepted:ceo -->

#### 0H. Spec review loop and document approval

3 reviewer launches (cap). Scores 4/10 -> 5/10 -> 6/10, all FAIL. 57 issues found; 39
confirmed resolved by later rounds; round 3's 18 issues resolved by A29-A43, not re-reviewed.
CEO summary: `~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-10-12-always-on-challenge.md`.
Document approval: auto-decided A (approve and continue to 0I), autoplan P6.

#### 0I. Temporal interrogation (human team / CC+gstack)

```
HOUR 1 (foundations): season clock (A19/A40), table set (A2), roles (A23), evidence
  types (A8/A17). Implementer needs: shared Supabase lives in the pseed checkout
  (supabase/migrations symlinks out of this repo); migrations land there.
HOUR 2-3 (core logic): eligibility + cascade RPCs (A7/A9/A24/A32) are the riskiest
  logic; write as SQL with pgTAP-style tests first.
HOUR 4-5 (integration): pg_cron + edge functions (A31), web verification page in
  passionseed/web (A5/A30/A39), push token registration (A4/A43). Surprise: two repos
  plus the shared DB; nobody owns web yet (A27).
HOUR 6+ (polish/tests): design-reviewed 4 screens, Thai copy, a11y, kill-app draft
  test (A16/A42), storage policy negatives (A10).
```

Estimate: human team ~4-5 weeks for the beta cut; CC+gstack ~1.5-2 weeks of focused
sessions plus human review/QA. Oct 20-Nov 7 is feasible only with A6's beta cut and
A43's post-launch nudges. Feasibility blocker: A27 web owner.

#### Step 0.5: CEO dual voices

Input: `ceo 8035196940c183e722ae01057f7ffa8ea4396a95e508c9136a501b81a07754e0` (both voices).

**Claude CEO subagent (in-host, completed).** Verdict: right direction, wrong order.
Critical: no problem statement (F1); timeline not credible, web owner missing (F5).
High: concierge-first beta and school-hosted seasons as reframes (F2); unvalidated
premises: unmentored students interview, certificate value, alumni representativeness,
staff review cost (F3); governance overbuilt for 25 users, cut A33/A34 (F4); alternatives
not analyzed: PWA/LINE, teams, peer review, co-signer in beta, pricing (F8); metrics
under-powered, no kill criteria (F10). Medium: December collides with exams/TCAS (F6);
pivot handled as a nav change, no plan for existing PathLab users (F7); competitors with
brand-weight certificates, fabrication cheap (F9).

**Codex CEO voice (gpt-6.1-sol, completed).** Recommendation: "Replace the December
two-track app launch commitment with a gated high-school Discord/web pilot because
admissions value and independent completion remain unproven." Findings: competition demand
is not demand for a Passion Seed completion certificate (1); mentoring may be the
mechanism that works, `mentor_led=true` does not deliver it (2); A7 measures compliance,
not competence; "measure one outcome" from `lib/shift-curriculum.ts:60` is dropped (3); SDT
peripheral, relatedness/support missing from check-ins (4); "always-on" conflicts with
14-day seasons and gaps (5); native app driven by the delayed app, not student need (6);
university track lacks its own demand thesis (7); free + manual review has no cost model (8);
metrics can pass while thesis fails (9); reframe: help students reach real people (10).

```
CEO DUAL VOICES — CONSENSUS TABLE:
  Dimension                            Claude  Codex  Consensus
  1. Premises valid?                    No      No     CONFIRMED (not valid yet)
  2. Right problem to solve?            Partly  Partly CONFIRMED (problem unstated; access/support may matter more)
  3. Scope calibration correct?         No      No     CONFIRMED (overbuilt/overcommitted)
  4. Alternatives sufficiently explored?No      No     CONFIRMED
  5. Competitive/market risks covered?  No      No     CONFIRMED
  6. 6-month trajectory sound?          No      No     CONFIRMED (risky)
```

**User Challenges (both models recommend changing the stated direction; not auto-decided):**
- UC1: Replace "native app beta Nov 10 + public two-track season in December" with a gated
  pilot: run the next season concierge-style (Discord + web form + manually issued
  certificate) with unfamiliar high school students, and build the app only after evidence
  gates pass.
- UC2: Do not treat the Passion Seed certificate as the growth engine until admissions
  value is tested (counselor/admissions interviews with sample certificates) or a co-signer
  is secured.

**Taste decisions from the voices:** university track deferred past December (Codex 7,
Claude F6); cut A33/A34 from beta (Claude F4); allow "decided not to build, with evidence"
to satisfy What I changed (Codex 3); add support/relatedness item to check-ins (Codex 4).

**Dismissed:** LINE instead of Discord (Claude F3e): company decision 2026-10-05 makes
Discord the only channel; not reopened.

**Mechanical additions accepted from the voices (A44-A48 below):** non-alumni in beta;
cost and quality metrics with pre-registered go/no-go; Nov 3 build go/no-go with concierge
fallback; problem/bet statement; counselor interviews before Nov 7.

#### Review sections (strategy-plus-capability depth)

**Current scope.** Mode SELECTIVE EXPANSION (autoplan override). Accepted: A1-A48 (see
accepted block), E1, E6, E7. Deferred: E2, E3, E4. Skipped: E5. Pending at gate: UC1, UC2,
taste choices T1-T6.

**Section 1: Architecture.**

```
  passionseed/ps_app (Expo 1.4.0)            shared Supabase (pseed checkout)        passionseed/web
  ┌──────────────────────────────┐   RPC    ┌──────────────────────────────────┐   ┌───────────────────────┐
  │ Season tab ─ Evidence tab ─  │ ───────▶ │ seasons, season_entries,         │◀──│ /c/[id] verification  │
  │ Profile (legacy under here)  │          │ evidence, milestone_progress,    │   │ server-rendered cert  │
  │ app/season-admin (roles)     │          │ certificates(snapshot),          │   │ image (OG route)      │
  │ generic draft store (A42)    │          │ sdt_checkins, season_roles,      │   │ logs visits → events  │
  │ push token registration      │          │ season_events, user_push_tokens  │   └───────────────────────┘
  └──────────────────────────────┘          │ private bucket: evidence-photos  │
        ▲  push                             │ pg_cron: issue_certificates,     │
        └────────── Expo push ◀──── edge fn │ purge_evidence, send_nudges      │
                                            └──────────────────────────────────┘
  untouched: hackathon_* tables, hackathon_participants, user_roles (A2, A23)
```

Data flow (evidence submit): happy: composer -> submit_evidence RPC validates type
fields (A8/A17) -> insert -> recompute milestone_progress -> event. Nil: missing field ->
RPC error -> composer keeps draft, shows field error. Empty: zero evidence -> milestone
locked, season home shows first action. Error: network/timeout -> draft retained
(A16/A42), retry with idempotency key (from companion receipt logic).
State machines: evidence submitted -> rejected | withdrawn (terminal; no edit, A24).
Certificate pending (close..+48h) -> issued -> revoked (terminal). Impossible: issued
without snapshot (A30), revoked -> issued (no RPC).
Coupling: new dependency on passionseed/web for growth loop; justified by admissions
readers on web (E1) but unowned (A27). Scaling: 10x (250 entrants) fine for DB; first
break is human review (48h window x evidence volume), confirmed by both voices.
SPOF: pg_cron issue job (A31 idempotent, rerunnable). Rollback: app binary can't roll
back fast; server pieces (web page, nudges, cron) roll back by disable.
Findings: WARNING human review capacity (added A45 metric); OK otherwise.

**Section 2: Error & Rescue Map (capability level).**

```
  CAPABILITY               | WHAT CAN GO WRONG                    | USER SEES                       | OWNER MUST VERIFY
  -------------------------|--------------------------------------|---------------------------------|------------------
  submit_evidence          | missing field / wrong type           | inline field error, draft kept  | RPC validation tests
                           | timeout / lost response              | "Saving…" then retry, no dup     | idempotency key test
                           | session expired                      | sign-in, draft restored         | companion resume path
  photo upload             | too large / HEIC / network           | photo error, text still sendable| size/type tests (A16)
  milestone recompute      | cascade bug after reject/withdraw    | wrong lock state                | SQL cascade tests (A9/A32)
  issue_certificates cron  | job fails / runs twice               | cert late / duplicate           | idempotency (A31), alert
  web verification page    | DB down / unknown id / revoked       | error page / not found / revoked| page tests (A5)
  certificate image render | render error                         | share button disabled + message | render fallback test
  send_nudges              | Expo push error / invalid token      | nothing (silent by design)      | token cleanup + log
  deletion (A21/A37)       | partial delete (storage vs rows)     | data left behind (PDPA risk)    | transactional + storage sweep
  staff RPCs               | wrong role / wrong season            | "not allowed"                   | negative tests (A23)
```
GAP: send_nudges and issue_certificates failures are silent to users by design; they
need staff-visible alerts (added to Section 8).

**Section 3: Security & threat model.**
| Threat | Likelihood | Impact | Mitigated? |
|---|---|---|---|
| Client forges milestones/certificate | Med | High | Yes: A1/A25 server-only |
| Fabricated evidence (AI quotes, fake testers) | High | High | Partly: spot checks; WARNING (both voices). Added A45 rejection-rate metric; quality sampling is taste T4 |
| Another user reads evidence photos | Low | High | Yes: A10 private bucket + negative test |
| Minor's personal data public | Med | High | Yes: A10/A35 staff approval, handle default (A38) |
| Mentor abuses rights outside season | Low | Med | Yes: A23 season-scoped |
| Verification page enumeration | Med | Low | Use unguessable certificate IDs (UUID/slug) — mechanical, A49 |
| XSS via project summary on web | Med | Med | Escape on render; staff approval (A35) — A49 |
| Account deletion cascade into web data | Low | High | Yes: A37 season-data only |

**Section 4: Data flow & interaction edge cases.**
| Interaction | Edge case | Handled? | How |
|---|---|---|---|
| Submit evidence | double tap | Yes | idempotency key per draft |
| Submit evidence | app killed mid-send | Yes | draft store + receipt reconcile (A42) |
| Submit at 23:59:59 ICT day 14 | close boundary | Yes | A40 close before 00:00 day 15; server time |
| Join season | after day 7 | Yes | rejected (A12) |
| Reject evidence | change linked to it | Yes | A32 cascade |
| Two seasons | which home | Taste | A34 switcher vs one entry (T2) |
| Share certificate | Android no completion signal | Yes | A28 |
| Deletion | photo deleted, row remains | GAP -> A21 verify covers both; transactional sweep in A31 purge |
Async ordering: reject_evidence and issue_certificates can overlap at close+48h.
Invariant: an entrant whose eligibility drops before issue gets no certificate.
Mechanism required: issue job re-checks eligibility inside the same transaction with a
row lock on season_entries; reject takes the same lock. Regression proof: test with
reject committing before vs after issue. Added as A50.

**Section 5: Code quality.** Risk of a third parallel program system (hackathon, SHIFT
camp `types/shift.ts`, seasons). A2 accepts new tables deliberately; the merged
interactive SHIFT camp (`supabase/migrations/20260930180202_interactive_shift_camp.sql`,
`types/shift.ts`) already models cohorts, check-ins and mentor checkpoints (Codex). WARNING:
the season schema must say whether it replaces the interactive SHIFT camp tables or not.
A14 says SHIFT cohort = season, so the interactive camp schema becomes legacy. Added A51.

**Section 6: Tests.**
```
  NEW THING                     TYPE          HAPPY                FAILURE                     EDGE
  submit_evidence RPC           SQL/integ     valid item stored    missing field rejected      dup idempotency key
  milestone recompute           SQL           thresholds met       reject re-locks             change w/ withdrawn source
  issue_certificates job        SQL/integ     eligible issued      ineligible skipped          run twice; reject race (A50)
  roles/RLS                     SQL           staff acts           mentor wrong season denied  null season staff
  storage policy                integ         owner reads photo    other user denied           staff reads
  deletion                      integ         season data gone     storage sweep               auth user kept
  web verify page               web e2e       valid shows          revoked/unknown             opt-out shows no project
  composer drafts               unit (vitest) restore text         photo re-pick prompt        account switch isolation
  nudges                        integ         no-evidence user     opted-out none              token invalid cleanup
  nav                           e2e manual    3 tabs               legacy deep links work      —
```
2am-Friday test: reject/issue race (A50). Hostile QA: submit 30 fake testers in a minute
(rate limit per entrant per hour; added A52). Chaos: cron down 24h then catches up.

**Section 7: Performance.** Small data. Indexes: evidence(entry_id, type, status),
season_entries(season_id, user_id) unique, certificates(public_id) unique,
season_events(season_id, created_at). Milestone recompute per submit is O(items per
entry) (~20). Certificate image: cache rendered image by certificate id + status.
No issues beyond indexes (folded into A49).

**Section 8: Observability.** Need: staff dashboard counts (entrants, evidence/day,
pending reviews, rejection rate, certificates issued), alert when issue_certificates or
send_nudges fails or processes 0 rows on a due day, Sentry (`docs/sentry-monitoring.md`
exists) on RPC errors in app. Debuggability: season_events gives a per-entrant timeline.
Added A53.

**Section 9: Deployment & rollout.** Order: migrations (additive only, no hackathon_*
changes) -> RPCs -> web page -> app binary 1.4.0 via TestFlight/Play internal -> cron
jobs enabled -> nudges (A43). Rollback: disable cron, hide Season tab via remote flag
(`app/_layout.tsx` already branches modes); migrations are additive so no down-migration
needed. Prior learning applied: mobile-rls-lock-breaks-binaries: no RLS tightening on
existing tables. Feature flag for Season tab: added A54. Post-deploy checks: create
test season, submit each evidence type, force-issue certificate on staging, open page.

**Section 10: Long-term trajectory.** Reversibility 4/5 (additive schema, server-side
pieces). Debt: three program systems coexist (A51 names the plan); legacy tabs kept
reachable carry regression cost (Codex 6). Path dependency: certificate snapshot format
becomes a public contract (version it, A49). Phase 2: teams, leaderboard, co-signed
certificates, TCASfolio export.

**Section 11: Design & UX (UI scope).** Info hierarchy season home: next action first,
milestone progress second, countdown third. State coverage:
```
  FEATURE        | LOADING   | EMPTY                    | ERROR                 | SUCCESS            | PARTIAL
  Season home    | skeleton  | no season: next opens on | offline banner, cached| next action        | joined late banner
  Evidence log   | —         | first-evidence coaching  | field error, kept     | counter climbs     | photo pending
  Cert/preview   | rendering | not eligible: what's left| render failed retry   | share + verify url | revoked state
```
Missing in plan: rejection and "stuck" moments (Codex 6): what an entrant sees when
evidence is rejected, and where to get help. Added A55. Recommend running the design
phase in full (next phase).

#### CEO required outputs

**NOT in scope**
- Deferred (TODOS.md): E2 TCASfolio export; E3 partner co-signed certificates; E4
  real-organization briefs; A26 cross-season portfolio; teams (A12); leaderboard and score
  (A6/A25, stretch).
- Rejected: E5 peer tester exchange as evidence (peers are not target users); LINE as a
  channel (company decision 2026-10-05).

**What already exists** — see 0B table. Reused: hackathon UI patterns, companion draft
and recovery logic (after A42), `app/admin` patterns, `expo-image-picker`,
`expo-notifications`, `react-native-share`, Sentry. Not reused: hackathon identity and
score events (F1/F2), interactive SHIFT camp schema (A51), `user_roles` (A23).

**Dream state delta.** After this plan: one evidence-gated season loop for high school
students with Passion Seed-only certificates and a verification page. Still missing vs
12-month ideal: recognized credentials (E3), university track with its own thesis
(T1), teams, portfolio across seasons, TCASfolio export, a measured SDT effect.

**Failure Modes Registry**
```
  CODEPATH              | FAILURE MODE                 | RESCUED? | TEST?    | USER SEES?           | LOGGED?
  submit_evidence       | lost response                | Y        | planned  | retry, no dup        | Y
  milestone recompute   | cascade wrong                | N/A      | planned  | wrong lock           | Y (events)
  issue_certificates    | job fails silently           | Y (A53)  | planned  | late cert            | Y alert
  issue vs reject race  | ineligible cert issued       | Y (A50)  | planned  | wrong cert           | Y
  send_nudges           | push fails                   | Y        | planned  | nothing (by design)  | Y
  deletion              | storage objects left         | Y (A31)  | planned  | nothing              | Y
  web page              | revoked shown as valid       | Y        | planned  | wrong status         | Y
  evidence authenticity | fabricated evidence passes   | PARTIAL  | metric   | n/a                  | rejection rate
```
No CRITICAL GAPS (no row with RESCUED=N, TEST=N and silent). Evidence authenticity is the
open product risk (UC2/T4), not a code gap.

**Stale diagram audit:** no existing ASCII diagrams in files this plan touches.

```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION (autoplan)              |
  | System Audit         | hackathon identity separate (F1), client-   |
  |                      | written score events (F2), 3rd program sys  |
  | Step 0               | 5 premise challenges, approach A + A1-A43   |
  | Section 1  (Arch)    | 1 issue (review capacity)                   |
  | Section 2  (Errors)  | 11 capability paths mapped, 1 GAP (alerts)  |
  | Section 3  (Security)| 8 threats, 2 High (fabrication, minors data)|
  | Section 4  (Data/UX) | 8 edge cases mapped, 1 race found (A50)     |
  | Section 5  (Quality) | 1 issue (third program system, A51)         |
  | Section 6  (Tests)   | Diagram produced, 2 gaps (race, rate limit) |
  | Section 7  (Perf)    | 0 issues beyond indexes                     |
  | Section 8  (Observ)  | 3 gaps found (A53)                          |
  | Section 9  (Deploy)  | 2 risks flagged (binary rollback, flag A54) |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 3           |
  | Section 11 (Design)  | 1 issue (rejection/stuck states, A55)       |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (8 items)                           |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 11 rows, 0 CRITICAL GAPS                    |
  | Failure modes        | 8 total, 0 CRITICAL GAPS                    |
  | TODOS.md updates     | 6 items proposed (auto-added)               |
  | Scope proposals      | 7 proposed, 3 accepted (EXP + SEL)          |
  | CEO plan             | written                                     |
  | Outside voice        | codex completed; Claude subagent completed  |
  | Lake Score           | N/A (no coverage-scored questions)          |
  | Diagrams produced    | 3 (architecture, error map, state coverage) |
  | Stale diagrams found | 0                                           |
  | Unresolved decisions | 3 (UC1, UC2, A27 web owner)                 |
  +====================================================================+
```

#### Implementation Tasks (CEO phase)
Synthesized from this review's findings. Checkbox as you ship.

- [ ] **T1 (P1, human: ~15min / CC: ~2min)** — plan — Write problem and bet statement at top of plan
  - Surfaced by: A47 / Claude F1
  - Files: docs/plans/2026-10-12-always-on-challenge.md
  - Verify: see the cited A-item's Verify clause
- [ ] **T2 (P1, human: ~15min / CC: n/a)** — team — Name an owner for the passionseed/web verification page
  - Surfaced by: A27 / Claude F5
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T3 (P1, human: ~1d / CC: n/a)** — research — Interview 5 counselors/admissions readers with a sample certificate
  - Surfaced by: A48 / UC2
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T4 (P1, human: ~1d / CC: n/a)** — research — Recruit at least 5 non-alumni high school students for beta
  - Surfaced by: A44
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T5 (P1, human: ~1d / CC: ~1h)** — db — Additive migrations: season tables, season_roles, season_events, user_push_tokens, private bucket, indexes
  - Surfaced by: A2 A10 A23 A39 A49
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T6 (P1, human: ~3d / CC: ~3h)** — db — RPCs: join, submit/withdraw evidence, reject, revoke, approve_summary, create_season with validation, rate limit, cascade, issue lock
  - Surfaced by: A1 A7-A9 A17 A24 A32 A50 A52
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T7 (P1, human: ~1.5d / CC: ~1h)** — db — pg_cron jobs issue_certificates, purge_evidence, send_nudges + edge function, idempotent, alerting
  - Surfaced by: A31 A43 A53
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T8 (P1, human: ~2d / CC: ~1.5h)** — web — Verification page /c/[id] + server-rendered certificate image + ref visit logging
  - Surfaced by: A5 A30 A38 A39 A49
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T9 (P1, human: ~1d / CC: ~30min)** — app — Generalize companion draft/recovery into generic draft store, commit with tests
  - Surfaced by: A42 A16
  - Files: lib/shiftCompanionDrafts.ts, lib/shiftCompanionRecovery.ts
  - Verify: see the cited A-item's Verify clause
- [ ] **T10 (P1, human: ~5d / CC: ~4h)** — app — Season home, evidence composer, certificate preview, project summary editor (design-reviewed)
  - Surfaced by: A6 A34 A35 A55
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T11 (P1, human: ~1d / CC: ~30min)** — app — Three-tab nav, legacy under Profile, Season tab remote flag, remove companion screens from beta
  - Surfaced by: A13 A41 A54
  - Files: app/(tabs)/_layout.tsx, app/_layout.tsx
  - Verify: see the cited A-item's Verify clause
- [ ] **T12 (P2, human: ~1.5d / CC: ~1h)** — app — Season tools route gated on season_roles with dashboard counts
  - Surfaced by: A36 A53
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause
- [ ] **T13 (P2, human: ~0.5d / CC: ~20min)** — app — Push token registration + opt-out toggle on auth users
  - Surfaced by: A4
  - Files: lib/notifications.ts
  - Verify: see the cited A-item's Verify clause
- [ ] **T14 (P1, human: ~15min / CC: n/a)** — release — Nov 3 go/no-go checkpoint with concierge fallback
  - Surfaced by: A46
  - Files: to be determined
  - Verify: see the cited A-item's Verify clause

### Phase 2: Design review (autoplan)

**Step 0.** Initial design completeness: 3/10. Backend rules are precise (A1-A55) but the
four screens are ~8 words each; the states the amendments create (review window,
re-lock, rejection, not eligible, summary approval, between seasons, joining closed,
revoked) have no screens. A 10 here = a state table per screen, an ordered hierarchy,
per-type composer spec, Thai/English copy for every state, a11y acceptance criteria, and
a connected prototype. DESIGN.md exists (`docs/DESIGN.md`) but is stale: it still says
"career path simulation" and lists Bai Jamjuree/Charm while CLAUDE.md names Libre Franklin
for Latin UI. Existing leverage: `components/AppText.tsx` (Thai line height),
`components/shift/CompanionUI.tsx` (560pt column, keyboard handling),
`app/shift/update.tsx` (validation, duplicate-send guard, receipt), `lib/hackathonTheme.ts`.
Focus areas: all 7 (autoplan P1).

**Step 0.5 mockups:** designer binary present, but mockup choice requires the user's
comparison-board feedback, which autoplan cannot supply mid-run. Deferred: run
`/design-shotgun` for the four screens after the final gate (Decision 39).

**CLAUDE SUBAGENT (design, independent):** completed. Critical: no "no active season"
state (S1); 48h review window silent, no issuance push (S2). High: home hierarchy unranked
(H1); sequential vs any-order milestones undecided (H2); not-eligible ending missing (S3);
rejection/re-lock/withdraw unseen (S4); composer submission states missing (S5); join flow
~6 steps before first win (J1); 10-second composer vs required fields (J2); Instagram story
has no clickable link (J4); four screens generic (P1); Thai/English server rendering (D1).
Medium: Evidence vs Season tab overlap (H3), summary states (S6), cert loading/revoked (S7),
undefined counter (J3), check-ins as homework (J5), certificate visual direction (P2),
language selection (D2), large text stepper (D3), season switch target (D4), copy tone (D5).

**CODEX SAYS (design — UX challenge):** completed. Use the bright primary theme for
Season/Evidence/Profile (DESIGN.md Dual-Thematic Rule); hackathon submission screen's
inline revision conflicts with immutable evidence. Home order: season + switcher,
rejection affecting progress, next action with requirement, one button, milestones,
deadline as Bangkok date (countdown secondary), Discord link. Define tab
responsibilities; replace emoji tab icons; flag-off should stop new enrollment, not strand
entrants; companion routes are wired into root redirects (`app/_layout.tsx:86`).
Provisional credit model; meaningful counts not a generic counter; fixes create linked
replacement drafts; withdrawal previews impact. Composer: field-level design, reuse
`app/shift/update.tsx` protections. Full state table (home, milestone, composer, deadline,
certificate, summary, verification). Public demo link conflicts with privacy; certificate
must not imply admissions endorsement; separate verification visibility from project
publication; legal-name preview. Responsive: single column, 560pt bound, 320px/200% zoom
on web, 1080x1920 story export with QR in safe area. A11y acceptance criteria;
`Text.tertiary` ~2.54:1 fails; white on neon 1.20:1; birth year cannot determine age 20.
Recommendation: revise and make the gated concierge pilot the next step.

```
DESIGN OUTSIDE VOICES — LITMUS SCORECARD (classifier: APP UI / OPERATE; web page: READ):
  Check                                    Claude    Codex     Consensus
  1. Brand unmistakable in first screen?   NOT SPEC  NOT SPEC  NOT SPEC'D
  2. One strong visual anchor?             No        No        CONFIRMED fail (next action becomes anchor)
  3. Scannable by headlines only?          No        No        CONFIRMED fail
  4. Each section has one job?             No (H1)   No        CONFIRMED fail
  5. Cards actually necessary?             Partly    Partly    CONFIRMED (Discord as footer, not card)
  6. Motion improves hierarchy?            NOT SPEC  Only on receipt  CONFIRMED (animate on confirmed receipt only)
  7. Premium without decorative shadows?   NOT SPEC  Yes if bright theme  DISAGREE on theme -> taste
  Hard rejections triggered:               none in plan text; existing tab bar uses emoji icons (slop #7) — both flag
```

#### Pass 1: Information architecture — 3/10 -> 8/10
Both voices: home hierarchy unranked, tab responsibilities undefined. Auto-fixed (P5
structural): DS1 home order, DS2 tab responsibilities, DS3 any-order milestones. Remaining:
brand moment on first screen not designed (mockups pending).
```
  Season tab (home)                     Evidence tab                 Profile tab
  ┌───────────────────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
  │ Season name · track  [switch] │     │ Log grouped by       │     │ Handle, language   │
  │ ! needs attention (1 item)    │     │ milestone, status    │     │ Certificates       │
  │ NEXT: "Log tester 2 of 3"     │     │ per item; drafts     │     │ Notifications      │
  │ [ primary button ]            │     │ [+ Add evidence]     │     │ Delete season data │
  │ ○●●○○○ milestones (any order) │     └──────────────────────┘     │ Legacy tools ▸     │
  │ Closes Sun 19 Nov, 23:59 ICT  │                                  └────────────────────┘
  │ Brief (collapsed after day 1) │
  │ Stuck? Ask in Discord (footer)│
  └───────────────────────────────┘
```

#### Pass 2: Interaction state coverage — 2/10 -> 8/10
Both voices list missing states. Auto-fixed (P5): DS4 state table below. Remaining: copy
for each state is not written yet (task DT3).
```
  SURFACE        | LOADING            | EMPTY / NONE                              | ERROR                         | SUCCESS                       | PARTIAL / OTHER
  Season home    | skeleton           | no season: next brief teaser, date,       | cached view + "offline" label;| next action                   | joining closed (after day 7);
                 |                    | notify-me, past certificates              | retry                         |                               | invite-only unavailable; season ended -> review/cert status
  Milestone      | —                  | "not yet: needs 3 interviews"             | —                             | met (provisional)             | credit removed: "needs 1 more" (calm color, no lock)
  Composer       | sending            | type pre-selected from next milestone     | field error, input kept;      | receipt: item + new count;    | saved offline chip; photo re-pick after kill;
                 |                    |                                           | rate limit with retry time;   | "Add another" / "Back"        | last 2h "closes in 1h 12m"; after close "saved, won't count"
                 |                    |                                           | expired sign-in -> restore    |                               | unknown outcome -> reconcile receipt
  Review window  | —                  | —                                         | issuance overdue message      | "Certificate arrives Tue 23:59"| close check-in card here
  Not eligible   | —                  | "Season closed: 4 of 6" + what you did    | —                             | join next season CTA          | private summary of work kept
  Certificate    | skeleton (ratio)   | —                                         | render failed: retry          | issued: share + verify URL    | revoked: date, no share; holder-deleted
  Project summary| —                  | not opted in: verify-only preview         | rejected with reason          | approved/public               | draft; awaiting approval; edit awaiting approval (old version stays public); taken down
  Web verify page| —                  | unknown id: not found                     | service failure (never shown  | valid                         | revoked
                 |                    |                                           | as not found/revoked)         |                               |
```

#### Pass 3: Journey and emotional arc — 3/10 -> 7/10
```
  STEP | USER DOES                    | USER FEELS             | PLAN SPECIFIES (after fixes)
  1    | Opens app, no season yet     | curious / unsure       | teaser + notify-me (DS4)
  2    | Joins (3 screens)            | committed, quick       | track, birth month+year -> consent if <20, handle (DS6)
  3    | Logs first contact           | small win              | 10s composer, success haptic on receipt (DS7)
  4    | Interviews, tests            | effort, momentum       | per-requirement counts, people-talked-to total (DS8)
  5    | Evidence rejected            | stung                  | reason + linked replacement draft + Discord (DS5)
  6    | Season closes                | anxious waiting        | review-window screen with exact issue time (DS4)
  7    | Certificate issued           | proud                  | push + celebration, share with QR (DS9)
  8    | Not eligible                 | disappointed           | "4 of 6" + next season, no shaming (DS4)
```
Remaining gap (7 not 8): the whole arc depends on UC1/UC2 (concierge vs app) and is
untested with cold students.

#### Pass 4: AI slop risk — 3/10 -> 7/10
Plan text describes generic screens ("countdown, brief, next milestone"). Existing tab bar
uses emoji icons (slop pattern 7; `app/(tabs)/_layout.tsx`). Auto-fixed: DS10 replace emoji
tab icons with consistent pictograms + selected state. Remaining: until mockups exist the
visual identity is unspecified; capped at 7.

#### Pass 5: Design system alignment — 4/10 -> 7/10
DESIGN.md Dual-Thematic Rule reserves dark for immersive experiences. Codex: bright
theme for Season/Evidence/Profile; Claude: in-app may stay immersive, certificate credential
style. TASTE (D-T6, recommend bright). Auto-fixed: DS11 certificate and web page use a
calm light "credential" style; DS12 contrast: never `Text.tertiary` for body text on white
(~2.54:1); Obsidian text on Passion Neon. DS13: update DESIGN.md (stale product line;
Libre Franklin vs Bai Jamjuree conflict with CLAUDE.md) — task.

#### Pass 6: Responsive and accessibility — 2/10 -> 8/10
Auto-fixed DS14: single column bounded at 560pt on tablets (reuse CompanionUI shell);
vertical milestone list at accessibility text sizes; 48x48 targets including dismiss,
switcher, attachment, help; 4.5:1 body / 3:1 large text and controls; 200% text scaling
without clipping Thai marks; screen-reader labels, selected/busy states, announcements
on submit, focus to first error; reduced motion; haptics always paired with visible change.
Web verify page: reflow at 320 CSS px and 200% zoom, keyboard focus visible. Story export
1080x1920 with text and QR inside safe area; copy-link fallback; works without Instagram.

#### Pass 7: Unresolved design decisions
```
  DECISION NEEDED                               | IF DEFERRED, WHAT HAPPENS                    | DISPOSITION
  In-app theme: bright primary vs immersive dark| engineers pick per screen, inconsistent      | TASTE D-T6 (recommend bright)
  Public demo link required vs private allowed  | students who can't publish fail milestone 6  | auto: allow reviewer-only link (DS15)
  Certificate claim wording                     | implies admissions endorsement               | auto: factual record only (DS16)
  Language default                              | mixed-language screens                       | auto: Thai default, English pref (DS17)
  Mockup direction for 4 screens                | implementer invents look                     | deferred to /design-shotgun post-gate
```
4 resolved by auto-decision, 1 taste, 1 deferred.

<!-- autoplan-accepted:design -->
- DS1: Season home order: season name and track (switcher only with 2+ entries); one "needs attention" slot (rejection or check-in, max one); next action phrased with the requirement ("Log tester 2 of 3"); one primary button opening the composer with that type; six-milestone overview; closing time as a Bangkok date/time with countdown secondary; brief collapsed after day 1; "Stuck? Ask in Discord" as a persistent footer. Verify: design review of the home wireframe.
- DS2: Tabs: Season = guidance and progress; Evidence = the log grouped by milestone with per-item status and drafts, plus "Add evidence" (opening the tab never auto-opens the composer); Profile = handle, language, certificates, notifications, "Delete season data", legacy tools. When the A54 flag is off, new enrollment stops but existing entrants keep Season and Evidence; users with no entries see Profile and legacy home. Root redirects into companion routes in app/_layout.tsx are replaced. Verify: nav test with flag on/off and with/without entries.
- DS3: Milestones can be met in any order, displayed in SHIFT order; "next" = first incomplete in that order. Copy uses "not yet"/"complete"/"needs N more", never "locked". Verify: home shows next action for a student who logged testers first.
- DS4: The state table in Pass 2 is required scope for Season home, milestone, composer, review window, not eligible, certificate, project summary and web verify page. Add a push and in-app celebration on certificate issuance (amends A4). Verify: each state has a wireframe and Thai/English copy before build.
- DS5: Rejection shows the reason, the affected milestone and count, any linked change also invalidated, and a "Log a replacement" action creating a linked draft; withdrawal previews which milestones and changes it affects; a push is sent on rejection. Verify: rejection flow test.
- DS6: Join is 3 screens: track; birth month and year (age-20 rule computed from month) with guardian consent only if under 20, with a share-with-parent link; handle. The first SDT check-in appears after the first evidence item as a dismissible card; legal-name opt-in moves to certificate time with a preview. Amends A29/A40. Verify: join flow timed under 60s.
- DS7: Composer per type: type first (default next milestone's type); date defaults today; recent roles as chips; at most one required free-text field per type with optional fields collapsed; change source picker shows the last 5 interview/tester items; consent checkbox only when a photo is attached. Reuse validation, duplicate-send guard and receipt confirmation from app/shift/update.tsx. Success: draft cleared, item and new count shown, "Add another" / "Back to Season". Targets: 10s for contact and tester, 30s for interview. Verify: timed usability with 3 students.
- DS8: Progress shows per-requirement counts ("Interviews 2/3", "Milestones 4/6") and a secondary "people you've talked to" total; numbers animate and success haptics fire only after a confirmed receipt; decrements on rejection do not animate. Copy states that evidence can be reviewed. Verify: design review.
- DS9: Certificate share: 1080x1920 story image with short verify URL and QR inside safe margins, plus a 1:1 portfolio version; after sharing, a tip to add the Instagram link sticker with the URL copied; copy-link fallback; works without Instagram installed. Verify: share test on iOS and Android.
- DS10: Tab bar uses consistent pictogram icons with visible localized labels and accessibility tab role and selected state; no emoji in navigation. Verify: VoiceOver reads "Season, tab, selected".
- DS11: Certificate image and web verification page use a calm light credential style (light background, clear issuer, date, status, verify URL); fonts embedded server-side for Thai and Latin with Thai line breaking; max lengths and truncation rules for handle and title; tested with Thai, English and mixed strings. Verify: render tests with long Thai strings.
- DS12: Contrast: body text never uses Text.tertiary on white; text on Passion Neon is Obsidian; 4.5:1 body, 3:1 large text and controls. Verify: contrast audit of the four screens.
- DS13: Update docs/DESIGN.md to the current product (seasons, not career simulation) and reconcile Latin font (Libre Franklin per CLAUDE.md) with Bai Jamjuree for Thai. Verify: DESIGN.md diff reviewed.
- DS14: Responsive and a11y acceptance criteria as written in Pass 6 apply to all season screens and the web page. Verify: a11y checklist pass at 200% text and with VoiceOver/TalkBack.
- DS15: The demo_post milestone accepts either a public URL or a reviewer-only link (visible to staff/mentors only); public pages never require a public demo. Amends A7/A17. Verify: milestone 6 completes with a reviewer-only link.
- DS16: Certificate wording is a factual record of completed activities; it does not imply admissions endorsement or verified impact; the verify page explains that current validity is checked there. Verify: copy review.
- DS17: Thai is the default interface language with a persistent English preference; one language at a time; student-written content is never translated. The certificate is bilingual. Verify: language switch keeps entered drafts.
<!-- /autoplan-accepted:design -->

**Design NOT in scope:** cross-season portfolio page (A26); leaderboard visuals (stretch);
in-app celebration beyond issuance; staff review workflow UI beyond A36/A53 counts
(flagged by Codex for the 15-minute target; deferred to eng phase to size).

**What already exists:** `docs/DESIGN.md` tokens; `components/AppText.tsx`;
`components/shift/CompanionUI.tsx`; `app/shift/update.tsx` composer protections;
`lib/hackathonTheme.ts` (reference only if taste D-T6 picks immersive).

#### Implementation Tasks (Design phase)
- [ ] **DT1 (P1, human: ~2d / CC: ~2h)** — design — Wireframe every state in the Pass 2 table for the four screens plus join, review window, not eligible
  - Surfaced by: Pass 2 (both voices); Files: to be determined; Verify: design review sign-off
- [ ] **DT2 (P1, human: ~1d / CC: ~1h)** — design — Run /design-shotgun for Season home, composer, certificate, public preview after the gate
  - Surfaced by: Step 0.5 deferred; Verify: approved mockups recorded in plan
- [ ] **DT3 (P1, human: ~1d / CC: ~30min)** — copy — Thai/English copy for every state, rejection/deletion/revocation tone reviewed
  - Surfaced by: Claude D5, Codex 8; Verify: copy review
- [ ] **DT4 (P1, human: ~0.5d / CC: ~20min)** — app — Replace emoji tab icons with pictograms, tab roles and selected state
  - Surfaced by: Pass 4; Files: app/(tabs)/_layout.tsx; Verify: VoiceOver check
- [ ] **DT5 (P2, human: ~1h / CC: ~10min)** — docs — Update DESIGN.md product line and font reconciliation
  - Surfaced by: Pass 5; Files: docs/DESIGN.md; Verify: diff review
- [ ] **DT6 (P1, human: ~1d / CC: ~1h)** — web — Certificate image renderer with embedded Thai/Latin fonts, QR, safe area, truncation
  - Surfaced by: Claude D1, J4; Codex 7; Verify: render tests with long Thai strings
- [ ] **DT7 (P1, human: ~0.5d / CC: n/a)** — research — Timed composer usability with 3 students (10s/30s targets)
  - Surfaced by: Claude J2, Codex 5; Verify: timings recorded

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | DESIGN.md exists but stale; UI scope: 4      |
  |                      | screens + join + web page                    |
  | Step 0               | 3/10 initial; all 7 dimensions              |
  | Pass 1  (Info Arch)  | 3/10 -> 8/10 after fixes                    |
  | Pass 2  (States)     | 2/10 -> 8/10 after fixes                    |
  | Pass 3  (Journey)    | 3/10 -> 7/10 after fixes                    |
  | Pass 4  (AI Slop)    | 3/10 -> 7/10 after fixes                    |
  | Pass 5  (Design Sys) | 4/10 -> 7/10 after fixes                    |
  | Pass 6  (Responsive) | 2/10 -> 8/10 after fixes                    |
  | Pass 7  (Decisions)  | 4 resolved, 1 taste, 1 deferred             |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (4 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items (all in-scope tasks)                |
  | Approved Mockups     | 0 generated (deferred to /design-shotgun)   |
  | Decisions made       | 17 added to plan (DS1-DS17)                 |
  | Decisions deferred   | 2 (theme taste D-T6, mockups)               |
  | Overall design score | 2/10 -> 7/10                                |
  +====================================================================+
```

### Phase 2.5: DX review (autoplan, DX POLISH)

DX scope came from the term-match gate (2 matches). Product type: **internal platform**
(Supabase RPCs + cron + Expo app + Next.js web page) built by a small team, plus an
operator surface (season tools) for staff and mentors.

**Developer persona (auto, P6)**
```
TARGET DEVELOPER PERSONA
Who:       New Passion Seed intern engineer joining to build or fix season features
Context:   Clones ps_app on day one; must reach a running season to test any change
Tolerance: ~30 min before asking the founder for help; no prior Supabase/pg_cron
Expects:   README that works, one seed command, tests that run locally
```
Secondary: season operator (staff/mentor) creating a season, reviewing evidence, revoking.

**Empathy narrative.** "I clone ps_app and run `pnpm install`; that works. The README
tells me this is a career simulation app, which is not what I was hired to build. I need a
database, but `supabase/migrations` is a symlink to `/Users/bunyasit/dev/pseed/...`, which
doesn't exist on my laptop, and `config.toml` points at a `seed.sql` that isn't there. I
ask in Discord. An hour later I have migrations, but no season, no staff role and no
evidence, so every screen is empty. To test the certificate I'd have to wait 16 days or
edit `starts_at` by hand. There are no database tests, so I check RLS by poking Studio.
The plan has 70+ amendments; some supersede others and I'm not sure which RPC names are
final." (Observed: README, symlink, missing seed.sql, no `supabase/tests`. Predicted:
timings and confusion.)

**Competitive DX benchmark**
| Tool | Start -> result | Time + evidence | DX choice | Source |
|---|---|---|---|---|
| Supabase local dev | clone -> `supabase start` + `seed.sql` -> data | ~5 min, reported | seed file + one command | supabase CLI docs (in-distribution) |
| Expo app | clone -> `pnpm i && pnpm start` -> screen | ~5 min, reported | one command, QR | Expo docs (in-distribution) |
| ps_app seasons today | clone -> working season with evidence | 60+ min, estimated | none (manual) | repo inspection |
TTHW target (auto, P5): **under 10 minutes** to a seeded season on a simulator via one
seed command (Needs Work boundary; Competitive would need a credential-free fixture mode,
deferred). Student TTHW: install -> first logged evidence under 2 minutes after sign-in.

**Magical moment (auto, P5 lowest-effort vehicle):** `pnpm season:seed --state=day7`
prints a test login; the app opens straight onto a Season home with real counts, and
`--state=review|issued` jumps to the certificate path without waiting days.

**Mode:** DX POLISH (autoplan override).

**Developer journey map**
```
STAGE        | DEVELOPER DOES                         | FRICTION                                   | STATUS
1 Discover   | reads README/CLAUDE.md                 | README describes old product               | fixed (X11)
2 Install    | pnpm install; get env; link migrations | absolute symlink; missing seed.sql         | fixed (X1, X2)
3 Hello world| run app against a seeded season        | no fixtures; time-dependent states         | fixed (X2, X3)
4 Real usage | write RPC + screen                      | contract scattered; payload schema in prose| fixed (X5, X6, X7)
5 Debug      | read error / alert                      | no codes; alerts unrouted; hidden fallbacks| fixed (X5, X8, X10)
6 Upgrade    | ship migration + app + web             | no compat matrix; staging lacks Auth/RLS   | fixed (X17); compat matrix to eng phase
```

**First-time developer confusion report**
```
T+0:00  pnpm install OK. README: "career path simulation". Wrong product?      -> X11
T+0:05  supabase start: migrations symlink broken (absolute path)              -> X1
T+0:30  migrations applied after asking; app shows "no season"                 -> X2
T+0:45  can't reach review/certificate states without editing dates            -> X3
T+1:00  submit returns {ok:false} with no code; can't tell auth vs validation  -> X5
T+1:30  gives up on RLS verification; tests only cover client libs             -> X4
```

**CLAUDE SUBAGENT (DX — independent review):** completed. Critical: no season dev seed
or time override; no DB test harness for ~30 SQL-level Verify clauses. High: RPC surface
scattered, no return shapes, no idempotency key; evidence payload schema defined in prose
3 times; no error catalogue (submit after close gives no feedback); operator alerts
unrouted, no runbook; no season dev docs; hard-coded season policy with no per-season
overrides. Medium: superseded amendments inline; hackathon UI coupled to hackathon types;
revoked-after-share recovery; staff runbook; concierge fallback procedure unwritten; no
staff accept/reinstate; flag mechanism unnamed; no student evidence export; companion test
count is 30 not 38; untracked screens must be committed before removal.

**CODEX SAYS (DX — developer experience challenge):** completed. ~9 setup actions to a
working season; committed absolute symlink; `config.toml` references missing `seed.sql`.
No typed error contract; `lib/shiftCompanion.ts:43` treats a missing RPC as "not enrolled",
which would hide a failed deploy; missing-config proxy in `lib/supabase.ts` lacks `rpc`
and `storage`. A42 understates the receipt model change. **A4 premise wrong: auth-user
push tokens already exist on `profiles` (`lib/notifications.ts:178`).** Script/doc drift
(`build:ios-local` vs README; deploy project names). **Staging guide omits Auth/RLS/
Storage/Edge Functions and contains a hardcoded database credential (verified;
`docs/GHOST_STAGING_SETUP.md`, commit 3354e82) — remove and rotate.** Recommendation: gate
the full build on a reproducible submit-reject-issue-verify vertical slice and a named web
owner (reinforces UC1).

```
DX DUAL VOICES — CONSENSUS TABLE:
  Dimension                           Claude  Codex  Consensus
  1. Getting started < 5 min?          No      No     CONFIRMED (fails)
  2. API/CLI naming guessable?         Partly  Partly CONFIRMED (names ok, contract missing)
  3. Error messages actionable?        No      No     CONFIRMED (fails)
  4. Docs findable & complete?         No      No     CONFIRMED (fails)
  5. Upgrade path safe?                Partly  Partly CONFIRMED (additive good, no compat matrix)
  6. Dev environment friction-free?    No      No     CONFIRMED (fails)
```

#### Passes
- Pass 1 Getting started: 2/10 -> 7/10. X1, X2, X3, X16. Residual: fixture mode deferred.
- Pass 2 API/RPC design: 4/10 -> 7/10. X5, X6, X7, X12. Residual: contract written at build start.
- Pass 3 Errors: 3/10 -> 7/10. Three traced paths: (a) submit after close: today silent "stored, doesn't count" -> X8 copy; (b) missing RPC after failed deploy: today "not enrolled" (`lib/shiftCompanion.ts:43`) -> X5 forbids fallback; (c) cron failure: today unrouted -> X10.
- Pass 4 Docs: 2/10 -> 6/10. X11, X10 runbook. Residual: amendment chain stays long until consolidated spec ships.
- Pass 5 Upgrade: 5/10 -> 7/10. X17 staging parity, X18 kill switch; compat matrix handed to eng phase.
- Pass 6 Dev environment: 2/10 -> 7/10. X1, X2, X3, X4, X14, X15.
- Pass 7 Community (internal): 4/10 -> 6/10. Discord staff channel for alerts; season-ops doc for operators.
- Pass 8 Measurement: 5/10 -> 7/10. Measure intern cold-clone TTHW once before Oct 20 and once after X1-X3; A45 product metrics already exist.

```
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                             |
+====================================================================+
| Getting Started      |  2 -> 7 /10                                  |
| API/RPC              |  4 -> 7 /10                                  |
| Error Messages       |  3 -> 7 /10                                  |
| Documentation        |  2 -> 6 /10                                  |
| Upgrade Path         |  5 -> 7 /10                                  |
| Dev Environment      |  2 -> 7 /10                                  |
| Community            |  4 -> 6 /10                                  |
| DX Measurement       |  5 -> 7 /10                                  |
+--------------------------------------------------------------------+
| TTHW                 | 60+ min (est.) -> target < 10 min            |
| Competitive Rank     | Red Flag -> Needs Work                       |
| Magical Moment       | designed via pnpm season:seed --state=...    |
| Product Type         | internal platform                            |
| Mode                 | POLISH                                       |
| Overall DX           | 2/10 -> 6/10 (lowest pass)                   |
+====================================================================+
| Zero Friction      | gap -> covered (seed)                          |
| Learn by Doing     | gap -> covered (state fixtures)                |
| Fight Uncertainty  | gap -> covered (error contract)                |
| Opinionated + Escape Hatches | gap -> covered (season policy cols)  |
| Code in Context    | gap -> partial (RPC examples in handbook)      |
| Magical Moments    | gap -> covered                                 |
+====================================================================+
```

```
DX IMPLEMENTATION CHECKLIST
[ ] Cold clone to seeded season < 10 min, measured with an intern
[ ] Migrations link without absolute paths (X1)
[ ] pnpm season:seed --state=day1|day7|review|issued|rejected (X2)
[ ] season_now() override used by every time rule (X3)
[ ] pnpm test:db runs pgTAP for RLS, cascade, race, rate limit, ICT boundary (X4)
[ ] One RPC + error contract table with codes, fields, retry_after (X5)
[ ] Evidence payload schema shared client/server, versioned (X6)
[ ] submit_evidence idempotent on client_draft_id, returns counts + receipt (X7)
[ ] TH/EN error catalogue (X8)
[ ] Alerts to staff Discord channel + season-ops runbook (X10)
[ ] README + CLAUDE.md describe seasons; command reference matches scripts (X11)
[ ] Hardcoded credential removed from docs and rotated (X13)
```

<!-- autoplan-accepted:dx -->
- X1: Replace the committed absolute `supabase/migrations` symlink with a portable setup (a `scripts/link-migrations.sh` reading `PSEED_DIR`, documented in README); `config.toml` seed path points at a file that exists. Verify: fresh clone on a second machine links migrations with one command.
- X2: `supabase/seed.sql` plus `pnpm season:seed --state=day1|day7|review|issued|rejected` create a season, entrant, assigned mentor, global staff role and evidence at each state, and print the test login. Verify: each state opens the matching Season home state from DS4.
- X3: Every time rule (A18, A19, A31, A40, A12) reads time through one `season_now()` SQL function that dev and test can override. Verify: pgTAP test moves season_now across the 23:59/00:00 ICT boundary.
- X4: A database test harness (`pnpm test:db`, pgTAP against local Supabase) exists before Oct 20; every A-item Verify that is SQL-level names its test file. Verify: CI or local run passes RLS, cascade, race and rate-limit tests.
- X5: One RPC and error contract table (name, args, return, error codes, caller role). Errors carry a stable code (validation, unauthenticated, forbidden, unavailable, retryable), field and retry_after where relevant, and a request id. Clients never treat a missing RPC as "not enrolled"; the missing-config proxy in lib/supabase.ts covers rpc and storage. Verify: contract table in the season handbook; test that a missing RPC surfaces "unavailable".
- X6: One versioned evidence payload schema per type (zod in lib/) mirrored by SQL validation. Verify: shared fixtures pass both validators.
- X7: submit_evidence takes client_draft_id for server-side idempotency and returns the evidence id, receipt id and updated milestone counts. Verify: replaying the same client_draft_id returns the same receipt with no duplicate row.
- X8: Error catalogue: code -> cause -> Thai/English student copy -> fix action -> Discord link, covering join after day 7, invite-only, submit after close ("Saved, but the season closed at 23:59; this won't count"), withdraw after issue, rate limit with retry time, missing field, invalidated change, offline. Verify: copy review and one test per code.
- X9: Season policy lives in season columns with defaults (duration_days, join_cutoff_day, review_window_hours, nudge_local_time, rate_limit_per_hour); staff RPCs extend_season, staff_accept_evidence and reinstate_certificate exist and write season_events. Verify: extend_season moves close and issue time; audit row written.
- X10: Cron alerts go to a named staff Discord channel and include last success time and due-work count; `docs/season-ops.md` covers role bootstrap, mentor assignment, allowlist, rejection, summary approval, revocation and safe job replay. Verify: forced failure posts to the channel; ops doc reviewed by a staff member.
- X11: README and CLAUDE.md describe seasons (tables, RPC table, cron jobs, seed commands, season_now, flag name); superseded amendments are consolidated into a final spec section; the command reference matches package.json scripts and deploy targets. Verify: a new intern finds setup in under 2 minutes.
- X12: Push nudges reuse the existing `profiles.expo_push_token` and `savePushToken` (lib/notifications.ts) instead of a new token table; an opt-out preference is added to profiles. Supersedes A4's "new main-app push token table". Verify: nudge job reads profiles token and respects opt-out.
- X13: Remove the hardcoded database credential from docs/GHOST_STAGING_SETUP.md and rotate it (owner: founder). Verify: grep finds no credential; old password rejected.
- X14: Before A41 removes companion screens, the untracked companion screens and libraries are committed to a separate branch; A42's test bar uses the actual companion test count (30 found, not 38). Verify: branch exists; recount recorded.
- X15: Hackathon UI pieces reused for seasons are extracted into components/season with props-only interfaces (budget 0.5 day). Verify: no components/season import from hackathon lib types.
- X16: The push permission prompt appears after the first evidence receipt, not at join. Verify: fresh install shows no permission prompt before first receipt.
- X17: Beta staging includes Auth, RLS, Storage and Edge Functions (the current staging guide omits them). Verify: staging run of submit -> reject -> issue -> verify.
- X18: The A54 flag lives in a Supabase app_config row with a cached value; if unreadable, existing entrants still see their season. A separate submissions kill switch disables new evidence while keeping logs and drafts readable. Verify: kill switch on shows read-only Evidence tab with drafts kept.
<!-- /autoplan-accepted:dx -->

**DX NOT in scope:** credential-free fixture mode (TODO); student evidence export
(TODO); public developer docs (internal product).
**What already exists:** `lib/notifications.ts` push token storage; companion draft and
receipt logic; `app/admin` patterns; `docs/sentry-monitoring.md`; Expo/EAS scripts.

#### Implementation Tasks (DX phase)
- [ ] **XT1 (P1, human: ~0.5d / CC: ~20min)** — dev env — Portable migrations link + seed.sql + season:seed states (X1, X2)
- [ ] **XT2 (P1, human: ~1d / CC: ~45min)** — db — season_now() and pgTAP harness with pnpm test:db (X3, X4)
- [ ] **XT3 (P1, human: ~0.5d / CC: ~20min)** — contract — RPC/error contract table, shared payload schema, idempotent submit (X5, X6, X7)
- [ ] **XT4 (P1, human: ~1h / CC: ~5min)** — security — Remove and rotate hardcoded DB credential in docs/GHOST_STAGING_SETUP.md (X13)
- [ ] **XT5 (P2, human: ~0.5d / CC: ~20min)** — docs — README, CLAUDE.md, season handbook, season-ops runbook (X10, X11)
- [ ] **XT6 (P2, human: ~2h / CC: ~10min)** — app — Reuse profiles push token, opt-out, permission after first receipt (X12, X16)
- [ ] **XT7 (P2, human: ~0.5d / CC: ~20min)** — db — Season policy columns + staff extend/accept/reinstate RPCs (X9)
- [ ] **XT8 (P1, human: ~1h / CC: ~5min)** — git — Commit untracked companion work to a branch; recount tests (X14)

### Phase 3: Eng review (autoplan, required gate)

**Scope challenge.** Code read: `lib/shiftCompanionDrafts.ts` (88 lines; idempotency key
rotates on every edit, line 35), `lib/shiftCompanion.ts` (missing-RPC fallback at ~line 55
returns "not enrolled"), `app/_layout.tsx` (unauthenticated users redirect to
`/shift/link`; staged change), `supabase/functions/push-notifications` (already reads
`profiles.expo_push_token` + `mobile_settings.push_enabled`), `delete-user-account`
(deletes the shared auth account), `lib/backblazeUpload.ts` (public CDN URLs).
Complexity: ~40+ planned files, 6+ new tables, ~14 RPCs, 3 cron jobs, 2 edge functions,
1 web page. Gate tripped. Auto-decision (P2, never reduce): **scope accepted as-is**,
original arrangement; the scope-cut proposals from both voices fold into User Challenge
UC1 (not auto-decided).
Search: [Layer 1] Supabase pg_cron + pg_net -> edge function for Storage API deletes;
SECURITY DEFINER with `search_path = ''`; `Intl.Segmenter('th')` for Thai word breaks.

**CLAUDE SUBAGENT (eng — independent review):** completed. Critical: scope vs ~10
working days. High: spec contradicts itself via supersessions; `milestone_progress` is a
cache needing perfect invalidation (derive instead); storage deletion can't be done from
SQL/cron; Thai certificate rendering breaks mid-word in common renderers; EXIF/GPS in
minors' photos; SECURITY DEFINER hygiene. Medium: offline submissions near close; replay
vs rate limit; per-entry issuance transactions; push chunking/receipts/UTC cron; migrations
live in pseed; companion removal risk. Low: missing-config proxy; flag defaults; data
minimization for minors.

**CODEX SAYS (eng — architecture challenge):** completed. P1: auth cutover larger than
A41 (sign-in/recovery live under /shift/*; hackathon-only alumni need an auth path);
hiding camp nav doesn't make old camps read-only (`lib/shift-context.tsx` still mutates);
issuance time vs review deadline conflated; A50 covers only part of the concurrency;
draft identity vs submission idempotency (key rotates per edit); private photo lifecycle
(B2 returns public URLs); change-source integrity; summary approval must bind a revision;
deletion vs snapshot identity tombstone, `delete-user-account` deletes the shared account;
verification page is a launch dependency; privileged execution boundaries (push cron branch
runs before auth). P2: push delivery semantics, cached state vs emergency controls
(`lib/queryClient.ts` disables refetch on focus/reconnect), "3 testers" counts rows not
people, 11 items minimum vs 10/hour limit. Recommendation: gate the native build behind a
concierge pilot and a consolidated lifecycle contract.

```
ENG DUAL VOICES — CONSENSUS TABLE:
  Dimension                           Claude      Codex       Consensus
  1. Architecture sound?               Core yes    Core yes,   CONFIRMED (sound core; lifecycle gaps)
                                       traps       lifecycle no
  2. Test coverage sufficient?         No          No          CONFIRMED (gaps)
  3. Performance risks addressed?      Yes w/ idx  Mostly      CONFIRMED (low risk)
  4. Security threats covered?         No          No          CONFIRMED (definer, photos)
  5. Error paths handled?              No          No          CONFIRMED (deletion, issuance)
  6. Deployment risk manageable?       No (time)   No (gates)  CONFIRMED
```
Both eng voices also recommend gating the native build: reinforces User Challenge UC1.

#### Section 1: Architecture (updated)
```
  ps_app (Expo 1.4.0)                       shared Supabase (migrations in pseed, pinned rev)        passionseed/web
  ┌───────────────────────────────┐ RPC    ┌──────────────────────────────────────────────┐        ┌──────────────────────────┐
  │ Season · Evidence · Profile   │──────▶ │ seasons(policy cols), season_entries,        │◀─RPC───│ /c/[public_id]           │
  │ app/season-admin (season_roles)│        │ evidence (immutable, state machine),         │ get_   │  reads snapshot only     │
  │ generic draft store + frozen  │        │ submissions(submission_id unique),           │ cert_  │ OG image renderer        │
  │   submission attempts         │        │ certificates(snapshot v1, review_ends_at,    │ public │  (Thai segmenter, TTFs)  │
  │ EXIF strip -> private upload  │        │   issued_at, tombstone), summary_revisions,  │        │ visit log -> events      │
  │ push token -> profiles        │        │ sdt_checkins, season_roles, season_events,   │        └──────────────────────────┘
  └───────────────────────────────┘        │ nudge_ledger, deletion_requests              │
        ▲ Expo push (chunks≤100)           │ fn milestone_counts(entry) (derived, no cache)│
        │                                  │ season_now() (test override, not client-call)│
  edge fn season-jobs ◀── pg_net ◀── pg_cron: issue (per-entry txn), purge, nudges (12:00 UTC)
        └── Storage API deletes (private bucket season/{season}/{user}/{evidence}.jpg)
  untouched: hackathon_*, user_roles, interactive camp tables (read-only for past cohorts, E15)
```
Findings: [P1] (9/10) `lib/shiftCompanionDrafts.ts:35` rotates idempotency per edit ->
E5. [P1] (9/10) `app/_layout.tsx:86` unauthenticated -> `/shift/link` -> E14. [P1] (8/10)
`supabase/functions/delete-user-account` deletes shared auth -> E10. [P1] (8/10)
`lib/backblazeUpload.ts` public URLs unsuitable -> E6. [P2] (8/10)
`supabase/functions/push-notifications` cron branch before auth -> E13.
Dispositions: all accepted as E-items (mechanical, P1/P5).

#### Section 2: Code quality
Shared code: draft store generalization (A42) has two callers (companion composer,
evidence composer); savings small, reliability gain real; accepted. Do not reuse
`companionStatus`'s missing-RPC fallback (E13/X5). No other extraction proposed.
Findings: idempotency rotation (above); supersession chain (E1). Dispositions: accepted.

#### Section 3: Test review
Framework: vitest (package.json `test`), no DB harness (X4 adds pgTAP). Existing: 30
companion test cases across 4 files (recount; plan said 38).
```
CODE PATHS                                                    USER FLOWS
[+] submit_evidence RPC                                       [+] Join -> first evidence
  ├── [GAP] validation per type (A8/A17/X6)                     ├── [GAP] [→E2E] 3-screen join + consent <20
  ├── [GAP] replay same submission_id -> same receipt (E5)       └── [GAP] first receipt -> push prompt (X16)
  ├── [GAP] payload mismatch on replay -> conflict (E5)        [+] Evidence lifecycle
  ├── [GAP] rate limit after replay check (E5)                  ├── [GAP] [→E2E] submit -> reject -> replacement
  ├── [GAP] after close: stored, not counted (A7/E17)           ├── [GAP] withdraw preview + cascade (DS5)
  └── [GAP] kill switch blocks submit + upload (X18)            └── [GAP] offline draft -> reconnect near close
[+] milestone_counts(entry) (E2)                              [+] Close -> certificate
  ├── [GAP] each threshold incl. distinct testers (E19)         ├── [GAP] [→E2E] review window screen -> issued push
  ├── [GAP] change valid iff source accepted, same entry (E8)    ├── [GAP] not eligible screen
  └── [GAP] reaccept source restores change (E8)                └── [GAP] share story + QR + link sticker tip
[+] issue_certificates job (E4)                               [+] Web verify
  ├── [GAP] per-entry txn, on conflict do nothing               ├── [GAP] valid / revoked / tombstone / unknown 404
  ├── [GAP] race with reject (separate connections)             ├── [GAP] XSS via handle/summary; https-only links
  └── [GAP] one bad entry doesn't abort batch                   └── [GAP] service failure != not found
[+] RLS / SECURITY DEFINER (E13)                              [+] Staff
  ├── [GAP] anon/other user denied on all season tables          ├── [GAP] mentor scoped to assigned season
  └── [GAP] season_now override not callable by clients          └── [GAP] approve summary revision; edit -> pending
[+] Deletion / purge (E7/E10)                                 [+] Nav cutover (E14/DS2)
  ├── [GAP] storage objects removed (bucket listing)             ├── [GAP] sign-in + expired session restore draft
  └── [GAP] snapshot intact on purge; tombstone on deletion      └── [GAP] legacy deep links; flag on/off; UTC device times
[+] Drafts (A42, existing tests extended)
  └── [★★ TESTED] companion draft writer/recovery (30 cases) -> extend for evidence drafts
COVERAGE: 1/34 paths tested | GAPS: 33 (6 E2E) | QUALITY: ★★:1
```
Regression rule: existing companion draft/recovery behavior is preserved by running the
existing 30 cases against the generic store (A42). Test plan artifact written (see path
in Completion summary). Dispositions: all gaps accepted as required tests of approved
behavior (no new policy).

#### Section 4: Performance
DB load small; derived milestone counts per entry O(~20 rows) with A49 indexes. Hot
spots: hourly issue job at a busy close (per-entry txns, E4), Expo push batching (E16),
certificate image render (cache by public_id + snapshot version + status, E11), staff review
throughput (A45 metric; plan sampling at scale). No N+1 if the Evidence tab reads one RPC
returning entry + counts + items. Finding accepted as E22 (single read RPC).

<!-- autoplan-accepted:eng -->
- E1: Before Oct 20, write one consolidated final spec (folding A, DS and X supersessions) and build the schema and RPC/error contract (X5) only from it. Verify: spec section exists; no superseded item referenced by tasks.
- E2: Milestone progress is derived by a SQL function over accepted evidence submitted before close; no milestone_progress cache table (supersedes that table in A2). Snapshots happen only at issue (A30). Verify: pgTAP thresholds via the function.
- E3: One transactional transition model: evidence submitted -> rejected | withdrawn; rejected -> accepted by staff; withdrawn is terminal. All eligibility-affecting operations (submit, reject, withdraw, staff accept, extend, reinstate, delete, issue) take a lock on the entry row in one order. Server submitted_at is authoritative; evidence submitted after close never completes a milestone. Race tests use separate database connections. Verify: concurrency test harness with two connections.
- E4: Certificates store review_ends_at (close + review_window_hours) separately from issued_at; review actions are rejected after review_ends_at even if issuance is delayed. issue_certificates runs one transaction per entry with on conflict do nothing; extend_season is refused once any certificate in the season has issued; reinstate restores the original snapshot. Verify: delayed-job test keeps review closed; per-entry failure doesn't abort batch.
- E5: Submission idempotency: the client freezes a submission attempt with a submission_id when the student taps Send (edits after that create a new attempt). Unique (entry_id, submission_id); a replay with the same payload returns the original receipt before rate-limit and close checks (ownership and deletion still checked); a replay with a different payload returns a conflict. Rate limit 30 per hour with retry_after (amends A52). Verify: lost-response replay, edit-after-send, mismatch tests.
- E6: Photos use a private season bucket with path season/{season_id}/{user_id}/{evidence_id}.jpg; EXIF/GPS stripped on device (re-encode) and checked server-side; submission verifies object ownership; upload size limit; staff view via short-lived signed URLs; orphan uploads cleaned by the purge job; the kill switch also blocks uploads. Not Backblaze public URLs. Verify: EXIF-free stored file; other user denied; orphan cleanup test.
- E7: Purge and season-data deletion run in an edge function (pg_cron -> pg_net) using the Storage API with service role, driven by an idempotent deletion_requests queue. Verify: test checks bucket listing, not just rows.
- E8: A change item's source must be an interview or tester in the same entry; validity is computed from the source's status; if a rejected source is re-accepted the change counts again unless the change itself was rejected. Payloads are immutable and direct table writes are denied by RLS. Verify: cross-entry source rejected; re-accept test.
- E9: Project summaries are stored as revisions; staff approve a specific revision; editing creates a pending revision while the last approved revision stays public; a reviewer-only demo link never appears publicly; public links must be https. Verify: edit-after-approve test; non-https link rejected.
- E10: "Delete season data" is a new operation separate from the existing delete-user-account function (which deletes the shared account and must also be extended to delete season data). After holder deletion the certificate page shows a minimal revoked tombstone with no handle or name; retention purge leaves valid snapshots intact. Local drafts and caches are cleared; stale clients cannot recreate deleted entries. Verify: tombstone test; delete-user-account removes season rows.
- E11: The web verification page and image renderer must be live and tested before the first certificate issues (amends A27: they can deploy separately from the app but are a prerequisite for issuance). Render failure is retried separately from issuance; cached images are invalidated on revoke, summary change or name change. Verify: issuance blocked in staging until page health check passes.
- E12: Certificate renderer pre-segments Thai with Intl.Segmenter('th') and zero-width spaces, embeds Bai Jamjuree and Libre Franklin TTFs, caps handle/title length server-side, and has golden-image tests with long Thai strings. Budget 2 days. Verify: golden images pass.
- E13: Every SECURITY DEFINER RPC sets search_path to empty, checks auth.uid(), has execute revoked from public/anon and granted to authenticated; the web page reads through a narrow get_certificate_public(public_id) RPC, never service role in a page handler; season_roles is writable only by global staff and bootstrapped by migration; season_now override is not callable by clients in production; scheduled edge functions authenticate the scheduler before any work. Verify: pgTAP grants tests; unauthenticated call to job function rejected.
- E14: Replacing /shift/* includes a new sign-in and expired-session recovery flow (restoring evidence drafts), invitation deep-link preservation, explicit guest and hackathon-mode behavior, and a path for hackathon-only alumni and mentors to create a Supabase Auth account and receive season membership. Verify: cold start unauthenticated -> sign-in -> season; expired session restores draft.
- E15: Interactive SHIFT camp data becomes read-only: audit ShiftProvider (lib/shift-context.tsx) and routes so the new binary performs no camp writes; backend blocks camp writes for closed cohorts using expand/contract so old binaries degrade gracefully. Verify: route audit list; write attempt on closed cohort rejected with a clear error.
- E16: Nudges respect the existing mobile_settings.push_enabled master switch plus a season-specific opt-out, and do not duplicate the existing local daily reminder; Expo sends in chunks of 100 with receipt handling that clears DeviceNotRegistered tokens; cron schedule 12:00 UTC for 19:00 ICT; a nudge_ledger (user, season, local_date, kind) records delivery with a defined retry policy; one token per user is a documented beta limit. Amends X12. Verify: duplicate-run test; opt-out test.
- E17: Offline submissions near close are counted by server submitted_at with a grace rule: evidence whose client created time is before close and whose receipt arrives within 30 minutes after close counts (taste decision T-E1). All times display in ICT regardless of device timezone. Verify: UTC-device display test; grace boundary tests.
- E18: Season queries override the global no-refetch defaults (refetch on focus and reconnect); cached flags and metadata never act as authorization; enrollment shutdown, submission shutdown and emergency routing are separate controls. Verify: rejection visible after foregrounding.
- E19: Tester and interview thresholds count distinct people by a required short context label (e.g. "Grade 11 student, library") with a duplicate warning; spot-check limits documented; "active days" metric uses server receipt local date. Verify: duplicate-label warning test.
- E20: Gates before Nov 3, outside the screen budget: pinned canonical migration revision in pseed, EAS profiles for TestFlight/Play internal, credential rotation (X13), and a staging end-to-end run (X17). Verify: checklist complete.
- E21: Retention and deletion also cover season_entries birth fields and sdt_checkins free text; a short PDPA review happens before any public season. Verify: purge test covers those columns.
- E22: The Evidence tab and Season home read through one RPC returning entry, derived counts and items (no N+1). Verify: one network call per screen load.
<!-- /autoplan-accepted:eng -->

**Eng NOT in scope:** multi-device push tokens (one per user, documented); credential-free
fixture mode (TODO); student evidence export (TODO); identity migration of hackathon
records (only an account path, E14).
**What already exists:** push-notifications edge fn and profiles tokens; companion draft
writer/recovery + 30 tests; `app/admin` patterns; Sentry; `delete-user-account` (to extend);
storage upload helpers (not reused for private photos).

**Failure modes registry**
```
  CODEPATH              | FAILURE                         | TEST?   | ERROR HANDLING      | USER SEES        | CRITICAL?
  submit replay         | duplicate evidence              | planned | E5 unique+receipt   | same receipt     | no
  issue job delayed     | review window silently extends  | planned | E4 review_ends_at   | issue time shown | no
  issue vs reject       | ineligible cert                 | planned | E3/E4 locks         | correct state    | no
  purge/deletion        | photos orphaned                 | planned | E7 queue+Storage API| nothing          | no (was CRITICAL before E7)
  photo upload          | GPS leaked to staff             | planned | E6 EXIF strip       | nothing          | no (was CRITICAL before E6)
  auth cutover          | users stranded at removed route | planned | E14 new flow        | sign-in          | no
  old binaries          | write closed camp data          | planned | E15 backend block   | clear error      | no
  cron function         | unauthenticated trigger         | planned | E13 scheduler auth  | n/a              | no
  web renderer          | Thai text broken on certificate | planned | E12 golden tests    | correct cert     | no
```
0 critical gaps remain after E6/E7 (2 were critical before acceptance).

**Worktree parallelization**
| Step | Modules touched | Depends on |
|---|---|---|
| S1 spec + contract (E1, X5) | docs/ | — |
| S2 DB schema/RPCs/tests (pseed migrations, pgTAP) | supabase (pseed), supabase/tests | S1 |
| S3 jobs + edge fns (issue, purge, nudges) | supabase/functions | S2 |
| S4 web verify + renderer | passionseed/web | S1 (contract), S2 for live data |
| S5 app nav/auth cutover + flags | app/_layout, app/(tabs), lib/ | S1 |
| S6 app season screens + composer | app/season*, components/season, lib/ | S1, S5 |
| S7 season-admin | app/season-admin | S2 |
Lanes: A: S2 -> S3 (backend). B: S4 (web, separate repo). C: S5 -> S6 (app). D: S7 after S2.
Order: S1 first; then launch A + B + C in parallel; D after A's S2. Conflict flag: lib/ shared by S5/S6 (same lane).

#### Implementation Tasks (Eng phase)
- [ ] **ET1 (P1, human: ~1d / CC: ~30min)** — spec — Consolidated final spec + RPC/error contract (E1, X5)
- [ ] **ET2 (P1, human: ~3d / CC: ~3h)** — db — Schema, derived milestone fn, transition model, RPC hygiene, pgTAP incl. 2-connection races (E2-E5, E8, E13)
- [ ] **ET3 (P1, human: ~1.5d / CC: ~1h)** — jobs — issue/purge/nudge edge fns with scheduler auth, deletion queue, nudge ledger (E4, E7, E16)
- [ ] **ET4 (P1, human: ~3d / CC: ~2h)** — web — Verification page, get_certificate_public, Thai renderer + golden tests (E11, E12)
- [ ] **ET5 (P1, human: ~2d / CC: ~1.5h)** — app — Auth/nav cutover, camp read-only audit, flags/kill switch, query refresh (E14, E15, E18)
- [ ] **ET6 (P1, human: ~1d / CC: ~45min)** — app — Frozen submission attempts, EXIF strip, private upload (E5, E6)
- [ ] **ET7 (P2, human: ~1d / CC: ~45min)** — app — Summary revisions, deletion op, tombstone (E9, E10)
- [ ] **ET8 (P1, human: ~0.5d / CC: n/a)** — release — Nov 3 gates: pinned migration rev, EAS beta profiles, staging e2e (E20)

```
ENG COMPLETION SUMMARY
- Step 0: Scope Challenge — scope accepted as-is (cuts routed to UC1)
- Architecture Review: 5 issues found
- Code Quality Review: 2 issues found
- Test Review: diagram produced, 33 gaps identified
- Performance Review: 1 issue found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 2 items added (fixture mode, evidence export)
- Failure modes: 0 critical gaps flagged (2 resolved by E6/E7)
- Unresolved decisions: 0 in this review (UC1/UC2 are CEO-phase user challenges)
- Outside voice: codex completed
- Parallelization: 4 lanes, 3 parallel / 1 sequential
- Lake Score: N/A
```

### Final approval gate (2026-10-12)

- **UC1 (hand-run pilot before the native build): rejected by user.** User: "already ran shift 0,1 and 2 is starting 14th". The SHIFT runs count as the hand-run pilots; the original direction stands (app beta ~Nov 10, public season in December). Still in force: A44 (at least 5 non-alumni in beta), A45 (December go/no-go), A46 (Nov 3 build checkpoint with concierge fallback). Residual risk noted: SHIFT runs were mentored, so unmentored completion is first measured in the beta.
- **UC2 (validate certificate value first): rejected by user ("Ship as is").** Beta certificates are Passion Seed-only with no pre-launch validation. A48 (counselor interviews before Nov 7) is withdrawn by this answer, along with task T3; DS16 (factual certificate wording) stays.
- **Gate: Approve as-is.** All automatic decisions and the 12 taste choices are accepted as recommended. Status: APPROVED.

### Post-approval updates (2026-10-12)

- **A27 resolved:** the web verification page and certificate renderer are owned by Claude (agent), built in the existing web codebase at `/Users/bunyasit/dev/pseed` (Next.js). Every "passionseed/web" reference in this plan means that checkout.
- **X13 partly done:** Ghost staging is no longer used. Deleted `docs/GHOST_STAGING_SETUP.md` and `scripts/sync-to-ghost.sh`, and removed the Ghost sync step from `scripts/backup-db.sh`. The password stays in git history, so the Timescale instance should be deleted or its password rotated. X17's staging requirement now needs a Supabase staging project (Ghost is gone).

### Design direction updates (2026-10-12, user)

- Theme: the app's current lavender-gradient look (white to faint-lavender cards, purple/blue accents), not Passion Neon flat. Supersedes taste choice D-T6 and DS12's neon notes. `lib/theme.ts` and `docs/DESIGN.md` must be updated (DS13).
- Primary button: "Pillow" (white to lavender pill, violet text, glossy violet icon gem, sinks on press with a light haptic).
- Naming: drop "Season". Each round is a SHIFT (รอบที่ N); the 6 milestones are Missions.
- Squads: small squads (3 students + mentor) for peer updates, starting with group icebreaking. Supersedes solo-only beta (A12). Open: whether squad updates live in the app or Discord, how squads are formed, and whether the icebreaker is live or async.
- Insight capture: the hackathon's form-style log worked poorly; proposed voice-first capture (record, tap the key sentence, tag who). Mockups: `~/.gstack/projects/passionseed-ps_app/designs/season-home-20261012/shift-home-v2.html`.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode SELECTIVE EXPANSION | Mechanical | autoplan override | Added capability on existing infra | Other modes |
| 2 | CEO | Review depth: strategy plus capability-level contracts | Mechanical | P5 | Plan is a release direction; no schema yet | Full method-level |
| 3 | CEO | Amend: server-derived scoring (A1) | Mechanical | P1, P4 | Client-written points are forgeable (F2) | Reuse score_events write path |
| 4 | CEO | Amend: auth-user identity (A2) | Mechanical | P4, P5 | Cert/portfolio must follow main account (F1) | hackathon_participants |
| 5 | CEO | Approach A with amendments | Mechanical | P1 | Most complete; B queued as challenge | B, C |
| 6 | CEO | E1 web project page + cert verify | Taste | P1 | Admissions readers use web; second repo | App-only page |
| 7 | CEO | E2 TCASfolio export deferred | Mechanical | P3 | Outside radius, needs research | Include |
| 8 | CEO | E3 partner co-sign deferred | Mechanical | P3 | Business work | Include |
| 9 | CEO | E4 org briefs deferred | Mechanical | P3 | Outside radius | Include |
| 10 | CEO | E5 peer tester exchange skipped | Mechanical | P1 | Inflates evidence | Include |
| 11 | CEO | E6 staff tools accepted | Mechanical | P2 | Required to operate | Defer |
| 12 | CEO | E7 push nudges accepted | Mechanical | P2 | <1 day, existing infra | Defer |
| 13 | CEO | PC3 leaderboard: evidence-bar completion + featured projects instead of count rank | Taste | P1 | SDT controlling-reward + gaming risk | Count-ranked leaderboard |
| 14 | CEO | A6 beta cut fixed now (spec review F1) | Mechanical | P6 | Fallback after slip is too late | Slip-triggered fallback |
| 15 | CEO | A2 new season tables, hackathon tables untouched | Mechanical | P5 | Re-keying hackathon infra is migration risk | Re-key hackathon_* |
| 16 | CEO | A4 new auth-user push token table + opt-out | Mechanical | P1 | No main-app token store exists | Reuse hackathon tokens |
| 17 | CEO | A5 single web verification page, server-rendered cert | Mechanical | P5 | One render path for app + web | Skia in app |
| 18 | CEO | A7-A11 eligibility, fields, cascade, PDPA, events | Mechanical | P1 | Spec review completeness gaps | Leave undefined |
| 19 | CEO | Solo entries in beta, teams later | Taste | P5 | Schema simpler; relatedness via Discord | Teams of 3 in beta |
| 20 | CEO | Leaderboard is stretch, not beta | Taste | P3 | YAGNI for 25 entrants; SDT risk | Leaderboard in beta |
| 21 | CEO | A14 SHIFT cohort = season | Mechanical | P4 | Same loop, no extra build | Separate SHIFT flow |
| 22 | CEO | A15 free beta, Passion Seed-only certs | Mechanical | P6 | Unblock build | Leave open |
| 23 | CEO | Spec review 2 fixes A17-A28, stale text baseline edits | Mechanical | P1, P5 | Material gaps from round 2 | Leave |
| 24 | CEO | A25 no score in beta | Mechanical | P3 | No beta consumer | Keep score |
| 25 | CEO | A23 season_roles table, shared user_roles untouched | Mechanical | P5 | Shared CHECK constraint with web | Alter user_roles |
| 26 | CEO | Spec review 3 fixes A29-A43 | Mechanical | P1, P5 | Material gaps from round 3 (third and final launch) | Leave |
| 27 | CEO | A38 handle by default, opt-in legal name | Taste | P1 | Admissions verification vs minor privacy | Legal name always |
| 29 | CEO | 0H document approval A | Mechanical | P6 | Autoplan auto-approve | Revise |
| 30 | CEO | A44-A48 from dual voices (non-alumni, metrics/go-no-go, Nov 3 fallback, problem statement, counselor interviews) | Mechanical | P1, P6 | Both voices agree; fallback not direction change | — |
| 31 | CEO | UC1 gated concierge pilot instead of native beta + Dec launch | User Challenge | — | Both voices; held for gate | — |
| 32 | CEO | UC2 certificate not the growth engine until validated | User Challenge | — | Both voices; held for gate | — |
| 33 | CEO | T1 university track deferred past December | Taste | P3 | Codex 7, Claude F6 | Both tracks Dec |
| 34 | CEO | T2 cut A33/A34 from beta | Taste | P3 | Claude F4; keeps A33 if SHIFT uses seasons in beta | Keep |
| 35 | CEO | T3 "decided not to build, with evidence" satisfies What I changed | Taste | P1 | Codex 3 competence over compliance | Change only |
| 36 | CEO | T4 mentor quality sampling of evidence | Taste | P1 | Fabrication risk | Spot checks only |
| 37 | CEO | T5 add support/relatedness question to check-ins | Taste | P1 | Codex 4 | Keep A20 |
| 38 | CEO | Sections 1-11: A49-A55 | Mechanical | P1, P2 | Section findings in blast radius | — |
| 39 | Design | Skip Step 0.5 mockups in autoplan; run /design-shotgun after gate | Mechanical | P6 | Board needs user feedback | Generate and block |
| 40 | Design | DS1-DS17 structural/state/a11y fixes | Mechanical | P5, P1 | Both voices; DESIGN.md alignment | Leave to implementer |
| 41 | Design | D-T6 in-app theme bright primary (recommended) vs immersive | Taste | P5 | Codex vs Claude disagree; DESIGN.md favors bright | Immersive dark |
| 42 | Design | DS15 reviewer-only demo link allowed | Mechanical | P1 | Privacy for minors (Codex) | Public link required |
| 43 | Design | DS6 birth month+year | Mechanical | P1 | Year alone can't compute age 20 (Codex) | Birth year only |
| 44 | DX | Persona: new intern engineer (P6) | Mechanical | P6 | Small team, internal platform | External devs |
| 45 | DX | TTHW target < 10 min via season:seed | Taste | P5 | Fixture mode would reach Competitive but is new capability | < 5 min fixture mode |
| 46 | DX | X1-X18 accepted | Mechanical | P1, P5 | Both voices confirmed; in blast radius | Leave |
| 47 | DX | X12 reuse profiles push token (corrects A4) | Mechanical | P4 DRY | Existing savePushToken (verified) | New table |
| 48 | DX | X13 remove/rotate leaked credential | Mechanical | P1 | Verified secret in committed docs | Ignore |
| 49 | Eng | Scope accepted as-is; cuts routed to UC1 | Mechanical | P2 | Autoplan never reduces scope | Smaller arrangement |
| 50 | Eng | E1-E22 accepted | Mechanical | P1, P5 | Both voices; code-verified | Leave |
| 51 | Eng | T-E1 30-min grace for offline evidence near close | Taste | P1 | Claude for grace; Codex for strict server time | Strict cutoff |
| 52 | Eng | E2 derive milestones, drop cache table | Mechanical | P5 | Fewer invalidation bugs | milestone_progress table |
| 53 | Gate | UC1 rejected by user: keep app plan; SHIFT runs were the pilots | User | — | User answer | Concierge pilot first |
| 54 | Gate | UC2 rejected by user: ship certificate as is; A48 withdrawn | User | — | User answer | Validate first |
| 55 | Gate | Approve as-is | User | — | User answer | Overrides |
| 28 | CEO | A41 three-tab beta nav, companion screens removed from beta | Mechanical | P5 | Shelving decided in A15 | Flag off in place |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` (via /autoplan) | Scope & strategy | 1 | ISSUES OPEN (resolved at gate) | 7 proposals, 3 accepted, 3 deferred; 55 requirements |
| Outside Review | codex (gpt-6.1-sol) via /autoplan | Independent 2nd opinion | 4 | completed | CEO 10, design 8, DX 5, eng 15 concerns; all dispositioned |
| Eng Review | `/plan-eng-review` (via /autoplan) | Architecture & tests (required) | 1 | CLEAR | 9 issues, 0 critical gaps; 22 requirements |
| Design Review | `/plan-design-review` (via /autoplan) | UI/UX gaps | 1 | ISSUES OPEN | score: 2/10 → 7/10, 17 decisions |
| DX Review | `/plan-devex-review` (via /autoplan) | Developer experience gaps | 1 | ISSUES OPEN | score: 2/10 → 6/10, TTHW: 60+ min (est.) → <10 min |

- **OUTSIDE COVERAGE:** codex completed for CEO, design, DX and eng phases.
- **CROSS-MODEL:** Claude subagent and codex agreed on 6/6 CEO, 5/7 design (1 theme disagreement, taste), 6/6 DX and 6/6 eng dimensions; model identities: Claude (in-host), codex gpt-6.1-sol.
- **VERDICT:** ENG CLEARED (via /autoplan); plan APPROVED at final gate. Design and DX remain below 8 until mockups (/design-shotgun) and dev tooling land.

NO UNRESOLVED DECISIONS

