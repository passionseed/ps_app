# Web Developer PathLab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a complete 5-day Web Developer PathLab with NPC PM, AI chat activities, and all content in Supabase.

**Architecture:** SQL seed file that creates seed → path → NPC avatar → path_days → path_activities → path_content in correct dependency order.

**Tech Stack:** Supabase SQL, TypeScript types

---

## Task 1: Create SQL Seed File Structure

**Files:**
- Create: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Create the file with header and seed record**

```sql
-- Web Developer PathLab Seed Data: Ship Your First Project (5 Days)
-- A 5-day immersive experience to discover if web development is your career fit.
-- Uses AI tools (Cursor, v0.dev), NPC Product Manager, and ikigai framework.

-- ============================================================================
-- 1. SEED RECORD
-- ============================================================================

INSERT INTO public.seeds (id, title, description, seed_type, difficulty, created_at)
VALUES (
  'web-developer-pathlab-001',
  'Web Developer: Ship Your First Project',
  'A 5-day immersive experience to discover if web development is your career fit. Build with AI tools, ship a real project, and decide your future.',
  'pathlab',
  'beginner',
  NOW()
) ON CONFLICT (id) DO NOTHING;
```

**Step 2: Verify file created**

Run: `ls -la supabase/seed/web-developer-pathlab-seed.sql`
Expected: File exists with content

**Step 3: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add web developer seed file structure"
```

---

## Task 2: Add Path and NPC Avatar Records

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append path and NPC records**

Add after the seed INSERT:

```sql
-- ============================================================================
-- 2. PATH RECORD
-- ============================================================================

INSERT INTO public.paths (id, seed_id, total_days, created_by, created_at)
VALUES (
  'web-dev-path-001',
  'web-developer-pathlab-001',
  5,
  '00000000-0000-0000-0000-000000000000', -- System/Admin
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. NPC AVATAR - PM Alex
-- ============================================================================

INSERT INTO public.seed_npc_avatars (id, seed_id, name, role, avatar_url, greeting_text, personality)
VALUES (
  gen_random_uuid(),
  'web-developer-pathlab-001',
  'Alex',
  'Senior Product Manager',
  'pm_alex_npc.png',
  'Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team. Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. Ready to dive in?',
  '{"traits": ["encouraging", "realistic", "asks_good_questions"], "voice": "casual_professional", "uses_we_language": true}'::jsonb
) ON CONFLICT (seed_id) DO NOTHING;
```

**Step 2: Verify SQL syntax**

Run: `head -50 supabase/seed/web-developer-pathlab-seed.sql`
Expected: See seed, path, and NPC records

**Step 3: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add path and NPC avatar records"
```

---

## Task 3: Add Day 1 Path Day and Activities

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 1 path_day**

```sql
-- ============================================================================
-- 4. PATH DAYS
-- ============================================================================

-- Day 1: Setup & Discover
INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, created_at)
VALUES (
  'web-dev-day-1',
  'web-dev-path-001',
  1,
  'Day 1: Setup & Discover',
  'Welcome to your first day as a web developer. Not a student learning about web development - an actual developer with real tools. Today you''ll set up your environment, explore what''s possible, and create your first prototype. By the end of the day, you''ll have something visual to show for it.',
  ARRAY[
    'What part of today felt most exciting?',
    'What felt confusing or overwhelming?',
    'On a scale of 1-10, how curious are you to continue?'
  ],
  NOW()
) ON CONFLICT (path_id, day_number) DO NOTHING;
```

**Step 2: Append Day 1 activities**

```sql
-- ============================================================================
-- 5. PATH ACTIVITIES - DAY 1
-- ============================================================================

-- Activity 1.1: NPC Chat - Meet Your PM
INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES (
  'web-dev-act-1-1',
  'web-dev-day-1',
  'Meet Your PM',
  'learning',
  'Your Product Manager Alex will introduce the project and set expectations for the week.',
  1,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 1.2: Tool Setup
INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES (
  'web-dev-act-1-2',
  'web-dev-day-1',
  'Tool Setup',
  'learning',
  'Set up your development environment with Cursor, create a GitHub account, and configure your workspace.',
  2,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 1.3: Explore the Ecosystem
INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES (
  'web-dev-act-1-3',
  'web-dev-day-1',
  'Explore the Ecosystem',
  'learning',
  'Browse awesome lists to discover what''s possible in web development. Find projects and tools that spark your curiosity.',
  3,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 1.4: First Prototype
INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES (
  'web-dev-act-1-4',
  'web-dev-day-1',
  'First Prototype',
  'learning',
  'Use v0.dev to generate a UI for a simple project idea. Don''t worry about how it works yet - just play and explore.',
  4,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 1.5: Day 1 Reflection
INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES (
  'web-dev-act-1-5',
  'web-dev-day-1',
  'Day 1 Reflection',
  'reflection',
  'Reflect on your first day as a web developer. What excited you? What overwhelmed you?',
  5,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;
```

**Step 3: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 1 path day and activities"
```

---

## Task 4: Add Day 1 Path Content

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 1 content**

```sql
-- ============================================================================
-- 6. PATH CONTENT - DAY 1
-- ============================================================================

-- Content for Activity 1.1: NPC Chat
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES (
  gen_random_uuid(),
  'web-dev-act-1-1',
  'npc_chat',
  'PM Alex Introduction',
  '{"npc_name": "Alex", "npc_role": "Senior Product Manager", "dialogue": "Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team.\n\nLet me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work.\n\nToday''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you - don''t worry about how it works yet. Just play.\n\nReady to dive in?"}'::jsonb,
  0,
  NOW()
);

-- Content for Activity 1.2: Tool Setup
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-1-2',
  'text',
  'Install Cursor',
  'Cursor is an AI-powered code editor. Download it from cursor.sh and install it on your computer. This will be your primary development tool for the week.',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-2',
  'resource_link',
  'Cursor Download',
  'https://cursor.sh',
  1,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-2',
  'text',
  'Create a GitHub Account',
  'GitHub is where developers store and share code. Go to github.com and create a free account if you don''t have one already. You''ll use this to save your project.',
  2,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-2',
  'resource_link',
  'GitHub',
  'https://github.com',
  3,
  NOW()
);

-- Content for Activity 1.3: Explore the Ecosystem
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-1-3',
  'text',
  'Discover What''s Possible',
  'The web development ecosystem is vast. Browse these curated lists to see what kinds of projects and tools exist. Don''t try to learn everything - just explore and see what sparks your curiosity.',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-3',
  'resource_link',
  'Awesome Web Development',
  'https://github.com/micromata/awesome-web-development',
  1,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-3',
  'resource_link',
  'Awesome JavaScript',
  'https://github.com/sorrycc/awesome-javascript',
  2,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-3',
  'resource_link',
  'Awesome React',
  'https://github.com/enaqx/awesome-react',
  3,
  NOW()
);

-- Content for Activity 1.4: First Prototype
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-1-4',
  'text',
  'Generate Your First UI',
  'v0.dev is an AI tool that generates user interfaces from text descriptions. You describe what you want, and it creates the code for you.\n\nTry generating a simple landing page, a todo app, or a personal portfolio. Just type what you want and see what happens!',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-4',
  'resource_link',
  'v0.dev',
  'https://v0.dev',
  1,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-1-4',
  'ai_chat',
  'v0 Exploration Helper',
  'Use this AI chat to help you explore v0.dev. Ask questions like:\n- "What can v0.dev build?"\n- "How do I describe a landing page to v0?"\n- "What should I build for my first project?"',
  2,
  NOW()
);

-- Content for Activity 1.5: Day 1 Reflection
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-1-5',
  'reflection_card',
  'Day 1 Reflection',
  'Take a moment to reflect on your first day. Your honest answers will help you understand if web development is right for you.',
  0,
  NOW()
);
```

**Step 2: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 1 path content"
```

---

## Task 5: Add Day 2 Path Day, Activities, and Content

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 2 records**

```sql
-- ============================================================================
-- 7. PATH DAYS - DAY 2
-- ============================================================================

INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, created_at)
VALUES (
  'web-dev-day-2',
  'web-dev-path-001',
  2,
  'Day 2: Design & Plan',
  'Yesterday you got a taste of what''s possible. Today we slow down and do what experienced developers do: refine the idea, make design decisions, and plan the build. This is where projects succeed or fail - in the planning.',
  ARRAY[
    'Did you enjoy the design/planning phase more or less than building?',
    'What was harder than expected about defining your project?',
    'How confident do you feel about your plan?'
  ],
  NOW()
) ON CONFLICT (path_id, day_number) DO NOTHING;

-- ============================================================================
-- 8. PATH ACTIVITIES - DAY 2
-- ============================================================================

INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES
(
  'web-dev-act-2-1',
  'web-dev-day-2',
  'Requirements Review',
  'learning',
  'Your PM Alex will review your prototype and ask clarifying questions to help refine your idea.',
  1,
  true,
  NOW()
),
(
  'web-dev-act-2-2',
  'web-dev-day-2',
  'Project Brief',
  'learning',
  'Write a short project brief defining what you''re building, who it''s for, and what features it needs.',
  2,
  true,
  NOW()
),
(
  'web-dev-act-2-3',
  'web-dev-day-2',
  'Design Iteration',
  'learning',
  'Refine your v0 prototype based on feedback. Iterate on the design until you''re happy with it.',
  3,
  true,
  NOW()
),
(
  'web-dev-act-2-4',
  'web-dev-day-2',
  'Plan the Build',
  'learning',
  'Break down your project into tasks. Create a simple roadmap for Days 3-4.',
  4,
  true,
  NOW()
),
(
  'web-dev-act-2-5',
  'web-dev-day-2',
  'Day 2 Reflection',
  'reflection',
  'Reflect on the planning process. How did it feel to design before building?',
  5,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. PATH CONTENT - DAY 2
-- ============================================================================

-- Content for Activity 2.1: Requirements Review
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES (
  gen_random_uuid(),
  'web-dev-act-2-1',
  'npc_chat',
  'PM Alex Requirements Review',
  '{"npc_name": "Alex", "npc_role": "Senior Product Manager", "dialogue": "I saw your v0 prototype - nice start! Before we lock in the design, I have a few questions:\n\n1. Who is this for? Be specific - ''everyone'' is not an answer.\n2. What''s the ONE thing it needs to do really well?\n3. What would make you proud to ship this?\n\nTake a few minutes to think about these. Your answers will shape everything we build."}'::jsonb,
  0,
  NOW()
);

-- Content for Activity 2.2: Project Brief
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-2-2',
  'daily_prompt',
  'Project Brief Template',
  '## Project Brief\n\n**Name:** [Your project name]\n\n**One-liner:** [What does it do in one sentence?]\n\n**Target User:** [Who will use this? Be specific]\n\n**Core Feature:** [The ONE thing it must do well]\n\n**Nice-to-haves:** [Features if time permits]\n\n**Success looks like:** [How will you know it''s done?]',
  0,
  NOW()
);

-- Content for Activity 2.3: Design Iteration
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-2-3',
  'text',
  'Iterate on Your Design',
  'Go back to v0.dev and refine your prototype based on your project brief. Try different variations. Ask yourself: Does this solve the problem? Is it clear what this does?',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-2-3',
  'ai_chat',
  'Design Feedback Helper',
  'Use this AI chat to get feedback on your design. Share your project brief and prototype, and ask for suggestions.',
  1,
  NOW()
);

-- Content for Activity 2.4: Plan the Build
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-2-4',
  'text',
  'Create Your Build Plan',
  'Break your project into small, achievable tasks. A good plan has:\n\n1. **Core features** - What MUST work for this to be useful?\n2. **Nice-to-haves** - What would be great but isn''t essential?\n3. **Order of operations** - What should you build first?\n\nWrite this down in your project''s README or a simple text file.',
  0,
  NOW()
);

-- Content for Activity 2.5: Day 2 Reflection
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-2-5',
  'reflection_card',
  'Day 2 Reflection',
  'Planning is a skill that improves with practice. Reflect on today''s design and planning process.',
  0,
  NOW()
);
```

**Step 2: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 2 path day, activities, and content"
```

---

## Task 6: Add Day 3 Path Day, Activities, and Content

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 3 records**

```sql
-- ============================================================================
-- 10. PATH DAYS - DAY 3
-- ============================================================================

INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, created_at)
VALUES (
  'web-dev-day-3',
  'web-dev-path-001',
  3,
  'Day 3: Build Core',
  'Today is build day. You have your plan, you have your tools, and you have AI as your coding partner. The goal: implement the core features. Don''t worry about perfection - worry about making it work. You can always polish tomorrow.',
  ARRAY[
    'What was the most satisfying moment today?',
    'What was the most frustrating?',
    'Did you enjoy the problem-solving aspect?',
    'How did it feel to use AI as a coding partner?'
  ],
  NOW()
) ON CONFLICT (path_id, day_number) DO NOTHING;

-- ============================================================================
-- 11. PATH ACTIVITIES - DAY 3
-- ============================================================================

INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES
(
  'web-dev-act-3-1',
  'web-dev-day-3',
  'Sprint Check-in',
  'learning',
  'Your PM Alex checks in on your progress and helps unblock any issues.',
  1,
  true,
  NOW()
),
(
  'web-dev-act-3-2',
  'web-dev-day-3',
  'Core Implementation',
  'learning',
  'Build the main features of your project using Cursor and AI assistance.',
  2,
  true,
  NOW()
),
(
  'web-dev-act-3-3',
  'web-dev-day-3',
  'Debug with AI',
  'learning',
  'When you get stuck, use AI to understand errors and find solutions.',
  3,
  true,
  NOW()
),
(
  'web-dev-act-3-4',
  'web-dev-day-3',
  'Commit & Push',
  'learning',
  'Push your changes to GitHub. Learn good commit habits.',
  4,
  true,
  NOW()
),
(
  'web-dev-act-3-5',
  'web-dev-day-3',
  'Day 3 Reflection',
  'reflection',
  'Reflect on the building process. What felt good? What was hard?',
  5,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. PATH CONTENT - DAY 3
-- ============================================================================

-- Content for Activity 3.1: Sprint Check-in
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES (
  gen_random_uuid(),
  'web-dev-act-3-1',
  'npc_chat',
  'PM Alex Sprint Check-in',
  '{"npc_name": "Alex", "npc_role": "Senior Product Manager", "dialogue": "How''s the sprint going?\n\nQuick check-in:\n- What''s working?\n- What''s blocking you?\n- Do you need to adjust the scope?\n\nRemember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify."}'::jsonb,
  0,
  NOW()
);

-- Content for Activity 3.2: Core Implementation
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-3-2',
  'text',
  'Build Your Core Features',
  'Now it''s time to write code. Open Cursor and start implementing the core features from your plan.\n\nTips:\n- Start with the most important feature\n- Use Cmd+K (or Ctrl+K) to ask Cursor for help\n- Don''t try to make it perfect - just make it work\n- Test frequently',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-3-2',
  'resource_link',
  'Cursor Documentation',
  'https://cursor.sh/docs',
  1,
  NOW()
);

-- Content for Activity 3.3: Debug with AI
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-3-3',
  'text',
  'Debug Like a Pro',
  'Errors are normal. Every developer gets them. The skill is knowing how to debug.\n\nWhen you hit an error:\n1. Read the error message carefully\n2. Use Cursor''s AI to explain it\n3. Ask AI for a fix\n4. Understand WHY the fix works',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-3-3',
  'ai_chat',
  'Debug Helper',
  'Use this AI chat when you''re stuck. Paste your error message or describe your problem.',
  1,
  NOW()
);

-- Content for Activity 3.4: Commit & Push
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-3-4',
  'text',
  'Save Your Progress',
  'Good developers commit often. Each commit is a save point you can return to.\n\nIn Cursor:\n1. Open the Source Control panel (Cmd+Shift+G)\n2. Stage your changes\n3. Write a clear commit message (e.g., "Add login form")\n4. Push to GitHub\n\nDo this after each feature you complete.',
  0,
  NOW()
);

-- Content for Activity 3.5: Day 3 Reflection
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-3-5',
  'reflection_card',
  'Day 3 Reflection',
  'Building is the heart of development. Your honest reflections will reveal if this work energizes you.',
  0,
  NOW()
);
```

**Step 2: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 3 path day, activities, and content"
```

---

## Task 7: Add Day 4 Path Day, Activities, and Content

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 4 records**

```sql
-- ============================================================================
-- 13. PATH DAYS - DAY 4
-- ============================================================================

INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, created_at)
VALUES (
  'web-dev-day-4',
  'web-dev-path-001',
  4,
  'Day 4: Polish & Ship',
  'You have working code. Now it''s time to make it feel real. Today you''ll polish the UI, fix bugs, and deploy your project live on the internet. By end of day, anyone with a link will be able to see what you built.',
  ARRAY[
    'How does it feel to have something live on the internet?',
    'What part of the process did you enjoy most?',
    'What part would you want to avoid in the future?'
  ],
  NOW()
) ON CONFLICT (path_id, day_number) DO NOTHING;

-- ============================================================================
-- 14. PATH ACTIVITIES - DAY 4
-- ============================================================================

INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES
(
  'web-dev-act-4-1',
  'web-dev-day-4',
  'Final Review',
  'learning',
  'Your PM Alex reviews your progress and gives launch approval.',
  1,
  true,
  NOW()
),
(
  'web-dev-act-4-2',
  'web-dev-day-4',
  'Polish & Fix',
  'learning',
  'Improve the UI, add final touches, and fix any remaining bugs.',
  2,
  true,
  NOW()
),
(
  'web-dev-act-4-3',
  'web-dev-day-4',
  'Deploy Live',
  'learning',
  'Ship your project to the internet using Vercel or Netlify.',
  3,
  true,
  NOW()
),
(
  'web-dev-act-4-4',
  'web-dev-day-4',
  'Project Report',
  'learning',
  'Document what you built, how you built it, and what you learned.',
  4,
  true,
  NOW()
),
(
  'web-dev-act-4-5',
  'web-dev-day-4',
  'Day 4 Reflection',
  'reflection',
  'Reflect on the shipping process. How does it feel to have something live?',
  5,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 15. PATH CONTENT - DAY 4
-- ============================================================================

-- Content for Activity 4.1: Final Review
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES (
  gen_random_uuid(),
  'web-dev-act-4-1',
  'npc_chat',
  'PM Alex Final Review',
  '{"npc_name": "Alex", "npc_role": "Senior Product Manager", "dialogue": "Looking good! Let''s do a final review before we ship.\n\nTell me:\n1. What are you most proud of?\n2. What would you do differently if you had more time?\n3. Are you ready to ship?\n\nIf yes, let''s get this live. If not, what''s blocking you?"}'::jsonb,
  0,
  NOW()
);

-- Content for Activity 4.2: Polish & Fix
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-4-2',
  'text',
  'Polish Your Project',
  'The difference between a prototype and a product is polish. Look at your project with fresh eyes:\n\n- Is the text clear?\n- Do buttons look clickable?\n- Does it work on mobile?\n- Are there any obvious bugs?\n\nUse AI to help you improve the UI and fix issues.',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-4-2',
  'ai_chat',
  'Polish Helper',
  'Use this AI chat to get suggestions for improving your project. Describe what you have and ask for polish ideas.',
  1,
  NOW()
);

-- Content for Activity 4.3: Deploy Live
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-4-3',
  'text',
  'Deploy to the Internet',
  'Time to ship! Deploying makes your project accessible to anyone with a link.\n\nOption 1: Vercel (recommended for Cursor projects)\n- Go to vercel.com\n- Connect your GitHub repo\n- Click Deploy\n\nOption 2: Netlify\n- Go to netlify.com\n- Drag and drop your project folder\n- Get your live URL',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-4-3',
  'resource_link',
  'Vercel',
  'https://vercel.com',
  1,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-4-3',
  'resource_link',
  'Netlify',
  'https://netlify.com',
  2,
  NOW()
);

-- Content for Activity 4.4: Project Report
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-4-4',
  'daily_prompt',
  'Project Report Template',
  '## Project Report\n\n**Project Name:** [Name]\n\n**Live URL:** [Your deployed URL]\n\n**What I Built:**\n[2-3 sentences describing your project]\n\n**How I Built It:**\n[What tools did you use? What AI helped with?]\n\n**What I Learned:**\n[Technical lessons + personal insights]\n\n**What I''d Do Differently:**\n[If you had more time or could start over]\n\n**Screenshots:**\n[Add screenshots of your project]',
  0,
  NOW()
);

-- Content for Activity 4.5: Day 4 Reflection
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-4-5',
  'reflection_card',
  'Day 4 Reflection',
  'Shipping is a milestone. Take a moment to appreciate what you accomplished.',
  0,
  NOW()
);
```

**Step 2: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 4 path day, activities, and content"
```

---

## Task 8: Add Day 5 Path Day, Activities, and Content

**Files:**
- Modify: `supabase/seed/web-developer-pathlab-seed.sql`

**Step 1: Append Day 5 records**

```sql
-- ============================================================================
-- 16. PATH DAYS - DAY 5
-- ============================================================================

INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, created_at)
VALUES (
  'web-dev-day-5',
  'web-dev-path-001',
  5,
  'Day 5: Reflect & Decide',
  'You built something real. You shipped it. You used the same tools professional developers use every day. Now it''s time to answer the most important question: Is web development a career fit for you?',
  ARRAY[
    'What aspects of web development would you want to do more of?',
    'What aspects would you want to avoid?',
    'What surprised you most about the development process?'
  ],
  NOW()
) ON CONFLICT (path_id, day_number) DO NOTHING;

-- ============================================================================
-- 17. PATH ACTIVITIES - DAY 5
-- ============================================================================

INSERT INTO public.path_activities (id, path_day_id, title, activity_type, instructions, display_order, is_required, created_at)
VALUES
(
  'web-dev-act-5-1',
  'web-dev-day-5',
  'Sprint Retrospective',
  'learning',
  'Your PM Alex leads a career conversation about your experience this week.',
  1,
  true,
  NOW()
),
(
  'web-dev-act-5-2',
  'web-dev-day-5',
  'Ikigai Mapping',
  'reflection',
  'Map your experience to the four quadrants of ikigai to understand your fit.',
  2,
  true,
  NOW()
),
(
  'web-dev-act-5-3',
  'web-dev-day-5',
  'Career Fit Analysis',
  'learning',
  'Use AI to analyze your reflections and get personalized career feedback.',
  3,
  true,
  NOW()
),
(
  'web-dev-act-5-4',
  'web-dev-day-5',
  'Explore Next Steps',
  'learning',
  'Learn about different paths into web development: bootcamps, self-taught, CS degrees.',
  4,
  true,
  NOW()
),
(
  'web-dev-act-5-5',
  'web-dev-day-5',
  'Final Decision',
  'milestone',
  'Make your decision about pursuing web development and plan your next steps.',
  5,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 18. PATH CONTENT - DAY 5
-- ============================================================================

-- Content for Activity 5.1: Sprint Retrospective
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES (
  gen_random_uuid(),
  'web-dev-act-5-1',
  'npc_chat',
  'PM Alex Retrospective',
  '{"npc_name": "Alex", "npc_role": "Senior Product Manager", "dialogue": "Great sprint! Let''s do a retrospective.\n\nI want you to think about the whole week:\n- What days did you look forward to?\n- What days felt like a grind?\n- When were you in flow? When were you frustrated?\n\nThese aren''t just project questions - they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.\n\nLet''s talk about what this means for your career."}'::jsonb,
  0,
  NOW()
);

-- Content for Activity 5.2: Ikigai Mapping
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-5-2',
  'reflection_card',
  'Your Web Dev Ikigai',
  '## Your Web Dev Ikigai\n\n**What You Love (Passion)**\n- What parts of this week did you genuinely enjoy?\n- When did you lose track of time?\n\n**What You''re Good At (Profession)**\n- What came naturally to you?\n- What did others (or AI) have to help you with?\n\n**What The World Needs (Mission)**\n- What problem does your project solve?\n- Who benefits from what you built?\n\n**What You Can Be Paid For (Vocation)**\n- What skills did you use that have market value?\n- What would you need to learn to be hireable?\n\n**The Center (Your Ikigai)**\nBased on your answers, where do you see yourself?',
  0,
  NOW()
);

-- Content for Activity 5.3: Career Fit Analysis
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-5-3',
  'text',
  'Analyze Your Fit',
  'Now that you''ve reflected, let AI help you analyze your fit for web development. Share your reflections and get personalized feedback.',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-5-3',
  'ai_chat',
  'Career Fit Analyzer',
  'Use this AI chat to analyze your career fit. Share your reflections from the week and ask for an honest assessment.\n\nExample prompt: "Based on my reflections from this week, analyze whether web development is a good career fit for me. Consider what energized me vs drained me, my natural strengths, and the gap between my current skills and hireability."',
  1,
  NOW()
);

-- Content for Activity 5.4: Explore Next Steps
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-5-4',
  'text',
  'Paths Into Web Development',
  'There are many ways to become a web developer. Here are the main paths:\n\n**1. Self-Taught**\n- Free resources, build projects, learn at your own pace\n- Pros: Free, flexible\n- Cons: No structure, need self-discipline\n\n**2. Bootcamp**\n- Intensive 3-6 month programs\n- Pros: Structured, career support, fast\n- Cons: Expensive ($10-20k), intense\n\n**3. Computer Science Degree**\n- 4-year university program\n- Pros: Deep foundation, degree credential\n- Cons: Expensive, slow, not all relevant\n\n**4. Apprenticeship/Internship**\n- Learn on the job\n- Pros: Paid learning, real experience\n- Cons: Hard to find, competitive',
  0,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-5-4',
  'resource_link',
  'freeCodeCamp',
  'https://freecodecamp.org',
  1,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-5-4',
  'resource_link',
  'The Odin Project',
  'https://theodinproject.com',
  2,
  NOW()
),
(
  gen_random_uuid(),
  'web-dev-act-5-4',
  'resource_link',
  'Fullstack Academy',
  'https://fullstackacademy.com',
  3,
  NOW()
);

-- Content for Activity 5.5: Final Decision
INSERT INTO public.path_content (id, activity_id, content_type, content_title, content_body, display_order, created_at)
VALUES
(
  gen_random_uuid(),
  'web-dev-act-5-5',
  'daily_prompt',
  'My Decision',
  '## My Decision\n\n**After this week, I believe web development is:**\n[ ] Definitely for me - I want to pursue this\n[ ] Maybe for me - I want to explore more\n[ ] Probably not for me - I want to explore other paths\n[ ] Definitely not for me - I''m glad I tried but this isn''t it\n\n**My reasoning:**\n[Why did you choose this answer?]\n\n**My next steps:**\n[What will you do in the next 30 days?]\n\n**Resources I''ll explore:**\n[Links, courses, communities, etc.]',
  0,
  NOW()
);
```

**Step 2: Commit**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): add Day 5 path day, activities, and content"
```

---

## Task 9: Run SQL Seed Against Supabase

**Files:**
- Execute: SQL against Supabase database

**Step 1: Check if Supabase CLI is available**

Run: `which supabase`
Expected: Path to supabase CLI or "not found"

**Step 2: Run the seed file**

If using Supabase CLI with local instance:
```bash
supabase db seed --file supabase/seed/web-developer-pathlab-seed.sql
```

If using psql with remote database:
```bash
psql $DATABASE_URL -f supabase/seed/web-developer-pathlab-seed.sql
```

**Step 3: Verify records created**

Run SQL query to verify:
```sql
SELECT 
  s.title as seed_title,
  p.total_days,
  COUNT(DISTINCT pd.id) as days,
  COUNT(DISTINCT pa.id) as activities,
  COUNT(pc.id) as content_items
FROM seeds s
JOIN paths p ON p.seed_id = s.id
LEFT JOIN path_days pd ON pd.path_id = p.id
LEFT JOIN path_activities pa ON pa.path_day_id = pd.id
LEFT JOIN path_content pc ON pc.activity_id = pa.id
WHERE s.id = 'web-developer-pathlab-001'
GROUP BY s.title, p.total_days;
```

Expected: 5 days, ~25 activities, ~40 content items

**Step 4: Commit final**

```bash
git add supabase/seed/web-developer-pathlab-seed.sql
git commit -m "feat(pathlab): complete web developer pathlab seed data"
```

---

## Task 10: Update Seed Index (if exists)

**Files:**
- Check: `supabase/seed/index.sql` or similar
- Modify: Add reference to new seed file

**Step 1: Check for seed index file**

Run: `ls supabase/seed/`
Expected: List of seed files

**Step 2: If index exists, add reference**

If there's an index file that imports all seeds, add:
```sql
\i web-developer-pathlab-seed.sql
```

**Step 3: Commit**

```bash
git add supabase/seed/
git commit -m "chore: add web developer pathlab to seed index"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create SQL file structure | `supabase/seed/web-developer-pathlab-seed.sql` |
| 2 | Add path and NPC records | Same file |
| 3 | Add Day 1 | Same file |
| 4 | Add Day 1 content | Same file |
| 5 | Add Day 2 | Same file |
| 6 | Add Day 3 | Same file |
| 7 | Add Day 4 | Same file |
| 8 | Add Day 5 | Same file |
| 9 | Run SQL seed | Database execution |
| 10 | Update seed index | `supabase/seed/index.sql` |

**Total Records Created:**
- 1 seed
- 1 path
- 1 NPC avatar
- 5 path_days
- 25 path_activities
- ~40 path_content items