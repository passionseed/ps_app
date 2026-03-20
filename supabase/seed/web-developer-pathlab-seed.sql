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
