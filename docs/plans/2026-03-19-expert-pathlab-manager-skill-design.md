# Design: expert-pathlab-manager Skill

## Overview

A skill for viewing and editing expert interviews, generated PathLabs, and all related content via direct Supabase API access. Uses service role for admin-level operations.

**Core principle**: Single source of truth for expert → PathLab content management with clear operation patterns.

## Target Users

- Human operators managing content
- AI agents automating PathLab creation/editing

## Auth Level

Supabase service role (admin access, bypasses RLS).

## Operations

| Domain | View | Edit |
|--------|------|------|
| Expert profiles | List, get by ID, filter by status | Create, update interview_data, update status |
| Expert PathLabs | List, get by expert, get by status | Create, update generation_status |
| Seeds | List, get by ID | Create, update, link to category |
| Paths | List, get by seed | Create, update total_days |
| Path Days | List by path, get by day number | Create, update context_text, reflection_prompts |
| Path Activities | List by day | Create, update, reorder |
| Path Content | List by activity | Create, update content_body/url |
| Path Assessments | List by activity | Create, update, add quiz questions |
| Node Content (legacy) | List by node | Create, update |

## Data Model

```
expert_profiles
    ↓ interview_data/transcript
expert_pathlabs (generation_status)
    ↓
seeds → seed_categories, seed_npc_avatars
    ↓
paths → path_days → path_activities
    ↓
path_content / path_assessments → path_quiz_questions
```

## Key Tables

### expert_profiles
- `id`, `name`, `title`, `company`, `field_category`
- `interview_data` (JSONB) - structured interview responses
- `interview_transcript` (JSONB) - raw transcript
- `status` - pending/approved/rejected/claimed

### expert_pathlabs
- `expert_profile_id`, `seed_id`, `path_id`
- `generation_status` - pending/generating/completed/failed

### seeds
- `id`, `map_id`, `title`, `description`
- `seed_type` - collaborative/pathlab
- `category_id`

### paths
- `seed_id`, `total_days`, `created_by`

### path_days
- `path_id`, `day_number`, `context_text`
- `reflection_prompts` (JSONB array)

### path_activities
- `path_day_id`, `title`, `activity_type`
- `instructions`, `display_order`

### path_content
- `activity_id`, `content_type`, `content_body`, `content_url`

### path_assessments
- `activity_id`, `assessment_type`, `metadata`

### path_quiz_questions
- `assessment_id`, `question_text`, `options`, `correct_option`

## Skill Structure

```markdown
# expert-pathlab-manager

## Overview
[2 sentences on purpose]

## Quick Reference
[Table of all tables with key fields and common queries]

## View Operations
[Patterns for each domain with code examples]

## Edit Operations
[Patterns for each domain with code examples]

## Common Workflows
- Create PathLab from expert interview
- Update expert interview data
- Fix generation errors
- Migrate node content to path content

## Common Mistakes
[What goes wrong and how to fix]
```

## Implementation Notes

- Use Supabase JS client with service role key
- All edits should include `.select().single()` to return created/updated record
- Use transactions for multi-table operations
- Handle JSONB fields carefully (merge vs replace)