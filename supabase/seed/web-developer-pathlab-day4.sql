-- Day 4: Polish & Ship
-- Web Developer PathLab

-- ============================================
-- PATH_DAYS
-- ============================================

INSERT INTO path_days (id, path_id, day_number, title, context, reflection_prompts, created_at, updated_at)
VALUES (
  'web-dev-day-4',
  'web-dev-path-001',
  4,
  'Day 4: Polish & Ship',
  'You have working code. Now it''s time to make it feel real. Today you''ll polish the UI, fix bugs, and deploy your project live on the internet. By end of day, anyone with a link will be able to see what you built.',
  '["How does it feel to have something live on the internet?", "What part of the process did you enjoy most?", "What part would you want to avoid in the future?"]',
  NOW(),
  NOW()
);

-- ============================================
-- PATH_ACTIVITIES
-- ============================================

-- Activity 1: Final Review (npc_chat)
INSERT INTO path_activities (id, path_day_id, activity_number, title, activity_type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day4-act1',
  'web-dev-day-4',
  1,
  'Final Review',
  'npc_chat',
  true,
  10,
  NOW(),
  NOW()
);

-- Activity 2: Polish & Fix (ai_chat)
INSERT INTO path_activities (id, path_day_id, activity_number, title, activity_type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day4-act2',
  'web-dev-day-4',
  2,
  'Polish & Fix',
  'ai_chat',
  true,
  45,
  NOW(),
  NOW()
);

-- Activity 3: Deploy Live (text + resource_link)
INSERT INTO path_activities (id, path_day_id, activity_number, title, activity_type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day4-act3',
  'web-dev-day-4',
  3,
  'Deploy Live',
  'text',
  true,
  30,
  NOW(),
  NOW()
);

-- Activity 4: Project Report (daily_prompt)
INSERT INTO path_activities (id, path_day_id, activity_number, title, activity_type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day4-act4',
  'web-dev-day-4',
  4,
  'Project Report',
  'daily_prompt',
  true,
  20,
  NOW(),
  NOW()
);

-- Activity 5: Day 4 Reflection (reflection_card)
INSERT INTO path_activities (id, path_day_id, activity_number, title, activity_type, is_required, estimated_minutes, created_at, updated_at)
VALUES (
  'web-dev-day4-act5',
  'web-dev-day-4',
  5,
  'Day 4 Reflection',
  'reflection_card',
  true,
  15,
  NOW(),
  NOW()
);

-- ============================================
-- PATH_CONTENT
-- ============================================

-- Activity 1: Final Review (npc_chat) - PM Alex launch approval
INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act1-content1',
  'web-dev-day4-act1',
  'npc_chat',
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
  }',
  1,
  NOW(),
  NOW()
);

-- Activity 2: Polish & Fix (ai_chat) - UI improvements
INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act2-content1',
  'web-dev-day4-act2',
  'ai_chat',
  '{
    "title": "Polish Your Project",
    "description": "Use AI to improve your UI, fix bugs, and add final touches before shipping.",
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
  }',
  1,
  NOW(),
  NOW()
);

-- Activity 3: Deploy Live (text + resource_link) - Vercel/Netlify
INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act3-content1',
  'web-dev-day4-act3',
  'text',
  '{
    "title": "Deploy Your Project Live",
    "body": "It''s time to ship! Deployment makes your project accessible to anyone with a URL. This is the moment your work goes from local to live.\n\n**Choose Your Platform:**\n\n**Vercel** (Recommended)\n- Best for Next.js, React, and modern frameworks\n- Connects directly to GitHub\n- Automatic deployments on every push\n- Free tier includes custom domains\n\n**Netlify**\n- Great for static sites and SPAs\n- Drag-and-drop deployment\n- Built-in form handling\n- Free SSL certificates\n\n**Steps to Deploy:**\n1. Push your final code to GitHub\n2. Connect your repo to Vercel or Netlify\n3. Configure build settings (usually auto-detected)\n4. Deploy and get your live URL\n5. Test the live site thoroughly\n\n**Before You Deploy:**\n- [ ] All features work as expected\n- [ ] No console errors\n- [ ] Responsive on mobile\n- [ ] Loading states handled\n- [ ] README updated\n\nOnce deployed, share your URL with pride. You built this!"
  }',
  1,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act3-content2',
  'web-dev-day4-act3',
  'resource_link',
  '{
    "title": "Vercel Deployment Guide",
    "url": "https://vercel.com/docs/concepts/deployments/overview",
    "description": "Official guide for deploying projects on Vercel"
  }',
  2,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act3-content3',
  'web-dev-day4-act3',
  'resource_link',
  '{
    "title": "Netlify Deployment Guide",
    "url": "https://docs.netlify.com/site-deploys/overview/",
    "description": "Official guide for deploying projects on Netlify"
  }',
  3,
  NOW(),
  NOW()
);

INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act3-content4',
  'web-dev-day4-act3',
  'resource_link',
  '{
    "title": "GitHub Pages Deployment",
    "url": "https://pages.github.com/",
    "description": "Free hosting directly from your GitHub repository"
  }',
  4,
  NOW(),
  NOW()
);

-- Activity 4: Project Report (daily_prompt) - Document the project
INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act4-content1',
  'web-dev-day4-act4',
  'daily_prompt',
  '{
    "title": "Project Report",
    "description": "Document what you built, how you built it, and what you learned. This becomes part of your portfolio.",
    "template": "## Project Report\n\n**Project Name:** [Name]\n\n**Live URL:** [Your deployed URL]\n\n**What I Built:**\n[2-3 sentences describing your project]\n\n**How I Built It:**\n[What tools did you use? What AI helped with?]\n\n**What I Learned:**\n[Technical lessons + personal insights]\n\n**What I''d Do Differently:**\n[If you had more time or could start over]\n\n**Screenshots:**\n[Add screenshots of your project]",
    "min_words": 50,
    "required": true
  }',
  1,
  NOW(),
  NOW()
);

-- Activity 5: Day 4 Reflection (reflection_card)
INSERT INTO path_content (id, path_activity_id, content_type, content, sequence_order, created_at, updated_at)
VALUES (
  'web-dev-day4-act5-content1',
  'web-dev-day4-act5',
  'reflection_card',
  '{
    "title": "Day 4 Reflection",
    "description": "You shipped something real today. Reflect on the experience.",
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
  }',
  1,
  NOW(),
  NOW()
);
