# Autonomous PathLab Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add autonomous validation and repair loop to PathLab generation, enabling batch processing of expert interviews with targeted regeneration on failures.

**Architecture:** Add a Validator agent that runs semantic alignment checks after Agent 5. If validation fails, repair logic identifies affected days and triggers targeted regeneration of specific agents. Batch processor handles multiple pending experts sequentially.

**Tech Stack:** TypeScript, Supabase, existing agent infrastructure

---

## Task 1: Add Validation Types

**Files:**
- Modify: `scripts/generate-pathlab/types.ts`

**Step 1: Add validation types to types.ts**

Add after the existing interfaces:

```typescript
// Validation types

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  summary: string;
}

export interface ValidationIssue {
  dayNumber: number;
  agent: 1 | 2 | 3 | 4 | 5;
  issue: string;
  severity: 'critical' | 'warning';
  suggestion: string;
}

export interface RepairState {
  attemptNumber: number;
  maxAttempts: number;
  issuesHistory: ValidationIssue[][];
  regeneratedDays: number[];
}

export interface BatchResult {
  totalProcessed: number;
  completed: number;
  failed: number;
  failedExperts: Array<{
    expertId: string;
    error: string;
  }>;
  totalTimeMs: number;
}
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/types.ts
git commit -m "feat(pathlab): add validation and batch types"
```

---

## Task 2: Create Validation Directory Structure

**Files:**
- Create: `scripts/generate-pathlab/validation/index.ts`
- Create: `scripts/generate-pathlab/validation/checks/objective-alignment.ts`
- Create: `scripts/generate-pathlab/validation/checks/evidence-coverage.ts`
- Create: `scripts/generate-pathlab/validation/checks/content-relevance.ts`
- Create: `scripts/generate-pathlab/validation/checks/expert-consistency.ts`
- Create: `scripts/generate-pathlab/validation/checks/activity-flow.ts`

**Step 1: Create validation directory**

```bash
mkdir -p scripts/generate-pathlab/validation/checks
```

**Step 2: Create validation runner (index.ts)**

```typescript
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
```

**Step 3: Commit**

```bash
git add scripts/generate-pathlab/validation/
git commit -m "feat(pathlab): create validation runner structure"
```

---

## Task 3: Implement Objective Alignment Check

**Files:**
- Modify: `scripts/generate-pathlab/validation/checks/objective-alignment.ts`

**Step 1: Implement the check**

```typescript
import { ValidationIssue, LearningOutput, ExpertProfile } from '../../types';
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/validation/checks/objective-alignment.ts
git commit -m "feat(pathlab): implement objective alignment validation check"
```

---

## Task 4: Implement Evidence Coverage Check

**Files:**
- Modify: `scripts/generate-pathlab/validation/checks/evidence-coverage.ts`

**Step 1: Implement the check**

```typescript
import { ValidationIssue, LearningOutput } from '../../types';
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

    // Check context text exists
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/validation/checks/evidence-coverage.ts
git commit -m "feat(pathlab): implement evidence coverage validation check"
```

---

## Task 5: Implement Content Relevance Check

**Files:**
- Modify: `scripts/generate-pathlab/validation/checks/content-relevance.ts`

**Step 1: Implement the check**

```typescript
import { ValidationIssue, LearningOutput, ExpertProfile } from '../../types';
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/validation/checks/content-relevance.ts
git commit -m "feat(pathlab): implement content relevance validation check"
```

---

## Task 6: Implement Expert Consistency Check

**Files:**
- Modify: `scripts/generate-pathlab/validation/checks/expert-consistency.ts`

**Step 1: Implement the check**

```typescript
import { ValidationIssue, LearningOutput, ExpertProfile } from '../../types';
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/validation/checks/expert-consistency.ts
git commit -m "feat(pathlab): implement expert consistency validation check"
```

---

## Task 7: Implement Activity Flow Check

**Files:**
- Modify: `scripts/generate-pathlab/validation/checks/activity-flow.ts`

**Step 1: Implement the check**

```typescript
import { ValidationIssue, LearningOutput } from '../../types';
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/validation/checks/activity-flow.ts
git commit -m "feat(pathlab): implement activity flow validation check"
```

---

## Task 8: Create Validator Agent

**Files:**
- Create: `scripts/generate-pathlab/agents/validator.ts`

**Step 1: Create the validator agent**

```typescript
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
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/agents/validator.ts
git commit -m "feat(pathlab): create validator agent"
```

---

## Task 9: Create Repair Logic

**Files:**
- Create: `scripts/generate-pathlab/repair.ts`

**Step 1: Create repair logic**

```typescript
import { ValidationIssue, LearningOutput, ObjectiveOutput, EvidenceOutput, ResearchOutput, ExpertProfile } from './types';
import { agent1Objectives } from './agents/agent1-objectives';
import { agent2Evidence } from './agents/agent2-evidence';
import { agent3Research } from './agents/agent3-research';
import { agent4Learning } from './agents/agent4-learning';

export interface RepairInput {
  expertProfile: ExpertProfile;
  issues: ValidationIssue[];
  currentObjectives: ObjectiveOutput[];
  currentEvidence: EvidenceOutput[];
  currentResearch: ResearchOutput[];
  currentLearning: LearningOutput[];
  attemptNumber: number;
}

export interface RepairOutput {
  objectives: ObjectiveOutput[];
  evidence: EvidenceOutput[];
  research: ResearchOutput[];
  learning: LearningOutput[];
  repairedDays: number[];
}

/**
 * Repair PathLab by regenerating specific days based on validation issues.
 */
export async function repairPathLab(input: RepairInput): Promise<RepairOutput> {
  console.log(`\n🔧 Repair Logic: Attempt ${input.attemptNumber} - Analyzing issues...\n`);

  // Group issues by day and agent
  const issuesByDay = new Map<number, Set<number>>();
  for (const issue of input.issues.filter(i => i.severity === 'critical')) {
    if (!issuesByDay.has(issue.dayNumber)) {
      issuesByDay.set(issue.dayNumber, new Set());
    }
    issuesByDay.get(issue.dayNumber)!.add(issue.agent);
  }

  const repairedDays: number[] = [];
  let objectives = [...input.currentObjectives];
  let evidence = [...input.currentEvidence];
  let research = [...input.currentResearch];
  let learning = [...input.currentLearning];

  // Process each day that needs repair
  for (const [dayNumber, agents] of issuesByDay) {
    console.log(`  Repairing Day ${dayNumber} (agents: ${Array.from(agents).join(', ')})`);
    repairedDays.push(dayNumber);

    // Regenerate in order: 1 → 2 → 3 → 4
    const sortedAgents = Array.from(agents).sort((a, b) => a - b);

    for (const agent of sortedAgents) {
      switch (agent) {
        case 1:
          // Regenerate objectives for this day
          const objResult = await agent1Objectives({
            expertProfile: input.expertProfile,
            existingObjectives: objectives
          });
          const dayObj = objResult.objectives.find(o => o.dayNumber === dayNumber);
          if (dayObj) {
            objectives = objectives.map(o => o.dayNumber === dayNumber ? dayObj : o);
          }
          break;

        case 2:
          // Regenerate evidence for this day
          const evResult = await agent2Evidence({
            objectives: objectives,
            dayNumber: dayNumber
          });
          const dayEv = evResult.find(e => e.dayNumber === dayNumber);
          if (dayEv) {
            evidence = evidence.map(e => e.dayNumber === dayNumber ? dayEv : e);
          }
          break;

        case 3:
          // Regenerate research for this day
          const dayObjective = objectives.find(o => o.dayNumber === dayNumber);
          if (dayObjective) {
            const resResult = await agent3Research({
              objectives: [dayObjective],
              expertProfile: input.expertProfile
            });
            const dayRes = resResult.find(r => r.dayNumber === dayNumber);
            if (dayRes) {
              research = research.map(r => r.dayNumber === dayNumber ? dayRes : r);
            }
          }
          break;

        case 4:
          // Regenerate learning for this day
          const dayObj4 = objectives.find(o => o.dayNumber === dayNumber);
          const dayEv4 = evidence.find(e => e.dayNumber === dayNumber);
          const dayRes4 = research.find(r => r.dayNumber === dayNumber);
          if (dayObj4 && dayEv4 && dayRes4) {
            const learnResult = await agent4Learning({
              objectives: [dayObj4],
              evidence: [dayEv4],
              research: [dayRes4],
              expertProfile: input.expertProfile
            });
            const dayLearn = learnResult.find(l => l.dayNumber === dayNumber);
            if (dayLearn) {
              learning = learning.map(l => l.dayNumber === dayNumber ? dayLearn : l);
            }
          }
          break;
      }
    }
  }

  console.log(`\n  Repaired ${repairedDays.length} day(s)\n`);

  return {
    objectives,
    evidence,
    research,
    learning,
    repairedDays
  };
}
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/repair.ts
git commit -m "feat(pathlab): create repair logic for targeted regeneration"
```

---

## Task 10: Create Batch Processor

**Files:**
- Create: `scripts/generate-pathlab/batch.ts`

**Step 1: Create batch processor**

```typescript
#!/usr/bin/env npx ts-node
/**
 * PathLab Batch Processor
 *
 * Processes multiple pending expert interviews with validation and repair loop.
 *
 * Usage:
 *   pnpm run generate:pathlab:batch
 *   pnpm run generate:pathlab:batch <expert_id_1> <expert_id_2>
 *   pnpm run generate:pathlab:batch --dry-run
 *   pnpm run generate:pathlab:batch --max-retries=5
 */

import { createClient } from '@supabase/supabase-js';
import { orchestrator } from './orchestrator';
import { BatchResult } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxRetriesArg = args.find(a => a.startsWith('--max-retries='));
  const maxRetries = maxRetriesArg ? parseInt(maxRetriesArg.split('=')[1]) : 3;
  const expertIds = args.filter(a => !a.startsWith('--'));

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PathLab Batch Processor');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nMode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Max retries: ${maxRetries}`);
  console.log(`Expert IDs: ${expertIds.length > 0 ? expertIds.join(', ') : 'All pending'}\n`);

  const startTime = Date.now();

  // Get pending experts
  let query = supabase
    .from('expert_pathlabs')
    .select('expert_profile_id, expert_profiles(id, name, title)')
    .eq('generation_status', 'pending');

  if (expertIds.length > 0) {
    query = query.in('expert_profile_id', expertIds);
  }

  const { data: pendingExperts, error } = await query;

  if (error) {
    console.error('Error fetching pending experts:', error);
    process.exit(1);
  }

  if (!pendingExperts || pendingExperts.length === 0) {
    console.log('No pending experts found.');
    process.exit(0);
  }

  console.log(`Found ${pendingExperts.length} pending expert(s)\n`);

  const result: BatchResult = {
    totalProcessed: pendingExperts.length,
    completed: 0,
    failed: 0,
    failedExperts: [],
    totalTimeMs: 0
  };

  // Process each expert
  for (const expert of pendingExperts) {
    const expertId = expert.expert_profile_id;
    const expertName = (expert.expert_profiles as any)?.name || 'Unknown';

    console.log(`\n───────────────────────────────────────────────────────────────`);
    console.log(`Processing: ${expertName} (${expertId})`);
    console.log(`───────────────────────────────────────────────────────────────\n`);

    try {
      const genResult = await orchestrator(supabase, expertId, {
        dryRun,
        maxRetries,
        enableValidation: true
      });

      if (genResult.success) {
        result.completed++;
        console.log(`✅ Completed: ${expertName}`);
      } else {
        result.failed++;
        result.failedExperts.push({ expertId, error: genResult.error || 'Unknown error' });
        console.log(`❌ Failed: ${expertName} - ${genResult.error}`);
      }
    } catch (err) {
      result.failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.failedExperts.push({ expertId, error: errorMsg });
      console.log(`❌ Error: ${expertName} - ${errorMsg}`);
    }
  }

  result.totalTimeMs = Date.now() - startTime;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Batch Processing Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nProcessed: ${result.totalProcessed}`);
  console.log(`Completed: ${result.completed} (${Math.round(result.completed / result.totalProcessed * 100)}%)`);
  console.log(`Failed: ${result.failed} (${Math.round(result.failed / result.totalProcessed * 100)}%)`);
  console.log(`Total time: ${Math.round(result.totalTimeMs / 1000 / 60)}m ${Math.round(result.totalTimeMs / 1000 % 60)}s`);
  console.log(`Avg time: ${Math.round(result.totalTimeMs / result.totalProcessed / 1000)}s per PathLab\n`);

  if (result.failedExperts.length > 0) {
    console.log('Failed experts:');
    for (const failed of result.failedExperts) {
      console.log(`  - ${failed.expertId}: ${failed.error}`);
    }
    console.log('');
  }
}

main();
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/batch.ts
git commit -m "feat(pathlab): create batch processor for multiple experts"
```

---

## Task 11: Update Orchestrator with Validation Loop

**Files:**
- Modify: `scripts/generate-pathlab/orchestrator.ts`

**Step 1: Add validation loop to orchestrator**

Add imports at top:

```typescript
import { validatorAgent } from './agents/validator';
import { repairPathLab } from './repair';
import { ValidationResult, RepairState } from './types';
```

Add validation options to orchestrator function signature:

```typescript
export interface OrchestratorOptions {
  dryRun?: boolean;
  maxRetries?: number;
  enableValidation?: boolean;
}
```

Update the orchestrator function to include validation loop after Agent 5:

```typescript
// After Agent 5 (review), add validation loop
if (options.enableValidation) {
  let attemptNumber = 1;
  const maxAttempts = options.maxRetries || 3;
  const issuesHistory: ValidationIssue[][] = [];

  while (attemptNumber <= maxAttempts) {
    // Run validator
    const { validation } = await validatorAgent({
      expertProfile: state.expertProfile!,
      learning: state.learning
    });

    if (validation.passed) {
      console.log(`\n✅ Validation passed on attempt ${attemptNumber}`);
      break;
    }

    issuesHistory.push(validation.issues);

    if (attemptNumber >= maxAttempts) {
      console.log(`\n❌ Validation failed after ${maxAttempts} attempts`);
      state.error = `Validation failed: ${validation.summary}`;
      state.status = 'failed';

      // Update expert_pathlabs with error
      if (!options.dryRun && state.seedId) {
        await supabase
          .from('expert_pathlabs')
          .update({
            generation_status: 'failed',
            generation_error: state.error,
            validation_history: issuesHistory
          })
          .eq('seed_id', state.seedId);
      }

      return {
        success: false,
        error: state.error,
        seedId: state.seedId,
        pathId: state.pathId,
        daysCreated: 0,
        activitiesCreated: 0,
        contentCreated: 0,
        duration: Math.round((Date.now() - state.startedAt.getTime()) / 1000)
      };
    }

    // Repair
    console.log(`\n🔧 Attempting repair (attempt ${attemptNumber}/${maxAttempts})...`);
    const repairResult = await repairPathLab({
      expertProfile: state.expertProfile!,
      issues: validation.issues,
      currentObjectives: state.objectives,
      currentEvidence: state.evidence,
      currentResearch: state.research,
      currentLearning: state.learning,
      attemptNumber
    });

    state.objectives = repairResult.objectives;
    state.evidence = repairResult.evidence;
    state.research = repairResult.research;
    state.learning = repairResult.learning;

    attemptNumber++;
  }
}
```

**Step 2: Commit**

```bash
git add scripts/generate-pathlab/orchestrator.ts
git commit -m "feat(pathlab): add validation loop to orchestrator"
```

---

## Task 12: Add CLI Commands to package.json

**Files:**
- Modify: `package.json`

**Step 1: Add batch command to scripts section**

Find the `scripts` section and add:

```json
"generate:pathlab:batch": "npx ts-node scripts/generate-pathlab/batch.ts"
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "feat(pathlab): add batch generation CLI command"
```

---

## Task 13: Add Tests for Validation Checks

**Files:**
- Create: `tests/validation.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect } from 'vitest';
import { checkObjectiveAlignment } from '../scripts/generate-pathlab/validation/checks/objective-alignment';
import { checkEvidenceCoverage } from '../scripts/generate-pathlab/validation/checks/evidence-coverage';
import { checkContentRelevance } from '../scripts/generate-pathlab/validation/checks/content-relevance';
import { checkActivityFlow } from '../scripts/generate-pathlab/validation/checks/activity-flow';
import { LearningOutput, ExpertProfile } from '../scripts/generate-pathlab/types';

const mockExpertProfile: ExpertProfile = {
  id: 'test-id',
  name: 'Test Expert',
  title: 'Software Engineer',
  company: 'Test Co',
  field_category: 'Technology',
  interview_data: {
    role: 'Engineer',
    field: 'Technology',
    advice: 'Test advice',
    skills: { soft: [], technical: ['coding'], hardToDevelop: [] },
    challenges: ['debugging'],
    dailyTasks: ['coding'],
    careerTruths: {
      mostImportant: ['learning'],
      hiddenChallenges: [],
      rewardingMoments: [],
      mundaneButRequired: [],
      noviceToExpertShifts: [],
      beginnersUnderestimate: []
    }
  },
  interview_transcript: []
};

describe('Validation Checks', () => {
  describe('checkObjectiveAlignment', () => {
    it('should fail when no activities exist', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context',
        activities: []
      }];

      const issues = await checkObjectiveAlignment({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('critical');
    });

    it('should pass with valid activities', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read this',
          displayOrder: 1,
          content: [{
            contentType: 'text',
            contentTitle: 'Content',
            contentBody: 'Some content here'
          }]
        }]
      }];

      const issues = await checkObjectiveAlignment({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.filter(i => i.severity === 'critical')).toHaveLength(0);
    });
  });

  describe('checkEvidenceCoverage', () => {
    it('should warn when no reflection activities exist', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context with enough text to pass',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read',
          displayOrder: 1,
          content: []
        }]
      }];

      const issues = await checkEvidenceCoverage({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('No reflection'))).toBe(true);
    });
  });

  describe('checkContentRelevance', () => {
    it('should fail on placeholder text', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read',
          displayOrder: 1,
          content: [{
            contentType: 'text',
            contentTitle: 'Content',
            contentBody: '[insert content here]'
          }]
        }]
      }];

      const issues = await checkContentRelevance({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('placeholder'))).toBe(true);
    });
  });

  describe('checkActivityFlow', () => {
    it('should warn when day ends with learning activity', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test',
        activities: [
          {
            title: 'Learn',
            activityType: 'learning',
            instructions: 'Read',
            displayOrder: 1,
            content: []
          },
          {
            title: 'Learn More',
            activityType: 'learning',
            instructions: 'Read more',
            displayOrder: 2,
            content: []
          }
        ]
      }];

      const issues = await checkActivityFlow({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('ends with a learning'))).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

```bash
pnpm test tests/validation.test.ts
```

**Step 3: Commit**

```bash
git add tests/validation.test.ts
git commit -m "test(pathlab): add validation check tests"
```

---

## Summary

**Files Created:**
- `scripts/generate-pathlab/validation/index.ts`
- `scripts/generate-pathlab/validation/checks/objective-alignment.ts`
- `scripts/generate-pathlab/validation/checks/evidence-coverage.ts`
- `scripts/generate-pathlab/validation/checks/content-relevance.ts`
- `scripts/generate-pathlab/validation/checks/expert-consistency.ts`
- `scripts/generate-pathlab/validation/checks/activity-flow.ts`
- `scripts/generate-pathlab/agents/validator.ts`
- `scripts/generate-pathlab/repair.ts`
- `scripts/generate-pathlab/batch.ts`
- `tests/validation.test.ts`

**Files Modified:**
- `scripts/generate-pathlab/types.ts`
- `scripts/generate-pathlab/orchestrator.ts`
- `package.json`

**New CLI Commands:**
- `pnpm run generate:pathlab:batch` - Process all pending experts
- `pnpm run generate:pathlab:batch <id>` - Process specific expert
- `pnpm run generate:pathlab:batch --dry-run` - Preview without writing
- `pnpm run generate:pathlab:batch --max-retries=5` - Custom retry limit