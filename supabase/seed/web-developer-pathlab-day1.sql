-- Web Developer PathLab - Day 1: Setup & Discover
-- Theme: "Today you become a web developer."

-- ============================================================================
-- 1. PATH_DAY RECORD
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
-- 2. PATH_ACTIVITIES RECORDS
-- ============================================================================

-- Activity 1: Meet Your PM (npc_chat)
INSERT INTO public.path_activities (
  id,
  path_day_id,
  activity_number,
  title,
  activity_type,
  created_at
)
VALUES (
  'web-dev-day1-act1',
  'web-dev-day-1',
  1,
  'Meet Your PM',
  'npc_chat',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 2: Tool Setup (text + resource_link)
INSERT INTO public.path_activities (
  id,
  path_day_id,
  activity_number,
  title,
  activity_type,
  created_at
)
VALUES (
  'web-dev-day1-act2',
  'web-dev-day-1',
  2,
  'Tool Setup',
  'text',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 3: Explore the Ecosystem (resource_link)
INSERT INTO public.path_activities (
  id,
  path_day_id,
  activity_number,
  title,
  activity_type,
  created_at
)
VALUES (
  'web-dev-day1-act3',
  'web-dev-day-1',
  3,
  'Explore the Ecosystem',
  'resource_link',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 4: First Prototype (ai_chat + resource_link)
INSERT INTO public.path_activities (
  id,
  path_day_id,
  activity_number,
  title,
  activity_type,
  created_at
)
VALUES (
  'web-dev-day1-act4',
  'web-dev-day-1',
  4,
  'First Prototype',
  'ai_chat',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Activity 5: Day 1 Reflection (reflection_card)
INSERT INTO public.path_activities (
  id,
  path_day_id,
  activity_number,
  title,
  activity_type,
  created_at
)
VALUES (
  'web-dev-day1-act5',
  'web-dev-day-1',
  5,
  'Day 1 Reflection',
  'reflection_card',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. PATH_CONTENT RECORDS
-- ============================================================================

-- Activity 1 Content: Meet Your PM (npc_chat)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act1',
  'npc_message',
  'Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team.

Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work.

Today''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you - don''t worry about how it works yet. Just play.

Ready to dive in?',
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (text)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act2',
  'text',
  'Before we start building, you need the right tools. Real developers use real tools - not toy versions. Here''s what you need:

**Cursor** - This is your code editor. It''s like VS Code but with AI built in. Download it, install it, and take a quick tour.

**GitHub Account** - This is where your code lives. Create an account if you don''t have one. You''ll use this for every project from now on.

**Git** - This tracks your code changes. It''s already installed on most systems, but verify it works.

Take your time with setup. A good foundation makes everything easier.',
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (resource_link for Cursor)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act2',
  'resource_link',
  'Download Cursor (AI Code Editor)',
  '{"url": "https://cursor.com", "description": "The AI-first code editor. Download and install."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 2 Content: Tool Setup (resource_link for GitHub)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act2',
  'resource_link',
  'Create GitHub Account',
  '{"url": "https://github.com/signup", "description": "Sign up for a free GitHub account."}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (resource_link - awesome-web-development)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act3',
  'resource_link',
  'Awesome Web Development',
  '{"url": "https://github.com/sindresorhus/awesome", "description": "A curated list of awesome web development resources. Browse and bookmark what interests you."}'::jsonb,
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (resource_link - awesome-resources)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act3',
  'resource_link',
  'Awesome Resources for Developers',
  '{"url": "https://github.com/DopplerHQ/awesome-interview-questions", "description": "Resources for learning and preparing for developer interviews."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 3 Content: Explore the Ecosystem (text)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act3',
  'text',
  'The web development ecosystem is HUGE. Frameworks, libraries, tools, communities - it can feel overwhelming.

But here''s the secret: You don''t need to know everything. You just need to know where to look.

Browse the awesome lists above. Don''t try to learn anything - just explore. See what''s possible. Bookmark things that catch your eye. This is your first step into the developer mindset: curiosity over mastery.',
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (ai_chat intro text)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act4',
  'text',
  'Now for the fun part. You''re going to create your first UI prototype - without writing a single line of code.

v0.dev is an AI tool that generates UI from text descriptions. Think of it like having a designer on your team who works instantly.

Pick a simple idea (a landing page, a dashboard, a form) and describe it to v0. Watch what happens. Don''t worry about making it perfect - just play.',
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (resource_link for v0.dev)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act4',
  'resource_link',
  'v0.dev - AI UI Generator',
  '{"url": "https://v0.dev", "description": "Generate UI components with AI. Sign in with your GitHub account."}'::jsonb,
  2,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 4 Content: First Prototype (ai_chat prompt)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act4',
  'ai_chat',
  'Generate a UI for my project idea',
  '{"suggested_prompt": "Create a landing page for [your idea here]. Include a hero section with a headline, description, and call-to-action button. Make it modern and clean."}'::jsonb,
  3,
  NOW()
) ON CONFLICT DO NOTHING;

-- Activity 5 Content: Day 1 Reflection (reflection_card)
INSERT INTO public.path_content (
  id,
  activity_id,
  content_type,
  content,
  metadata,
  order_index,
  created_at
)
VALUES (
  gen_random_uuid(),
  'web-dev-day1-act5',
  'reflection_card',
  'Take a moment to reflect on your first day as a developer.',
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
