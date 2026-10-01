# Passion Seed app plan: SHIFT first, useful for everyone

Updated: 2026-10-01. This document records the agreed product direction and
remaining work. It is a plan, not a claim that these features are live.

## Product direction

Make the app easy to start using, including for someone with no project idea or
career direction. Help people choose something, try it, share real work, get
support, and decide what to do next.

Support the three SDT needs through the experience:

- Autonomy: people choose their focus, project, skills, and next steps.
- Competence: people build, test, improve, and collect evidence of learning.
- Relatedness: peers and mentors respond to real work and help each other grow.

SHIFT is the first structured experience to validate this loop. Joining SHIFT
must not become a requirement for getting value from the wider app.

## Current implementation status

The interactive SHIFT implementation is on
[`codex/interactive-shift-camp`](https://github.com/passionseed/ps_app/tree/codex/interactive-shift-camp),
at mobile commit `dda1a002867b959791c5ee3cab191ca78a913c7e`. Its companion backend
and staff tools are in
[`passionseed/web`, commit `2aaa9447`](https://github.com/passionseed/web/commit/2aaa9447c7cb25911a936a51381fc024701dfb06).

That implementation includes:

- A short, resumable Thai/English introduction.
- Scheduled seven-day camps with Today, Projects, and My Group screens.
- Peer groups targeting three people, separate from project ownership.
- Solo projects and shared projects, including mixed groups.
- Daily Tried/Shipped, Broke, and Learned updates, plus a final demo post.
- Project links, private screenshots, contributor attribution, and peer feedback.
- Individual milestones and optional private choice/capability/support check-ins.
- Mentor checkpoints on Days 1, 4, and 7, group support, and moderation.
- Cohort-only presentations, private drafts, and shared-edit conflict handling.

These changes were tested against their original checkout. The company repo's
remote `main`, checked at `f0cae48`, has a newer, divergent app architecture and
does not contain that mobile commit. Integration with current `main`, production
migration, native device QA, and release remain outstanding.

In the camp implementation, unenrolled users retain Discover, My Paths, and
Profile. The new camp navigation is conditional on cohort enrollment. The wider
redesign below has not been implemented as part of the SHIFT work.

## Phase 1: integrate and launch the SHIFT pilot

1. Port the SHIFT feature into current `main`, preserving its existing auth,
   hackathon experience, design system, and TanStack Query conventions. Review
   conflicting files individually rather than replacing the newer app wholesale.
2. Verify the companion backend migration against the full target schema and
   existing policies/triggers, then apply it before releasing the app.
3. Create a scheduled cohort and explicitly enroll participant and mentor account
   IDs. Help participants choose peers; staff fills unmatched places.
4. Verify the whole journey on native devices: introduction, group invitations,
   solo/shared projects, screenshots, draft recovery, feedback, final demo, and
   mentor support. Include large text and screen-reader checks.
5. Build and release a native app containing the new photo-picker module. An OTA
   update to a binary without that module is insufficient.
6. Run a complete seven-day pilot before expanding.

Release criteria: camp data stays cohort-only; drafts and check-ins stay private;
groups cannot exceed three; shared posts do not complete another person's
milestones; failed saves preserve work; mentor reviews do not block later days.

Evaluate actual participation, unanswered work, external testing evidence,
unresolved requests, mentor time, and participant interviews. Posting totals
and self-reports alone do not establish SDT improvement or prove scalability.

## Phase 2: make the core app useful outside SHIFT

| Area | Remaining work | What a person should be able to do |
| --- | --- | --- |
| Onboarding and personalization | Replace long upfront questionnaires with a short start and optional questions at relevant moments. Use interests, goals, availability, skills, and actual activity to tailor suggestions. Let people skip and edit answers. | Start without knowing their future, and get increasingly relevant suggestions. |
| Home | Show current focus, one useful suggested next action, active projects/camps/learning experiences, and recent progress. Provide a helpful empty state for someone with no enrollment or project. | Understand what they can do now without having to join SHIFT. |
| Explore | Surface real projects, small things to try, learning experiences, and people or groups to collaborate with. Show enough context to take a next step. | Discover something worth trying, respond to work, or find collaborators. |
| Community | Extend project sharing, questions, and useful feedback beyond camp groups into topic communities. Define membership, visibility, reporting, and moderation before opening posting broadly. | Find people around a shared interest and get support for real work. |
| Opportunities | Organize relevant camps, competitions, internships, and collaboration openings. Include eligibility, dates, source links, and clear next actions. | Find and act on a relevant opportunity. |
| Profile and portfolio | Bring together real projects, contributions, evidence, skills practiced, and reflections across experiences. Give people control over what they share. | Show what they actually did and learned, with evidence. |

Home answers “What can I do now?” Explore answers “What else could I try?”
Profile holds the accumulated work. A camp is one experience within the app.

Explore can use a visual project gallery, but discovery must lead to actions such
as trying a project, giving feedback, joining a group, or starting an experience.
It should not depend on users producing polished reels.

The exact general navigation and Explore layout still need validation. A possible
structure is Home, Explore, Community, and Profile, with opportunities inside
Explore. This is a proposal, not a finalized tab specification.

Suggested delivery order:

1. Short general onboarding, useful Home, and real profile/portfolio continuity.
2. Explore with existing learning experiences and a curated project selection.
3. Topic communities with working moderation and a small opportunities catalog.
4. Improve personalization using what people choose, try, complete, and reflect on.

Acceptance criteria: a new unenrolled person can reach a useful first action;
existing users retain their work and preferences; recommendations can be
understood and changed; profiles show truthful data and honest empty states;
opportunities have maintained sources and dates.

## Phase 3: creator platform

The later vision is a platform for creators who want to share their work without
having to edit reels. Define the creator publishing workflow after validating
project posting and discovery in SHIFT and the wider app.

Public showcases and richer creator tools are future scope. Automated matching,
private one-to-one messaging, and a broad open social feed are not part of the
first camp release.

## Implementation references

- [Product purpose](../PRODUCT.md)
- [Design system](../DESIGN.md)
- [Current data-fetching conventions](../OPTIMIZATION_GUIDE.md)
- [Earlier profile real-data plan](2026-03-29-profile-real-data-plan.md)
- [SHIFT backend setup and verification](https://github.com/passionseed/web/blob/2aaa9447c7cb25911a936a51381fc024701dfb06/docs/interactive-shift.md)

Reconcile overlapping older plans with this direction and the current code before
implementing a phase. Each phase needs its own concrete screen, data, and release
scope.
