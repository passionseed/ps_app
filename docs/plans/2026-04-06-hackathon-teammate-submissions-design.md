# Hackathon Teammate Submissions Design

**Problem**

In the hackathon learning activity solo-work flow, the activity screen currently refreshes only the current participant's submission history after submit. The user wants the post-submit state to also show teammate submissions for the same activity.

**Outcome**

After a participant submits a solo activity, the screen should show:

- their own submission history
- a teammate submissions section for the same activity

On later revisits, if the participant has already submitted that activity before, both sections should still be visible.

## Runtime Scope

- Frontend/UI change in the hackathon activity detail screen
- Helper/data-fetch extension in the mobile submission helper
- No storage model change
- No seed or production data rewrite

## Existing Runtime Path

- `app/(hackathon)/activity/[nodeId].tsx`
  - loads activity detail
  - loads the current participant's submission history with `fetchActivitySubmissions`
  - refreshes that history after submit
- `lib/hackathon-submit.ts`
  - reads the local hackathon participant
  - inserts into `hackathon_phase_activity_submissions`
  - fetches only the current participant's submissions
- `lib/hackathonProgram.ts`
  - already resolves hackathon team membership and team member IDs through `hackathon_team_members`

## Recommended Approach

Add a second submission query path for teammate rows instead of mixing all submissions into one feed.

### Data flow

1. Read the current hackathon participant.
2. Resolve their current row in `hackathon_team_members`.
3. Load all team member participant IDs for that `team_id`.
4. Exclude the current participant ID.
5. Query `hackathon_phase_activity_submissions` for the same `activity_id` and those teammate IDs.
6. Query `hackathon_participants` for teammate names.
7. Return enriched teammate submission rows sorted newest first.

### UI flow

The activity screen keeps the current "your submission history" list and adds a second "teammate submissions" list beneath it.

Each teammate card shows:

- teammate name
- submitted timestamp
- text answer, image preview, or file label using the same rendering rules as the personal history list

### Reveal rule

The teammate section appears only when the participant has at least one submission for the current activity.

This satisfies "after you submit" while also keeping the section visible on later revisits after a prior submission.

## Why This Approach

- Preserves the existing mental model of "my work" versus "team work"
- Reuses the current screen instead of adding navigation or modal state
- Avoids backend/schema churn
- Keeps the change local to the current mobile runtime path

## Risks

- Team membership may be missing: teammate section should silently hide.
- A participant may have no teammates or no teammate submissions yet: render nothing or a soft empty state.
- Submission rows may be multiple per teammate: keep newest-first ordering and show all returned rows.

## Verification Target

- Before submit: no teammate section
- After successful submit: personal history refreshes and teammate section loads
- Reopen screen after prior submission: both sections still load
- No regression to text, image, or file submission flows
