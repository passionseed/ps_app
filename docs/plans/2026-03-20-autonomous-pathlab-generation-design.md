# Autonomous PathLab Generation with Validation Loop

**Date:** 2026-03-20
**Status:** Approved
**Inspired by:** [karpathy/autoresearch](https://github.com/karpathy/autoresearch)

## Overview

Apply the autoresearch pattern to PathLab generation: AI agents autonomously generate PathLabs, validate quality, and iterate on failures. The system processes pending expert interviews in batch mode with targeted regeneration.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Autonomous PathLab Generator                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Agent 1  │───▶│ Agent 2  │───▶│ Agent 3  │───▶│ Agent 4  │  │
│  │Objectives│    │ Evidence │    │ Research │    │ Learning │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                        │        │
│                                                        ▼        │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────┐   │
│  │ Agent 5  │◀───│   Validator  │◀───│     Agent 5         │   │
│  │  Review  │    │   (NEW)      │    │    Review           │   │
│  └──────────┘    └──────────────┘    └─────────────────────┘   │
│       │                 │                                       │
│       │         ┌───────┴───────┐                              │
│       │         ▼               ▼                              │
│       │    [PASS]           [FAIL]                             │
│       │         │               │                              │
│       │         ▼               ▼                              │
│       │    Write to DB    Targeted Repair                      │
│       │                        │                               │
│       │                        ▼                               │
│       │              Regenerate specific                       │
│       │              day/activity/agent                        │
│       │                        │                               │
│       │                        ▼                               │
│       │                  Re-validate                           │
│       │                   (max 3 retries)                      │
│       └────────────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Validator Agent (NEW)

Runs semantic alignment checks on generated PathLab content.

**Checks:**

| Check | Description | Failure Action |
|-------|-------------|----------------|
| Objective Alignment | Each day's activities align with its learning objective | Flag day for Agent 4 regeneration |
| Evidence Coverage | Each objective has reflection prompts + success criteria | Flag day for Agent 2 regeneration |
| Content Relevance | Content matches the day's topic and expert's field | Flag specific content for Agent 3 regeneration |
| Expert Consistency | Generated content reflects expert's interview data | Flag for Agent 1 regeneration |
| Activity Flow | Activities progress logically within each day | Flag day for Agent 4 regeneration |

**Output:**

```typescript
interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  summary: string;
}

interface ValidationIssue {
  dayNumber: number;
  agent: 1 | 2 | 3 | 4 | 5;
  issue: string;
  severity: 'critical' | 'warning';
  suggestion: string;
}
```

### 2. Repair Logic (NEW)

Maps validation failures to targeted regeneration.

**Repair Strategy:**

| Issue Type | Repair Action | Re-run Agent |
|------------|---------------|--------------|
| Objective misalignment | Regenerate objectives for that day | Agent 1 |
| Missing evidence | Regenerate evidence for that day | Agent 2 |
| Content not relevant | Regenerate research for that day | Agent 3 |
| Activity flow issues | Regenerate learning activities for that day | Agent 4 |
| Multiple issues same day | Regenerate all affected parts in sequence | Agents in order |

**Retry Limits:**
- Max 3 validation attempts per PathLab
- If still failing after 3 attempts, mark as `generation_status: 'failed'`
- Store validation history for debugging

**State Tracking:**

```typescript
interface RepairState {
  attemptNumber: number;
  maxAttempts: 3;
  issuesHistory: ValidationIssue[][];
  regeneratedDays: number[];
}
```

### 3. Batch Processor (NEW)

Processes multiple pending expert interviews with validation loop.

**Flow:**

1. Query `expert_pathlabs` WHERE `generation_status = 'pending'`
2. For each expert:
   - Set status: `'generating'`
   - Run Agent 1-5 pipeline
   - Run Validator
   - If FAIL: Repair loop (max 3 attempts)
   - Set status: `'completed'` or `'failed'`
3. Report summary: completed, failed, total time

**CLI Commands:**

```bash
# Process all pending experts
pnpm run generate:pathlab:batch

# Process specific experts
pnpm run generate:pathlab:batch <expert_id_1> <expert_id_2>

# Dry run (validate without writing)
pnpm run generate:pathlab:batch --dry-run

# With retry limit override
pnpm run generate:pathlab:batch --max-retries=5
```

## File Structure

```
scripts/generate-pathlab/
├── index.ts              # CLI entry point (existing)
├── orchestrator.ts       # Main orchestrator (enhanced)
├── types.ts              # Types (existing + new validation types)
├── agents/
│   ├── agent1-objectives.ts
│   ├── agent2-evidence.ts
│   ├── agent3-research.ts
│   ├── agent4-learning.ts
│   ├── agent5-review.ts
│   └── validator.ts      # NEW: Validation agent
├── repair.ts             # NEW: Repair logic
├── batch.ts              # NEW: Batch processor
└── validation/
    ├── checks/
    │   ├── objective-alignment.ts
    │   ├── evidence-coverage.ts
    │   ├── content-relevance.ts
    │   ├── expert-consistency.ts
    │   └── activity-flow.ts
    └── index.ts          # Validation runner
```

## Implementation Notes

- Existing Agents 1-5 remain unchanged
- Validator runs after Agent 5 (Review)
- Repair logic only regenerates affected parts, not entire PathLab
- Batch processor handles multiple experts sequentially (not parallel, to avoid rate limits)
- All validation issues logged to `expert_pathlabs.generation_error` for debugging