# Profile Real-Data Redesign

## Goal

Refocus the Profile tab on who the student is and what they are aiming for, using only real data already stored in the app. The page should prioritize career goals first, interests second, and remove dashboard-style noise and fake social content.

## Product Direction

The current screen mixes real onboarding and Ikigai data with invented metrics, mock skills, a fake friend count, and a fake achievement feed. That makes the page feel less trustworthy and distracts from the student's actual direction.

The redesigned Profile page should answer three questions in order:

1. Who am I?
2. What do I want to become?
3. What have I actually done in the app?

## Information Hierarchy

### 1. Identity Header

The top card remains visually strong, but it becomes quieter and more truthful.

- Show avatar, display name, education level, school, and preferred language.
- Remove fake labels such as `Level 3 Explorer`.
- Remove the fake friends row.

### 2. Career Goals First

Career goals are the main content in the hero area.

- Render real `career_goals` as the most visually prominent chips.
- If the user has no career goals yet, show an honest empty state with a direct CTA back into discovery or onboarding.
- Do not inject aspirational placeholder goals.

### 3. Interests As Supporting Context

Interests remain important, but they are secondary to goals.

- Render selected interest statements from `user_interests`.
- Use lighter chip styling than career goals so the visual emphasis stays on intent.
- Do not inject fallback mock interests.

### 4. Ikigai As Supporting Progress

The current Ikigai section already uses real data and should stay, but lower on the page.

- Keep the real compass cards.
- Keep the real score trend when timeline data exists.
- Keep the empty state that prompts Seed exploration when no score data exists.

### 5. Real Activity Only

The social/achievement section should be replaced with a recent activity feed sourced from real `user_events`.

- Valid activity items include: onboarding step completion, interest selection, career selection, portfolio changes, program saves, fit score views, and journey creation.
- No mock achievements.
- No social feed items.
- If activity is sparse or absent, show a clean empty state rather than fabricating motion.

### 6. Portfolio And TCAS Actions

Keep the existing action rows because they connect to real user work.

- Preserve navigation to portfolio and TCAS fit.
- Adjust supporting copy so it reflects real usage rather than generic promo language when possible.

## Data Contract

The page should only use real data from existing sources:

- `profiles`
- `career_goals`
- `user_interests`
- `student_journeys`
- `score_events`
- `student_portfolio_items`
- `saved_programs`
- `user_events`

The page should not render any section backed by hardcoded social, skill, friend, or stat data.

## Empty-State Rule

When real data is missing:

- show a truthful empty state
- provide one next action
- do not substitute invented content

## Testing Direction

Because the repo has Vitest but not established React Native component tests for this screen, the change should extract pure helper functions for profile data shaping and cover them with unit tests. The tests should verify that:

- career goals are prioritized over interests in the top-section data model
- activity feed items come only from real event types
- no mock fallback data is emitted
