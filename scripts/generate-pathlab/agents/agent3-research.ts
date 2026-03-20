import { ExpertProfile, ObjectiveOutput, ResearchOutput, GroundedContent, Resource } from '../types';

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE = 'https://api.exa.ai/search';

interface ExaResult {
  title: string;
  url: string;
  snippet?: string;
  text?: string;
  author?: string;
  publishedDate?: string;
}

async function exaSearch(query: string, numResults = 5): Promise<ExaResult[]> {
  if (!EXA_API_KEY) {
    console.warn('EXA_API_KEY not set, skipping Exa search');
    return [];
  }

  try {
    const res = await fetch(EXA_BASE, {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        type: 'auto',
        num_results: numResults,
      }),
    });

    if (!res.ok) {
      console.warn(`Exa API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.results ?? [];
  } catch (error) {
    console.warn('Exa search failed:', error);
    return [];
  }
}

function generateSearchQueries(expert: ExpertProfile, objectives: ObjectiveOutput[]): string[] {
  const field = expert.field_category;

  // Get key skills from all objectives for day 2
  const allKeySkills = objectives
    .flatMap(obj => obj.keySkills)
    .slice(0, 5);

  return [
    // Day 1: Career introduction
    `${field} career introduction beginner guide`,
    // Day 2: Skills
    `${field} skills ${allKeySkills.join(' ')}`,
    // Day 3: Challenges
    `${field} challenges how to overcome`,
    // Day 4: Day in the life
    `${field} day in the life ${expert.title}`,
    // Day 5: Career decision
    `${field} career decision how to know if right for you`,
  ];
}

function mapExaResultsToGroundedContent(results: ExaResult[]): GroundedContent[] {
  return results.slice(0, 3).map(result => ({
    type: 'article',
    title: result.title,
    summary: result.snippet || result.text?.slice(0, 200) || 'No summary available',
    source: result.url,
  }));
}

function mapExaResultsToResources(results: ExaResult[]): Resource[] {
  return results.slice(0, 3).map(result => ({
    title: result.title,
    url: result.url,
    type: 'article',
  }));
}

function generateFallbackContent(expert: ExpertProfile, dayNumber: number): ResearchOutput {
  const interviewData = expert.interview_data;
  const groundedContent: GroundedContent[] = [];
  const realExamples: string[] = [];

  switch (dayNumber) {
    case 1:
      // Career introduction - use advice
      if (interviewData.advice) {
        groundedContent.push({
          type: 'example',
          title: `Advice from ${expert.name}`,
          summary: interviewData.advice.slice(0, 300),
        });
      }
      break;
    case 2:
      // Skills - use skills data with context
      if (interviewData.skills) {
        const softSkills = interviewData.skills.soft || [];
        const technicalSkills = interviewData.skills.technical || [];
        const hardToDevelop = interviewData.skills.hardToDevelop || [];
        
        let skillsSummary = '';
        
        if (softSkills.length > 0) {
          skillsSummary += `**Soft Skills That Matter:**\n${softSkills.slice(0, 4).map(s => `• ${s}`).join('\n')}\n\n`;
        }
        
        if (technicalSkills.length > 0) {
          skillsSummary += `**Technical Skills to Develop:**\n${technicalSkills.slice(0, 3).map(s => `• ${s}`).join('\n')}\n\n`;
        }
        
        if (hardToDevelop.length > 0) {
          skillsSummary += `**Skills That Take Time to Master:**\n${hardToDevelop.slice(0, 2).map(s => `• ${s}`).join('\n')}`;
        }
        
        groundedContent.push({
          type: 'article',
          title: `Essential Skills in ${expert.field_category}`,
          summary: skillsSummary.trim() || `Key skills for success in ${expert.field_category}.`,
        });
      }
      break;
    case 3:
      // Challenges - use challenges
      if (interviewData.challenges && interviewData.challenges.length > 0) {
        groundedContent.push({
          type: 'case_study',
          title: `Common Challenges in ${expert.field_category}`,
          summary: interviewData.challenges.join('. '),
        });
      }
      break;
    case 4:
      // Day in the life - use daily tasks
      if (interviewData.dailyTasks && interviewData.dailyTasks.length > 0) {
        groundedContent.push({
          type: 'example',
          title: `A Day in the Life of a ${expert.title}`,
          summary: interviewData.dailyTasks.join('. '),
        });
        realExamples.push(...interviewData.dailyTasks.slice(0, 3));
      }
      break;
    case 5:
      // Career decision - use career truths
      if (interviewData.careerTruths) {
        const truths = [
          ...interviewData.careerTruths.mostImportant,
          ...interviewData.careerTruths.hiddenChallenges,
        ];
        groundedContent.push({
          type: 'article',
          title: `What You Should Know About ${expert.field_category}`,
          summary: truths.join('. '),
        });
        realExamples.push(...interviewData.careerTruths.noviceToExpertShifts.slice(0, 2));
      }
      break;
  }

  return {
    dayNumber,
    groundedContent,
    realExamples,
    resources: [],
  };
}

export async function agent3_research(
  expert: ExpertProfile,
  objectives: ObjectiveOutput[]
): Promise<ResearchOutput[]> {
  const searchQueries = generateSearchQueries(expert, objectives);
  const results: ResearchOutput[] = [];

  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    const dayNumber = dayIndex + 1;
    const query = searchQueries[dayIndex];

    console.log(`[Agent 3] Researching Day ${dayNumber}: ${query}`);

    // Try Exa search
    const exaResults = await exaSearch(query, 5);

    if (exaResults.length > 0) {
      // Use Exa results
      const groundedContent = mapExaResultsToGroundedContent(exaResults);
      const resources = mapExaResultsToResources(exaResults);

      // Extract real examples from snippets
      const realExamples = exaResults
        .map(r => r.snippet || r.text)
        .filter((s): s is string => !!s)
        .slice(0, 3);

      results.push({
        dayNumber,
        groundedContent,
        realExamples,
        resources,
      });
    } else {
      // Fallback to expert interview data
      console.log(`[Agent 3] Day ${dayNumber}: Using fallback content from expert interview`);
      const fallbackContent = generateFallbackContent(expert, dayNumber);
      results.push(fallbackContent);
    }
  }

  return results;
}
