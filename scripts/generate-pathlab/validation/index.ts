import { ValidationResult, ValidationIssue, LearningOutput, ExpertProfile } from '../types';
import { checkObjectiveAlignment } from './checks/objective-alignment';
import { checkEvidenceCoverage } from './checks/evidence-coverage';
import { checkContentRelevance } from './checks/content-relevance';
import { checkExpertConsistency } from './checks/expert-consistency';
import { checkActivityFlow } from './checks/activity-flow';

export interface ValidationInput {
  expertProfile: ExpertProfile;
  learning: LearningOutput[];
}

export async function runValidation(input: ValidationInput): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Run all checks
  issues.push(...await checkObjectiveAlignment(input));
  issues.push(...await checkEvidenceCoverage(input));
  issues.push(...await checkContentRelevance(input));
  issues.push(...await checkExpertConsistency(input));
  issues.push(...await checkActivityFlow(input));

  const criticalIssues = issues.filter(i => i.severity === 'critical');

  return {
    passed: criticalIssues.length === 0,
    issues,
    summary: criticalIssues.length === 0
      ? `All ${issues.length} checks passed`
      : `Found ${criticalIssues.length} critical issues across ${new Set(criticalIssues.map(i => i.dayNumber)).size} days`
  };
}
