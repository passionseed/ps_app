# SHIFT companion completion audit

This audit follows the full two-flow plan. Source implementation and passing unit
tests are evidence of local progress; they are not proof that backend persistence,
native interactions, or a participant usability pass work in the target system.
Full completion is still unproven. No production mutation or release occurred.

## Current evidence

- 38 targeted tests pass across companion rules, drafts, API boundaries, recovery,
  and retained legacy SHIFT storage/query behavior.
- Companion screens and libraries have no TypeScript or lint errors. The full app
  typecheck still has existing errors elsewhere. Root/legacy files retain existing
  lint warnings.
- Expo web export succeeds. Browser interaction and visual review have not run:
  this environment cannot bind a local server and browser connector calls require
  approval unavailable under the current policy.
- `ios/Podfile.lock` contains `ExpoImagePicker` 55.0.18; iOS configuration and
  `Info.plist` contain photo-library usage descriptions. This verifies checked-in
  native configuration, not an installed release binary. The composer requests a
  compatible image representation on iOS so HEIC gallery photos can be converted
  before the existing JPEG/PNG/WebP upload contract.
- The additive corrective SQL and an isolated database regression fixture are
  present in `scripts/shift-companion`. Neither has executed against PostgreSQL.
  `supabase/migrations` resolves into the separate `/Users/bunyasit/dev/pseed`
  checkout, outside writable roots. PostgreSQL initialization was denied shared
  memory access; the expected local PostgreSQL socket is not serving a database.

## Requirements and acceptance evidence

| Requirement | Local evidence | Still required to prove completion |
| --- | --- | --- |
| Secret linking code first, safe preview, no code consumption | `link.tsx`, preview RPC, SQL exact hash match, code-format unit tests | Render and paste on devices; execute anonymous preview and invalid/expired/reissued code tests against target schema |
| Support for missing codes, identity mismatch and rate limits | User-confirmed Instagram `passion_seed.th` and LINE OA `@passionseed` links on all linking steps, sign-in and Account; bilingual failure message and manual-search handles | Open both links on iOS/Android/web, including devices without the apps installed |
| Verified identity owns the expected roster participant | Email OTP and confirmed-email rules; corrective SQL verifies the roster email, locks claim ownership, returns caller identity | Real non-production OTP delivery/template verification, identity mismatch and concurrent claim execution |
| Private mobile and later edits | Contact normalization tests, private roster storage, account mutation with cache invalidation | Execute persistence and negative roster/contact authorization tests |
| Contact email can be edited from Account | Account requests Auth confirmation links; verifies the caller and confirmed address before syncing only active owned roster contacts; tests reject incomplete confirmation, account switches and mismatched receipts | Non-production secure email-change delivery and both-inbox confirmation; execute sync authorization tests and recovery after an interrupted confirmation |
| Retry successful claims and show clear receipt | SQL same-owner claim result; cache seeded from durable claim result | Lose a successful claim response and retry/restart against backend |
| Already linked accounts open Today without onboarding | Account-scoped root queries and navigation tests; linked routing does not wait for a legacy profile query | Cold-start and deep-link verification with real auth sessions |
| One action, small bilingual composer, optional details | Today and composer source, copy catalog, 48-point controls, AppText, keyboard avoidance and focus/error handling | Render iOS/Android and wide/narrow web; exercise large Thai text, keyboards, VoiceOver/TalkBack and language changes with entered work |
| Personal daily update needs no project or group | Save payload and SQL have no project/group prerequisite; one record per author/cohort/date | Execute create/edit/own-history paths without project/group records |
| Personal history with bounded pagination | Exclusive date cursor and 30-record history API; Today uses five prior records | Execute multi-page history and another-device history retrieval |
| Offline writing and force-close recovery | Serialized draft writer, captured account/date keys, flush/recovery tests; root and screens share offline cohort loading | Device force-close/reopen offline, then reconnect and explicitly send |
| Local-only state is different from sent state | Save labels follow completed storage writes; sent text follows a matching durable receipt | Screen-reader status announcements and interrupted network interactions on devices |
| Interrupted sends never duplicate or clear unconfirmed work | Stable retry keys, exact receipt author/date/revision/content tests; separate SQL receipts and transaction locks | Execute lost-response replay, first-insert concurrency, and same-date revision conflicts |
| Photo failure preserves text and can be retried/removed | Independent upload state; size/type validation; send remains blocked until a pending photo is removed or succeeds | Device gallery upload/retry/replace/remove, large files, HEIC conversion and actual private storage policies |
| Account/cohort switching isolates drafts, caches and permissions | Scoped query keys, remounted composer, resume isolation tests, validated offline metadata | Multi-account/device runtime switching and backend negative authorization tests |
| Authentication expiry preserves and restores the composer | JWT errors trigger email sign-in; pending resume has original account/cohort/date; sign-in does not create another account | Expire an actual non-production session and verify OTP and OAuth return to the same draft |
| Midnight and older drafts retain their date | Original composer date, valid-date parsing, year in date labels, explicit copy-to-today confirmation | Cross-midnight device session, older draft submission and cancellation of date copying |
| Cross-device edits preserve local work | Revision check in SQL; full local/server comparison; overwrite requires an explicit choice and another Send | Two-device edit conflict and timeout replay after a later revision |
| Author/staff audience and cohort isolation | No peer feed in client/RPC; author/staff RLS; private photos; separate staff roster/update operations | Execute RLS, staff scope and photo negative tests in the full schema with existing policies |
| Legacy users, project updates and images retain continuity | Legacy routes and helpers retained; SQL fixture includes old project data/photo checks | Execute fixture and whole target-schema checks; exercise existing guest and hackathon routes on devices |
| Native binary and release | Existing package/native lockfile confirmed; no version bump or deploy because nothing shipped | Native binary smoke check and explicitly authorized migration/release |
| Usability: four of five participants finish both flows unaided | Product target only; no measured result | Real participant sessions, including identifying local versus sent state and the update audience |

## Commands for local checks

```sh
pnpm exec vitest run tests/shift-companion.test.ts tests/shift-companion-drafts.test.ts tests/shift-companion-api.test.ts tests/shift-companion-recovery.test.ts tests/shift.test.ts tests/shift-storage.test.ts tests/shift-query-keys.test.ts
pnpm typecheck:app
pnpm exec expo export -p web
```

The isolated PostgreSQL fixture command, prerequisites and migration order are
in [the backend handoff](../../scripts/shift-companion/README.md). It is deliberately
not an instruction to run a test against production.
