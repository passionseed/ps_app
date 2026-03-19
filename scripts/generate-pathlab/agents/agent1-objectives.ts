import { ExpertProfile, ObjectiveOutput, LearningObjective } from '../types';

/**
 * Agent 1: Extract Learning Objectives
 *
 * This agent extracts learning objectives from expert interview data.
 * Input: ExpertProfile
 * Output: ObjectiveOutput[] (array of 5 objectives, one per day)
 */

export async function agent1_extractObjectives(expert: ExpertProfile): Promise<ObjectiveOutput[]> {
  const { interview_data } = expert;

  // Check if quest_blueprint.learningObjectives exists
  const learningObjectives = interview_data.questBlueprint?.learningObjectives;
  if (learningObjectives && learningObjectives.length > 0) {
    return transformBlueprintObjectives(learningObjectives, interview_data);
  }

  // Generate objectives from interview data
  return generateObjectivesFromData(interview_data);
}

/**
 * Transform blueprint learning objectives into ObjectiveOutput format
 */
function transformBlueprintObjectives(
  learningObjectives: LearningObjective[],
  interviewData: ExpertProfile['interview_data']
): ObjectiveOutput[] {
  const { skills, challenges } = interviewData;

  // Get all available skills and challenges for distribution
  const allSkills = [...(skills?.soft || []), ...(skills?.technical || [])];
  const allChallenges = challenges || [];

  return learningObjectives.map((obj: LearningObjective, index: number): ObjectiveOutput => {
    // Distribute skills and challenges across days
    const keySkills = distributeItems(allSkills, 5, index, 2);
    const keyChallenges = distributeItems(allChallenges, 5, index, 1);

    return {
      dayNumber: obj.day,
      title: obj.title,
      objective: obj.objective,
      decisionQuestion: obj.studentDecisionQuestion,
      keySkills,
      keyChallenges,
    };
  });
}

/**
 * Generate 5 objectives from interview data when no blueprint exists
 */
function generateObjectivesFromData(
  interviewData: ExpertProfile['interview_data']
): ObjectiveOutput[] {
  const { role, field, skills, challenges, dailyTasks, careerTruths } = interviewData;

  const allSkills = [...(skills?.soft || []), ...(skills?.technical || [])];
  const allChallenges = challenges || [];
  const allTruths = [
    ...(careerTruths?.mostImportant || []),
    ...(careerTruths?.hiddenChallenges || []),
    ...(careerTruths?.rewardingMoments || []),
  ];

  const objectives: ObjectiveOutput[] = [
    // Day 1: Introduction to the field/role
    {
      dayNumber: 1,
      title: `Introduction to ${role || field}`,
      objective: `Understand what a ${role || 'professional'} in ${field || 'this field'} actually does, the core responsibilities, and how this role fits into the broader industry landscape.`,
      decisionQuestion: `Am I genuinely curious about ${field || 'this field'} and what ${role || 'this role'} entails?`,
      keySkills: distributeItems(allSkills, 5, 0, 2),
      keyChallenges: distributeItems(allChallenges, 5, 0, 1),
    },

    // Day 2: Key skills
    {
      dayNumber: 2,
      title: 'Essential Skills for Success',
      objective: `Explore the key technical and soft skills required to excel as a ${role || 'professional'}, including which skills are hardest to develop and why they matter.`,
      decisionQuestion: 'Do I have or am I willing to develop the core skills needed for this career?',
      keySkills: distributeItems(allSkills, 5, 1, 2),
      keyChallenges: distributeItems(allChallenges, 5, 1, 1),
    },

    // Day 3: Challenges and how to overcome them
    {
      dayNumber: 3,
      title: 'Navigating Career Challenges',
      objective: `Learn about the common challenges faced by ${role || 'professionals'} and strategies for overcoming them, including hidden obstacles that aren't obvious from the outside.`,
      decisionQuestion: 'Am I prepared to face the difficult aspects of this career?',
      keySkills: distributeItems(allSkills, 5, 2, 2),
      keyChallenges: distributeItems(allChallenges, 5, 2, 2),
    },

    // Day 4: Day-to-day reality
    {
      dayNumber: 4,
      title: 'A Day in the Life',
      objective: `Understand the daily reality of working as a ${role || 'professional'}—the typical tasks, the mundane requirements, and what separates novices from experts.`,
      decisionQuestion: 'Would I enjoy the day-to-day work, including the less exciting parts?',
      keySkills: distributeItems(allSkills, 5, 3, 2),
      keyChallenges: distributeItems(allChallenges, 5, 3, 1),
    },

    // Day 5: Decision point
    {
      dayNumber: 5,
      title: 'Is This Career Right for You?',
      objective: `Synthesize everything learned to make an informed decision about whether pursuing ${role || 'this career'} aligns with your interests, strengths, and values.`,
      decisionQuestion: `Based on everything I've learned, should I pursue ${role || 'this career'} or explore other options?`,
      keySkills: distributeItems(allSkills, 5, 4, 2),
      keyChallenges: distributeItems(allChallenges, 5, 4, 1),
    },
  ];

  return objectives;
}

/**
 * Distribute items across days evenly
 * Returns a subset of items for the given day index
 */
function distributeItems(items: string[], totalDays: number, dayIndex: number, itemsPerDay: number): string[] {
  if (!items || items.length === 0) {
    return [];
  }

  const result: string[] = [];
  const startIndex = dayIndex * itemsPerDay;

  for (let i = 0; i < itemsPerDay; i++) {
    const itemIndex = (startIndex + i) % items.length;
    // Avoid duplicates if we wrap around
    if (!result.includes(items[itemIndex])) {
      result.push(items[itemIndex]);
    }
  }

  return result;
}
