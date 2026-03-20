import { ValidationIssue } from '../../types';
import { ValidationInput } from '../index';

/**
 * Check that each day has reflection prompts and success criteria.
 */
export async function checkEvidenceCoverage(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  for (const day of learning) {
    // Check for reflection activities
    const reflectionActivities = day.activities?.filter(
      a => a.activityType === 'reflection' || a.activityType === 'checkpoint'
    ) || [];

    if (reflectionActivities.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 2,
        issue: 'No reflection or checkpoint activities found',
        severity: 'critical',
        suggestion: 'Add at least one reflection activity with prompts for self-assessment'
      });
    }

    // Check for assessments
    const activitiesWithAssessments = day.activities?.filter(a => a.assessment) || [];
    if (activitiesWithAssessments.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 2,
        issue: 'No assessments found for this day',
        severity: 'warning',
        suggestion: 'Consider adding a quiz or daily reflection assessment'
      });
    }

    // Check context text exists and is meaningful
    if (!day.contextText || day.contextText.trim().length < 50) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 4,
        issue: 'Context text is missing or too short',
        severity: 'critical',
        suggestion: 'Add meaningful context text (at least 50 characters) to set up the day'
      });
    }
  }

  return issues;
}
