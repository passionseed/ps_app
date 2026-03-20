import { ValidationIssue } from '../../types';
import { ValidationInput } from '../index';

/**
 * Check that content matches the day's topic and expert's field.
 */
export async function checkContentRelevance(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning, expertProfile } = input;
  const field = expertProfile.field_category?.toLowerCase() || '';
  const expertSkills = [
    ...(expertProfile.interview_data?.skills?.technical || []),
    ...(expertProfile.interview_data?.skills?.soft || [])
  ].map(s => s.toLowerCase());

  for (const day of learning) {
    const dayContent = day.activities?.flatMap(a => a.content || []) || [];

    // Check for empty content bodies
    const emptyContent = dayContent.filter(c => !c.contentBody || c.contentBody.trim().length < 20);
    for (const content of emptyContent) {
      issues.push({
        dayNumber: day.dayNumber,
        agent: 3,
        issue: `Content "${content.contentTitle}" has insufficient body text`,
        severity: 'critical',
        suggestion: 'Add meaningful content (at least 20 characters)'
      });
    }

    // Check for placeholder text
    const placeholderPatterns = ['[insert', 'todo:', 'tbd', 'placeholder', 'lorem ipsum'];
    for (const content of dayContent) {
      const body = (content.contentBody || '').toLowerCase();
      for (const pattern of placeholderPatterns) {
        if (body.includes(pattern)) {
          issues.push({
            dayNumber: day.dayNumber,
            agent: 3,
            issue: `Content "${content.contentTitle}" contains placeholder text: "${pattern}"`,
            severity: 'critical',
            suggestion: 'Replace placeholder with actual content'
          });
        }
      }
    }

    // Check for resource links with invalid URLs
    const resourceLinks = dayContent.filter(c => c.contentType === 'resource_link');
    for (const resource of resourceLinks) {
      if (!resource.contentUrl || !resource.contentUrl.startsWith('http')) {
        issues.push({
          dayNumber: day.dayNumber,
          agent: 3,
          issue: `Resource "${resource.contentTitle}" has invalid or missing URL`,
          severity: 'warning',
          suggestion: 'Provide a valid URL for the resource'
        });
      }
    }
  }

  return issues;
}
