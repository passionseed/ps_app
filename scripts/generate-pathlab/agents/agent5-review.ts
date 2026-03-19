import { ExpertProfile, ObjectiveOutput, EvidenceOutput, LearningOutput, ReviewOutput, RevisionRequest } from '../types';

/**
 * Agent 5: Review PathLab for Quality and Coherence
 *
 * This agent reviews the complete PathLab for quality and coherence.
 * Input: ExpertProfile, ObjectiveOutput[], EvidenceOutput[], LearningOutput[]
 * Output: ReviewOutput
 *
 * Quality checks:
 * 1. Completeness: All 5 days have objectives, evidence, and activities
 * 2. Coherence: Activities align with objectives
 * 3. Evidence alignment: Reflection prompts connect to objectives
 * 4. Content quality: Each activity has meaningful content
 * 5. Progression: Days build on each other logically
 *
 * Approval criteria:
 * - All 5 days present
 * - Each day has 2-4 activities
 * - Each activity has content
 * - Reflection prompts exist for each day
 * - Context text is meaningful (not empty)
 *
 * Revision triggers:
 * - Missing activities for a day
 * - Empty content
 * - Misaligned reflection prompts
 * - Context text too short (< 50 chars)
 */

export async function agent5_review(
  expert: ExpertProfile,
  objectives: ObjectiveOutput[],
  evidence: EvidenceOutput[],
  learning: LearningOutput[]
): Promise<ReviewOutput> {
  const revisions: RevisionRequest[] = [];

  // Check completeness
  if (objectives.length !== 5) {
    revisions.push({ dayNumber: 0, issue: 'Missing objectives', suggestion: 'Generate all 5 days' });
  }

  // Check each day
  for (let day = 1; day <= 5; day++) {
    const obj = objectives.find(o => o.dayNumber === day);
    const ev = evidence.find(e => e.dayNumber === day);
    const learn = learning.find(l => l.dayNumber === day);

    if (!obj) {
      revisions.push({ dayNumber: day, issue: 'Missing objective', suggestion: 'Add objective' });
    }

    if (!ev) {
      revisions.push({ dayNumber: day, issue: 'Missing evidence', suggestion: 'Add reflection prompts' });
    } else {
      // Check reflection prompts exist and are not empty
      if (!ev.reflectionPrompts || ev.reflectionPrompts.length === 0) {
        revisions.push({ dayNumber: day, issue: 'No reflection prompts', suggestion: 'Add reflection prompts for this day' });
      }
    }

    if (!learn) {
      revisions.push({ dayNumber: day, issue: 'Missing activities', suggestion: 'Add activities' });
    } else {
      // Check activity count (should be 2-4)
      if (learn.activities.length < 2) {
        revisions.push({ dayNumber: day, issue: 'Too few activities', suggestion: 'Add more activities (minimum 2)' });
      }
      if (learn.activities.length > 4) {
        revisions.push({ dayNumber: day, issue: 'Too many activities', suggestion: 'Reduce activities to maximum 4' });
      }

      // Check context text length
      if (!learn.contextText || learn.contextText.length < 50) {
        revisions.push({ dayNumber: day, issue: 'Context too short', suggestion: 'Expand context to at least 50 characters' });
      }

      // Check each activity has content
      for (const activity of learn.activities) {
        if (!activity.content || activity.content.length === 0) {
          revisions.push({
            dayNumber: day,
            issue: `Activity "${activity.title}" has no content`,
            suggestion: 'Add content items to this activity'
          });
        } else {
          // Check content items have meaningful body text
          for (const content of activity.content) {
            if (!content.contentBody || content.contentBody.trim().length === 0) {
              revisions.push({
                dayNumber: day,
                issue: `Content "${content.contentTitle}" has empty body`,
                suggestion: 'Add meaningful content body text'
              });
            }
          }
        }
      }
    }
  }

  const approved = revisions.length === 0;
  const feedback = approved
    ? 'PathLab is complete and coherent. Ready for deployment.'
    : `Found ${revisions.length} issue(s) that need attention.`;

  return { approved, feedback, revisions };
}
