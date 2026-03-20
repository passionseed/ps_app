-- Day 5: Reflect & Decide
-- Web Developer PathLab

-- ============================================
-- PATH_DAYS RECORD
-- ============================================

INSERT INTO path_days (
    id,
    path_id,
    day_number,
    title,
    context_text,
    reflection_prompts,
    created_at,
    updated_at
) VALUES (
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
);

-- ============================================
-- PATH_ACTIVITIES RECORDS
-- ============================================

-- Activity 1: Sprint Retrospective (npc_chat)
INSERT INTO path_activities (
    id,
    path_day_id,
    activity_type,
    title,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act1',
    'web-dev-day-5',
    'npc_chat',
    'Sprint Retrospective',
    'PM Alex leads career conversation, discusses the journey',
    1,
    NOW(),
    NOW()
);

-- Activity 2: Ikigai Mapping (reflection_card)
INSERT INTO path_activities (
    id,
    path_day_id,
    activity_type,
    title,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act2',
    'web-dev-day-5',
    'reflection_card',
    'Ikigai Mapping',
    'Map your experience to the 4 quadrants of ikigai',
    2,
    NOW(),
    NOW()
);

-- Activity 3: Career Fit Analysis (ai_chat)
INSERT INTO path_activities (
    id,
    path_day_id,
    activity_type,
    title,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act3',
    'web-dev-day-5',
    'ai_chat',
    'Career Fit Analysis',
    'AI analyzes reflections and gives personalized feedback',
    3,
    NOW(),
    NOW()
);

-- Activity 4: Explore Next Steps (text + resource_link)
INSERT INTO path_activities (
    id,
    path_day_id,
    activity_type,
    title,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4',
    'web-dev-day-5',
    'text',
    'Explore Next Steps',
    'Bootcamps, self-taught paths, CS degrees - what''s next?',
    4,
    NOW(),
    NOW()
);

-- Activity 5: Final Decision (daily_prompt)
INSERT INTO path_activities (
    id,
    path_day_id,
    activity_type,
    title,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act5',
    'web-dev-day-5',
    'daily_prompt',
    'Final Decision',
    'Your decision and next steps',
    5,
    NOW(),
    NOW()
);

-- ============================================
-- PATH_CONTENT RECORDS
-- ============================================

-- Activity 1 Content: Sprint Retrospective (npc_chat)
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act1-content1',
    'web-dev-day5-act1',
    'npc_message',
    'Great sprint! Let''s do a retrospective.

I want you to think about the whole week:
- What days did you look forward to?
- What days felt like a grind?
- When were you in flow? When were you frustrated?

These aren''t just project questions - they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.

Let''s talk about what this means for your career.',
    1,
    NOW(),
    NOW()
);

-- Activity 2 Content: Ikigai Mapping (reflection_card)
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act2-content1',
    'web-dev-day5-act2',
    'reflection_prompt',
    '## Your Web Dev Ikigai

**What You Love (Passion)**
- What parts of this week did you genuinely enjoy?
- When did you lose track of time?

**What You''re Good At (Profession)**
- What came naturally to you?
- What did others (or AI) have to help you with?

**What The World Needs (Mission)**
- What problem does your project solve?
- Who benefits from what you built?

**What You Can Be Paid For (Vocation)**
- What skills did you use that have market value?
- What would you need to learn to be hireable?

**The Center (Your Ikigai)**
Based on your answers, where do you see yourself?',
    1,
    NOW(),
    NOW()
);

-- Activity 3 Content: Career Fit Analysis (ai_chat)
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act3-content1',
    'web-dev-day5-act3',
    'ai_prompt',
    'Based on my reflections from this week, analyze whether web development is a good career fit for me. Consider:
- What energized me vs drained me
- My natural strengths and growth areas
- The gap between my current skills and hireability
- Alternative roles I might consider

Give me an honest assessment with specific recommendations.',
    1,
    NOW(),
    NOW()
);

-- Activity 4 Content: Explore Next Steps (text)
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4-content1',
    'web-dev-day5-act4',
    'text',
    'You''ve experienced what it''s like to be a web developer. Now it''s time to decide how to move forward. Here are the main paths people take:

**Coding Bootcamps (3-6 months)**
Intensive, structured programs that teach job-ready skills. Great if you want guided learning and career support.

**Self-Taught Path (6-12+ months)**
Learn at your own pace using free/cheap resources. Requires discipline but offers flexibility. Build a portfolio through projects.

**Computer Science Degree (4 years)**
Deep theoretical foundation. Best for certain roles (AI, systems programming) and larger companies. Significant time and cost investment.

**Hybrid Approach**
Combine elements: take a short bootcamp, supplement with self-study, or get a degree while building projects.

There''s no "right" answer - only what fits your situation, learning style, and goals.',
    1,
    NOW(),
    NOW()
);

-- Activity 4 Content: Resource Links
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    metadata,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4-content2',
    'web-dev-day5-act4',
    'resource_link',
    'freeCodeCamp - Free self-paced coding curriculum',
    '{"url": "https://www.freecodecamp.org/", "category": "self-taught"}',
    2,
    NOW(),
    NOW()
);

INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    metadata,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4-content3',
    'web-dev-day5-act4',
    'resource_link',
    'The Odin Project - Full-stack curriculum with projects',
    '{"url": "https://www.theodinproject.com/", "category": "self-taught"}',
    3,
    NOW(),
    NOW()
);

INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    metadata,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4-content4',
    'web-dev-day5-act4',
    'resource_link',
    'Course Report - Compare coding bootcamps',
    '{"url": "https://www.coursereport.com/", "category": "bootcamps"}',
    4,
    NOW(),
    NOW()
);

INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    metadata,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act4-content5',
    'web-dev-day5-act4',
    'resource_link',
    'roadmap.sh - Developer career roadmaps',
    '{"url": "https://roadmap.sh/", "category": "career"}',
    5,
    NOW(),
    NOW()
);

-- Activity 5 Content: Final Decision (daily_prompt)
INSERT INTO path_content (
    id,
    path_activity_id,
    content_type,
    content,
    sort_order,
    created_at,
    updated_at
) VALUES (
    'web-dev-day5-act5-content1',
    'web-dev-day5-act5',
    'prompt_template',
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
    NOW(),
    NOW()
);
