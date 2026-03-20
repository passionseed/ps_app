-- Day 3: Build Core - Web Developer PathLab
-- PathLab: Web Developer - Ship Your First Project

-- ============================================
-- DAY RECORD
-- ============================================
INSERT INTO path_days (
    id,
    path_id,
    day_number,
    title,
    context,
    reflection_prompts,
    created_at,
    updated_at
) VALUES (
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
);

-- ============================================
-- ACTIVITY 1: Sprint Check-in (npc_chat)
-- ============================================
INSERT INTO path_activities (
    id,
    day_id,
    activity_type,
    title,
    description,
    "order",
    is_required,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act1',
    'web-dev-day-3',
    'npc_chat',
    'Sprint Check-in',
    'PM Alex checks progress, helps unblock, offers encouragement',
    1,
    true,
    NOW(),
    NOW()
);

-- Activity 1 Content (NPC Chat)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act1-content',
    'web-dev-day3-act1',
    'npc_chat',
    '{
        "npc_id": "pm-alex",
        "messages": [
            {
                "role": "npc",
                "content": "How''s the sprint going?\n\nQuick check-in:\n- What''s working?\n- What''s blocking you?\n- Do you need to adjust the scope?\n\nRemember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify."
            }
        ]
    }'::jsonb,
    NOW(),
    NOW()
);

-- ============================================
-- ACTIVITY 2: Core Implementation (text + resource_link)
-- ============================================
INSERT INTO path_activities (
    id,
    day_id,
    activity_type,
    title,
    description,
    "order",
    is_required,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act2',
    'web-dev-day-3',
    'text',
    'Core Implementation',
    'Build main features with Cursor + Copilot, commit regularly',
    2,
    true,
    NOW(),
    NOW()
);

-- Activity 2 Content (Text Instructions)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act2-content-text',
    'web-dev-day3-act2',
    'text',
    '{
        "title": "Time to Build",
        "body": "This is where developers spend most of their time - turning ideas into working code.\n\n**Your mission today:**\n1. Open your project in Cursor\n2. Start implementing your core feature from the plan\n3. Use AI liberally - ask Cursor to generate code, explain concepts, or refactor\n4. Commit after each working feature\n\n**Tips for success:**\n- Start with the simplest version that works\n- Test as you go - don''t write 100 lines without running it\n- When stuck, describe the problem to AI in plain English\n- Celebrate small wins - got a button to work? That''s progress!"
    }'::jsonb,
    NOW(),
    NOW()
);

-- Activity 2 Content (Resource Link)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act2-content-resource',
    'web-dev-day3-act2',
    'resource_link',
    '{
        "title": "Cursor Documentation",
        "url": "https://docs.cursor.com/",
        "description": "Learn Cursor shortcuts and AI features to code faster"
    }'::jsonb,
    NOW(),
    NOW()
);

-- ============================================
-- ACTIVITY 3: Debug with AI (ai_chat)
-- ============================================
INSERT INTO path_activities (
    id,
    day_id,
    activity_type,
    title,
    description,
    "order",
    is_required,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act3',
    'web-dev-day-3',
    'ai_chat',
    'Debug with AI',
    'When stuck, use AI to understand and fix issues',
    3,
    true,
    NOW(),
    NOW()
);

-- Activity 3 Content (AI Chat)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act3-content',
    'web-dev-day3-act3',
    'ai_chat',
    '{
        "prompt_suggestions": [
            "I''m getting this error: [paste error]. Help me understand and fix it.",
            "How do I implement [feature] in my project?",
            "Review my code and suggest improvements."
        ],
        "context": "You''re building your project and have hit a roadblock. Use this AI chat to get unstuck. Paste error messages, share code snippets, or describe what you''re trying to achieve."
    }'::jsonb,
    NOW(),
    NOW()
);

-- ============================================
-- ACTIVITY 4: Commit & Push (text)
-- ============================================
INSERT INTO path_activities (
    id,
    day_id,
    activity_type,
    title,
    description,
    "order",
    is_required,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act4',
    'web-dev-day-3',
    'text',
    'Commit & Push',
    'Push to GitHub after each feature, learn commit hygiene',
    4,
    true,
    NOW(),
    NOW()
);

-- Activity 4 Content (Text Instructions)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act4-content',
    'web-dev-day3-act4',
    'text',
    '{
        "title": "GitHub Workflow",
        "body": "Real developers commit early and often. It''s like saving your game progress - you never know when you''ll need to go back.\n\n**Commit workflow:**\n1. Make a small working change\n2. Stage your changes: `git add .`\n3. Commit with a clear message: `git commit -m "feat: add login button"`\n4. Push to GitHub: `git push`\n\n**Good commit messages:**\n- `feat: add user authentication`\n- `fix: correct button alignment`\n- `refactor: simplify form validation`\n\n**Your task:** Make at least 3 commits today and push them all to GitHub. Check your repo online to confirm they''re there!"
    }'::jsonb,
    NOW(),
    NOW()
);

-- ============================================
-- ACTIVITY 5: Day 3 Reflection (reflection_card)
-- ============================================
INSERT INTO path_activities (
    id,
    day_id,
    activity_type,
    title,
    description,
    "order",
    is_required,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act5',
    'web-dev-day-3',
    'reflection_card',
    'Day 3 Reflection',
    'What was satisfying? What was frustrating?',
    5,
    true,
    NOW(),
    NOW()
);

-- Activity 5 Content (Reflection Card)
INSERT INTO path_content (
    id,
    activity_id,
    content_type,
    content,
    created_at,
    updated_at
) VALUES (
    'web-dev-day3-act5-content',
    'web-dev-day3-act5',
    'reflection_card',
    '{
        "title": "Reflect on Your Build Day",
        "prompts": [
            "What was the most satisfying moment today?",
            "What was the most frustrating?",
            "Did you enjoy the problem-solving aspect?",
            "How did it feel to use AI as a coding partner?"
        ]
    }'::jsonb,
    NOW(),
    NOW()
);
