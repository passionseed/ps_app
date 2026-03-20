import { ValidationIssue } from '../../types';
import { ValidationInput } from '../index';

/**
 * Check that activities progress logically within each day.
 */
export async function checkActivityFlow(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  const expectedOrder = ['learning', 'reflection', 'milestone', 'checkpoint'];

  for (const day of learning) {
    const activities = day.activities || [];

    // Check minimum activities
    if (activities.length < 2) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: `Only ${activities.length} activity found, expected at least 2`,
        severity: 'critical',
        suggestion: 'Add more activities to create a complete learning experience'
      });
      continue;
    }

    // Check display order is sequential
    const orders = activities.map(a => a.displayOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        issues.push({
          dayNumber: day.dayNumber,
          agent: 4,
          issue: 'Activities have non-sequential display order',
          severity: 'warning',
          suggestion: 'Ensure display_order is 1, 2, 3... for proper sequencing'
        });
        break;
      }
    }

    // Check for logical flow: learning should come before reflection
    const learningIdx = activities.findIndex(a => a.activityType === 'learning');
    const reflectionIdx = activities.findIndex(a => a.activityType === 'reflection');

    if (learningIdx !== -1 && reflectionIdx !== -1 && learningIdx > reflectionIdx) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: 'Reflection activity appears before learning activity',
        severity: 'warning',
        suggestion: 'Learning activities should come before reflection activities'
      });
    }

    // Check for milestone/checkpoint at end
    const lastActivity = activities[activities.length - 1];
    if (lastActivity.activityType === 'learning') {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: 'Day ends with a learning activity (no reflection/checkpoint)',
        severity: 'warning',
        suggestion: 'End each day with a reflection or checkpoint activity'
      });
    }
  }

  return issues;
}
