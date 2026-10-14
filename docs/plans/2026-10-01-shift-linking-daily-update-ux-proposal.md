# SHIFT companion: cohort linking and daily updates

**Date:** 2026-10-01

**Status:** Implementation authorized by the user's 2026-10-02 instruction to
check this plan, set it as a goal, and finish it. Local client implementation and
corrective backend SQL are prepared; database execution, native QA, usability
measurement, and release are still outstanding due to environment/release gates.

**Implementation decisions:** Use participant-specific single-use codes, verified
signup email, private unverified mobile, author/staff visibility, and the small
optional-detail composer. Permit late updates and edits for an original date
within cohort dates; reject future/out-of-cohort dates. No 19:00 deadline. Preserve
legacy app, guest, and hackathon routes. Details and deployment order are in
[the backend handoff](../../scripts/shift-companion/README.md).

**Support channels:** Confirmed by the user: Instagram
[`passion_seed.th`](https://www.instagram.com/passion_seed.th/) and LINE OA
[`@passionseed`](https://line.me/R/ti/p/%40passionseed). Linking (including contact
and verification steps), returning-account sign-in, and Account expose both links.
No code, email, or phone number is included in the support URLs. If opening fails,
show the handles for manual search with a Thai/English error message.

**Validation:** 38 targeted SHIFT unit tests pass; changed companion files have no
TypeScript or lint diagnostics, and the web export succeeds. The full suite has
the same 12 failing tests and two failing suites as the pre-change baseline.
The full app typecheck still has unrelated existing errors. No device usability
results are claimed. Requirement-level evidence and remaining gates are tracked in
[the verification audit](2026-10-02-shift-companion-verification.md).

**Scope:** Two complete flows, not a redesign of every existing feature.

## 1. The first version, in one minute

SHIFT happens with people, including live sessions on Discord. The app should
remove coordination friction, not become another course platform.

The first version does two things:

1. **Link me to my SHIFT cohort.** Enter a secret linking code, connect email and
   mobile number to the correct participant record, and confirm the connection.
2. **Let me send today's update.** Write a short update, send it into the system,
   and see a clear receipt and my previous updates.

After linking, the app opens directly on **Today**. The main action is
**Write today's update**, not a menu of features.

**Keep out of this release:** community feeds, icebreaker tools, mentor booking,
career discovery, university tools, assessments, course dashboards, project
setup, automatic matching, mandatory questionnaires, and Discord chat mirroring.
Keep existing data and unrelated routes intact; do not delete people's work.

### Confirmed direction versus proposals

| Confirmed by the user | Proposed here, subject to review |
| --- | --- |
| A SHIFT companion app, with live sessions on Discord. | A focused Today home, with history and account access as secondary destinations. |
| Participants connect email and mobile using a secret linking code. | A unique, single-use participant code and verified email identity; mobile is collected but not claimed to be verified. |
| Daily updates are the first core feature: easy, clean, saved into the system. | Personal updates, one record per participant per cohort per date, editable after submission. |
| Plan these two flows before building. | Updates visible to their author and authorized SHIFT staff only in this first release. Broader sharing comes later. |

These proposals change some current SHIFT behavior. They must be approved rather
than silently inherited from the existing camp implementation.

## 2. UX/UI direction

**Usage scene:** A participant opens their phone between a Discord session and
other daily activities, often in a bright classroom or on the move, and wants to
finish quickly without figuring out the app.

Use a light, quiet interface with generous spacing, strong text contrast, and
one obvious primary action per screen. Keep the existing Passion Seed brand,
with lime reserved for the primary action. No gradients, floating decorative
tab bar, oversized statistics, streaks, or nested cards.

Use the familiar directness of a Signal composer and the clear save feedback of
a Google Forms submission, not a social-network dashboard. These are interaction
references, not instructions to copy their visual identity.

### Shared craft rules

- Use Libre Franklin for Latin text and Bai Jamjuree for Thai through `AppText`.
  State text colors explicitly; its current base style is white.
- Use `lib/theme.ts` tokens. A body size of at least 16 and 20–24-point screen
  headings keep hierarchy clear without oversized hero text.
- Use 20–24-point page gutters and touch targets of at least 48 points.
- Labels remain visible above fields. Placeholders are examples, not labels.
- Keep content in one column. On wide web layouts, use a comfortable form width.
- Keep the primary action reachable above the keyboard without covering fields.
  Support safe areas, keyboard avoidance, and long Thai labels.
- Show progress through content and explicit save states, not celebratory
  animations. Respect reduced motion.
- Support large text, VoiceOver/TalkBack, accessible field errors, visible focus,
  and status announcements. No fixed-height text areas that clip enlarged text.
- Language can be changed without losing entered data.

This is a text-and-wireframe interaction proposal, not a high-fidelity visual
mockup. New visual-direction imagery is deferred: the goal here is to validate
the two flows within the existing brand. Native screen previews and usability
testing are required before calling the implemented UX/UI finished.

## 3. Flow A: link to a SHIFT cohort

### Entry

New or unlinked participants see **Connect to SHIFT** immediately. They do not
first see Discover, career questions, a project wizard, or a generic profile.
Already linked participants go directly to Today.

No Google or Apple sign-in is mandatory before entering the linking code.
However, accepting a code is not permission to impersonate a participant:
verified identity and an authenticated session are still required to finish
linking and access personal records.

### A1. Enter the linking code

```text
SHIFT
Connect to your cohort

Enter the linking code your SHIFT team gave you.

Linking code
[ Paste or enter your code                    ]

[ Continue                                   ]
Need your code? Contact the SHIFT team
```

- One field, not separate boxes for each character.
- Allow paste, replace, and password-manager entry where available.
- Treat the cohort code as an invite secret, distinct from an email OTP.
- Normalize only formatting that the server explicitly supports.
- No validation errors while typing. Validate on Continue and focus the first
  actionable error.
- Validating a code must not consume it. A failed contact or verification step
  must not require staff to issue another code.
- After safe server validation, show only the minimum context needed, such as
  cohort name and dates. Do not reveal roster email, phone, or other personal
  information to someone merely holding an unverified code.

### A2. Connect contact details and verify identity

```text
Connect to [cohort name]

Email
[ Your signup email                          ]

Mobile number
[ Country code ][ Your mobile number         ]

Your contact details are private.
Only authorized SHIFT staff can access them.

[ Verify email and connect                   ]
```

- Prefill only from the participant's own authenticated account, not from an
  unclaimed roster record.
- Use email autofill and an email keyboard. Use phone autofill, a sensible
  editable country code, and a telephone keyboard.
- Accept familiar phone formatting and normalize server-side.
- Preserve values when going back to correct a code.
- Recommend email OTP verification using normal Supabase Auth. Existing
  verified sessions can skip an unnecessary second verification.
- The verified identity must be authorized to claim the record the code refers
  to. A mismatch requires a controlled staff correction, not silent reassignment.
- Support OTP paste/autofill, a resend countdown, changing the entered email,
  and a clear route back. Do not ask for a new password.
- Mobile is a private contact detail in this proposal. Do not label it verified
  or use it for account recovery without actually verifying it.
- If phone verification is required operationally, agree on it before building;
  adding a second OTP is not a hidden implementation detail.

### A3. Success

Show a short confirmation: **You're connected to [cohort name].**
Then offer **Write today's update** as the sole primary action.

Contact details can be edited later from the account menu. No profile-photo,
interest, skills, or Discord-username form blocks the first update.

### Linking state and recovery rules

| State | What the participant sees | System behavior |
| --- | --- | --- |
| Empty or malformed code | A field-level correction. | No unnecessary request for an empty value. |
| Invalid, expired, or unavailable code | “This code can't be used. Check it or contact the SHIFT team.” | Do not enumerate another person's enrollment or account. |
| Too many attempts | A clear wait time and support route. | Rate-limit on the server; never rely on UI throttling alone. |
| Network failure | “Couldn't connect. Your details are still here.” Retry. | Preserve entered values; no false success or code consumption. |
| Email verification pending | Enter code, resend when allowed, or change email. | Do not expose participant data or complete the claim prematurely. |
| Already linked to this account | “You're already connected.” Continue to Today. | Idempotent success, not a duplicate enrollment. |
| Already claimed by another account | A support route without exposing the account. | Never overwrite the existing owner. |
| App closed mid-flow | Resume the safe, non-secret parts of the flow. | Do not persist the raw linking code in ordinary local storage. |
| Linking succeeded but response was lost | Continue safely after retry or reload. | Atomic, idempotent claim and a durable server-side receipt. |

### Security contract

Recommend individual, high-entropy, expiring, revocable, single-use linking
codes. A shared cohort password is not enough to identify or claim a particular
participant.

Store a hash of each code on the server. Do not put raw codes in logs, analytics,
URLs, crash reports, or browser history. Issuance and reissuance are staff-only.

The final claim must atomically bind the verified account, participant, and
cohort, record contact details, and consume the code. Concurrent claims cannot
create duplicate ownership. Contact details stay outside cohort-readable data.
Client-provided participant IDs, roles, or staff flags are never trusted.

## 4. Flow B: a daily update

### B1. Today is the home screen

```text
SHIFT · [cohort name]                         [Account]

Today's update
Thursday, 1 October

A small update is enough.
What did you try today?

[ Write today's update                       ]

My previous updates                          View all
Yesterday · Sent
“I tested the first version with two people…”
```

- Default to the current date in the cohort's timezone, initially Asia/Bangkok.
  Date is the primary label; show camp day only as helpful secondary context.
- This flow does not require a project, peer group, milestone, or course day to
  be created first.
- After submission, change the action to **View / edit today's update** and show
  its preview and server-confirmed status.
- Keep history to the participant's own updates. Community discovery is not
  hidden inside the home screen.
- Empty history teaches the action: **Your first update starts here.**
- Cohort dates outside the active period get an explicit operational rule before
  implementation. Do not silently copy the current seven-day gate.
- No reminder setup, notification permission, or Discord account connection
  interrupts the first submission.

### B2. A small composer, not a report

```text
Back                         Today's update

What did you try today?
[ One small thing counts.                    ]
[                                            ]

+ Add what you learned
+ Ask for help
+ Add a photo or link

Only you and authorized SHIFT staff can see this.

Saved on this device                         [ Send update ]
```

One required field: **What did you try today?**

Optional sections reveal inline:

- **What did you learn?**
- **Where could you use help?**
- **One photo and/or one link.**

Do not require “what broke,” project scope, contributor selection, skills,
ratings, slide decks, or a special final-day presentation form. Those are
separate features, not prerequisites for a quick daily update.

Proposed limits: 2,000 characters for the main update, 1,000 for each optional
text section, one image up to 5 MB after safe processing, and one HTTP(S) link.
Counts appear near the limit rather than adding noise from the first character.
These are reviewable product limits, not existing backend guarantees.

### B3. Save behavior participants can trust

- Debounce local draft saving, scoped to verified account, participant, cohort,
  and date. Never share an individual's draft with teammates.
- Distinguish **Saving on this device**, **Saved on this device**, **Sending**,
  **Sent to SHIFT**, and **Couldn't send**. Local storage is not server delivery.
- If local saving fails, say so and leave the text editable. Never show a
  reassuring saved label without evidence.
- Send requires a network connection. Offline users can keep writing; explain
  that the draft is on this device and let them send later.
- Do not silently queue a submission after the participant leaves. Background
  sending needs its own consent and delivery design and is deferred.
- During Send, prevent repeat taps. Use a server idempotency key so retries after
  a timeout cannot create another update.
- Keep the draft until a durable server receipt confirms the exact revision.
  A timeout, failed upload, or expired login never clears entered work.
- Attachment failure affects the attachment, not the text. Offer retry, replace,
  or remove. Do not require photo-library access for text-only submission.
- Resolve authentication expiry while preserving the draft, then return to the
  same composer. Never display another account's draft.
- History comes from server data and remains available on another signed-in
  device. A local-only draft explicitly does not.

### B4. Receipt and edits

On confirmed success, return to Today with **Sent to SHIFT**, the submission
time, and the saved text. Prefer an inline receipt to a blocking success modal.

Propose one personal update per participant, cohort, and local date. Additional
sends edit that day's record rather than creating feed spam. Keep revision
history server-side and show **Edited** when appropriate.

An update written before midnight retains its original date after midnight:
show that date clearly and ask before moving it to Today. A recovered older draft
is not silently submitted as today's work.

Cross-device edits use revision checks. If a newer server version exists,
preserve the local text, explain the conflict, and offer a comparison before
overwriting anything. Do not automatically replace the participant's work.

### Default visibility

This first version is **not an app-wide feed**. The recommended default is
author plus explicitly authorized SHIFT staff. Staff need the update for support;
email, phone, linking codes, and local drafts never accompany it.

If participants should also see cohort peers' updates, that is a review decision.
Make the audience explicit before Send and enforce it server-side. Opening an
existing community table is not an acceptable shortcut.

## 5. Suggested copy

These strings are a starting point for native Thai/English review.

| Purpose | English | Thai |
| --- | --- | --- |
| Linking title | Connect to your cohort | เชื่อมบัญชีกับรุ่น SHIFT |
| Code label | Linking code | รหัสเชื่อมบัญชี |
| Linking action | Continue | ต่อไป |
| Contact action | Verify email and connect | ยืนยันอีเมลและเชื่อมบัญชี |
| Home action | Write today's update | เขียนอัปเดตวันนี้ |
| Main prompt | What did you try today? | วันนี้ลองทำอะไร? |
| Encouragement | One small thing counts. | เรื่องเล็กๆ ที่ลองทำก็เล่าได้ |
| Optional learning | What did you learn? | ได้เรียนรู้อะไร? |
| Optional help | Where could you use help? | อยากให้ช่วยตรงไหน? |
| Submission action | Send update | ส่งอัปเดต |
| Local receipt | Saved on this device | บันทึกไว้ในเครื่องแล้ว |
| Server receipt | Sent to SHIFT | ส่งให้ทีม SHIFT แล้ว |
| Failed submission | Couldn't send. Your draft is still here. | ส่งไม่สำเร็จ ฉบับร่างยังอยู่ |

## 6. Existing code: reuse and gaps

| Current implementation | Plan for these two flows |
| --- | --- |
| `lib/shift-context.tsx` loads previously enrolled cohorts. | Keep account-scoped TanStack Query patterns, but add a real unlinked entry flow and an authorized claim operation. |
| `types/shift.ts` exposes cohort membership and staff enrollment actions, but no linking-code claim contract. | Verify the companion backend before defining new claim endpoints or migrations. Mobile support is not implemented just by showing a code field. |
| `app/shift/compose.tsx` requires a project and shares project/day drafts. | Add personal participant/date ownership; do not create a fake project to fit the old API. Keep project updates separate for compatibility. |
| The current composer has four daily fields and a different final-day form. | One required prompt and inline optional detail, consistently every day. |
| `lib/shift.ts` uploads screenshots under cohort/project paths. | Authorize new personal-update attachments separately; do not reuse another project's access rules or expose private storage paths publicly. |
| `lib/shiftStorage.ts` uses the installed SQLite localStorage polyfill. | Reuse for non-secret, account-scoped drafts with explicit local-only status and safe account-switch behavior. |
| The app has a long general onboarding and many existing destinations. | Linked SHIFT participants reach Today without legacy questionnaires. Preserve non-SHIFT users' existing records and unrelated flows. |

The old scheduled SHIFT pilot and this personal-update flow must coexist safely.
A roster record, authenticated identity, and cohort membership are related but
not interchangeable. Confirm the actual schema, claim rules, RLS policies,
storage policies, and staff permissions before implementation.

### Data and API behavior, without prematurely choosing table names

- **Claim:** validate a code, verify identity, atomically claim the correct
  participant, save normalized contact data, and return cohort access.
- **Today/history:** fetch only permitted personal updates with bounded history
  pagination, explicit timezone, timestamps, and revision numbers.
- **Send/edit:** validate content, date, ownership, and attachments on the server;
  write once; return a durable receipt.
- **Staff view:** make these updates available in the operational system with
  participant/cohort/date, text, optional help, attachments, and timestamps.
  This is not a promise of a new staff dashboard in this two-flow release.
- **Client:** centralized query keys and query invalidation after mutations.
  Do not use component-level raw fetch/Supabase effects for server state.

Do not submit live claims, send OTPs, run production migrations, enroll users,
publish updates, or deploy services merely to validate this proposal.

## 7. Build order after approval

1. Confirm the review decisions below and the real backend/identity contract.
2. Prototype Today, the small composer, and its states with synthetic data. This
   is the first core feature to shape; do not present fake submissions as live.
3. Build secure cohort linking and personal-update persistence, including staff
   visibility and authorization tests.
4. Connect the client flows, short-circuit legacy onboarding for linked SHIFT
   accounts, and verify recovery, account switching, and existing-user continuity.
5. Test on iOS and Android with real keyboards, large text, Thai copy, attachment
   failures, offline drafts, and interrupted submissions.
6. Release only after the target schema and native binary support are verified
   and release actions are explicitly authorized.

No app code or database changes are part of this document's creation. Keep this
proposal separate from the broader [app roadmap](2026-10-01-app-roadmap.md).

## 8. Acceptance and usability checks

### Product quality targets, not measured results

- A first-time participant understands which code to use without staff explaining
  the screen. Active linking work should take roughly a minute, excluding
  delivery delays for verification.
- A returning participant reaches the composer in one tap and can send a short
  text-only update in about 30 seconds.
- In a five-participant usability pass, at least four complete each core flow
  without assistance. Every participant can tell whether work is local or sent.
- Participants can explain who will see their update before sending it.

### Must-pass scenarios

- Paste a valid code; link a new identity; skip unnecessary verification for an
  already verified account; retry an interrupted successful claim.
- Test invalid/expired codes, repeated guesses, identity mismatch, duplicate
  claims, and reissued codes without exposing contact details.
- Submit an update with no project or group; edit today's record; view history.
- Write offline, force-close, restore the draft, and submit after reconnection.
- Interrupt a save or lose its response; retry without duplicate records.
- Fail an image upload and still send the text after removing the attachment.
- Switch accounts and cohorts without crossing drafts, caches, or permissions.
- Cross midnight and recover an older draft without changing its date silently.
- Preserve local work when another device has edited the server version.
- Verify author-only draft access, staff-scoped update access, cohort isolation,
  and private contact/storage access with negative authorization tests.
- Complete both flows in Thai and English with large text and a screen reader.
- Verify the old project/day update records are unchanged.

## 9. Decisions to review

The recommended defaults make this document concrete while leaving ownership
with the reviewer.

1. **Linking codes:** unique to each participant, single-use and reissuable,
   rather than one shared cohort password?
2. **Identity:** verify email, collect mobile privately without SMS verification
   in this first slice, or is verified mobile essential?
3. **Audience:** daily updates visible to author and authorized SHIFT staff only,
   or also to peers in the same cohort? Never assume app-wide visibility.
4. **Update rhythm:** one editable personal update per local date, and are late
   updates or updates outside cohort dates allowed?
5. **Form:** one required “What did you try?” field, with learning, help, and an
   attachment optional, and no project/group prerequisite?

These points were resolved using the recommended defaults above when implementation was authorized. Community, icebreakers,
mentor booking, and Discord integrations remain outside this first slice.
