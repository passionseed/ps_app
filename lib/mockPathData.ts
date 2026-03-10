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
                passion: "เข้ากันได้ดีกับความสนใจด้านความคิดสร้างสรรค์และงานอดิเรกที่เน้นการออกแบบของคุณ",
                future: "มีศักยภาพในการเติบโตสูง แม้ว่าทักษะบางอย่างเช่นการออกแบบระบบยังต้องพัฒนาเพิ่มเติม",
                world: "ความต้องการในตลาดสูงมาก และสอดคล้องกับวิถีชีวิตและสถานที่ที่คุณต้องการ",
            },
            confidence: "high",
            steps: [
                {
                    id: "step-a1",
                    order: 1,
                    type: "university",
                    title: "ปริญญาตรีการออกแบบ",
                    subtitle: "มหาวิทยาลัยศิลปากร",
                    detail: "คณะมัณฑนศิลป์ · วิชาเอก: การออกแบบสื่อสาร",
                    duration: "3 ปี",
                    icon: "🎓",
                    status: "in-progress",
                },
                {
                    id: "step-a2",
                    order: 2,
                    type: "internship",
                    title: "เด็กฝึกงานนักออกแบบ UX",
                    subtitle: "Canva",
                    detail: "ทีมงานออกแบบผลิตภัณฑ์ · กรุงเทพฯ",
                    duration: "6 เดือน",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-a3",
                    order: 3,
                    type: "job",
                    title: "นักออกแบบ UX ระดับต้น",
                    subtitle: "Agoda",
                    detail: "45K–65K บาท · ↑ ความต้องการเพิ่มขึ้น",
                    duration: "งานประจำ",
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
                passion: "ตรงปานกลาง คุณชอบความเป็นผู้นำแต่ไม่ค่อยชอบงานเอกสาร",
                future: "ความถนัดตรงกับจุดแข็งด้านการวิเคราะห์และการจัดการของคุณ",
                world: "ความต้องการสูงสม่ำเสมอพร้อมผลตอบแทนที่ดีทั่วโลก",
            },
            confidence: "medium",
            steps: [
                {
                    id: "step-b1",
                    order: 1,
                    type: "university",
                    title: "ปริญญาตรีบัญชี / ไอที",
                    subtitle: "จุฬาลงกรณ์มหาวิทยาลัย",
                    detail: "คณะพาณิชยศาสตร์และการบัญชี",
                    duration: "4 ปี",
                    icon: "🎓",
                    status: "upcoming",
                },
                {
                    id: "step-b2",
                    order: 2,
                    type: "internship",
                    title: "Product Analyst Intern",
                    subtitle: "Google",
                    detail: "โครงการ APM · สิงคโปร์",
                    duration: "3 เดือน",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-b3",
                    order: 3,
                    type: "internship",
                    title: "Product Manager Intern",
                    subtitle: "Stripe",
                    detail: "ทีมระบบชำระเงิน · ทำงานทางไกล",
                    duration: "6 เดือน",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-b4",
                    order: 4,
                    type: "job",
                    title: "ผู้จัดการผลิตภัณฑ์",
                    subtitle: "Spotify",
                    detail: "80K–120K บาท · ↑ ความต้องการเพิ่มขึ้น",
                    duration: "งานประจำ",
                    icon: "🚀",
                    status: "upcoming",
                },
            ],
        },
        {
            id: "path-c",
            label: "แผน C",
            careerGoal: "นักวิทยาศาสตร์ข้อมูล",
            careerGoalIcon: "🧬",
            passionScore: 45,
            futureScore: 58,
            worldScore: 94,
            journeyScore: null,
            explanations: {
                passion: "ความสอดคล้องต่ำ โปรไฟล์ของคุณแสดงความสนใจในการจำลองทางคณิตศาสตร์เชิงลึกน้อย",
                future: "ต้องสร้างพื้นฐานทางเทคนิคที่สำคัญซึ่งยังไม่มีในปัจจุบัน",
                world: "โอกาสสูงมากด้วยการเติบโตของอุตสาหกรรมขนาดใหญ่และความยืดหยุ่นในการทำงานทางไกล",
            },
            confidence: "low",
            steps: [
                {
                    id: "step-c1",
                    order: 1,
                    type: "university",
                    title: "วท.บ. วิทยาการคอมพิวเตอร์",
                    subtitle: "มหาวิทยาลัยเกษตรศาสตร์",
                    detail: "คณะวิทยาศาสตร์ · วิชาเอก: วิทยาการข้อมูลและ AI",
                    duration: "3 ปี",
                    icon: "🎓",
                    status: "upcoming",
                },
                {
                    id: "step-c2",
                    order: 2,
                    type: "internship",
                    title: "เด็กฝึกงานวิศวกร ML",
                    subtitle: "KBTG",
                    detail: "แผนกวิจัย · กรุงเทพฯ",
                    duration: "12 เดือน",
                    icon: "💼",
                    status: "upcoming",
                },
                {
                    id: "step-c3",
                    order: 3,
                    type: "job",
                    title: "นักวิทยาศาสตร์ข้อมูล",
                    subtitle: "LINE",
                    detail: "90K–150K บาท · ↑ ความต้องการสูงมาก",
                    duration: "งานประจำ",
                    icon: "🚀",
                    status: "upcoming",
                },
            ],
        },
    ],
};
