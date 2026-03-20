import { ValidationIssue } from '../../types';
import { ValidationInput } from '../index';

/**
 * Check that each day's activities align with its learning objective.
 */
export async function checkObjectiveAlignment(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  for (const day of learning) {
    // Check if activities exist
    if (!day.activities || day.activities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: 'No activities found for this day',
        severity: 'critical',
        suggestion: 'Generate at least 2-3 activities that align with the learning objective'
      });
      continue;
    }

    // Check if activities have content
    for (const activity of day.activities) {
      if (!activity.content || activity.content.length === 0) {
        issues.push({
          dayNumber: day.dayNumber,
          agent: 4,
          issue: `Activity "${activity.title}" has no content`,
          severity: 'critical',
          suggestion: 'Add content items to this activity'
        });
      }
    }

    // Check for learning activities (not just reflections)
    const learningActivities = day.activities.filter(a => a.activityType === 'learning');
    if (learningActivities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: 'No learning activities found (only reflections/checkpoints)',
        severity: 'warning',
        suggestion: 'Include at least one learning activity with educational content'
      });
    }
  }

  return issues;
}
