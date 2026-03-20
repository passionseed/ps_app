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
