export interface UniversityPerson {
  name: string;
  role: string;
  initials: string;
  url: string;
}

export interface UniversityNewsItem {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedDate: string | null;
}

export interface UniversityInsights {
  // Match
  quickMatchScore: number;         // client-computed from path scores (instant)
  aiMatchScore: number | null;     // AI-computed
  matchExplanation: string | null;

  // Admissions
  acceptanceRate: string | null;   // e.g. "12%" or "GPAX 3.20+"
  gpaxCutoff: string | null;       // e.g. "GPAX 3.25 (2566)"

  // Cost
  tuitionPerYear: number | null;   // THB
  tuitionNote: string | null;      // brief Thai note

  // Program
  duration: string | null;         // e.g. "4 ปี"
  curriculumUrl: string | null;
  ranking: string | null;          // e.g. "QS Thailand #3"

  // Research
  people: UniversityPerson[];
  news: UniversityNewsItem[];

  // Meta
  cachedAt: string | null;
  source: "seeded" | "ai" | null;
}

export interface UniversityMeta {
  universityName: string;
  facultyName: string;
}
