# NPC Conversation Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 broken `npc_chat` activities in the Web Developer PathLab by creating proper `path_npc_conversations` tree records and rewiring `path_content` metadata to reference them.

**Architecture:** Two SQL files — a one-time migration for the live local DB, and an updated seed so `supabase db reset` produces correct data going forward. No app code changes needed.

**Tech Stack:** Supabase (PostgreSQL), SQL, local Supabase CLI (`supabase db reset`)

**Spec:** `docs/superpowers/specs/2026-03-20-npc-conversation-migration-design.md`

---

## Fixed UUIDs Reference

These are deterministic UUIDs used throughout both files. Copy-paste carefully.

### Conversations
| Day | Conversation UUID |
|-----|-------------------|
| 1 | `a1000001-0000-0000-0000-000000000001` |
| 2 | `a1000001-0000-0000-0000-000000000002` |
| 3 | `a1000001-0000-0000-0000-000000000003` |
| 4 | `a1000001-0000-0000-0000-000000000004` |
| 5 | `a1000001-0000-0000-0000-000000000005` |

### Nodes
| Day | Node | UUID |
|-----|------|------|
| 1 | statement | `b1000001-0000-0000-0000-000000000001` |
| 1 | end | `b1000001-0000-0000-0000-000000000002` |
| 2 | statement | `b1000002-0000-0000-0000-000000000001` |
| 2 | end | `b1000002-0000-0000-0000-000000000002` |
| 3 | statement | `b1000003-0000-0000-0000-000000000001` |
| 3 | end | `b1000003-0000-0000-0000-000000000002` |
| 4 | statement "Looking good!" | `b1000004-0000-0000-0000-000000000001` |
| 4 | statement "Tell me..." | `b1000004-0000-0000-0000-000000000002` |
| 4 | question "Ready to ship?" | `b1000004-0000-0000-0000-000000000003` |
| 4 | statement "Amazing!" | `b1000004-0000-0000-0000-000000000004` |
| 4 | statement "That's normal..." | `b1000004-0000-0000-0000-000000000005` |
| 4 | end | `b1000004-0000-0000-0000-000000000006` |
| 5 | statement | `b1000005-0000-0000-0000-000000000001` |
| 5 | end | `b1000005-0000-0000-0000-000000000002` |

### Choices
| Day | From → To | UUID |
|-----|-----------|------|
| 1 | stmt → end ("Got it!") | `c1000001-0000-0000-0000-000000000001` |
| 2 | stmt → end ("Got it!") | `c1000002-0000-0000-0000-000000000001` |
| 3 | stmt → end ("Got it!") | `c1000003-0000-0000-0000-000000000001` |
| 4 | node1 → node2 ("Continue") | `c1000004-0000-0000-0000-000000000001` |
| 4 | node2 → node3 ("Continue") | `c1000004-0000-0000-0000-000000000002` |
| 4 | node3 → node4 ("I'm ready to ship!") | `c1000004-0000-0000-0000-000000000003` |
| 4 | node3 → node5 ("I'm blocked by...") | `c1000004-0000-0000-0000-000000000004` |
| 4 | node4 → node6 ("Done!") | `c1000004-0000-0000-0000-000000000005` |
| 4 | node5 → node6 ("Got it!") | `c1000004-0000-0000-0000-000000000006` |
| 5 | stmt → end ("Got it!") | `c1000005-0000-0000-0000-000000000001` |

---

## Files

- **Create:** `supabase/migrations/20260320000000_npc_conversation_migration.sql`
- **Modify:** `supabase/seed/web-developer-pathlab-seed.sql`

---

## Task 1: Write the migration SQL

**File:** `supabase/migrations/20260320000000_npc_conversation_migration.sql`

- [ ] **Step 1: Create the file with this exact content**

```sql
-- Migration: Create path_npc_conversations for Web Developer PathLab
-- Fixes: "No conversation_id in metadata" error on all 5 NPC activities
-- Seed: f989a28a-1c4f-42b6-929f-fe00bc77f533 (Web Developer: Ship Your First Project)

DO $$
DECLARE
  avatar_id UUID;
BEGIN
  -- Look up Alex's NPC avatar for this seed
  SELECT id INTO avatar_id
  FROM public.seed_npc_avatars
  WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533'
  LIMIT 1;

  IF avatar_id IS NULL THEN
    RAISE EXCEPTION 'NPC avatar not found for Web Developer seed. Run seed first.';
  END IF;

  -- ============================================================
  -- INSERT CONVERSATIONS (root_node_id = NULL, set after nodes)
  -- ============================================================

  INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
  VALUES
    ('a1000001-0000-0000-0000-000000000001', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'PM Alex Introduction', NULL, 2),
    ('a1000001-0000-0000-0000-000000000002', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Requirements Review with Alex', NULL, 3),
    ('a1000001-0000-0000-0000-000000000003', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Check-in with Alex', NULL, 2),
    ('a1000001-0000-0000-0000-000000000004', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Final Review with Alex', NULL, 5),
    ('a1000001-0000-0000-0000-000000000005', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Retrospective with Alex', NULL, 3)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DAY 1: PM Alex Introduction
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', avatar_id, 'statement',
     'Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team. Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work. Today''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you — don''t worry about how it works yet. Just play. Ready to dive in?'),
    ('b1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000002', 'Got it! Let''s go.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000001-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000001';

  -- ============================================================
  -- DAY 2: Requirements Review with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000002-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', avatar_id, 'statement',
     'I saw your v0 prototype — nice start! Before we lock in the design, I have a few questions:' || E'\n\n' ||
     '1. Who is this for? Be specific — "everyone" is not an answer.' || E'\n' ||
     '2. What''s the ONE thing it needs to do really well?' || E'\n' ||
     '3. What would make you proud to ship this?' || E'\n\n' ||
     'Take a few minutes to think about these. Your answers will shape everything we build.'),
    ('b1000002-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000002', 'Got it, I''ll think on these.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000002-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000002';

  -- ============================================================
  -- DAY 3: Sprint Check-in with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000003-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003', avatar_id, 'statement',
     'How''s the sprint going?' || E'\n\n' ||
     'Quick check-in:' || E'\n' ||
     '- What''s working?' || E'\n' ||
     '- What''s blocking you?' || E'\n' ||
     '- Do you need to adjust the scope?' || E'\n\n' ||
     'Remember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify.'),
    ('b1000003-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000002', 'Got it, thanks for the check-in.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000003-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000003';

  -- ============================================================
  -- DAY 4: Final Review with Alex (branching)
  -- Tree: [stmt1] → Continue → [stmt2] → Continue →
  --       [question: ready?]
  --         "I'm ready to ship!" → [stmt: Amazing!] → Done! → [end]
  --         "I'm blocked by..."  → [stmt: Normal.]  → Got it → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000004-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Looking good! Let''s do a final review before we ship.'),
    ('b1000004-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Tell me:' || E'\n' ||
     '1. What are you most proud of?' || E'\n' ||
     '2. What would you do differently if you had more time?' || E'\n' ||
     '3. Are you ready to ship?'),
    ('b1000004-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'question',
     'If yes, let''s get this live. If not, what''s blocking you?'),
    ('b1000004-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Amazing! Let''s push it live. You shipped something real this week. That''s more than most people ever do.'),
    ('b1000004-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'That''s totally normal. Let''s simplify scope and ship what you have. A working simple app beats an unfinished complex one every time.'),
    ('b1000004-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000002', 'Continue', 1),
    ('c1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000003', 'Continue', 1),
    ('c1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000004', 'I''m ready to ship!', 1),
    ('c1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000005', 'I''m blocked by...', 2),
    ('c1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000006', 'Done!', 1),
    ('c1000004-0000-0000-0000-000000000006', 'b1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000006', 'Got it, I''ll simplify.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000004-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000004';

  -- ============================================================
  -- DAY 5: Sprint Retrospective with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000005-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', avatar_id, 'statement',
     'Great sprint! Let''s do a retrospective.' || E'\n\n' ||
     'I want you to think about the whole week:' || E'\n' ||
     '- What days did you look forward to?' || E'\n' ||
     '- What days felt like a grind?' || E'\n' ||
     '- When were you in flow? When were you frustrated?' || E'\n\n' ||
     'These aren''t just project questions — they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.' || E'\n\n' ||
     'Let''s talk about what this means for your career.'),
    ('b1000005-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000005', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000002', 'Got it, I''ll reflect on this.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000005-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000005';

  -- ============================================================
  -- REPLACE path_content rows for all 5 NPC activities
  -- Delete old inline-format rows, insert new rows with conversation_id
  -- Safe: no other table has FK referencing path_content.id
  -- ============================================================

  DELETE FROM public.path_content
  WHERE content_type = 'npc_chat'
    AND activity_id IN (
      '9f434488-e3e8-44dd-8a24-205e8c95568c',
      '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0',
      '439b6bea-0914-4e09-aa0d-e8ff3c15227d',
      '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a',
      '56504356-073f-4ee4-bd04-4193221751b5'
    );

  INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
  VALUES
    (gen_random_uuid(), '9f434488-e3e8-44dd-8a24-205e8c95568c', 'npc_chat', 'PM Alex Introduction',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000001"}'::jsonb, 1, NOW()),
    (gen_random_uuid(), '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0', 'npc_chat', 'Requirements Review with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000002"}'::jsonb, 1, NOW()),
    (gen_random_uuid(), '439b6bea-0914-4e09-aa0d-e8ff3c15227d', 'npc_chat', 'Sprint Check-in with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000003"}'::jsonb, 1, NOW()),
    (gen_random_uuid(), '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a', 'npc_chat', 'Final Review with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000004"}'::jsonb, 1, NOW()),
    (gen_random_uuid(), '56504356-073f-4ee4-bd04-4193221751b5', 'npc_chat', 'Sprint Retrospective with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000005"}'::jsonb, 1, NOW());

END $$;
```

- [ ] **Step 2: Apply the migration to local Supabase**

```bash
# From the pseed project directory (where Supabase is running):
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f /path/to/ps_app/supabase/migrations/20260320000000_npc_conversation_migration.sql
```

> If `psql` is not available, paste the SQL directly into Supabase Studio SQL editor at http://127.0.0.1:54323

- [ ] **Step 3: Verify conversations were created**

Run this query in psql or Supabase Studio:

```sql
SELECT
  c.id,
  c.title,
  c.root_node_id,
  COUNT(n.id) AS node_count,
  COUNT(ch.id) AS choice_count
FROM path_npc_conversations c
LEFT JOIN path_npc_conversation_nodes n ON n.conversation_id = c.id
LEFT JOIN path_npc_conversation_choices ch ON ch.from_node_id = n.id
WHERE c.seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533'
GROUP BY c.id, c.title, c.root_node_id
ORDER BY c.title;
```

Expected: 5 rows, all have non-null `root_node_id`, node_counts 2/2/2/6/2, choice_counts 1/1/1/6/1

- [ ] **Step 3b: Verify root_node_id points to the correct conversation's node**

```sql
SELECT c.id, c.title,
       (n.conversation_id = c.id) AS root_is_in_correct_conversation
FROM path_npc_conversations c
JOIN path_npc_conversation_nodes n ON n.id = c.root_node_id
WHERE c.seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533';
```

Expected: 5 rows, all `root_is_in_correct_conversation = true`

- [ ] **Step 4: Verify path_content rows were replaced**

```sql
SELECT activity_id, content_type, content_title, metadata
FROM path_content
WHERE content_type = 'npc_chat'
  AND activity_id IN (
    '9f434488-e3e8-44dd-8a24-205e8c95568c',
    '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0',
    '439b6bea-0914-4e09-aa0d-e8ff3c15227d',
    '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a',
    '56504356-073f-4ee4-bd04-4193221751b5'
  );
```

Expected: 5 rows, each with `metadata` containing `conversation_id`, no `content_body` data.

- [ ] **Step 5: Commit the migration file**

```bash
git add supabase/migrations/20260320000000_npc_conversation_migration.sql
git commit -m "fix(npc): create conversation trees for web dev pathlab days 1-5"
```

---

## Task 2: Update the seed SQL

Update `supabase/seed/web-developer-pathlab-seed.sql` so `supabase db reset` produces the correct structure on fresh installs.

For each of the 5 NPC activities, find the old `INSERT INTO public.path_content` block with `content_type = 'npc_chat'` and `content_body` containing `"npc_id": "pm-alex"`, and replace the entire block.

**Pattern to find (varies slightly per day):**
```sql
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  '<activity_id>',
  'npc_chat',
  '<title>',
  '{...}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 1: Add NPC conversation section to seed (insert before DAY 1 PATH_CONTENT section)**

Find the comment `-- DAY 1: PATH_CONTENT` in the seed file and insert the following block immediately before it:

```sql
-- ============================================================================
-- NPC AVATAR LOOKUP HELPER (used in NPC conversation inserts below)
-- ============================================================================
-- Note: avatar_id is referenced inline via subquery in each node insert.
-- Alex's avatar was inserted in section 3 above with ON CONFLICT DO NOTHING.

-- ============================================================================
-- NPC CONVERSATIONS (path_npc_conversations + nodes + choices)
-- ============================================================================

-- DAY 1: PM Alex Introduction
INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
VALUES ('a1000001-0000-0000-0000-000000000001', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'PM Alex Introduction', NULL, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
VALUES
  ('b1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement',
   'Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team. Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work. Today''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you — don''t worry about how it works yet. Just play. Ready to dive in?'),
  ('b1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'end', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
VALUES ('c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000002', 'Got it! Let''s go.', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.path_npc_conversations SET root_node_id = 'b1000001-0000-0000-0000-000000000001'
WHERE id = 'a1000001-0000-0000-0000-000000000001';

-- DAY 2: Requirements Review with Alex
INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
VALUES ('a1000001-0000-0000-0000-000000000002', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Requirements Review with Alex', NULL, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
VALUES
  ('b1000002-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement',
   'I saw your v0 prototype — nice start! Before we lock in the design, I have a few questions:' || E'\n\n' ||
   '1. Who is this for? Be specific — "everyone" is not an answer.' || E'\n' ||
   '2. What''s the ONE thing it needs to do really well?' || E'\n' ||
   '3. What would make you proud to ship this?' || E'\n\n' ||
   'Take a few minutes to think about these. Your answers will shape everything we build.'),
  ('b1000002-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'end', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
VALUES ('c1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000002', 'Got it, I''ll think on these.', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.path_npc_conversations SET root_node_id = 'b1000002-0000-0000-0000-000000000001'
WHERE id = 'a1000001-0000-0000-0000-000000000002';

-- DAY 3: Sprint Check-in with Alex
INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
VALUES ('a1000001-0000-0000-0000-000000000003', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Check-in with Alex', NULL, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
VALUES
  ('b1000003-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement',
   'How''s the sprint going?' || E'\n\n' ||
   'Quick check-in:' || E'\n' ||
   '- What''s working?' || E'\n' ||
   '- What''s blocking you?' || E'\n' ||
   '- Do you need to adjust the scope?' || E'\n\n' ||
   'Remember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify.'),
  ('b1000003-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'end', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
VALUES ('c1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000002', 'Got it, thanks for the check-in.', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.path_npc_conversations SET root_node_id = 'b1000003-0000-0000-0000-000000000001'
WHERE id = 'a1000001-0000-0000-0000-000000000003';

-- DAY 4: Final Review with Alex (branching)
INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
VALUES ('a1000001-0000-0000-0000-000000000004', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Final Review with Alex', NULL, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
VALUES
  ('b1000004-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement', 'Looking good! Let''s do a final review before we ship.'),
  ('b1000004-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement',
   'Tell me:' || E'\n' ||
   '1. What are you most proud of?' || E'\n' ||
   '2. What would you do differently if you had more time?' || E'\n' ||
   '3. Are you ready to ship?'),
  ('b1000004-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'question', 'If yes, let''s get this live. If not, what''s blocking you?'),
  ('b1000004-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement', 'Amazing! Let''s push it live. You shipped something real this week. That''s more than most people ever do.'),
  ('b1000004-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement', 'That''s totally normal. Let''s simplify scope and ship what you have. A working simple app beats an unfinished complex one every time.'),
  ('b1000004-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000004',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'end', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
VALUES
  ('c1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000002', 'Continue', 1),
  ('c1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000003', 'Continue', 1),
  ('c1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000004', 'I''m ready to ship!', 1),
  ('c1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000005', 'I''m blocked by...', 2),
  ('c1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000006', 'Done!', 1),
  ('c1000004-0000-0000-0000-000000000006', 'b1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000006', 'Got it, I''ll simplify.', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.path_npc_conversations SET root_node_id = 'b1000004-0000-0000-0000-000000000001'
WHERE id = 'a1000001-0000-0000-0000-000000000004';

-- DAY 5: Sprint Retrospective with Alex
INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
VALUES ('a1000001-0000-0000-0000-000000000005', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Retrospective with Alex', NULL, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
VALUES
  ('b1000005-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'statement',
   'Great sprint! Let''s do a retrospective.' || E'\n\n' ||
   'I want you to think about the whole week:' || E'\n' ||
   '- What days did you look forward to?' || E'\n' ||
   '- What days felt like a grind?' || E'\n' ||
   '- When were you in flow? When were you frustrated?' || E'\n\n' ||
   'These aren''t just project questions — they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.' || E'\n\n' ||
   'Let''s talk about what this means for your career.'),
  ('b1000005-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000005',
   (SELECT id FROM public.seed_npc_avatars WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533' LIMIT 1),
   'end', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
VALUES ('c1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000002', 'Got it, I''ll reflect on this.', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.path_npc_conversations SET root_node_id = 'b1000005-0000-0000-0000-000000000001'
WHERE id = 'a1000001-0000-0000-0000-000000000005';
```

- [ ] **Step 2: Replace old Day 1 npc_chat path_content block**

In `supabase/seed/web-developer-pathlab-seed.sql`, find and replace this block (around line 214):

**Find:**
```sql
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  '9f434488-e3e8-44dd-8a24-205e8c95568c',
  'npc_chat',
  'PM Alex Introduction',
  '{
    "npc_id": "pm-alex",
    "messages": [
```
(the entire INSERT block through `ON CONFLICT DO NOTHING;`)

**Replace with:**
```sql
INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
VALUES (
  gen_random_uuid(),
  '9f434488-e3e8-44dd-8a24-205e8c95568c',
  'npc_chat',
  'PM Alex Introduction',
  '{"conversation_id": "a1000001-0000-0000-0000-000000000001"}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 3: Replace old Day 2 npc_chat path_content block**

Find the block with `activity_id = '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0'` and `content_type = 'npc_chat'`.

Replace with:
```sql
INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
VALUES (
  gen_random_uuid(),
  '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0',
  'npc_chat',
  'Requirements Review with Alex',
  '{"conversation_id": "a1000001-0000-0000-0000-000000000002"}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: Replace old Day 3 npc_chat path_content block**

Find the block with `activity_id = '439b6bea-0914-4e09-aa0d-e8ff3c15227d'` and `content_type = 'npc_chat'`.

Replace with:
```sql
INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
VALUES (
  gen_random_uuid(),
  '439b6bea-0914-4e09-aa0d-e8ff3c15227d',
  'npc_chat',
  'Sprint Check-in with Alex',
  '{"conversation_id": "a1000001-0000-0000-0000-000000000003"}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 5: Replace old Day 4 npc_chat path_content block**

Find the block with `activity_id = '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a'` and `content_type = 'npc_chat'`. Note: this one has `"sender"` keys and `"prompts"` array — it's a bigger block.

Replace the entire INSERT with:
```sql
INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
VALUES (
  gen_random_uuid(),
  '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a',
  'npc_chat',
  'Final Review with Alex',
  '{"conversation_id": "a1000001-0000-0000-0000-000000000004"}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 6: Replace old Day 5 npc_chat path_content block**

Find the block with `activity_id = '56504356-073f-4ee4-bd04-4193221751b5'` and `content_type = 'npc_chat'`.

Replace with:
```sql
INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
VALUES (
  gen_random_uuid(),
  '56504356-073f-4ee4-bd04-4193221751b5',
  'npc_chat',
  'Sprint Retrospective with Alex',
  '{"conversation_id": "a1000001-0000-0000-0000-000000000005"}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;
```

- [ ] **Step 7: Verify seed has no remaining old-format npc_chat blocks**

```bash
grep -n '"npc_id": "pm-alex"' supabase/seed/web-developer-pathlab-seed.sql
```

Expected: no output (zero matches)

- [ ] **Step 8: Commit the seed update**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "fix(seed): replace inline npc_chat format with path_npc_conversations references"
```

---

## Task 3: Verify in the app

- [ ] **Step 1: Open any NPC activity in the Web Developer path**

Launch the app (`pnpm ios` or `pnpm start`) and navigate to a Day 1–5 NPC activity. The error `"No conversation_id in metadata"` must not appear.

- [ ] **Step 2: Confirm Alex's dialogue displays**

The NPC statement text from Day 1 should appear: "Hey! I'm Alex, your Product Manager..."
A "Got it! Let's go." choice button should be visible.

- [ ] **Step 3: Check Day 4 branching**

Navigate to the Day 4 "Final Review with Alex" activity. After stepping through the first two statements, you should see two choice buttons: **"I'm ready to ship!"** and **"I'm blocked by..."**. Each should lead to a different follow-up message.

- [ ] **Step 4: Verify seed reset still works**

```bash
# From pseed project (where Supabase runs):
npx supabase db reset
```

Then open the app and confirm NPC activities still work. This validates the seed changes are correct.
