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
```

## Quick Reference: Tables & Key Fields

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `expert_profiles` | `id`, `name`, `title`, `company`, `field_category`, `interview_data` (JSONB), `interview_transcript` (JSONB), `status` | status: pending/approved/rejected/claimed |
| `expert_pathlabs` | `expert_profile_id`, `seed_id`, `path_id`, `generation_status` | generation_status: pending/generating/completed/failed |
| `seeds` | `id`, `map_id`, `title`, `description`, `seed_type`, `category_id` | seed_type: collaborative/pathlab |
| `seed_categories` | `id`, `name`, `logo_url` | |
| `seed_npc_avatars` | `seed_id`, `name`, `svg_data`, `description` | NPC guide for PathLab |
| `paths` | `id`, `seed_id`, `total_days`, `created_by` | One path per seed |
| `path_days` | `id`, `path_id`, `day_number`, `context_text`, `reflection_prompts` (JSONB) | |
| `path_activities` | `id`, `path_day_id`, `title`, `instructions`, `activity_type`, `display_order` | activity_type: learning/reflection/milestone/checkpoint/journal_prompt |
| `path_content` | `id`, `activity_id`, `content_type`, `content_title`, `content_url`, `content_body` | content_type: video/canva_slide/text/image/pdf/resource_link/daily_prompt/reflection_card |
| `path_assessments` | `id`, `activity_id`, `assessment_type`, `metadata` | assessment_type: quiz/text_answer/file_upload/daily_reflection/interest_rating |
| `path_quiz_questions` | `id`, `assessment_id`, `question_text`, `options` (JSONB), `correct_option` | |
| `map_nodes` | `id`, `map_id`, `title`, `instructions`, `difficulty` | Legacy node system |
| `node_content` | `id`, `node_id`, `content_type`, `content_title`, `content_url`, `content_body` | Legacy content |

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
    seeds (id, title),
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
// List seeds with category
const { data } = await supabase
  .from('seeds')
  .select(`
    id,
    title,
    seed_type,
    seed_categories (name),
    paths (id, total_days)
  `)
  .eq('seed_type', 'pathlab');

// Get full path with days and activities
const { data } = await supabase
  .from('paths')
  .select(`
    id,
    total_days,
    path_days (
      id,
      day_number,
      context_text,
      reflection_prompts,
      path_activities (
        id,
        title,
        activity_type,
        display_order,
        path_content (id, content_type, content_body),
        path_assessments (id, assessment_type)
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
    category_id: categoryId
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
const { data: day } = await supabase
  .from('path_days')
  .insert({
    path_id: pathId,
    day_number: 1,
    context_text: 'Day 1 context...',
    reflection_prompts: ['What did you learn?', 'How will you apply this?']
  })
  .select()
  .single();

// Create activity
const { data: activity } = await supabase
  .from('path_activities')
  .insert({
    path_day_id: day.id,
    title: 'Introduction',
    activity_type: 'learning',
    display_order: 1,
    instructions: 'Read the introduction...'
  })
  .select()
  .single();

// Add content to activity
const { data: content } = await supabase
  .from('path_content')
  .insert({
    activity_id: activity.id,
    content_type: 'text',
    content_title: 'Introduction',
    content_body: 'Content here...',
    display_order: 0
  })
  .select()
  .single();
```

### Update Expert Interview Data

```javascript
// Update interview_data (JSONB - use raw assignment, not merge)
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

## Common Workflows

### Create Full PathLab from Expert

1. Get expert's `interview_data` from `expert_profiles`
2. Create `seeds` record with `seed_type: 'pathlab'`
3. Create `paths` record linked to seed
4. Create `path_days` for each day
5. Create `path_activities` for each day
6. Create `path_content` for activities
7. Update `expert_pathlabs` with `seed_id`, `path_id`, `generation_status: 'completed'`

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

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `expert_id` instead of `expert_profile_id` | FK is `expert_profile_id` |
| Using `pathlab_id` in expert_pathlabs | Use `seed_id` and `path_id` separately |
| Using `body` instead of `content_body` | Column is `content_body` |
| Using `order_index` instead of `display_order` | Column is `display_order` |
| Forgetting `map_id` on seeds | `map_id` is required |
| Not using `.select().single()` on insert/update | Always return created record |
| Using wrong content_type values | Check enum: video/canva_slide/text/image/pdf/resource_link/daily_prompt/reflection_card/emotion_check/progress_snapshot |

## Required Fields Summary

| Table | Required on Insert |
|-------|-------------------|
| `seeds` | `map_id`, `title` |
| `paths` | `seed_id`, `created_by` |
| `path_days` | `path_id`, `day_number`, `context_text` |
| `path_activities` | `path_day_id`, `title`, `activity_type` |
| `path_content` | `activity_id`, `content_type` |
| `expert_pathlabs` | `expert_profile_id` |