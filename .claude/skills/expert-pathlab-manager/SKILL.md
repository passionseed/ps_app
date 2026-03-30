---
name: expert-pathlab-manager
description: Use when viewing or editing expert interviews, PathLab content, seeds, paths, path_days, path_activities, path_content, or node_content in Supabase. Triggers include tasks about expert_profiles, expert_pathlabs, learning content management, or PathLab generation.
---

# Expert PathLab Manager

## Overview

Reference skill for viewing and editing expert interviews, generated PathLabs, and all related content via Supabase API. Uses service role for admin-level operations.

**Core principle:** Know the exact schema before writing queries. Column names and relationships are non-obvious.

## Data Flow

```
expert_profiles (interview_data/transcript)
    ↓
expert_pathlabs (generation_status: pending→generating→completed/failed)
    ↓
seeds → seed_categories, seed_npc_avatars
    ↓
paths → path_days → path_activities
    ↓
path_content / path_assessments → path_quiz_questions
    ↓
path_activity_progress → path_assessment_submissions
                       → path_ai_chat_sessions → path_ai_chat_messages
                       → path_npc_conversation_progress
```

## Quick Reference: Tables & Key Fields

### Core PathLab Tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `expert_profiles` | `id`, `name`, `title`, `company`, `field_category`, `interview_data` (JSONB), `interview_transcript` (JSONB), `status` | status: pending/approved/rejected/claimed |
| `expert_pathlabs` | `expert_profile_id`, `seed_id`, `path_id`, `generation_status` | generation_status: pending/generating/completed/failed |
| `seeds` | `id`, `map_id` (REQUIRED), `title`, `description`, `slogan`, `cover_image_url`, `cover_image_key`, `cover_image_blurhash`, `seed_type`, `category_id`, `visibility` | seed_type: collaborative/pathlab; visibility: hidden/visible/featured; cover_image_url links to storage bucket |
| `seed_categories` | `id`, `name`, `logo_url` | |
| `seed_npc_avatars` | `seed_id`, `name`, `svg_data`, `description` | NPC guide for PathLab — use `svg_data` not `avatar_url` |
| `paths` | `id`, `seed_id`, `total_days`, `created_by` | One path per seed |
| `path_days` | `id`, `path_id`, `day_number`, `title` (nullable), `context_text`, `reflection_prompts` (JSONB array), `node_ids` (UUID[]), `migrated_from_nodes` (bool), `activity_count` (int, auto-maintained by trigger) | reflection_prompts is JSONB not TEXT[] |
| `path_activities` | `id`, `path_day_id`, `title`, `instructions`, `display_order`, `estimated_minutes`, `is_required`, `is_draft`, `draft_reason` | NO activity_type column — type determined by path_content.content_type or path_assessments.assessment_type |
| `path_content` | `id`, `activity_id`, `content_type`, `content_title`, `content_url`, `content_body`, `display_order`, `metadata` (JSONB) | **CRITICAL:** For video/short_video, YouTube URLs go in `content_url` (not `content_body`). The app's YoutubePlayer only reads `content_url`. |
| `path_assessments` | `id`, `activity_id`, `assessment_type`, `points_possible`, `is_graded`, `metadata` (JSONB) | One per activity (UNIQUE constraint). This is how a seeded activity gets a homework/submission step; see assessment_type enum below |
| `path_quiz_questions` | `id`, `assessment_id`, `question_text`, `options` (JSONB), `correct_option` | |
| `map_nodes` | `id`, `map_id`, `title`, `node_type`, `metadata` | Legacy node system |
| `node_content` | `id`, `node_id`, `content_type`, `content_title`, `content_url`, `content_body` | Legacy content |

### Content & Assessment Types

**`path_content.content_type`** (full enum):
```
video, short_video, canva_slide, text, image, pdf, ai_chat, npc_chat
```

**`path_assessments.assessment_type`** (full enum):
```
text_answer, file_upload, image_upload
```

### Template Tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `activity_templates` | `id`, `created_by`, `title`, `description`, `activity_type`, `content_template` (JSONB), `assessment_template` (JSONB), `estimated_minutes`, `is_public`, `use_count` | activity_type: learning/reflection/milestone/checkpoint/journal_prompt |
| `page_templates` | `id`, `created_by`, `title`, `description`, `activities` (JSONB array), `context_text`, `reflection_prompts` (TEXT[]), `estimated_total_minutes`, `visibility`, `use_count` | visibility: private/organization/public |

### Progress & Engagement Tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `path_enrollments` | `id`, `user_id`, `path_id`, `current_day`, `status` | status: active/paused/quit/explored |
| `path_activity_progress` | `id`, `enrollment_id`, `activity_id`, `status`, `started_at`, `completed_at`, `time_spent_seconds` | status: not_started/in_progress/completed/skipped; UNIQUE(enrollment_id, activity_id) |
| `path_assessment_submissions` | `id`, `progress_id`, `assessment_id`, `text_answer`, `file_urls` (TEXT[]), `image_url`, `quiz_answers` (JSONB), `metadata` (JSONB) | Learner homework submissions for PathLab activities |
| `path_reflections` | `id`, `enrollment_id`, `day_number`, `energy_level` (1-5), `confusion_level` (1-5) | |
| `path_exit_reflections` | `id`, `enrollment_id`, `trigger_day`, `reason_category`, `interest_change` | reason_category: boring/confusing/stressful/not_me |
| `path_end_reflections` | `id`, `enrollment_id`, `overall_interest` (1-5), `fit_level` (1-5), `surprise_response` | |
| `path_reports` | `id`, `enrollment_id`, `generated_by`, `report_data` (JSONB), `report_text` | |

### Homework / Submission Model

For normal PathLab seeds, homework is not stored directly on `path_activities`.

The current contract is:

1. Create the `path_activities` row
2. Optionally create one or more `path_content` rows for instructions/materials
3. Create one `path_assessments` row when the activity should accept homework
4. Student progress is tracked in `path_activity_progress`
5. Actual homework submissions are stored in `path_assessment_submissions`

Use this mapping:

| Homework UX | Database shape |
|-------------|----------------|
| short written response | `path_assessments.assessment_type = 'text_answer'` + `path_assessment_submissions.text_answer` |
| file upload / attachment | `path_assessments.assessment_type = 'file_upload'` + `path_assessment_submissions.file_urls` |
| image-based homework | `path_assessments.assessment_type = 'image_upload'` + `path_assessment_submissions.image_url` |

Important:

- `path_activities` alone does **not** make an activity submittable
- a seed activity only has homework if you also seed a `path_assessments` row for that activity
- the current `supabase/seed/web-developer-pathlab-seed.sql` file seeds activities and content, but does **not** seed any `path_assessments` rows yet
- hackathon/team workflows use separate tables: `hackathon_activity_individual_submissions`, `hackathon_activity_team_submissions`, `hackathon_activity_ai_reviews`, `hackathon_activity_mentor_reviews`

### AI Chat Tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `path_ai_chat_sessions` | `id`, `progress_id`, `activity_id`, `user_id`, `objective`, `completion_percentage` (0-100), `is_completed`, `total_messages` | UNIQUE(progress_id) |
| `path_ai_chat_messages` | `id`, `session_id`, `role`, `content` | role: user/assistant/system |

### NPC Conversation Tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `path_npc_conversations` | `id`, `seed_id`, `title`, `description`, `root_node_id`, `estimated_minutes`, `created_by` | Root container for conversation tree |
| `path_npc_conversation_nodes` | `id`, `conversation_id`, `npc_avatar_id`, `node_type`, `text_content`, `title`, `metadata` (JSONB) | node_type: question/statement/end |
| `path_npc_conversation_choices` | `id`, `from_node_id`, `to_node_id`, `choice_text`, `choice_label`, `display_order` | Branches between nodes |
| `path_npc_conversation_progress` | `id`, `progress_id`, `conversation_id`, `user_id` | Tracks user's position in conversation |

### Storage Buckets

| Bucket | Purpose | Notes |
|--------|---------|-------|
| `seed-assets` | Seed cover images | Upload cover images here, then set `seeds.cover_image_url` to the public URL |
| `pathlab-videos` | PathLab video content | For uploaded video files (YouTube videos use `content_url` directly) |

**Upload flow for seed cover images:**
```javascript
// 1. Upload image to storage
const { data, error } = await supabase.storage
  .from('seed-assets')
  .upload('my-seed-cover.png', fileBuffer, {
    contentType: 'image/png',
    upsert: true
  });

// 2. Get public URL
const publicUrl = supabase.storage
  .from('seed-assets')
  .getPublicUrl('my-seed-cover.png');

// 3. Update seed with cover image
await supabase
  .from('seeds')
  .update({
    cover_image_url: publicUrl,
    cover_image_key: 'my-seed-cover.png'
  })
  .eq('id', seedId);
```

## View Operations

### Expert Profiles

```javascript
// List all approved experts
const { data } = await supabase
  .from('expert_profiles')
  .select('id, name, title, company, field_category, status, interview_data')
  .eq('status', 'approved')
  .order('created_at', { ascending: false });

// Get single expert with interview data
const { data } = await supabase
  .from('expert_profiles')
  .select('*')
  .eq('id', expertId)
  .single();
```

### Expert PathLabs

```javascript
// List all expert_pathlabs with status
const { data } = await supabase
  .from('expert_pathlabs')
  .select(`
    id,
    generation_status,
    generation_error,
    expert_profiles (id, name, title),
    seeds (id, title, visibility),
    paths (id, total_days)
  `)
  .order('created_at', { ascending: false });

// Get by generation status
const { data } = await supabase
  .from('expert_pathlabs')
  .select('*')
  .eq('generation_status', 'failed');
```

### Seeds & Paths

```javascript
// List visible pathlab seeds with category
const { data } = await supabase
  .from('seeds')
  .select(`
    id,
    title,
    seed_type,
    visibility,
    seed_categories (name),
    paths (id, total_days)
  `)
  .eq('seed_type', 'pathlab')
  .in('visibility', ['visible', 'featured']);

// Get full path with days and activities
const { data } = await supabase
  .from('paths')
  .select(`
    id,
    total_days,
    path_days (
      id,
      day_number,
      title,
      context_text,
      reflection_prompts,
      activity_count,
      path_activities (
        id,
        title,
        display_order,
        instructions,
        estimated_minutes,
        is_draft,
        path_content (id, content_type, content_body, content_title),
        path_assessments (id, assessment_type, metadata)
      )
    )
  `)
  .eq('id', pathId)
  .single();
```

## Edit Operations

### Create Expert PathLab

```javascript
// 1. Create seed
const { data: seed } = await supabase
  .from('seeds')
  .insert({
    map_id: learningMapId,  // Required
    title: 'Expert PathLab Title',
    description: 'From expert interview',
    seed_type: 'pathlab',
    category_id: categoryId,
    visibility: 'hidden'  // Start hidden, change to 'visible' when ready
  })
  .select()
  .single();

// 2. Create path
const { data: path } = await supabase
  .from('paths')
  .insert({
    seed_id: seed.id,
    total_days: 5,
    created_by: adminUserId
  })
  .select()
  .single();

// 3. Link to expert_pathlabs
const { data: expertPathlab } = await supabase
  .from('expert_pathlabs')
  .insert({
    expert_profile_id: expertId,
    seed_id: seed.id,
    path_id: path.id,
    generation_status: 'completed'
  })
  .select()
  .single();
```

### Create Path Day with Content

```javascript
// Create path day
// NOTE: reflection_prompts is JSONB, not TEXT[]
const { data: day } = await supabase
  .from('path_days')
  .insert({
    path_id: pathId,
    day_number: 1,
    title: 'Day 1: Introduction',  // Optional
    context_text: 'Day 1 context...',
    reflection_prompts: ['What did you learn?', 'How will you apply this?'],  // JSONB array
    node_ids: [],
    migrated_from_nodes: true
  })
  .select()
  .single();

// Create activity
// NO activity_type field — type is determined by content/assessment added
const { data: activity } = await supabase
  .from('path_activities')
  .insert({
    path_day_id: day.id,
    title: 'Introduction',
    display_order: 0,
    instructions: 'Read the introduction...',
    estimated_minutes: 5,
    is_required: true,
    is_draft: false
  })
  .select()
  .single();

// Add content (content_type determines the activity's type)
const { data: content } = await supabase
  .from('path_content')
  .insert({
    activity_id: activity.id,
    content_type: 'text',  // or 'video', 'short_video', 'canva_slide', 'image', 'pdf', 'ai_chat', 'npc_chat'
    content_title: 'Introduction',
    content_body: 'Content here...',
    display_order: 0,
    metadata: {}
  })
  .select()
  .single();

// For VIDEO content — URL MUST go in content_url, not content_body
const { data: videoContent } = await supabase
  .from('path_content')
  .insert({
    activity_id: activity.id,
    content_type: 'video',  // or 'short_video'
    content_title: 'YC: How to Get Startup Ideas',
    content_url: 'https://www.youtube.com/watch?v=DGU0wXMKqf4',  // ← REQUIRED for YouTube
    content_body: null,  // Optional description text
    display_order: 0,
    metadata: {}
  })
  .select()
  .single();

// Add homework submission to the activity
const { data: assessment } = await supabase
  .from('path_assessments')
  .insert({
    activity_id: activity.id,
    assessment_type: 'text_answer',  // or 'file_upload' / 'image_upload'
    is_graded: false,
    metadata: {
      submission_label: 'Homework',
      min_words: 100,
      rubric: 'Explain what you built and what you learned'
    }
  })
  .select()
  .single();
```

### View Homework for an Activity

```javascript
// Load the activity, its homework definition, and learner submissions
const { data: activity } = await supabase
  .from('path_activities')
  .select(`
    id,
    title,
    instructions,
    path_assessments (
      id,
      assessment_type,
      metadata,
      path_assessment_submissions (
        id,
        progress_id,
        text_answer,
        file_urls,
        image_url,
        metadata,
        submitted_at
      )
    )
  `)
  .eq('id', activityId)
  .single();
```

### Update Expert Interview Data

```javascript
// Update interview_data (JSONB — use raw assignment, not merge)
const { data } = await supabase
  .from('expert_profiles')
  .update({
    interview_data: { key: 'value', topics: ['a', 'b'] },
    status: 'approved'
  })
  .eq('id', expertId)
  .select()
  .single();
```

### Update Generation Status

```javascript
const { data } = await supabase
  .from('expert_pathlabs')
  .update({
    generation_status: 'completed',
    generated_at: new Date().toISOString()
  })
  .eq('id', expertPathlabId)
  .select()
  .single();
```

### Publish a PathLab

```javascript
// Make a seed visible in the app
await supabase
  .from('seeds')
  .update({ visibility: 'visible' })  // or 'featured' for promoted
  .eq('id', seedId);
```

## Common Workflows

### Create Full PathLab from Expert

1. Get expert's `interview_data` from `expert_profiles`
2. Create `seeds` record with `seed_type: 'pathlab'`, `visibility: 'hidden'`
3. Create `paths` record linked to seed
4. Create `path_days` for each day (reflection_prompts as JSONB, migrated_from_nodes: true)
5. Create `path_activities` for each day (no activity_type field)
6. Create `path_content` for activities (content_type determines the activity type)
7. For any activity that should collect homework, create `path_assessments`
8. Update `expert_pathlabs` with `seed_id`, `path_id`, `generation_status: 'completed'`
9. When ready, set `seeds.visibility = 'visible'`

### Fix Failed Generation

```javascript
// Get failed generations
const { data: failed } = await supabase
  .from('expert_pathlabs')
  .select('*, expert_profiles (name)')
  .eq('generation_status', 'failed');

// Update to retry
await supabase
  .from('expert_pathlabs')
  .update({ generation_status: 'pending', generation_error: null })
  .eq('id', failedId);
```

### Fix Video Content with URL in Wrong Field

```javascript
// Find video content where URL is in content_body instead of content_url
const { data: brokenVideos } = await supabase
  .from('path_content')
  .select('id, content_title, content_url, content_body')
  .in('content_type', ['video', 'short_video'])
  .is('content_url', null)
  .not('content_body', 'is', null);

// Fix each one
for (const video of brokenVideos) {
  // Check if content_body contains a URL
  const urlMatch = video.content_body?.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    await supabase
      .from('path_content')
      .update({
        content_url: urlMatch[0],
        content_body: null
      })
      .eq('id', video.id);
    console.log(`Fixed: ${video.content_title}`);
  }
}
```

### Set Day Titles

```javascript
// Days without titles fall back to seed title in the app
// Set meaningful titles for each day based on the day's theme

const dayTitles = {
  1: "Finding Real Problems",
  2: "Customer Validation",
  3: "Embracing Failure",
  4: "Human Connection",
  5: "Impact-Driven Motivation"
};

for (const [dayNum, title] of Object.entries(dayTitles)) {
  await supabase
    .from('path_days')
    .update({ title })
    .eq('path_id', pathId)
    .eq('day_number', parseInt(dayNum));
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `expert_id` instead of `expert_profile_id` | FK is `expert_profile_id` |
| Using `pathlab_id` in expert_pathlabs | Use `seed_id` and `path_id` separately |
| Using `body` instead of `content_body` | Column is `content_body` |
| Using `order_index` instead of `display_order` | Column is `display_order` |
| Forgetting `map_id` on seeds | `map_id` is required |
| Not using `.select().single()` on insert/update | Always return created record |
| Using `activity_type` in path_activities | NO activity_type column — removed by migration; type is determined by path_content.content_type |
| Using `difficulty` in seeds | No difficulty column in seeds table |
| Using `role`, `avatar_url`, `greeting_text` in seed_npc_avatars | Use `svg_data` and `description` instead |
| Using TEXT[] for reflection_prompts in path_days | It is JSONB, not TEXT[] |
| Manually setting `activity_count` on path_days | Auto-maintained by DB trigger — do not set manually |
| Forgetting `is_draft: false` on activities | Defaults to false, but students cannot see draft activities |
| Using removed content types (resource_link, order_code, daily_prompt, reflection_card, emotion_check, progress_snapshot) | Full enum is now: video/short_video/canva_slide/text/image/pdf/ai_chat/npc_chat |
| Using removed assessment types (quiz, checklist, daily_reflection, interest_rating, energy_check) | Full enum is now: text_answer/file_upload/image_upload |
| Assuming every activity can accept homework automatically | Only activities with a `path_assessments` row can collect submissions |
| Storing homework instructions only in `path_content` | Instructional content is separate from the actual submission contract in `path_assessments` |
| Using PathLab submission tables for team hackathon workflows | Use `hackathon_activity_individual_submissions` / `hackathon_activity_team_submissions` for collaborative evidence workflows |
| Not setting `visibility` on seeds | Defaults to `hidden` — set to `visible` or `featured` to show in app |
| Putting video URLs in `content_body` instead of `content_url` | For video/short_video content, YouTube URLs MUST go in `content_url` field — the app's YoutubePlayer only reads from `content_url`, not `content_body` |
| Forgetting to set `cover_image_url` on seeds | Seeds without cover images look broken in the app — upload to `seed-assets` bucket and set `cover_image_url` |
| Leaving `path_days.title` as null | Days without titles fall back to seed title in the app — set meaningful day titles like "Finding Real Problems", "Customer Validation", etc. |

## Required Fields Summary

| Table | Required on Insert |
|-------|-------------------|
| `seeds` | `map_id`, `title` — **Recommended: `cover_image_url` for app display** |
| `paths` | `seed_id`, `created_by` |
| `path_days` | `path_id`, `day_number`, `context_text` |
| `path_activities` | `path_day_id`, `title` |
| `path_content` | `activity_id`, `content_type` — **For video/short_video: `content_url` is required** |
| `path_assessments` | `activity_id`, `assessment_type` |
| `expert_pathlabs` | `expert_profile_id` |
| `seed_npc_avatars` | `seed_id`, `name`, `svg_data` |
| `activity_templates` | `created_by`, `title`, `activity_type` |
| `path_npc_conversations` | `seed_id`, `title` |
| `path_npc_conversation_nodes` | `conversation_id`, `node_type`, `text_content` |
| `path_npc_conversation_choices` | `from_node_id`, `choice_text` |
