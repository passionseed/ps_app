# Web Developer PathLab Design

## Overview

A 5-day immersive PathLab that teaches complete beginners what it means to be a web developer through hands-on building with modern AI-powered tools. Students ship a real project while evaluating career fit through the ikigai framework.

## Target Audience

- **Level:** Complete beginners (no coding experience)
- **Goal:** Career fit decision + hands-on experience
- **Duration:** 5 days

## Learning Objectives

By the end of this PathLab, students will:

1. **Understand** the modern web developer workflow (AI-augmented development)
2. **Experience** the full development cycle: ideation → design → build → ship
3. **Use** real tools: Cursor, GitHub, v0.dev, deployment platforms
4. **Evaluate** their fit for web development through ikigai mapping
5. **Decide** if web development is a career path worth pursuing

## Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| Learn by doing | Ship a real project, not just tutorials |
| AI as partner | Use Cursor, Copilot, v0.dev authentically |
| Real workflow | GitHub from day 1, commits, deployment |
| Guided discovery | NPC Product Manager provides context and support |
| Self-reflection | Daily reflections + ikigai framework |

## 5-Day Structure

### Day 1: Setup & Discover

**Theme:** "Today you become a web developer."

**Context Text:**
> Welcome to your first day as a web developer. Not a student learning about web development - an actual developer with real tools. Today you'll set up your environment, explore what's possible, and create your first prototype. By the end of the day, you'll have something visual to show for it.

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | Meet Your PM | `npc_chat` | PM Alex introduces the project, sets expectations, welcomes student to the "team" |
| 2 | Tool Setup | `text` + `resource_link` | Install Cursor, create GitHub account, configure environment |
| 3 | Explore the Ecosystem | `resource_link` | Browse awesome lists (awesome-web-development, awesome-resources), discover what's possible |
| 4 | First Prototype | `ai_chat` | Use v0.dev to generate a UI for a simple idea |
| 5 | Day 1 Reflection | `reflection_card` | What excited you? What felt overwhelming? |

**NPC Chat - Activity 1:**
```
PM Alex: "Hey! I'm Alex, your Product Manager for this project. Excited to have you on the team.

Let me give you the quick context: We're building something from scratch this week, and you're going to ship it live by Day 4. No pressure, but also... this is how real developers work.

Today's mission: Get your tools set up, explore what's possible, and create your first prototype using v0.dev. It's going to generate UI for you - don't worry about how it works yet. Just play.

Ready to dive in?"
```

**Reflection Prompts:**
- What part of today felt most exciting?
- What felt confusing or overwhelming?
- On a scale of 1-10, how curious are you to continue?

---

### Day 2: Design & Plan

**Theme:** "Real developers don't just code - they design, plan, and iterate."

**Context Text:**
> Yesterday you got a taste of what's possible. Today we slow down and do what experienced developers do: refine the idea, make design decisions, and plan the build. This is where projects succeed or fail - in the planning.

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | Requirements Review | `npc_chat` | PM Alex reviews prototype, asks clarifying questions, helps refine the idea |
| 2 | Project Brief | `daily_prompt` | Write a short brief: What are you building? Who is it for? What features? |
| 3 | Design Iteration | `ai_chat` | Refine v0 prototype based on feedback, iterate on design |
| 4 | Plan the Build | `text` | Break down into tasks, estimate complexity, create a simple roadmap |
| 5 | Day 2 Reflection | `reflection_card` | How did planning feel? Did you enjoy the design phase? |

**NPC Chat - Activity 1:**
```
PM Alex: "I saw your v0 prototype - nice start! Before we lock in the design, I have a few questions:

1. Who is this for? Be specific - 'everyone' is not an answer.
2. What's the ONE thing it needs to do really well?
3. What would make you proud to ship this?

Take a few minutes to think about these. Your answers will shape everything we build."
```

**Daily Prompt - Project Brief Template:**
```
## Project Brief

**Name:** [Your project name]

**One-liner:** [What does it do in one sentence?]

**Target User:** [Who will use this? Be specific]

**Core Feature:** [The ONE thing it must do well]

**Nice-to-haves:** [Features if time permits]

**Success looks like:** [How will you know it's done?]
```

**Reflection Prompts:**
- Did you enjoy the design/planning phase more or less than building?
- What was harder than expected about defining your project?
- How confident do you feel about your plan?

---

### Day 3: Build Core

**Theme:** "This is where developers spend most of their time - turning ideas into working code."

**Context Text:**
> Today is build day. You have your plan, you have your tools, and you have AI as your coding partner. The goal: implement the core features. Don't worry about perfection - worry about making it work. You can always polish tomorrow.

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | Sprint Check-in | `npc_chat` | PM Alex checks progress, helps unblock, offers encouragement |
| 2 | Core Implementation | `text` + `resource_link` | Build main features with Cursor + Copilot, commit regularly |
| 3 | Debug with AI | `ai_chat` | When stuck, use AI to understand and fix issues |
| 4 | Commit & Push | `text` | Push to GitHub after each feature, learn commit hygiene |
| 5 | Day 3 Reflection | `reflection_card` | What was satisfying? What was frustrating? |

**NPC Chat - Activity 1:**
```
PM Alex: "How's the sprint going? 

Quick check-in:
- What's working?
- What's blocking you?
- Do you need to adjust the scope?

Remember: A shipped simple project beats an unfinished complex one. If you're stuck, let's simplify."
```

**AI Chat Prompt Suggestions:**
- "I'm getting this error: [paste error]. Help me understand and fix it."
- "How do I implement [feature] in my project?"
- "Review my code and suggest improvements."

**Reflection Prompts:**
- What was the most satisfying moment today?
- What was the most frustrating?
- Did you enjoy the problem-solving aspect?
- How did it feel to use AI as a coding partner?

---

### Day 4: Polish & Ship

**Theme:** "The difference between a project and a product is polish. Today you ship."

**Context Text:**
> You have working code. Now it's time to make it feel real. Today you'll polish the UI, fix bugs, and deploy your project live on the internet. By end of day, anyone with a link will be able to see what you built.

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | Final Review | `npc_chat` | PM Alex reviews progress, gives launch approval |
| 2 | Polish & Fix | `ai_chat` | Improve UI, add interactions, fix remaining bugs |
| 3 | Deploy Live | `text` + `resource_link` | Ship to Vercel/Netlify, get a live URL |
| 4 | Project Report | `daily_prompt` | Document what you built, how you built it, what you learned |
| 5 | Day 4 Reflection | `reflection_card` | How does it feel to have something live? |

**NPC Chat - Activity 1:**
```
PM Alex: "Looking good! Let's do a final review before we ship.

Tell me:
1. What are you most proud of?
2. What would you do differently if you had more time?
3. Are you ready to ship?

If yes, let's get this live. If not, what's blocking you?"
```

**Daily Prompt - Project Report Template:**
```
## Project Report

**Project Name:** [Name]

**Live URL:** [Your deployed URL]

**What I Built:**
[2-3 sentences describing your project]

**How I Built It:**
[What tools did you use? What AI helped with?]

**What I Learned:**
[Technical lessons + personal insights]

**What I'd Do Differently:**
[If you had more time or could start over]

**Screenshots:**
[Add screenshots of your project]
```

**Reflection Prompts:**
- How does it feel to have something live on the internet?
- What part of the process did you enjoy most?
- What part would you want to avoid in the future?

---

### Day 5: Reflect & Decide

**Theme:** "You've shipped. Now the real question: Is this who you want to be?"

**Context Text:**
> You built something real. You shipped it. You used the same tools professional developers use every day. Now it's time to answer the most important question: Is web development a career fit for you?

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | Sprint Retrospective | `npc_chat` | PM Alex leads career conversation, discusses the journey |
| 2 | Ikigai Mapping | `reflection_card` | Map your experience to the 4 quadrants of ikigai |
| 3 | Career Fit Analysis | `ai_chat` | AI analyzes reflections and gives personalized feedback |
| 4 | Explore Next Steps | `text` + `resource_link` | Bootcamps, self-taught paths, CS degrees - what's next? |
| 5 | Final Decision | `daily_prompt` | Your decision and next steps |

**NPC Chat - Activity 1:**
```
PM Alex: "Great sprint! Let's do a retrospective.

I want you to think about the whole week:
- What days did you look forward to?
- What days felt like a grind?
- When were you in flow? When were you frustrated?

These aren't just project questions - they're career questions. The things that energized you? That's data. The things that drained you? Also data.

Let's talk about what this means for your career."
```

**Reflection Card - Ikigai Mapping:**
```
## Your Web Dev Ikigai

**What You Love (Passion)**
- What parts of this week did you genuinely enjoy?
- When did you lose track of time?

**What You're Good At (Profession)**
- What came naturally to you?
- What did others (or AI) have to help you with?

**What The World Needs (Mission)**
- What problem does your project solve?
- Who benefits from what you built?

**What You Can Be Paid For (Vocation)**
- What skills did you use that have market value?
- What would you need to learn to be hireable?

**The Center (Your Ikigai)**
Based on your answers, where do you see yourself?
```

**AI Chat Prompt:**
```
"Based on my reflections from this week, analyze whether web development is a good career fit for me. Consider:
- What energized me vs drained me
- My natural strengths and growth areas
- The gap between my current skills and hireability
- Alternative roles I might consider

Give me an honest assessment with specific recommendations."
```

**Daily Prompt - Final Decision:**
```
## My Decision

**After this week, I believe web development is:**
[ ] Definitely for me - I want to pursue this
[ ] Maybe for me - I want to explore more
[ ] Probably not for me - I want to explore other paths
[ ] Definitely not for me - I'm glad I tried but this isn't it

**My reasoning:**
[Why did you choose this answer?]

**My next steps:**
[What will you do in the next 30 days?]

**Resources I'll explore:**
[Links, courses, communities, etc.]
```

---

## NPC Product Manager Character

**Name:** Alex
**Role:** Senior Product Manager at a tech company
**Personality:** 
- Encouraging but realistic
- Asks good questions rather than giving answers
- Celebrates wins, normalizes struggles
- Treats student as a junior team member

**Voice Guidelines:**
- Casual but professional
- Uses "we" language (team mindset)
- Asks open-ended questions
- Validates feelings while pushing forward

---

## Content Type Summary

| Content Type | Count | Purpose |
|--------------|-------|---------|
| `npc_chat` | 5 | PM Alex guides through each day |
| `ai_chat` | 5 | Technical help, design feedback, career analysis |
| `text` | 8 | Instructions, context, explanations |
| `resource_link` | 8 | Awesome lists, docs, deployment guides, career resources |
| `daily_prompt` | 3 | Project brief, report, final decision |
| `reflection_card` | 5 | Daily reflections + ikigai |

**Total Activities:** ~26 across 5 days

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Completion rate | >70% complete all 5 days |
| Ship rate | >80% deploy a live project |
| Reflection quality | Average reflection length >50 words |
| Career decision clarity | >90% make a clear decision on Day 5 |

---

## Technical Requirements

### Seed Creation
- `map_id`: Link to existing learning map (or create "Career Exploration" map)
- `title`: "Web Developer: Ship Your First Project"
- `description`: "A 5-day immersive experience to discover if web development is your career fit. Build with AI tools, ship a real project, and decide your future."
- `seed_type`: "pathlab"
- `category_id`: Link to "Technology" or "Career Exploration" category

### NPC Avatar
- Create `seed_npc_avatars` record for PM Alex
- Include SVG avatar and personality description

### Path Structure
- `total_days`: 5
- Each day has 4-5 activities
- Mix of content types as specified above

---

## Open Questions

1. **Project ideas:** Should we provide a list of suggested project ideas, or let students choose freely?
2. **Deployment platform:** Vercel vs Netlify vs other? (Vercel has best Cursor integration)
3. **NPC avatar:** Do we need a visual avatar, or is text-only sufficient?
4. **Assessment:** Should Day 5 include a quiz-style fit assessment, or rely on reflections only?

---

## Next Steps

1. Create seed record in database
2. Create NPC avatar for PM Alex
3. Generate path_days, path_activities, and path_content
4. Create expert_pathlabs record (if linking to an expert interview)
5. Test the full PathLab flow