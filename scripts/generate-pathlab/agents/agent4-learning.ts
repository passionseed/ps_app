/**
 * Agent 4: Learning Designer
 *
 * Designs learning activities based on objectives, evidence, and research.
 * Creates a structured 5-day learning journey with activities for each day.
 */

import {
  ExpertProfile,
  ObjectiveOutput,
  EvidenceOutput,
  ResearchOutput,
  LearningOutput,
  ActivityDesign,
  ContentDesign,
  AssessmentDesign,
  QuizQuestion,
} from '../types';

/**
 * Designs learning activities for a 5-day learning path
 */
export async function agent4_designLearning(
  expert: ExpertProfile,
  objectives: ObjectiveOutput[],
  evidence: EvidenceOutput[],
  research: ResearchOutput[]
): Promise<LearningOutput[]> {
  const learningOutputs: LearningOutput[] = [];

  // Sort objectives by day number to ensure correct order
  const sortedObjectives = [...objectives].sort((a, b) => a.dayNumber - b.dayNumber);

  for (const objective of sortedObjectives) {
    const dayNumber = objective.dayNumber;
    const dayEvidence = evidence.find(e => e.dayNumber === dayNumber);
    const dayResearch = research.find(r => r.dayNumber === dayNumber);

    if (!dayEvidence || !dayResearch) {
      throw new Error(`Missing evidence or research for day ${dayNumber}`);
    }

    const activities: ActivityDesign[] = [];

    // Activity 1: Read/Watch - Grounded content from research
    activities.push(createReadWatchActivity(dayNumber, dayResearch, activities.length + 1));

    // Activity 2: Expert Insight - Direct from interview
    activities.push(createExpertInsightActivity(dayNumber, expert, activities.length + 1));

    // Activity 3: Self-reflection
    activities.push(createReflectionActivity(dayNumber, dayEvidence, activities.length + 1));

    // Activity 4: Checkpoint (optional) - Quiz or assessment
    const checkpointActivity = createCheckpointActivity(dayNumber, dayEvidence, activities.length + 1);
    if (checkpointActivity) {
      activities.push(checkpointActivity);
    }

    learningOutputs.push({
      dayNumber,
      contextText: generateContextText(dayNumber, objective),
      activities,
    });
  }

  return learningOutputs;
}

/**
 * Generates context text for a day based on day number
 */
function generateContextText(dayNumber: number, objective: ObjectiveOutput): string {
  if (dayNumber === 1) {
    return `Welcome to Day 1. Today you'll explore ${objective.title.toLowerCase()}. ${objective.objective}`;
  } else if (dayNumber === 5) {
    return `You've reached the final day. Today is about ${objective.title.toLowerCase()}. ${objective.objective}`;
  } else {
    return `In Day ${dayNumber}, we'll dive into ${objective.title.toLowerCase()}. ${objective.objective}`;
  }
}

/**
 * Creates Activity 1: Read/Watch - Grounded content from research
 */
function createReadWatchActivity(
  dayNumber: number,
  research: ResearchOutput,
  displayOrder: number
): ActivityDesign {
  const content: ContentDesign[] = [];

  // Add grounded content as text
  for (const grounded of research.groundedContent.slice(0, 2)) {
    content.push({
      contentType: 'text',
      contentTitle: grounded.title,
      contentBody: grounded.summary,
    });
  }

  // Add resources as resource_links
  for (const resource of research.resources.slice(0, 2)) {
    content.push({
      contentType: 'resource_link',
      contentTitle: resource.title,
      contentBody: `A ${resource.type} resource to deepen your understanding.`,
      contentUrl: resource.url,
    });
  }

  // Ensure at least one content item exists
  if (content.length === 0) {
    content.push({
      contentType: 'text',
      contentTitle: 'Learning Materials',
      contentBody: 'Explore the key concepts and real-world examples for today\'s learning objective.',
    });
  }

  return {
    title: 'Learn: Core Concepts',
    activityType: 'learning',
    instructions: 'Read through the materials and resources provided. Take notes on key concepts that resonate with your goals.',
    displayOrder,
    content,
  };
}

/**
 * Creates Activity 2: Expert Insight - Direct from interview
 */
function createExpertInsightActivity(
  dayNumber: number,
  expert: ExpertProfile,
  displayOrder: number
): ActivityDesign {
  const interview = expert.interview_data;
  const content: ContentDesign[] = [];

  // Build expert insight content from interview data
  let insightBody = '';

  // Add advice
  if (interview.advice) {
    insightBody += `**Advice from ${expert.name}:**\n\n${interview.advice}\n\n`;
  }

  // Add career truths
  if (interview.careerTruths?.mostImportant?.length > 0) {
    insightBody += `**What matters most in this field:**\n\n`;
    for (const truth of interview.careerTruths.mostImportant.slice(0, 2)) {
      insightBody += `• ${truth}\n`;
    }
    insightBody += '\n';
  }

  // Add challenges
  if (interview.challenges?.length > 0) {
    insightBody += `**Common challenges:**\n\n`;
    for (const challenge of interview.challenges.slice(0, 2)) {
      insightBody += `• ${challenge}\n`;
    }
    insightBody += '\n';
  }

  // Add hidden challenges if available
  if (interview.careerTruths?.hiddenChallenges?.length > 0) {
    insightBody += `**Challenges you might not expect:**\n\n`;
    for (const challenge of interview.careerTruths.hiddenChallenges.slice(0, 2)) {
      insightBody += `• ${challenge}\n`;
    }
  }

  // Fallback if no specific content
  if (!insightBody) {
    insightBody = `${expert.name} shares insights from their experience as a ${expert.title} at ${expert.company}. Reflect on how their journey might inform your own path.`;
  }

  content.push({
    contentType: 'text',
    contentTitle: `Insight from ${expert.name}`,
    contentBody: insightBody.trim(),
  });

  return {
    title: 'Expert Insight',
    activityType: 'learning',
    instructions: `Read ${expert.name}'s perspective on the field. Consider how their experience aligns with or differs from your expectations.`,
    displayOrder,
    content,
  };
}

/**
 * Creates Activity 3: Self-reflection
 */
function createReflectionActivity(
  dayNumber: number,
  evidence: EvidenceOutput,
  displayOrder: number
): ActivityDesign {
  const content: ContentDesign[] = [];

  // Use reflection prompts from evidence
  const prompts = evidence.reflectionPrompts.slice(0, 3);

  if (prompts.length > 0) {
    content.push({
      contentType: 'reflection_card',
      contentTitle: 'Reflection Time',
      contentBody: prompts.join('\n\n'),
    });
  } else {
    // Fallback prompts
    content.push({
      contentType: 'daily_prompt',
      contentTitle: 'Daily Reflection',
      contentBody: `Take a moment to reflect on what you've learned today.\n\n• What surprised you?\n• What resonated with your goals?\n• What questions do you still have?`,
    });
  }

  return {
    title: 'Reflect on Your Learning',
    activityType: 'reflection',
    instructions: 'Take 5-10 minutes to reflect on the prompts. There are no right answers—this is for your personal growth.',
    displayOrder,
    content,
  };
}

/**
 * Creates Activity 4: Checkpoint (optional) - Quiz or assessment
 * Returns null if no assessment should be created
 */
function createCheckpointActivity(
  dayNumber: number,
  evidence: EvidenceOutput,
  displayOrder: number
): ActivityDesign | null {
  // Day 5 gets interest rating (decision day)
  if (dayNumber === 5) {
    return {
      title: 'Final Check-in',
      activityType: 'checkpoint',
      instructions: 'Rate your interest in this career path after completing the 5-day journey.',
      displayOrder,
      content: [
        {
          contentType: 'text',
          contentTitle: 'Decision Time',
          contentBody: 'You\'ve completed the learning path. Take a moment to assess your interest in pursuing this career.',
        },
      ],
      assessment: {
        assessmentType: 'interest_rating',
      },
    };
  }

  // Other days get quiz if questions exist
  if (evidence.quizQuestions && evidence.quizQuestions.length > 0) {
    const questions: QuizQuestion[] = evidence.quizQuestions.slice(0, 3);

    return {
      title: 'Knowledge Check',
      activityType: 'checkpoint',
      instructions: 'Test your understanding with a quick quiz. This helps reinforce what you\'ve learned.',
      displayOrder,
      content: [
        {
          contentType: 'text',
          contentTitle: 'Quick Quiz',
          contentBody: 'Answer the following questions to check your understanding of today\'s material.',
        },
      ],
      assessment: {
        assessmentType: 'quiz',
        questions,
      },
    };
  }

  // No checkpoint for this day
  return null;
}
