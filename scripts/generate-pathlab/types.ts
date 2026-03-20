// Types for PathLab Generator

export interface ExpertProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  field_category: string;
  interview_data: InterviewData;
  interview_transcript: TranscriptMessage[];
}

export interface InterviewData {
  role: string;
  field: string;
  advice: string;
  skills: {
    soft: string[];
    technical: string[];
    hardToDevelop: string[];
  };
  challenges: string[];
  dailyTasks: string[];
  careerTruths: {
    mostImportant: string[];
    hiddenChallenges: string[];
    rewardingMoments: string[];
    mundaneButRequired: string[];
    noviceToExpertShifts: string[];
    beginnersUnderestimate: string[];
  };
  questBlueprint?: {
    learningObjectives: LearningObjective[];
    mustExperience: string[];
    mustUnderstand: string[];
    fitSignals: string[];
    misfitSignals: string[];
  };
  [key: string]: any;
}

export interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export interface LearningObjective {
  day: number;
  title: string;
  objective: string;
  studentDecisionQuestion: string;
}

// Agent outputs

export interface ObjectiveOutput {
  dayNumber: number;
  title: string;
  objective: string;
  decisionQuestion: string;
  keySkills: string[];
  keyChallenges: string[];
}

export interface EvidenceOutput {
  dayNumber: number;
  reflectionPrompts: string[];
  successCriteria: string[];
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: string;
}

export interface ResearchOutput {
  dayNumber: number;
  groundedContent: GroundedContent[];
  realExamples: string[];
  resources: Resource[];
}

export interface GroundedContent {
  type: 'example' | 'case_study' | 'article' | 'video';
  title: string;
  summary: string;
  source?: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'tool';
}

export interface LearningOutput {
  dayNumber: number;
  contextText: string;
  activities: ActivityDesign[];
}

export interface ActivityDesign {
  title: string;
  activityType: 'learning' | 'reflection' | 'milestone' | 'checkpoint';
  instructions: string;
  displayOrder: number;
  content: ContentDesign[];
  assessment?: AssessmentDesign;
}

export interface ContentDesign {
  contentType: 'text' | 'video' | 'resource_link' | 'daily_prompt' | 'reflection_card';
  contentTitle: string;
  contentBody: string;
  contentUrl?: string;
}

export interface AssessmentDesign {
  assessmentType: 'daily_reflection' | 'interest_rating' | 'quiz';
  questions?: QuizQuestion[];
}

export interface ReviewOutput {
  approved: boolean;
  feedback: string;
  revisions: RevisionRequest[];
}

export interface RevisionRequest {
  dayNumber: number;
  issue: string;
  suggestion: string;
}

// DB records to create

export interface PathDayRecord {
  path_id: string;
  day_number: number;
  context_text: string;
  reflection_prompts: string[];
}

export interface PathActivityRecord {
  path_day_id: string;
  title: string;
  instructions: string;
  activity_type: string;
  display_order: number;
  is_required: boolean;
}

export interface PathContentRecord {
  activity_id: string;
  content_type: string;
  content_title: string;
  content_body: string;
  content_url?: string;
  display_order: number;
}

export interface PathAssessmentRecord {
  activity_id: string;
  assessment_type: string;
  metadata: Record<string, any>;
}

export interface PathQuizQuestionRecord {
  assessment_id: string;
  question_text: string;
  options: any[];
  correct_option: string;
}

// Orchestrator state

export interface OrchestratorState {
  expertProfileId: string;
  expertProfile: ExpertProfile | null;
  seedId: string | null;
  pathId: string | null;
  objectives: ObjectiveOutput[];
  evidence: EvidenceOutput[];
  research: ResearchOutput[];
  learning: LearningOutput[];
  review: ReviewOutput | null;
  status: 'pending' | 'generating' | 'reviewing' | 'completed' | 'failed';
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

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