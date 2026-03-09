// Mock data for Career Path Mapping — replace with Supabase calls later

export type StepType = "university" | "internship" | "job";

export interface PathStep {
    id: string;
    order: number;
    type: StepType;
    title: string;
    subtitle: string; // company, university name, etc.
    detail: string; // faculty, role, salary range
    duration: string; // "4 years", "3 months", "Full-time"
    icon: string;
    status: "completed" | "in-progress" | "upcoming";
}

export interface CareerPath {
    id: string;
    label: string;
    careerGoal: string; // The 1 career goal linked to this path
    careerGoalIcon: string;
    passionScore: number | null;
    futureScore: number | null;
    worldScore: number | null;
    journeyScore: number | null;
    explanations: {
        passion: string;
        future: string;
        world: string;
    };
    confidence: "low" | "medium" | "high";
    steps: PathStep[];
}

export interface PathData {
    profileCareerGoal: string; // From profile, e.g. "UX Designer"
    paths: CareerPath[];
}

export const MOCK_PATH_DATA: PathData = {
    profileCareerGoal: "UX Designer",
    paths: [
        {
            id: "path-a",
            label: "Plan A",
            careerGoal: "UX Designer",
            careerGoalIcon: "🎨",
            passionScore: 82,
            futureScore: 68,
            worldScore: 91,
            journeyScore: 79,
            explanations: {
                passion: "High alignment with your creative interests and design-focused hobbies.",
                future: "Solid growth potential, though some skills like systemic design are still developing.",
                world: "Very high market demand and aligns well with your desired lifestyle and location.",
            },
            confidence: "high",
            steps: [
                {
                    id: "step-a1",
                    order: 1,
                    type: "university",
                    title: "Bachelor of Design",
                    subtitle: "RMIT University",
                    detail: "Faculty of Design · Major: Interaction Design",
                    duration: "3 years",
                    icon: "🎓",
                    status: "in-progress",
                },
                {
                    id: "step-a2",
                    order: 2,
                    type: "internship",
                    title: "UX Design Intern",
                    subtitle: "Canva",
                    detail: "Product Design Team · Sydney",
                    duration: "6 months",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-a3",
                    order: 3,
                    type: "job",
                    title: "Junior UX Designer",
                    subtitle: "Atlassian",
                    detail: "$85K–$110K · ↑ Growing demand",
                    duration: "Full-time",
                    icon: "🚀",
                    status: "upcoming",
                },
            ],
        },
        {
            id: "path-b",
            label: "Plan B",
            careerGoal: "Product Manager",
            careerGoalIcon: "📊",
            passionScore: 65,
            futureScore: 74,
            worldScore: 88,
            journeyScore: 73,
            explanations: {
                passion: "Moderate match; you enjoy leadership but less so the administrative overhead.",
                future: "Strong aptitude match for your analytical and organizational strengths.",
                world: "Consistent high demand with great compensation trajectories globally.",
            },
            confidence: "medium",
            steps: [
                {
                    id: "step-b1",
                    order: 1,
                    type: "university",
                    title: "B.Commerce / B.IT",
                    subtitle: "University of Melbourne",
                    detail: "Faculty of Business · Major: Information Systems",
                    duration: "4 years",
                    icon: "🎓",
                    status: "upcoming",
                },
                {
                    id: "step-b2",
                    order: 2,
                    type: "internship",
                    title: "Product Analyst Intern",
                    subtitle: "Google",
                    detail: "APM Program · Melbourne",
                    duration: "3 months",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-b3",
                    order: 3,
                    type: "internship",
                    title: "Associate PM Intern",
                    subtitle: "Stripe",
                    detail: "Payments Team · Remote",
                    duration: "6 months",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-b4",
                    order: 4,
                    type: "job",
                    title: "Product Manager",
                    subtitle: "Spotify",
                    detail: "$120K–$160K · ↑ Growing demand",
                    duration: "Full-time",
                    icon: "🚀",
                    status: "upcoming",
                },
            ],
        },
        {
            id: "path-c",
            label: "Plan C",
            careerGoal: "Data Scientist",
            careerGoalIcon: "🧬",
            passionScore: 45,
            futureScore: 58,
            worldScore: 94,
            journeyScore: null,
            explanations: {
                passion: "Lower alignment; your profile shows less interest in deep mathematical modeling.",
                future: "Requires building significant technical foundations not currently present.",
                world: "Extremely high viability with massive industry growth and remote flexibility.",
            },
            confidence: "low",
            steps: [
                {
                    id: "step-c1",
                    order: 1,
                    type: "university",
                    title: "B.Sc Computer Science",
                    subtitle: "Monash University",
                    detail: "Faculty of IT · Major: Data Science & AI",
                    duration: "3 years",
                    icon: "🎓",
                    status: "upcoming",
                },
                {
                    id: "step-c2",
                    order: 2,
                    type: "internship",
                    title: "ML Engineering Intern",
                    subtitle: "CSIRO Data61",
                    detail: "Research Division · Canberra",
                    duration: "12 months",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-c3",
                    order: 3,
                    type: "job",
                    title: "Data Scientist",
                    subtitle: "Canva",
                    detail: "$130K–$180K · ↑ High demand",
                    duration: "Full-time",
                    icon: "🚀",
                    status: "upcoming",
                },
            ],
        },
    ],
};
