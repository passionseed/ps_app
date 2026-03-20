import { ValidationResult, LearningOutput, ExpertProfile } from '../types';
import { runValidation, ValidationInput } from '../validation';

export interface ValidatorInput {
  expertProfile: ExpertProfile;
  learning: LearningOutput[];
}

export interface ValidatorOutput {
  validation: ValidationResult;
}

export async function validatorAgent(input: ValidatorInput): Promise<ValidatorOutput> {
  console.log('\n📋 Validator Agent: Running semantic alignment checks...\n');

  const validationInput: ValidationInput = {
    expertProfile: input.expertProfile,
    learning: input.learning
  };

  const validation = await runValidation(validationInput);

  if (validation.passed) {
    console.log(`✅ Validation passed: ${validation.summary}`);
  } else {
    console.log(`❌ Validation failed: ${validation.summary}`);
    console.log('\nIssues found:');
    for (const issue of validation.issues.filter(i => i.severity === 'critical')) {
      console.log(`  - Day ${issue.dayNumber} [Agent ${issue.agent}]: ${issue.issue}`);
      console.log(`    Suggestion: ${issue.suggestion}`);
    }
  }

  return { validation };
}
