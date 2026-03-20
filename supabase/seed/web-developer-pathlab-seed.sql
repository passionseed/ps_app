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

-- ============================================================================
-- DAY 1: Setup & Discover
-- ============================================================================

INSERT INTO public.path_days (
  id,
  path_id,
  day_number,
  title,
  context_text,
  reflection_prompts,
  created_at
)
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
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 1: PATH_ACTIVITIES
-- ============================================================================

-- Activity 1: Meet Your PM
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day1-act1',
  'web-dev-day-1',
  'Meet Your PM',
  'Your Product Manager Alex will introduce the project and set expectations for the week.',
  1,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Tool Setup
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day1-act2',
  'web-dev-day-1',
  'Tool Setup',
  'Set up your development environment with the essential tools: Cursor (AI code editor), GitHub account, and Git.',
  2,
  30,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Explore the Ecosystem
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day1-act3',
  'web-dev-day-1',
  'Explore the Ecosystem',
  'Browse curated resource lists to understand the web development landscape. Don''t try to learn everything - just explore and bookmark what interests you.',
  3,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: First Prototype
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day1-act4',
  'web-dev-day-1',
  'First Prototype',
  'Use v0.dev to create your first UI prototype without writing code. Pick a simple idea and describe it to see AI-generated UI.',
  4,
  30,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Day 1 Reflection
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day1-act5',
  'web-dev-day-1',
  'Day 1 Reflection',
  'Take a moment to reflect on your first day as a developer.',
  5,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 1: PATH_CONTENT
-- ============================================================================

-- Activity 1 Content: Meet Your PM (npc_chat)
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
  'web-dev-day1-act1',
  'npc_chat',
  'PM Alex Introduction',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "role": "npc",
        "content": "Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team. Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work. Today''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you - don''t worry about how it works yet. Just play. Ready to dive in?"
      }
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (text)
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
  'web-dev-day1-act2',
  'text',
  'Development Tools Setup',
  '{
    "title": "Set Up Your Development Environment",
    "body": "Before we start building, you need the right tools. Real developers use real tools - not toy versions. Here''s what you need:\n\n**Cursor** - This is your code editor. It''s like VS Code but with AI built in. Download it, install it, and take a quick tour.\n\n**GitHub Account** - This is where your code lives. Create an account if you don''t have one. You''ll use this for every project from now on.\n\n**Git** - This tracks your code changes. It''s already installed on most systems, but verify it works.\n\nTake your time with setup. A good foundation makes everything easier."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (resource_link for Cursor)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act2',
  'resource_link',
  'Download Cursor (AI Code Editor)',
  'https://cursor.com',
  '{"description": "The AI-first code editor. Download and install."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (resource_link for GitHub)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act2',
  'resource_link',
  'Create GitHub Account',
  'https://github.com/signup',
  '{"description": "Sign up for a free GitHub account."}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (resource_link - awesome-web-development)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act3',
  'resource_link',
  'Awesome Web Development',
  'https://github.com/sindresorhus/awesome',
  '{"description": "A curated list of awesome web development resources. Browse and bookmark what interests you."}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (resource_link - awesome-resources)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act3',
  'resource_link',
  'Awesome Resources for Developers',
  'https://github.com/DopplerHQ/awesome-interview-questions',
  '{"description": "Resources for learning and preparing for developer interviews."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (text)
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
  'web-dev-day1-act3',
  'text',
  'The Developer Ecosystem',
  '{
    "title": "Explore the Ecosystem",
    "body": "The web development ecosystem is HUGE. Frameworks, libraries, tools, communities - it can feel overwhelming.\n\nBut here''s the secret: You don''t need to know everything. You just need to know where to look.\n\nBrowse the awesome lists above. Don''t try to learn anything - just explore. See what''s possible. Bookmark things that catch your eye. This is your first step into the developer mindset: curiosity over mastery."
  }'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (text intro)
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
  'web-dev-day1-act4',
  'text',
  'Create Your First Prototype',
  '{
    "title": "Build Without Code",
    "body": "Now for the fun part. You''re going to create your first UI prototype - without writing a single line of code.\n\nv0.dev is an AI tool that generates UI from text descriptions. Think of it like having a designer on your team who works instantly.\n\nPick a simple idea (a landing page, a dashboard, a form) and describe it to v0. Watch what happens. Don''t worry about making it perfect - just play."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (resource_link for v0.dev)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act4',
  'resource_link',
  'v0.dev - AI UI Generator',
  'https://v0.dev',
  '{"description": "Generate UI components with AI. Sign in with your GitHub account."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (ai_chat prompt)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act4',
  'ai_chat',
  'Generate a UI for my project idea',
  '{
    "title": "AI UI Generation",
    "description": "Use AI to generate UI components for your project"
  }'::jsonb,
  '{"suggested_prompt": "Create a landing page for [your idea here]. Include a hero section with a headline, description, and call-to-action button. Make it modern and clean."}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Day 1 Reflection (reflection_card)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act5',
  'reflection_card',
  'Day 1 Reflection',
  '{
    "title": "Reflect on Your First Day",
    "description": "Take a moment to reflect on your first day as a developer."
  }'::jsonb,
  '{
    "prompts": [
      "What part of today felt most exciting?",
      "What felt confusing or overwhelming?",
      "On a scale of 1-10, how curious are you to continue?"
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DAY 2: Design & Plan
-- ============================================================================

INSERT INTO public.path_days (
  id,
  path_id,
  day_number,
  title,
  context_text,
  reflection_prompts,
  created_at,
  updated_at
)
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
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 2: PATH_ACTIVITIES
-- ============================================================================

-- Activity 1: Requirements Review
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day2-act1',
  'web-dev-day-2',
  'Requirements Review',
  'PM Alex reviews your prototype and asks clarifying questions about your project.',
  1,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Project Brief
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day2-act2',
  'web-dev-day-2',
  'Project Brief',
  'Write a clear project brief that defines what you''re building, who it''s for, and what success looks like.',
  2,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Design Iteration
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day2-act3',
  'web-dev-day-2',
  'Design Iteration',
  'Go back to v0.dev and iterate on your prototype based on your project brief.',
  3,
  25,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: Plan the Build
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day2-act4',
  'web-dev-day-2',
  'Plan the Build',
  'Break your project down into small, actionable tasks for the next two days.',
  4,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Day 2 Reflection
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day2-act5',
  'web-dev-day-2',
  'Day 2 Reflection',
  'Reflect on today''s design and planning work.',
  5,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 2: PATH_CONTENT
-- ============================================================================

-- Activity 1 Content: Requirements Review (npc_chat)
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
  'web-dev-day2-act1',
  'npc_chat',
  'Requirements Review with Alex',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "role": "npc",
        "content": "I saw your v0 prototype - nice start! Before we lock in the design, I have a few questions:\n\n1. Who is this for? Be specific - ''everyone'' is not an answer.\n2. What''s the ONE thing it needs to do really well?\n3. What would make you proud to ship this?\n\nTake a few minutes to think about these. Your answers will shape everything we build."
      }
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Project Brief (daily_prompt)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day2-act2',
  'daily_prompt',
  'Write Your Project Brief',
  '{
    "title": "Write Your Project Brief",
    "description": "Use the template below to define your project clearly. This brief will guide your build over the next few days."
  }'::jsonb,
  '{
    "template": "## Project Brief\n\n**Name:** [Your project name]\n\n**One-liner:** [What does it do in one sentence?]\n\n**Target User:** [Who will use this? Be specific]\n\n**Core Feature:** [The ONE thing it must do well]\n\n**Nice-to-haves:** [Features if time permits]\n\n**Success looks like:** [How will you know it''s done?]",
    "min_length": 100,
    "placeholder": "Start writing your project brief here..."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Design Iteration (ai_chat)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day2-act3',
  'ai_chat',
  'Refine Your Design',
  '{
    "title": "Refine Your Design",
    "description": "Go back to v0.dev and iterate on your prototype based on your project brief. Use the AI to help you refine the design."
  }'::jsonb,
  '{
    "suggested_prompts": [
      "Based on my project brief, help me improve this design: [paste your brief]",
      "I want to change the layout to better fit [specific need]. How should I prompt v0?",
      "Review my design and suggest improvements for [target user]",
      "Help me simplify this design to focus on the core feature"
    ],
    "context": "You have your project brief now. Use it to guide your design iterations. The clearer your prompts, the better results you''ll get."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: Plan the Build (text)
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
  'web-dev-day2-act4',
  'text',
  'Break Down Your Build',
  '{
    "title": "Break Down Your Build",
    "body": "Now that you have a clear design and brief, it''s time to plan the actual build. Experienced developers know that good planning prevents headaches later.\n\n## Your Task\n\nBreak your project down into small, actionable tasks. Aim for tasks that take 30-60 minutes each.\n\n### Suggested Structure:\n\n**Day 3 Tasks (Core Build):**\n- Set up project structure\n- Build [specific component/feature]\n- Implement [core functionality]\n- Test and debug\n\n**Day 4 Tasks (Polish & Ship):**\n- Add styling and polish\n- Fix any remaining bugs\n- Deploy to production\n- Write project report\n\n### Tips:\n- Be specific - ''build the app'' is not a task\n- Order matters - what needs to happen first?\n- Leave buffer time - things always take longer than expected\n\nWrite your task list in a note or document. You''ll use it tomorrow."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Day 2 Reflection (reflection_card)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day2-act5',
  'reflection_card',
  'Reflect on Day 2',
  '{
    "title": "Reflect on Day 2",
    "description": "Take a moment to reflect on today''s design and planning work."
  }'::jsonb,
  '{
    "prompts": [
      {
        "id": "d2-p1",
        "question": "Did you enjoy the design/planning phase more or less than building?",
        "type": "text",
        "placeholder": "Share your thoughts on planning vs building..."
      },
      {
        "id": "d2-p2",
        "question": "What was harder than expected about defining your project?",
        "type": "text",
        "placeholder": "What challenges did you face..."
      },
      {
        "id": "d2-p3",
        "question": "How confident do you feel about your plan?",
        "type": "scale",
        "min": 1,
        "max": 10,
        "min_label": "Not confident",
        "max_label": "Very confident"
      }
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DAY 3: Build Core
-- ============================================================================

INSERT INTO public.path_days (
  id,
  path_id,
  day_number,
  title,
  context_text,
  reflection_prompts,
  created_at,
  updated_at
)
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
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 3: PATH_ACTIVITIES
-- ============================================================================

-- Activity 1: Sprint Check-in
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day3-act1',
  'web-dev-day-3',
  'Sprint Check-in',
  'PM Alex checks progress, helps unblock, offers encouragement.',
  1,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Core Implementation
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day3-act2',
  'web-dev-day-3',
  'Core Implementation',
  'Build main features with Cursor + Copilot, commit regularly.',
  2,
  60,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Debug with AI
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day3-act3',
  'web-dev-day-3',
  'Debug with AI',
  'When stuck, use AI to understand and fix issues.',
  3,
  30,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: Commit & Push
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day3-act4',
  'web-dev-day-3',
  'Commit & Push',
  'Push to GitHub after each feature, learn commit hygiene.',
  4,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Day 3 Reflection
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day3-act5',
  'web-dev-day-3',
  'Day 3 Reflection',
  'What was satisfying? What was frustrating?',
  5,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 3: PATH_CONTENT
-- ============================================================================

-- Activity 1 Content: Sprint Check-in (npc_chat)
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
  'web-dev-day3-act1',
  'npc_chat',
  'Sprint Check-in with Alex',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "role": "npc",
        "content": "How''s the sprint going?\n\nQuick check-in:\n- What''s working?\n- What''s blocking you?\n- Do you need to adjust the scope?\n\nRemember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify."
      }
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Core Implementation (text)
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
  'web-dev-day3-act2',
  'text',
  'Time to Build',
  '{
    "title": "Time to Build",
    "body": "This is where developers spend most of their time - turning ideas into working code.\n\n**Your mission today:**\n1. Open your project in Cursor\n2. Start implementing your core feature from the plan\n3. Use AI liberally - ask Cursor to generate code, explain concepts, or refactor\n4. Commit after each working feature\n\n**Tips for success:**\n- Start with the simplest version that works\n- Test as you go - don''t write 100 lines without running it\n- When stuck, describe the problem to AI in plain English\n- Celebrate small wins - got a button to work? That''s progress!"
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Resource Link (Cursor docs)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day3-act2',
  'resource_link',
  'Cursor Documentation',
  'https://docs.cursor.com/',
  '{"description": "Learn Cursor shortcuts and AI features to code faster"}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Debug with AI (ai_chat)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day3-act3',
  'ai_chat',
  'Debug with AI',
  '{
    "title": "Get Unstuck with AI",
    "description": "Use AI to debug issues and understand errors"
  }'::jsonb,
  '{
    "prompt_suggestions": [
      "I''m getting this error: [paste error]. Help me understand and fix it.",
      "How do I implement [feature] in my project?",
      "Review my code and suggest improvements."
    ],
    "context": "You''re building your project and have hit a roadblock. Use this AI chat to get unstuck. Paste error messages, share code snippets, or describe what you''re trying to achieve."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: Commit & Push (text)
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
  'web-dev-day3-act4',
  'text',
  'GitHub Workflow',
  '{
    "title": "GitHub Workflow",
    "body": "Real developers commit early and often. It''s like saving your game progress - you never know when you''ll need to go back.\n\n**Commit workflow:**\n1. Make a small working change\n2. Stage your changes: `git add .`\n3. Commit with a clear message: `git commit -m "feat: add login button"`\n4. Push to GitHub: `git push`\n\n**Good commit messages:**\n- `feat: add user authentication`\n- `fix: correct button alignment`\n- `refactor: simplify form validation`\n\n**Your task:** Make at least 3 commits today and push them all to GitHub. Check your repo online to confirm they''re there!"
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Day 3 Reflection (reflection_card)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day3-act5',
  'reflection_card',
  'Reflect on Your Build Day',
  '{
    "title": "Reflect on Your Build Day",
    "description": "Take a moment to reflect on today''s building experience."
  }'::jsonb,
  '{
    "prompts": [
      "What was the most satisfying moment today?",
      "What was the most frustrating?",
      "Did you enjoy the problem-solving aspect?",
      "How did it feel to use AI as a coding partner?"
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DAY 4: Polish & Ship
-- ============================================================================

INSERT INTO public.path_days (
  id,
  path_id,
  day_number,
  title,
  context_text,
  reflection_prompts,
  created_at,
  updated_at
)
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
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 4: PATH_ACTIVITIES
-- ============================================================================

-- Activity 1: Final Review
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day4-act1',
  'web-dev-day-4',
  'Final Review',
  'PM Alex reviews your progress before shipping.',
  1,
  10,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Polish & Fix
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day4-act2',
  'web-dev-day-4',
  'Polish & Fix',
  'Use AI to improve your UI, fix bugs, and add final touches before shipping.',
  2,
  45,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Deploy Live
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day4-act3',
  'web-dev-day-4',
  'Deploy Live',
  'Deploy your project to Vercel, Netlify, or GitHub Pages.',
  3,
  30,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: Project Report
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day4-act4',
  'web-dev-day-4',
  'Project Report',
  'Document what you built, how you built it, and what you learned.',
  4,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Day 4 Reflection
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day4-act5',
  'web-dev-day-4',
  'Day 4 Reflection',
  'You shipped something real today. Reflect on the experience.',
  5,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 4: PATH_CONTENT
-- ============================================================================

-- Activity 1 Content: Final Review (npc_chat)
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
  'web-dev-day4-act1',
  'npc_chat',
  'Final Review with Alex',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "sender": "npc",
        "text": "Looking good! Let''s do a final review before we ship."
      },
      {
        "sender": "npc",
        "text": "Tell me:\n1. What are you most proud of?\n2. What would you do differently if you had more time?\n3. Are you ready to ship?"
      },
      {
        "sender": "npc",
        "text": "If yes, let''s get this live. If not, what''s blocking you?"
      }
    ],
    "prompts": [
      "I''m most proud of...",
      "I would do this differently...",
      "I''m ready to ship!",
      "I''m blocked by..."
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Polish & Fix (ai_chat)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act2',
  'ai_chat',
  'Polish Your Project',
  '{
    "title": "Polish Your Project",
    "description": "Use AI to improve your UI, fix bugs, and add final touches before shipping."
  }'::jsonb,
  '{
    "suggested_prompts": [
      "Review my code and suggest UI improvements",
      "Help me fix this bug: [describe the issue]",
      "Make this component look more polished",
      "Add loading states and error handling",
      "Improve the responsive design for mobile",
      "Add hover effects and animations",
      "Check for accessibility issues"
    ],
    "context": "You''re in the final polish phase. Focus on making your project feel complete and professional."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Deploy Live (text)
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
  'web-dev-day4-act3',
  'text',
  'Deploy Your Project Live',
  '{
    "title": "Deploy Your Project Live",
    "body": "It''s time to ship! Deployment makes your project accessible to anyone with a URL. This is the moment your work goes from local to live.\n\n**Choose Your Platform:**\n\n**Vercel** (Recommended)\n- Best for Next.js, React, and modern frameworks\n- Connects directly to GitHub\n- Automatic deployments on every push\n- Free tier includes custom domains\n\n**Netlify**\n- Great for static sites and SPAs\n- Drag-and-drop deployment\n- Built-in form handling\n- Free SSL certificates\n\n**Steps to Deploy:**\n1. Push your final code to GitHub\n2. Connect your repo to Vercel or Netlify\n3. Configure build settings (usually auto-detected)\n4. Deploy and get your live URL\n5. Test the live site thoroughly\n\n**Before You Deploy:**\n- [ ] All features work as expected\n- [ ] No console errors\n- [ ] Responsive on mobile\n- [ ] Loading states handled\n- [ ] README updated\n\nOnce deployed, share your URL with pride. You built this!"
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Resource Links
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act3',
  'resource_link',
  'Vercel Deployment Guide',
  'https://vercel.com/docs/concepts/deployments/overview',
  '{"description": "Official guide for deploying projects on Vercel"}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act3',
  'resource_link',
  'Netlify Deployment Guide',
  'https://docs.netlify.com/site-deploys/overview/',
  '{"description": "Official guide for deploying projects on Netlify"}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act3',
  'resource_link',
  'GitHub Pages Deployment',
  'https://pages.github.com/',
  '{"description": "Free hosting directly from your GitHub repository"}'::jsonb,
  4,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: Project Report (daily_prompt)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act4',
  'daily_prompt',
  'Project Report',
  '{
    "title": "Project Report",
    "description": "Document what you built, how you built it, and what you learned. This becomes part of your portfolio."
  }'::jsonb,
  '{
    "template": "## Project Report\n\n**Project Name:** [Name]\n\n**Live URL:** [Your deployed URL]\n\n**What I Built:**\n[2-3 sentences describing your project]\n\n**How I Built It:**\n[What tools did you use? What AI helped with?]\n\n**What I Learned:**\n[Technical lessons + personal insights]\n\n**What I''d Do Differently:**\n[If you had more time or could start over]\n\n**Screenshots:**\n[Add screenshots of your project]",
    "min_words": 50,
    "required": true
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Day 4 Reflection (reflection_card)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day4-act5',
  'reflection_card',
  'Day 4 Reflection',
  '{
    "title": "Day 4 Reflection",
    "description": "You shipped something real today. Reflect on the experience."
  }'::jsonb,
  '{
    "prompts": [
      {
        "id": "day4-q1",
        "question": "How does it feel to have something live on the internet?",
        "placeholder": "Describe your feelings about shipping your project...",
        "min_words": 20
      },
      {
        "id": "day4-q2",
        "question": "What part of the process did you enjoy most?",
        "placeholder": "Building, designing, debugging, deploying...",
        "min_words": 20
      },
      {
        "id": "day4-q3",
        "question": "What part would you want to avoid in the future?",
        "placeholder": "Which aspects felt draining or frustrating?",
        "min_words": 20
      }
    ],
    "required": true
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DAY 5: Reflect & Decide
-- ============================================================================

INSERT INTO public.path_days (
  id,
  path_id,
  day_number,
  title,
  context_text,
  reflection_prompts,
  created_at,
  updated_at
)
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
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 5: PATH_ACTIVITIES
-- ============================================================================

-- Activity 1: Sprint Retrospective
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day5-act1',
  'web-dev-day-5',
  'Sprint Retrospective',
  'PM Alex leads career conversation, discusses the journey.',
  1,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Ikigai Mapping
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day5-act2',
  'web-dev-day-5',
  'Ikigai Mapping',
  'Map your experience to the 4 quadrants of ikigai.',
  2,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Career Fit Analysis
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day5-act3',
  'web-dev-day-5',
  'Career Fit Analysis',
  'AI analyzes reflections and gives personalized feedback.',
  3,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: Explore Next Steps
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day5-act4',
  'web-dev-day-5',
  'Explore Next Steps',
  'Bootcamps, self-taught paths, CS degrees - what''s next?',
  4,
  20,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Final Decision
INSERT INTO public.path_activities (
  id,
  path_day_id,
  title,
  instructions,
  display_order,
  estimated_minutes,
  is_required,
  is_draft,
  created_at,
  updated_at
)
VALUES (
  'web-dev-day5-act5',
  'web-dev-day-5',
  'Final Decision',
  'Your decision and next steps.',
  5,
  15,
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DAY 5: PATH_CONTENT
-- ============================================================================

-- Activity 1 Content: Sprint Retrospective (npc_chat)
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
  'web-dev-day5-act1',
  'npc_chat',
  'Sprint Retrospective with Alex',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "role": "npc",
        "content": "Great sprint! Let''s do a retrospective.\n\nI want you to think about the whole week:\n- What days did you look forward to?\n- What days felt like a grind?\n- When were you in flow? When were you frustrated?\n\nThese aren''t just project questions - they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.\n\nLet''s talk about what this means for your career."
      }
    ]
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Ikigai Mapping (reflection_card)
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
  'web-dev-day5-act2',
  'reflection_card',
  'Your Web Dev Ikigai',
  '{
    "title": "Your Web Dev Ikigai",
    "description": "Map your experience to the 4 quadrants of ikigai"
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Ikigai text content
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
  'web-dev-day5-act2',
  'text',
  'Ikigai Framework',
  '{
    "title": "Your Web Dev Ikigai",
    "body": "**What You Love (Passion)**\n- What parts of this week did you genuinely enjoy?\n- When did you lose track of time?\n\n**What You''re Good At (Profession)**\n- What came naturally to you?\n- What did others (or AI) have to help you with?\n\n**What The World Needs (Mission)**\n- What problem does your project solve?\n- Who benefits from what you built?\n\n**What You Can Be Paid For (Vocation)**\n- What skills did you use that have market value?\n- What would you need to learn to be hireable?\n\n**The Center (Your Ikigai)**\nBased on your answers, where do you see yourself?"
  }'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Career Fit Analysis (ai_chat)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_body,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day5-act3',
  'ai_chat',
  'Career Fit Analysis',
  '{
    "title": "Career Fit Analysis",
    "description": "Get AI-powered insights on whether web development is right for you"
  }'::jsonb,
  '{
    "prompt": "Based on my reflections from this week, analyze whether web development is a good career fit for me. Consider:\n- What energized me vs drained me\n- My natural strengths and growth areas\n- The gap between my current skills and hireability\n- Alternative roles I might consider\n\nGive me an honest assessment with specific recommendations."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: Explore Next Steps (text)
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
  'web-dev-day5-act4',
  'text',
  'Next Steps Options',
  '{
    "title": "Explore Next Steps",
    "body": "You''ve experienced what it''s like to be a web developer. Now it''s time to decide how to move forward. Here are the main paths people take:\n\n**Coding Bootcamps (3-6 months)**\nIntensive, structured programs that teach job-ready skills. Great if you want guided learning and career support.\n\n**Self-Taught Path (6-12+ months)**\nLearn at your own pace using free/cheap resources. Requires discipline but offers flexibility. Build a portfolio through projects.\n\n**Computer Science Degree (4 years)**\nDeep theoretical foundation. Best for certain roles (AI, systems programming) and larger companies. Significant time and cost investment.\n\n**Hybrid Approach**\nCombine elements: take a short bootcamp, supplement with self-study, or get a degree while building projects.\n\nThere''s no "right" answer - only what fits your situation, learning style, and goals."
  }'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: Resource Links
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day5-act4',
  'resource_link',
  'freeCodeCamp - Free self-paced coding curriculum',
  'https://www.freecodecamp.org/',
  '{"category": "self-taught"}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day5-act4',
  'resource_link',
  'The Odin Project - Full-stack curriculum with projects',
  'https://www.theodinproject.com/',
  '{"category": "self-taught"}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day5-act4',
  'resource_link',
  'Course Report - Compare coding bootcamps',
  'https://www.coursereport.com/',
  '{"category": "bootcamps"}'::jsonb,
  4,
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content_title,
  content_url,
  metadata,
  display_order,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day5-act4',
  'resource_link',
  'roadmap.sh - Developer career roadmaps',
  'https://roadmap.sh/',
  '{"category": "career"}'::jsonb,
  5,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Final Decision (daily_prompt)
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
  'web-dev-day5-act5',
  'daily_prompt',
  'Final Decision',
  '## My Decision

**After this week, I believe web development is:**
[ ] Definitely for me - I want to pursue this
[ ] Maybe for me - I want to explore more
[ ] Probably not for me - I want to explore other paths
[ ] Definitely not for me - I''m glad I tried but this isn''t it

**My reasoning:**
[Why did you choose this answer?]

**My next steps:**
[What will you do in the next 30 days?]

**Resources I''ll explore:**
[Links, courses, communities, etc.]',
  1,
  NOW()
) ON CONFLICT DO NOTHING;
