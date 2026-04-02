# Hackathon Activity Submission — Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Hackathon participants submit work for phase activities from the mobile app. Activities have one of three assessment types: `text_answer`, `image_upload`, or `file_upload`. This spec covers the full stack: DB table, web API endpoint, and mobile UI.

---

## Database

### New table: `hackathon_phase_activity_submissions`

```sql
id                UUID PK
participant_id    UUID NOT NULL → hackathon_participants(id)
activity_id       UUID NOT NULL → hackathon_phase_activities(id)
assessment_id     UUID NOT NULL → hackathon_phase_activity_assessments(id)
text_answer       TEXT
image_url         TEXT          -- for image_upload type
file_urls         TEXT[]        -- for file_upload type
status            TEXT NOT NULL DEFAULT 'draft'  -- draft | submitted
submitted_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()

UNIQUE(participant_id, activity_id)  -- one submission per participant per activity
```

RLS: `anon` and `authenticated` can SELECT their own rows (participant_id matches session). INSERT/UPDATE allowed for `anon`/`authenticated` on own rows.

---

## Web API (`/web`)

### `POST /api/hackathon/submit`

Single endpoint handles all 3 assessment types.

**Auth:** `Authorization: Bearer <hackathon_token>` — validates against `hackathon_sessions`, returns 401 if invalid/expired.

**Request (image_upload / file_upload):** `multipart/form-data`
- `activityId` — string
- `assessmentId` — string
- `file` — the image or document

**Request (text_answer):** `application/json`
```json
{ "activityId": "...", "assessmentId": "...", "textAnswer": "..." }
```

**Upload path (B2):**
```
hackathon/{participantId}/{activityId}/{timestamp}_{random}.{ext}
```

**Allowed file types:**
- Images: JPEG, PNG, WebP, HEIC
- Documents: PDF, DOCX, PPTX, XLSX

**Max size:** 10MB

**Response:**
```json
{ "submissionId": "...", "url": "..." }
```

**Flow:**
1. Parse + validate auth token → get `participantId`
2. For file/image: validate type + size → upload to B2 → get URL
3. Upsert row in `hackathon_phase_activity_submissions`
4. Return `submissionId` + `url`

---

## Mobile UI (`app/(hackathon)/activity/[nodeId].tsx`)

Replace `AssessmentBlock`'s "coming soon" placeholder with real upload UI per assessment type.

### `text_answer`
Already implemented (textarea). Wire submit to call `POST /api/hackathon/submit` with JSON body.

### `image_upload`
- **Empty state:** "Tap to add photo" button with camera icon
- **Picked state:** Full-width thumbnail preview + "Change" button
- **Uploading state:** Thumbnail with loading overlay + spinner
- **Uploaded state:** Thumbnail + checkmark badge
- **Error state:** Inline error message + retry button

Uses `expo-image-picker` (already installed). Camera roll only (no camera capture needed).

### `file_upload`
- **Empty state:** "Tap to attach file" button with paperclip icon
- **Picked state:** Filename + file size + remove button
- **Uploading state:** Filename + progress indicator
- **Uploaded state:** Filename + checkmark
- **Error state:** Inline error message + retry button

Uses `expo-document-picker` (needs installing).

### Submit button
- Disabled until content is provided (text non-empty / file picked & uploaded)
- Shows spinner while submitting text-only (file/image upload happens on pick, before submit)
- On success: shows "Submitted ✓" confirmation, button becomes "Resubmit"

---

## New files

| File | Purpose |
|------|---------|
| `app/api/hackathon/submit/route.ts` (in `/web`) | Upload + submit endpoint |
| `lib/hackathon-submit.ts` (in app) | API call helper |

## Modified files

| File | Change |
|------|--------|
| `app/(hackathon)/activity/[nodeId].tsx` | Replace placeholder with real upload UI |
| `supabase/migrations/20260403000000_hackathon_submissions.sql` | New table + RLS |

---

## Out of scope

- Submission grading / review UI (mentor side)
- Multiple file uploads per submission
- Camera capture (camera roll only)
- Progress tracking / status updates after submission
