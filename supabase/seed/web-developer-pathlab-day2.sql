-- Day 2: Design & Plan
-- Web Developer PathLab

-- Insert Day 2
INSERT INTO path_days (id, path_id, day_number, title, context, reflection_prompts, created_at, updated_at)
VALUES (
  'web-dev-day-2',
  'web-dev-path-001',
  2,
  'Day 2: Design & Plan',
  'Yesterday you got a taste of what''s possible. Today we slow down and do what experienced developers do: refine the idea, make design decisions, and plan the build. This is where projects succeed or fail - in the planning.',
  '["Did you enjoy the design/planning phase more or less than building?", "What was harder than expected about defining your project?", "How confident do you feel about your plan?"]',
  NOW(),
  NOW()
);

-- Activity 1: Requirements Review (npc_chat)
INSERT INTO path_activities (id, path_day_id, activity_number, title, type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day2-act1',
  'web-dev-day-2',
  1,
  'Requirements Review',
  'npc_chat',
  true,
  15,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, created_at, updated_at)
VALUES (
  'web-dev-day2-act1-content',
  'web-dev-day2-act1',
  'npc_chat',
  '{
    "npc_id": "pm-alex",
    "messages": [
      {
        "role": "npc",
        "content": "I saw your v0 prototype - nice start! Before we lock in the design, I have a few questions:\n\n1. Who is this for? Be specific - ''everyone'' is not an answer.\n2. What''s the ONE thing it needs to do really well?\n3. What would make you proud to ship this?\n\nTake a few minutes to think about these. Your answers will shape everything we build."
      }
    ]
  }',
  NOW(),
  NOW()
);

-- Activity 2: Project Brief (daily_prompt)
INSERT INTO path_activities (id, path_day_id, activity_number, title, type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day2-act2',
  'web-dev-day-2',
  2,
  'Project Brief',
  'daily_prompt',
  true,
  20,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, created_at, updated_at)
VALUES (
  'web-dev-day2-act2-content',
  'web-dev-day2-act2',
  'daily_prompt',
  '{
    "title": "Write Your Project Brief",
    "description": "Use the template below to define your project clearly. This brief will guide your build over the next few days.",
    "template": "## Project Brief\n\n**Name:** [Your project name]\n\n**One-liner:** [What does it do in one sentence?]\n\n**Target User:** [Who will use this? Be specific]\n\n**Core Feature:** [The ONE thing it must do well]\n\n**Nice-to-haves:** [Features if time permits]\n\n**Success looks like:** [How will you know it''s done?]",
    "min_length": 100,
    "placeholder": "Start writing your project brief here..."
  }',
  NOW(),
  NOW()
);

-- Activity 3: Design Iteration (ai_chat)
INSERT INTO path_activities (id, path_day_id, activity_number, title, type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day2-act3',
  'web-dev-day-2',
  3,
  'Design Iteration',
  'ai_chat',
  true,
  25,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, created_at, updated_at)
VALUES (
  'web-dev-day2-act3-content',
  'web-dev-day2-act3',
  'ai_chat',
  '{
    "title": "Refine Your Design",
    "description": "Go back to v0.dev and iterate on your prototype based on your project brief. Use the AI to help you refine the design.",
    "suggested_prompts": [
      "Based on my project brief, help me improve this design: [paste your brief]",
      "I want to change the layout to better fit [specific need]. How should I prompt v0?",
      "Review my design and suggest improvements for [target user]",
      "Help me simplify this design to focus on the core feature"
    ],
    "context": "You have your project brief now. Use it to guide your design iterations. The clearer your prompts, the better results you''ll get."
  }',
  NOW(),
  NOW()
);

-- Activity 4: Plan the Build (text)
INSERT INTO path_activities (id, path_day_id, activity_number, title, type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day2-act4',
  'web-dev-day-2',
  4,
  'Plan the Build',
  'text',
  true,
  20,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, created_at, updated_at)
VALUES (
  'web-dev-day2-act4-content',
  'web-dev-day2-act4',
  'text',
  '{
    "title": "Break Down Your Build",
    "body": "Now that you have a clear design and brief, it''s time to plan the actual build. Experienced developers know that good planning prevents headaches later.\n\n## Your Task\n\nBreak your project down into small, actionable tasks. Aim for tasks that take 30-60 minutes each.\n\n### Suggested Structure:\n\n**Day 3 Tasks (Core Build):**\n- Set up project structure\n- Build [specific component/feature]\n- Implement [core functionality]\n- Test and debug\n\n**Day 4 Tasks (Polish & Ship):**\n- Add styling and polish\n- Fix any remaining bugs\n- Deploy to production\n- Write project report\n\n### Tips:\n- Be specific - ''build the app'' is not a task\n- Order matters - what needs to happen first?\n- Leave buffer time - things always take longer than expected\n\nWrite your task list in a note or document. You''ll use it tomorrow.",
    "format": "markdown"
  }',
  NOW(),
  NOW()
);

-- Activity 5: Day 2 Reflection (reflection_card)
INSERT INTO path_activities (id, path_day_id, activity_number, title, type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day2-act5',
  'web-dev-day-2',
  5,
  'Day 2 Reflection',
  'reflection_card',
  true,
  10,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, created_at, updated_at)
VALUES (
  'web-dev-day2-act5-content',
  'web-dev-day2-act5',
  'reflection_card',
  '{
    "title": "Reflect on Day 2",
    "description": "Take a moment to reflect on today''s design and planning work.",
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
  }',
  NOW(),
  NOW()
);
