import { ValidationIssue } from '../../types';
import { ValidationInput } from '../index';

/**
 * Check that generated content reflects expert's interview data.
 */
export async function checkExpertConsistency(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning, expertProfile } = input;

  // Extract key terms from expert interview
  const interviewData = expertProfile.interview_data;
  const expertName = expertProfile.name?.toLowerCase() || '';
  const expertField = expertProfile.field_category?.toLowerCase() || '';
  const expertRole = interviewData?.role?.toLowerCase() || '';

  // Key phrases from interview that should appear in content
  const keyPhrases = [
    ...(interviewData?.challenges || []).slice(0, 3),
    ...(interviewData?.dailyTasks || []).slice(0, 3),
    ...(interviewData?.careerTruths?.mostImportant || []).slice(0, 2)
  ].map(p => p.toLowerCase());

  for (const day of learning) {
    const allContent = day.activities?.flatMap(a =>
      (a.content || []).map(c => (c.contentBody || '').toLowerCase())
    ).join(' ') || '';

    const dayTitle = day.activities?.[0]?.title?.toLowerCase() || '';

    // Check if day content mentions the expert's field
    if (expertField && !allContent.includes(expertField.split(' ')[0])) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 1,
        issue: `Content doesn't reference the expert's field: "${expertField}"`,
        severity: 'warning',
        suggestion: 'Ensure content is relevant to the expert\'s domain'
      });
    }

    // Check if any key phrases from interview appear
    const phrasesFound = keyPhrases.filter(phrase => {
      const words = phrase.split(' ').filter(w => w.length > 4);
      return words.some(word => allContent.includes(word));
    });

    if (keyPhrases.length > 0 && phrasesFound.length === 0) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 3,
        issue: 'Content doesn\'t reflect key insights from expert interview',
        severity: 'warning',
        suggestion: 'Incorporate specific challenges or tasks mentioned in the interview'
      });
    }
  }

  return issues;
}
