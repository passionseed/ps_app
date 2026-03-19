import { ExpertProfile, ObjectiveOutput } from "../types";

interface EvidenceOutput {
  dayNumber: number;
  reflectionPrompts: string[];    // 2-3 reflection questions
  successCriteria: string[];      // What success looks like
  quizQuestions?: QuizQuestion[]; // Optional quiz for key concepts
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: string;  // "A", "B", "C", or "D"
}

export async function agent2_designEvidence(
  expert: ExpertProfile,
  objectives: ObjectiveOutput[]
): Promise<EvidenceOutput[]> {
  const evidenceOutputs: EvidenceOutput[] = [];

  for (const objective of objectives) {
    const dayNumber = objective.dayNumber;
    const evidence: EvidenceOutput = {
      dayNumber,
      reflectionPrompts: generateReflectionPrompts(dayNumber, objective, expert),
      successCriteria: generateSuccessCriteria(objective, expert),
    };

    // Add quiz for days 2-4 with key concepts
    if (dayNumber >= 2 && dayNumber <= 4) {
      const quizQuestions = generateQuizQuestions(dayNumber, objective, expert);
      if (quizQuestions.length > 0) {
        evidence.quizQuestions = quizQuestions;
      }
    }

    evidenceOutputs.push(evidence);
  }

  return evidenceOutputs;
}

function generateReflectionPrompts(
  dayNumber: number,
  objective: ObjectiveOutput,
  expert: ExpertProfile
): string[] {
  const prompts: string[] = [];

  if (dayNumber === 1 || dayNumber === 2) {
    // Early days: focus on discovery and expectations
    prompts.push(`What surprised you about ${objective.title}?`);
    prompts.push(`How does this compare to your expectations about ${expert.title.toLowerCase()}?`);
    if (dayNumber === 2) {
      prompts.push(`What aspect of ${objective.title} interests you most?`);
    }
  } else if (dayNumber === 3 || dayNumber === 4) {
    // Middle days: focus on application and deeper thinking
    prompts.push(`What would you do if you encountered a challenge in ${objective.title}?`);
    prompts.push(`How might you apply what you've learned about ${objective.title} in a real situation?`);
    if (dayNumber === 4) {
      prompts.push(`What connections do you see between ${objective.title} and your own experiences?`);
    }
  } else if (dayNumber === 5) {
    // Final day: focus on synthesis and next steps
    prompts.push(`What's your biggest takeaway from exploring ${expert.title}?`);
    prompts.push(`What will you do next based on what you've learned?`);
    prompts.push(`How has your understanding of ${expert.title.toLowerCase()} changed over the past 5 days?`);
  }

  return prompts;
}

function generateSuccessCriteria(
  objective: ObjectiveOutput,
  expert: ExpertProfile
): string[] {
  const criteria: string[] = [];

  // Base criteria on the objective's title
  criteria.push(`Can explain the key aspects of ${objective.title}`);

  // Add criteria based on day number
  if (objective.dayNumber === 1) {
    criteria.push(`Can identify what ${expert.title} involves on a day-to-day basis`);
    criteria.push(`Has reflected on initial impressions of the career`);
  } else if (objective.dayNumber === 2) {
    criteria.push(`Can describe the essential skills needed for ${expert.title.toLowerCase()}`);
    criteria.push(`Has identified which skills they already possess or want to develop`);
  } else if (objective.dayNumber === 3) {
    criteria.push(`Can identify 3 key challenges in this field`);
    criteria.push(`Has considered how they might overcome these challenges`);
  } else if (objective.dayNumber === 4) {
    criteria.push(`Can explain different career paths in ${expert.title.toLowerCase()}`);
    criteria.push(`Has thought about which path aligns with their interests`);
  } else if (objective.dayNumber === 5) {
    criteria.push(`Has reflected on personal fit with ${expert.title.toLowerCase()}`);
    criteria.push(`Can articulate next steps for exploring this career further`);
  }

  return criteria;
}

function generateQuizQuestions(
  dayNumber: number,
  objective: ObjectiveOutput,
  expert: ExpertProfile
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const { interview_data } = expert;

  // Generate questions based on day-specific content
  if (dayNumber === 2) {
    // Quiz about essential skills
    const allSkills = [
      ...interview_data.skills.soft,
      ...interview_data.skills.technical,
    ];

    if (allSkills.length >= 1) {
      const skill = allSkills[0];
      questions.push({
        question: `Which of the following is considered an essential skill for ${expert.title}?`,
        options: [
          `A) Advanced mathematics`,
          `B) ${skill}`,
          `C) Graphic design`,
          `D) Public speaking only`,
        ],
        correctOption: "B",
      });
    }

    if (allSkills.length >= 2) {
      const skill2 = allSkills[1];
      questions.push({
        question: `What skill is particularly valuable when working as a ${expert.title.toLowerCase()}?`,
        options: [
          `A) Playing musical instruments`,
          `B) ${skill2}`,
          `C) Professional cooking`,
          `D) Automotive repair`,
        ],
        correctOption: "B",
      });
    }
  } else if (dayNumber === 3 && interview_data.challenges.length >= 1) {
    // Quiz about challenges
    const challenge = interview_data.challenges[0];
    questions.push({
      question: `What is one of the biggest challenges in ${expert.title}?`,
      options: [
        `A) Having too much free time`,
        `B) ${challenge}`,
        `C) Working alone exclusively`,
        `D) Lack of career growth`,
      ],
      correctOption: "B",
    });

    if (interview_data.challenges.length >= 2) {
      const challenge2 = interview_data.challenges[1];
      questions.push({
        question: `Which challenge do many ${expert.title.toLowerCase()}s commonly face?`,
        options: [
          `A) Difficulty finding work`,
          `B) ${challenge2}`,
          `C) Excessive vacation time`,
          `D) Too many promotions`,
        ],
        correctOption: "B",
      });
    }
  } else if (dayNumber === 4) {
    // Quiz about career paths or progression
    questions.push({
      question: `What is typically required to advance in ${expert.title}?`,
      options: [
        `A) Only years of experience, nothing else`,
        `B) A combination of skills, experience, and continuous learning`,
        `C) Knowing the right people exclusively`,
        `D) Changing companies every year`,
      ],
      correctOption: "B",
    });

    questions.push({
      question: `Which factor most influences long-term success in ${expert.title.toLowerCase()}?`,
      options: [
        `A) Starting salary`,
        `B) Consistent skill development and adaptability`,
        `C) Working at the biggest company`,
        `D) Having a specific degree`,
      ],
      correctOption: "B",
    });
  }

  return questions;
}
