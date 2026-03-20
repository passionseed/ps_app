import { ValidationInput, ValidationIssue } from '../index';

/**
 * Check that activities align with learning objectives.
 */
export async function checkObjectiveAlignment(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  for (const day of learning) {
    const activities = day.activities || [];

    // Check for empty activities
    if (activities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 1,
        issue: 'No activities found for this day',
        severity: 'critical',
        suggestion: 'Add at least one learning activity'
      });
      continue;
    }

    // Check for activities without content
    for (const activity of activities) {
      if (!activity.content || activity.content.length === 0) {
        issues.push({
          dayNumber: day.dayNumber,
          agent: 1,
          issue: `Activity "${activity.title}" has no content`,
          severity: 'warning',
          suggestion: 'Add content to the activity'
        });
      }
    }
  }

  return issues;
}
