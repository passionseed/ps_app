# SHIFT companion backend correction

The existing `20261002090000_shift_companion_linking.sql` migration implements a
cohort feed with a 19:00 deadline. The approved two-flow plan requires private
personal updates and a simpler date policy. Apply the corrective migration
**before distributing the companion client**. No live claims, OTPs, deployments,
or production database changes were performed during implementation.

The repository's `supabase/migrations` is a symlink into a different checkout,
outside the implementation workspace's write permissions. The additive migration
is therefore kept here, without changing an already-applied migration.

1. In the backend checkout, copy
   `20261002100000_shift_companion_contract.sql` into `supabase/migrations/`.
2. Verify/apply it to a disposable local database with the complete target schema
   and existing policies. Keep the earlier camp and companion migrations.
3. Run `contract.test.sql` in a **separate empty disposable PostgreSQL database**:
   `psql -v ON_ERROR_STOP=1 -d shift_companion_test -f scripts/shift-companion/contract.test.sql`.
   This exercises the actual migrations with a minimal legacy fixture. It does
   not substitute for full target-schema or concurrent-transaction testing.
4. Verify the release matrix in the linked plan, then migrate/release through the
   normal authorized deployment process. A native binary must contain the photo
   picker; the existing dependency is retained.

The current environment denies PostgreSQL shared memory, listening sockets,
external package resolution, and native simulator access. The SQL regression
script was authored and reviewed but **not executed here**.

## Email and recovery setup

Support uses the user-confirmed Instagram `passion_seed.th` and LINE OA
`@passionseed`. The client opens the accounts directly without putting a linking
code or contact detail in the URL. This does not send a message automatically.

The Supabase email template must include the email OTP (`{{ .Token }}`) and the
configured redirect allowlist must include the companion link and sign-in routes.
Validate this in a non-production auth environment before release; no test email
was sent here. Connecting an invite can create the expected email identity;
reauthentication uses `shouldCreateUser: false` and does not need an invite code.

Account email changes use Auth confirmation links. Keep `{{ .ConfirmationURL }}`
in the **email-change** template and include `/shift/account` in the web redirect
allowlist. Retain Secure Email Change; participants confirm both inboxes when
required, then return to Account and check confirmation. The client queries Auth
for the verified account and address before updating the SHIFT roster, and can
retry the contact sync after a restart. No email-change request or contact write
is performed by displaying the screen. Supabase describes confirmation behavior
in [the Auth documentation](https://supabase.com/docs/reference/swift/auth-updateuser)
and [email template guide](https://supabase.com/docs/guides/local-development/customizing-email-templates).

Both root routing and companion screens share the same account-scoped offline
cohort loader. It stores only cohort identifiers, names and dates, excluding
contact details. It accepts cached metadata on transport failure, never as a
successful response to an authorization failure. A verified unlink removes that
snapshot and retains local drafts.

Interrupted composers store a non-secret account-scoped date/cohort resume intent.
An email sign-in or OAuth callback can recover that intent only for the same
verified account and a permitted cohort. It cannot route another account into the
original person's draft. Signing in itself never sends an update.

## Operational contract

All calls use `public.shift_companion_action(action, payload)`. The public wrapper
executes as its owner so anonymous previews can call the private implementation
without granting anonymous schema access. The implementation verifies the JWT
identity and cohort permissions for every action. It is not directly callable by
client roles.

- `issue_code`: staff supplies `cohort_id` and the participant's expected `email`.
  Returns a single-use code once; never log/store that response in analytics.
- `reissue_code`: staff supplies `roster_id`; revokes any previous unconsumed code.
  Unclaimed records from the old migration without an expected email need a
  controlled staff correction before claiming. Do not bulk-assign identities.
- `preview_code`: accepts formatting-normalized code; returns only cohort name
  and dates. Validation consumes no code. Requests are serialized and limited
  before lookup, including valid-code requests after the limit.
- `claim`: requires an authenticated, email-verified user with the roster's
  expected email. Saves normalized mobile privately, atomically consumes the
  code, and creates companion enrollment. Retrying returns the same ownership.
- `status`: returns only the caller's active companion cohorts and own contacts.
- `today` / `history`: personal updates only; history has 30-record pages with
  an exclusive `before` date cursor. Today includes five prior updates.
- `save_daily`: one record per caller/cohort/date. Dates must be within cohort
  dates and no later than today in Asia/Bangkok. Late submissions and edits are
  allowed for an original valid cohort date, including after the cohort ends.
  There is no time-of-day cutoff. Sending never silently changes a draft's date.
- Each save requires `expected_revision` and a stable `idempotency_key`. A receipt
  is stored separately from the current record, so an old retry returns its exact
  receipt even after another edit. Reusing a key for different content is rejected.
  Account/cohort advisory locking serializes first inserts and edits.
- `update_contact`: updates only the caller's own roster mobile. Mobile is
  collected privately and is not considered verified or used for account recovery.
- `sync_contact_email`: copies the caller's confirmed `auth.users.email` into
  their active companion roster records. Caller-supplied addresses and identities
  are ignored; pending email requests cannot change the contact or claim owner.
- `staff_roster` / `staff_updates`: authorized staff access for the requested
  cohort only. Staff update pages accept `before` plus `before_author` from the
  last row to include all remaining participants on the same date. The existing operations system can also read daily updates and
  revisions directly through their author/staff RLS policies.

Personal photos use private `daily/{cohort}/{author}/{file}` paths. Only a linked
owner can upload/delete. An owner can read their own uploads; staff can read only
photos referenced by a submitted update or revision. Peers cannot read them.
The legacy project-photo branch of the authorization function remains intact.
