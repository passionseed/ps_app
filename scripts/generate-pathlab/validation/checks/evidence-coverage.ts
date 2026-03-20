import { ValidationInput, ValidationIssue } from '../index';

/**
 * Check that evidence/reflection coverage is adequate.
 */
export async function checkEvidenceCoverage(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  for (const day of learning) {
    const activities = day.activities || [];

    // Check for reflection activities
    const reflectionActivities = activities.filter(a => a.activityType === 'reflection');
    if (reflectionActivities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 2,
        issue: 'No reflection activities found',
        severity: 'warning',
        suggestion: 'Add reflection activities to help students process their learning'
      });
    }

    // Check for checkpoint/milestone activities
    const checkpointActivities = activities.filter(a => a.activityType === 'checkpoint' || a.activityType === 'milestone');
    if (checkpointActivities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 2,
        issue: 'No checkpoint or milestone activities found',
        severity: 'warning',
        suggestion: 'Add checkpoint activities to assess student understanding'
      });
    }
  }

  return issues;
}
