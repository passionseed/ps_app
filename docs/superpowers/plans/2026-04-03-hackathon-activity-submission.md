# Hackathon Activity Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow hackathon participants to submit text answers, photos, and documents for phase activity assessments from the mobile app, storing files in Backblaze B2.

**Architecture:** A new Next.js API route (`POST /api/hackathon/submit`) in `/web` handles auth (hackathon token), file upload to B2, and DB upsert to a new `hackathon_phase_activity_submissions` table. The mobile app calls this endpoint using the stored hackathon token, with assessment-type-specific UI for each of the 3 types.

**Tech Stack:** Next.js API routes, Backblaze B2 (`lib/backblaze.ts`), Supabase (service role for DB writes), `expo-image-picker`, `expo-document-picker`, React Native

---

## File Map

**Create (web `/Users/pine/Documents/web`):**
- `app/api/hackathon/submit/route.ts` — upload + submit endpoint
- `supabase/migrations/20260403000000_hackathon_submissions.sql` — new table + RLS

**Create (app `/Users/pine/Documents/app_ps/ps_app`):**
- `lib/hackathon-submit.ts` — API call helper (submit, load existing submission)

**Modify (app):**
- `app/(hackathon)/activity/[nodeId].tsx` — replace "coming soon" with real upload UI
- `.env` / `.env.local` — add `EXPO_PUBLIC_WEB_API_URL`

---

## Task 1: DB Migration

**Files:**
- Create: `/Users/pine/Documents/web/supabase/migrations/20260403000000_hackathon_submissions.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- /Users/pine/Documents/web/supabase/migrations/20260403000000_hackathon_submissions.sql

CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.hackathon_phase_activity_assessments(id) ON DELETE CASCADE,
  text_answer TEXT,
  image_url TEXT,
  file_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_participant
  ON public.hackathon_phase_activity_submissions(participant_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_activity
  ON public.hackathon_phase_activity_submissions(activity_id);

ALTER TABLE public.hackathon_phase_activity_submissions ENABLE ROW LEVEL SECURITY;

-- anon can read/write their own rows (participant_id checked server-side via service role)
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_submissions TO authenticated;

-- Allow all reads/writes — access control is enforced at the API layer (hackathon token auth)
CREATE POLICY "allow_all_hackathon_submissions"
  ON public.hackathon_phase_activity_submissions FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS hackathon_submissions_handle_updated_at
  ON public.hackathon_phase_activity_submissions;
CREATE TRIGGER hackathon_submissions_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activity_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

- [ ] **Step 2: Push migration to remote**

```bash
cd /Users/pine/Documents/web
npx supabase db push --linked
```

Expected output: `Applying migration 20260403000000_hackathon_submissions.sql... Finished supabase db push.`

---

## Task 2: Web API Endpoint

**Files:**
- Create: `/Users/pine/Documents/web/app/api/hackathon/submit/route.ts`

- [ ] **Step 1: Create the route**

```ts
// /Users/pine/Documents/web/app/api/hackathon/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function fileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "bin";
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";

  let activityId: string;
  let assessmentId: string;
  let textAnswer: string | null = null;
  let uploadedUrl: string | null = null;
  let uploadedFileUrls: string[] | null = null;

  if (contentType.includes("application/json")) {
    // text_answer
    const body = await req.json();
    activityId = body.activityId;
    assessmentId = body.assessmentId;
    textAnswer = body.textAnswer ?? null;

    if (!activityId || !assessmentId) {
      return NextResponse.json({ error: "activityId and assessmentId are required" }, { status: 400 });
    }
  } else {
    // image_upload or file_upload
    const formData = await req.formData();
    activityId = formData.get("activityId") as string;
    assessmentId = formData.get("assessmentId") as string;
    const file = formData.get("file") as File | null;

    if (!activityId || !assessmentId || !file) {
      return NextResponse.json({ error: "activityId, assessmentId and file are required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isDoc = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isImage && !isDoc) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileExtension(file.name);
    const path = `hackathon/${participant.id}/${activityId}/${timestamp}_${random}.${ext}`;

    const result = await b2.uploadFile(file, participant.id, activityId, path);

    if (isImage) {
      uploadedUrl = result.fileUrl;
    } else {
      uploadedFileUrls = [result.fileUrl];
    }
  }

  // 3. Upsert submission
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .upsert(
      {
        participant_id: participant.id,
        activity_id: activityId,
        assessment_id: assessmentId,
        text_answer: textAnswer,
        image_url: uploadedUrl,
        file_urls: uploadedFileUrls,
        status: "submitted",
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "participant_id,activity_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[hackathon/submit] DB error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  return NextResponse.json({
    submissionId: data.id,
    url: uploadedUrl ?? uploadedFileUrls?.[0] ?? null,
  });
}
```

- [ ] **Step 2: Verify the route file compiles (no TS errors)**

```bash
cd /Users/pine/Documents/web
npx tsc --noEmit 2>&1 | grep "submit/route"
```

Expected: no output (no errors in that file).

---

## Task 3: Add Web API URL to App Env

**Files:**
- Modify: `/Users/pine/Documents/app_ps/ps_app/.env`
- Modify: `/Users/pine/Documents/app_ps/ps_app/.env.local`

- [ ] **Step 1: Add to `.env`**

Add this line to `/Users/pine/Documents/app_ps/ps_app/.env`:
```
EXPO_PUBLIC_WEB_API_URL=https://pseed.vercel.app
```

- [ ] **Step 2: Add to `.env.local` (for local dev pointing to local Next.js)**

Add this line to `/Users/pine/Documents/app_ps/ps_app/.env.local`:
```
EXPO_PUBLIC_WEB_API_URL=http://localhost:3000
```

> Note: For testing on a physical device against local Next.js, replace `localhost` with your machine's local IP (e.g. `http://192.168.1.x:3000`).

---

## Task 4: Mobile Submit Helper

**Files:**
- Create: `/Users/pine/Documents/app_ps/ps_app/lib/hackathon-submit.ts`

- [ ] **Step 1: Create the helper**

```ts
// lib/hackathon-submit.ts
import { readHackathonToken } from "./hackathon-mode";

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? "https://pseed.vercel.app";

export type SubmitResult = {
  submissionId: string;
  url: string | null;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await readHackathonToken();
  if (!token) throw new Error("Not logged in");
  return { Authorization: `Bearer ${token}` };
}

export async function submitTextAnswer(
  activityId: string,
  assessmentId: string,
  textAnswer: string
): Promise<SubmitResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WEB_API_URL}/api/hackathon/submit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ activityId, assessmentId, textAnswer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Submit failed (${res.status})`);
  }
  return res.json();
}

export async function submitFile(
  activityId: string,
  assessmentId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<SubmitResult> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("activityId", activityId);
  formData.append("assessmentId", assessmentId);
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(`${WEB_API_URL}/api/hackathon/submit`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Upload failed (${res.status})`);
  }
  return res.json();
}
```

---

## Task 5: Install expo-document-picker

- [ ] **Step 1: Install**

```bash
cd /Users/pine/Documents/app_ps/ps_app
npx expo install expo-document-picker
```

Expected: package added to package.json without errors.

---

## Task 6: Mobile UI — AssessmentBlock

**Files:**
- Modify: `/Users/pine/Documents/app_ps/ps_app/app/(hackathon)/activity/[nodeId].tsx`

This task replaces the `AssessmentBlock` component and wires up submit for all 3 types.

- [ ] **Step 1: Add imports at the top of `[nodeId].tsx`**

Add after the existing imports:
```ts
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ActivityIndicator } from "react-native";
import { submitTextAnswer, submitFile } from "../../../lib/hackathon-submit";
```

- [ ] **Step 2: Replace the `AssessmentBlock` component**

Replace the entire `AssessmentBlock` function (lines ~187–220) with:

```tsx
type UploadState = "idle" | "uploading" | "done" | "error";

function ImageUploadBlock({
  assessment,
  activityId,
  onUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  onUploaded: (url: string) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUri(asset.uri);
    setError(null);
    setState("uploading");
    try {
      const fileName = asset.uri.split("/").pop() ?? "photo.jpg";
      const mimeType = asset.mimeType ?? "image/jpeg";
      const res = await submitFile(activityId, assessment.id, asset.uri, fileName, mimeType);
      setState("done");
      onUploaded(res.url ?? asset.uri);
    } catch (e: any) {
      setState("error");
      setError(e.message ?? "Upload failed");
    }
  }

  return (
    <View style={styles.uploadBlock}>
      {uri ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
          {state === "uploading" && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={CYAN} />
            </View>
          )}
          {state === "done" && (
            <View style={styles.uploadBadge}>
              <AppText style={styles.uploadBadgeText}>✓</AppText>
            </View>
          )}
          {state !== "uploading" && (
            <Pressable style={styles.changeBtn} onPress={pick}>
              <AppText style={styles.changeBtnText}>Change</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📷</AppText>
          <AppText style={styles.uploadEmptyLabel}>Tap to add photo</AppText>
        </Pressable>
      )}
      {state === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>Retry</AppText></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function FileUploadBlock({
  assessment,
  activityId,
  onUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  onUploaded: (url: string) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFileName(asset.name);
    setFileUri(asset.uri);
    setError(null);
    setState("uploading");
    try {
      const mimeType = asset.mimeType ?? "application/octet-stream";
      const res = await submitFile(activityId, assessment.id, asset.uri, asset.name, mimeType);
      setState("done");
      onUploaded(res.url ?? asset.uri);
    } catch (e: any) {
      setState("error");
      setError(e.message ?? "Upload failed");
    }
  }

  return (
    <View style={styles.uploadBlock}>
      {fileName ? (
        <View style={styles.fileRow}>
          <AppText style={styles.fileIcon}>📄</AppText>
          <AppText style={styles.fileName} numberOfLines={1}>{fileName}</AppText>
          {state === "uploading" && <ActivityIndicator color={CYAN} size="small" />}
          {state === "done" && <AppText style={styles.fileDone}>✓</AppText>}
          {state !== "uploading" && (
            <Pressable onPress={pick}>
              <AppText style={styles.changeBtnText}>Change</AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.uploadEmptyBtn} onPress={pick}>
          <AppText style={styles.uploadEmptyIcon}>📎</AppText>
          <AppText style={styles.uploadEmptyLabel}>Tap to attach file</AppText>
        </Pressable>
      )}
      {state === "error" && error ? (
        <View style={styles.uploadError}>
          <AppText style={styles.uploadErrorText}>{error}</AppText>
          <Pressable onPress={pick}><AppText style={styles.retryText}>Retry</AppText></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function AssessmentBlock({
  assessment,
  activityId,
  value,
  onChange,
  onFileUploaded,
}: {
  assessment: HackathonPhaseActivityAssessment;
  activityId: string;
  value: string;
  onChange: (v: string) => void;
  onFileUploaded: (url: string) => void;
}) {
  const label = assessment.assessment_type === "text_answer"
    ? "Your answer"
    : assessment.assessment_type === "image_upload"
    ? "Your photo"
    : "Your file";

  return (
    <View style={styles.assessmentBlock}>
      <AppText style={styles.assessmentLabel}>
        {label}{assessment.points_possible ? ` · ${assessment.points_possible} pts` : ""}
      </AppText>
      {assessment.assessment_type === "text_answer" ? (
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Write your response here..."
          placeholderTextColor={WHITE28}
          value={value}
          onChangeText={onChange}
        />
      ) : assessment.assessment_type === "image_upload" ? (
        <ImageUploadBlock
          assessment={assessment}
          activityId={activityId}
          onUploaded={onFileUploaded}
        />
      ) : (
        <FileUploadBlock
          assessment={assessment}
          activityId={activityId}
          onUploaded={onFileUploaded}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Update state and submit logic in `HackathonActivityScreen`**

Replace the existing `const [answer, setAnswer] = useState("")` and submit button logic:

```tsx
// State
const [answer, setAnswer] = useState("");
const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);

// Derive if submit is enabled
const canSubmit = activity?.assessment
  ? activity.assessment.assessment_type === "text_answer"
    ? answer.trim().length > 0
    : uploadedUrl !== null
  : true;

async function handleSubmit() {
  if (!activity?.assessment) { router.back(); return; }
  setSubmitting(true);
  setSubmitError(null);
  try {
    if (activity.assessment.assessment_type === "text_answer") {
      await submitTextAnswer(activity.id, activity.assessment.id, answer);
    }
    // image/file already uploaded on pick — just mark done
    setSubmitted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e: any) {
    setSubmitError(e.message ?? "Submission failed");
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 4: Update the `AssessmentBlock` JSX call to pass new props**

Replace:
```tsx
<AssessmentBlock
  assessment={activity.assessment}
  value={answer}
  onChange={setAnswer}
/>
```
With:
```tsx
<AssessmentBlock
  assessment={activity.assessment}
  activityId={activity.id}
  value={answer}
  onChange={setAnswer}
  onFileUploaded={(url) => setUploadedUrl(url)}
/>
```

- [ ] **Step 5: Update submit button JSX**

Replace the two `Pressable` submit/mark-complete blocks with:
```tsx
{submitError ? (
  <AppText style={{ color: "#F87171", fontSize: 13, textAlign: "center" }}>
    {submitError}
  </AppText>
) : null}

<Pressable
  style={({ pressed }) => [
    styles.submitBtn,
    (!canSubmit || submitting) && { opacity: 0.5 },
    pressed && { opacity: 0.8 },
  ]}
  disabled={!canSubmit || submitting}
  onPress={handleSubmit}
>
  {submitting ? (
    <ActivityIndicator color={BG} />
  ) : (
    <AppText variant="bold" style={styles.submitBtnText}>
      {submitted ? "Submitted ✓" : activity.assessment ? "Submit →" : "Mark complete →"}
    </AppText>
  )}
</Pressable>
```

- [ ] **Step 6: Add new styles to `StyleSheet.create`**

Add inside the existing `styles` object:
```ts
uploadBlock: { gap: Space.sm },
uploadEmptyBtn: {
  backgroundColor: CARD_BG,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 16,
  paddingVertical: Space.xl,
  alignItems: "center",
  gap: Space.sm,
},
uploadEmptyIcon: { fontSize: 32 },
uploadEmptyLabel: { fontSize: 14, color: WHITE55 },
imagePreviewWrap: { borderRadius: 16, overflow: "hidden", position: "relative" },
imagePreview: { width: "100%", height: 220, borderRadius: 16 },
uploadOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.5)",
  alignItems: "center",
  justifyContent: "center",
},
uploadBadge: {
  position: "absolute",
  top: 10,
  right: 10,
  backgroundColor: "#4ADE80",
  borderRadius: 99,
  width: 28,
  height: 28,
  alignItems: "center",
  justifyContent: "center",
},
uploadBadgeText: { color: "#000", fontSize: 14 },
changeBtn: {
  position: "absolute",
  bottom: 10,
  right: 10,
  backgroundColor: "rgba(0,0,0,0.6)",
  borderRadius: 99,
  paddingHorizontal: 12,
  paddingVertical: 5,
},
changeBtnText: { fontSize: 12, color: CYAN },
fileRow: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: CARD_BG,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  padding: Space.md,
  gap: Space.sm,
},
fileIcon: { fontSize: 20 },
fileName: { flex: 1, fontSize: 13, color: WHITE55 },
fileDone: { fontSize: 16, color: "#4ADE80" },
uploadError: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginTop: 4 },
uploadErrorText: { fontSize: 12, color: "#F87171", flex: 1 },
retryText: { fontSize: 12, color: CYAN },
```

---

## Task 7: Verify End-to-End

- [ ] **Step 1: Start the web server**

```bash
cd /Users/pine/Documents/web
pnpm dev
```

- [ ] **Step 2: Start the app**

```bash
cd /Users/pine/Documents/app_ps/ps_app
pnpm start
```

- [ ] **Step 3: Manual test — text_answer**
  1. Open a phase → tap an activity with `text_answer` assessment
  2. Type something in the text area
  3. Tap Submit → spinner shows → "Submitted ✓" appears
  4. Verify row in DB: `SELECT * FROM hackathon_phase_activity_submissions WHERE activity_id = '<id>';`

- [ ] **Step 4: Manual test — image_upload**
  1. Open an activity with `image_upload` assessment
  2. Tap "Tap to add photo" → pick an image
  3. Thumbnail appears + spinner → then checkmark
  4. Submit button becomes enabled → tap → "Submitted ✓"
  5. Verify `image_url` is a B2 URL in DB

- [ ] **Step 5: Manual test — file_upload**
  1. Open an activity with `file_upload` assessment
  2. Tap "Tap to attach file" → pick a PDF
  3. Filename + spinner → checkmark
  4. Submit → "Submitted ✓"
  5. Verify `file_urls[0]` is a B2 URL in DB
