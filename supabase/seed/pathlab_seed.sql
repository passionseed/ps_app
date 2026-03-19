-- Pathlab Seed Data: UX Designer Discovery Path (5 Days)

-- 1. Insert Seed
INSERT INTO public.seeds (id, title, description, seed_type, cover_image, theme_color, difficulty, created_at)
VALUES (
  'ux-designer-pathlab-001', 
  'UX Designer Discovery', 
  'Explore the world of User Experience Design through a 5-day immersive simulation.', 
  'pathlab', 
  'ux_cover_1773089994116.png', 
  '#BFFF00', 
  'beginner', 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Path
INSERT INTO public.paths (id, seed_id, total_days, created_by, created_at)
VALUES (
  'ux-path-001', 
  'ux-designer-pathlab-001', 
  5, 
  '00000000-0000-0000-0000-000000000000', -- System/Admin
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert NPC Avatar
INSERT INTO public.seed_npc_avatars (id, seed_id, name, role, avatar_url, greeting_text)
VALUES (
  gen_random_uuid(),
  'ux-designer-pathlab-001',
  'Alex',
  'Senior UX Designer',
  'ux_designer_npc.png',
  'Hi! I am Alex, and I will be your mentor for this UX Design discovery journey.'
) ON CONFLICT (seed_id) DO NOTHING;

-- 4. Insert Map Nodes for 5 Days
-- Day 1: Understanding UX
INSERT INTO public.map_nodes (id, map_id, title, node_type, metadata, created_at, updated_at)
VALUES (
  'ux-node-d1-1', 
  'ux-path-001', 
  'What is UX?', 
  'learning', 
  '{"body": "User Experience (UX) design is the process design teams use to create products that provide meaningful and relevant experiences to users.", "instructions": "Read the introduction to UX design."}'::jsonb, 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Day 2: User Research
INSERT INTO public.map_nodes (id, map_id, title, node_type, metadata, created_at, updated_at)
VALUES (
  'ux-node-d2-1', 
  'ux-path-001', 
  'User Interviews', 
  'learning', 
  '{"body": "User interviews are a core part of user research. Learn how to ask the right questions.", "instructions": "Watch the video on user interview techniques."}'::jsonb, 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Day 3: Information Architecture
INSERT INTO public.map_nodes (id, map_id, title, node_type, metadata, created_at, updated_at)
VALUES (
  'ux-node-d3-1', 
  'ux-path-001', 
  'Site Maps', 
  'learning', 
  '{"body": "A sitemap is a diagram that shows the hierarchy of a website or app.", "instructions": "Create a simple sitemap for a coffee shop app."}'::jsonb, 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Day 4: Wireframing
INSERT INTO public.map_nodes (id, map_id, title, node_type, metadata, created_at, updated_at)
VALUES (
  'ux-node-d4-1', 
  'ux-path-001', 
  'Low-Fi Wireframes', 
  'learning', 
  '{"body": "Wireframes are skeletal blueprints of your design.", "instructions": "Sketch a wireframe for the home screen."}'::jsonb, 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Day 5: Prototyping & Feedback
INSERT INTO public.map_nodes (id, map_id, title, node_type, metadata, created_at, updated_at)
VALUES (
  'ux-node-d5-1', 
  'ux-path-001', 
  'Interactive Prototypes', 
  'learning', 
  '{"body": "Prototyping makes your wireframes interactive.", "instructions": "Link your wireframes together to create a flow."}'::jsonb, 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert Path Days
INSERT INTO public.path_days (id, path_id, day_number, title, context_text, reflection_prompts, node_ids, created_at)
VALUES 
(gen_random_uuid(), 'ux-path-001', 1, 'Day 1: The UX Mindset', 'Today you will learn what UX is all about.', ARRAY['How do you feel about UX so far?'], ARRAY['ux-node-d1-1'], NOW()),
(gen_random_uuid(), 'ux-path-001', 2, 'Day 2: Knowing Your User', 'Research is the foundation of design.', ARRAY['What was the most surprising thing you learned from the user interview?'], ARRAY['ux-node-d2-1'], NOW()),
(gen_random_uuid(), 'ux-path-001', 3, 'Day 3: Organizing Info', 'Structure leads to clarity.', ARRAY['Was it easy to organize the coffee shop app sections?'], ARRAY['ux-node-d3-1'], NOW()),
(gen_random_uuid(), 'ux-path-001', 4, 'Day 4: Visualizing the Flow', 'Time to get sketching.', ARRAY['How many versions of the home screen did you sketch?'], ARRAY['ux-node-d4-1'], NOW()),
(gen_random_uuid(), 'ux-path-001', 5, 'Day 5: Bringing it to Life', 'Interactivity is key.', ARRAY['What feedback would you give to yourself?'], ARRAY['ux-node-d5-1'], NOW())
ON CONFLICT (path_id, day_number) DO NOTHING;
