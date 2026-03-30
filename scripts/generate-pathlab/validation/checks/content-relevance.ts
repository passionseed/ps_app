import { ValidationInput, ValidationIssue } from '../../types';

const PLACEHOLDER_PATTERNS = [
  /\[insert\s+[^\]]+\]/i,
  /\[placeholder\]/i,
  /\[todo\]/i,
  /\[fixme\]/i,
  /\[content\s+here\]/i,
  /lorem\s+ipsum/i,
  /xxx+/i,
  /\{\{[^}]+\}\}/
];

/**
 * Check that content is relevant and doesn't contain placeholder text.
 */
export async function checkContentRelevance(input: ValidationInput): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { learning } = input;

  for (const day of learning) {
    const activities = day.activities || [];

    for (const activity of activities) {
      // Check activity title and instructions
      const textToCheck = [activity.title, activity.instructions].join(' ');
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(textToCheck)) {
          issues.push({
            dayNumber: day.dayNumber,
            agent: 3,
            issue: `Activity "${activity.title}" contains placeholder text`,
            severity: 'critical',
            suggestion: 'Replace placeholder text with actual content'
          });
          break;
        }
      }

      // Check content body
      for (const content of activity.content || []) {
        const contentText = [content.contentTitle, content.contentBody].join(' ');
        for (const pattern of PLACEHOLDER_PATTERNS) {
          if (pattern.test(contentText)) {
            issues.push({
              dayNumber: day.dayNumber,
              agent: 3,
              issue: `Content "${content.contentTitle}" contains placeholder text`,
              severity: 'critical',
              suggestion: 'Replace placeholder text with actual content'
            });
            break;
          }
        }
      }
    }
  }

  return issues;
}
