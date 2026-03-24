#!/usr/bin/env tsx
/**
 * Seed Basic Careers
 *
 * Directly inserts 85 priority careers into the jobs table with basic data.
 * This is a lightweight alternative to the Viability Agent approach.
 *
 * Usage: npx tsx scripts/seed-basic-careers.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root (try .env first for production, then .env.local)
dotenv.config({ path: join(__dirname, "..", ".env") });
dotenv.config({ path: join(__dirname, "..", ".env.local") });

// Production Supabase URL (hardcoded for direct access)
const PRODUCTION_SUPABASE_URL = "https://iikrvgjfkuijcpvdwzvv.supabase.co";

// ─── Configuration ───────────────────────────────────────────────────────────

interface Career {
  title: string;
  title_th: string;
  category: string;
  required_skills: string[];
  viability_score: number;
  demand_trend: "growing" | "stable" | "declining";
}

const CAREERS: Career[] = [
  // Technology (15)
  { title: "Software Engineer", title_th: "วิศวกรซอฟต์แวร์", category: "Technology", required_skills: ["JavaScript", "Python", "System Design", "Git", "Problem Solving"], viability_score: 92, demand_trend: "growing" },
  { title: "Data Scientist", title_th: "นักวิทยาศาสตร์ข้อมูล", category: "Technology", required_skills: ["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization"], viability_score: 90, demand_trend: "growing" },
  { title: "UX Designer", title_th: "นักออกแบบประสบการณ์ผู้ใช้", category: "Technology", required_skills: ["User Research", "Figma", "Prototyping", "Usability Testing", "Design Thinking"], viability_score: 85, demand_trend: "growing" },
  { title: "Product Manager", title_th: "ผู้จัดการผลิตภัณฑ์", category: "Technology", required_skills: ["Product Strategy", "Agile", "Data Analysis", "Communication", "Stakeholder Management"], viability_score: 88, demand_trend: "growing" },
  { title: "DevOps Engineer", title_th: "วิศวกรเดฟออปส์", category: "Technology", required_skills: ["Docker", "Kubernetes", "CI/CD", "AWS", "Linux"], viability_score: 89, demand_trend: "growing" },
  { title: "Cloud Architect", title_th: "สถาปนิกคลาวด์", category: "Technology", required_skills: ["AWS/Azure/GCP", "Infrastructure as Code", "Security", "Networking", "System Design"], viability_score: 91, demand_trend: "growing" },
  { title: "Cybersecurity Analyst", title_th: "นักวิเคราะห์ความปลอดภัยไซเบอร์", category: "Technology", required_skills: ["Network Security", "Penetration Testing", "SIEM", "Risk Assessment", "Compliance"], viability_score: 93, demand_trend: "growing" },
  { title: "Mobile App Developer", title_th: "นักพัฒนาแอปมือถือ", category: "Technology", required_skills: ["iOS/Android", "React Native", "Swift", "Kotlin", "Mobile UI/UX"], viability_score: 84, demand_trend: "stable" },
  { title: "AI/ML Engineer", title_th: "วิศวกรเอไอ/แมชชีนเลิร์นนิง", category: "Technology", required_skills: ["Python", "TensorFlow/PyTorch", "Deep Learning", "NLP", "Computer Vision"], viability_score: 94, demand_trend: "growing" },
  { title: "Blockchain Developer", title_th: "นักพัฒนาบล็อกเชน", category: "Technology", required_skills: ["Solidity", "Smart Contracts", "Web3", "Cryptography", "Distributed Systems"], viability_score: 75, demand_trend: "stable" },
  { title: "Full Stack Developer", title_th: "นักพัฒนาฟูลสแต็ก", category: "Technology", required_skills: ["JavaScript", "React", "Node.js", "Database", "API Design"], viability_score: 87, demand_trend: "growing" },
  { title: "Data Engineer", title_th: "วิศวกรข้อมูล", category: "Technology", required_skills: ["SQL", "Python", "ETL", "Data Warehousing", "Spark"], viability_score: 88, demand_trend: "growing" },
  { title: "QA Engineer", title_th: "วิศวกรควบคุมคุณภาพ", category: "Technology", required_skills: ["Test Automation", "Selenium", "API Testing", "Bug Tracking", "Agile"], viability_score: 80, demand_trend: "stable" },
  { title: "Technical Writer", title_th: "นักเขียนเทคนิค", category: "Technology", required_skills: ["Technical Documentation", "Markdown", "API Documentation", "Communication", "Research"], viability_score: 72, demand_trend: "stable" },
  { title: "IT Project Manager", title_th: "ผู้จัดการโครงการไอที", category: "Technology", required_skills: ["Project Management", "Agile/Scrum", "Risk Management", "Communication", "Budgeting"], viability_score: 85, demand_trend: "growing" },

  // Healthcare (10)
  { title: "Doctor", title_th: "แพทย์", category: "Healthcare", required_skills: ["Medical Diagnosis", "Patient Care", "Surgery", "Medical Knowledge", "Communication"], viability_score: 95, demand_trend: "stable" },
  { title: "Nurse", title_th: "พยาบาล", category: "Healthcare", required_skills: ["Patient Care", "Medical Procedures", "Emergency Response", "Communication", "Compassion"], viability_score: 92, demand_trend: "growing" },
  { title: "Pharmacist", title_th: "เภสัชกร", category: "Healthcare", required_skills: ["Pharmaceutical Knowledge", "Patient Counseling", "Drug Interactions", "Attention to Detail", "Ethics"], viability_score: 88, demand_trend: "stable" },
  { title: "Dentist", title_th: "ทันตแพทย์", category: "Healthcare", required_skills: ["Dental Procedures", "Patient Care", "Manual Dexterity", "Diagnosis", "Communication"], viability_score: 90, demand_trend: "stable" },
  { title: "Physical Therapist", title_th: "นักกายภาพบำบัด", category: "Healthcare", required_skills: ["Rehabilitation", "Anatomy", "Exercise Therapy", "Patient Assessment", "Communication"], viability_score: 86, demand_trend: "growing" },
  { title: "Medical Technologist", title_th: "นักเทคนิคการแพทย์", category: "Healthcare", required_skills: ["Lab Procedures", "Sample Analysis", "Quality Control", "Medical Equipment", "Attention to Detail"], viability_score: 84, demand_trend: "stable" },
  { title: "Psychologist", title_th: "นักจิตวิทยา", category: "Healthcare", required_skills: ["Counseling", "Psychological Assessment", "Therapy", "Research", "Communication"], viability_score: 82, demand_trend: "growing" },
  { title: "Veterinarian", title_th: "สัตวแพทย์", category: "Healthcare", required_skills: ["Animal Care", "Surgery", "Diagnosis", "Communication", "Compassion"], viability_score: 85, demand_trend: "stable" },
  { title: "Nutritionist", title_th: "นักโภชนาการ", category: "Healthcare", required_skills: ["Nutritional Science", "Diet Planning", "Health Assessment", "Counseling", "Research"], viability_score: 78, demand_trend: "growing" },
  { title: "Radiologist", title_th: "รังสีแพทย์", category: "Healthcare", required_skills: ["Medical Imaging", "Diagnosis", "Radiation Safety", "Anatomy", "Technology"], viability_score: 91, demand_trend: "stable" },

  // Business & Finance (10)
  { title: "Accountant", title_th: "นักบัญชี", category: "Business", required_skills: ["Financial Reporting", "Tax", "Auditing", "Excel", "Attention to Detail"], viability_score: 85, demand_trend: "stable" },
  { title: "Financial Analyst", title_th: "นักวิเคราะห์การเงิน", category: "Business", required_skills: ["Financial Modeling", "Excel", "Data Analysis", "Accounting", "Research"], viability_score: 86, demand_trend: "growing" },
  { title: "Marketing Manager", title_th: "ผู้จัดการการตลาด", category: "Business", required_skills: ["Marketing Strategy", "Digital Marketing", "Analytics", "Brand Management", "Communication"], viability_score: 84, demand_trend: "growing" },
  { title: "HR Manager", title_th: "ผู้จัดการฝ่ายทรัพยากรบุคคล", category: "Business", required_skills: ["Recruitment", "Employee Relations", "Performance Management", "Labor Law", "Communication"], viability_score: 82, demand_trend: "stable" },
  { title: "Business Consultant", title_th: "ที่ปรึกษาธุรกิจ", category: "Business", required_skills: ["Business Analysis", "Strategy", "Problem Solving", "Communication", "Industry Knowledge"], viability_score: 87, demand_trend: "growing" },
  { title: "Investment Banker", title_th: "นักลงทุนการธนาคาร", category: "Business", required_skills: ["Financial Modeling", "Valuation", "M&A", "Excel", "Negotiation"], viability_score: 88, demand_trend: "stable" },
  { title: "Sales Manager", title_th: "ผู้จัดการฝ่ายขาย", category: "Business", required_skills: ["Sales Strategy", "Team Management", "Negotiation", "CRM", "Communication"], viability_score: 83, demand_trend: "stable" },
  { title: "Supply Chain Manager", title_th: "ผู้จัดการห่วงโซ่อุปทาน", category: "Business", required_skills: ["Logistics", "Procurement", "Inventory Management", "Data Analysis", "Negotiation"], viability_score: 85, demand_trend: "growing" },
  { title: "Entrepreneur", title_th: "ผู้ประกอบการ", category: "Business", required_skills: ["Business Strategy", "Leadership", "Finance", "Marketing", "Risk Management"], viability_score: 70, demand_trend: "growing" },
  { title: "Risk Analyst", title_th: "นักวิเคราะห์ความเสี่ยง", category: "Business", required_skills: ["Risk Assessment", "Data Analysis", "Financial Modeling", "Regulations", "Statistics"], viability_score: 86, demand_trend: "growing" },

  // Engineering (9)
  { title: "Civil Engineer", title_th: "วิศวกรโยธา", category: "Engineering", required_skills: ["Structural Design", "AutoCAD", "Project Management", "Construction", "Mathematics"], viability_score: 84, demand_trend: "stable" },
  { title: "Electrical Engineer", title_th: "วิศวกรไฟฟ้า", category: "Engineering", required_skills: ["Circuit Design", "Power Systems", "MATLAB", "Electronics", "Problem Solving"], viability_score: 85, demand_trend: "stable" },
  { title: "Mechanical Engineer", title_th: "วิศวกรเครื่องกล", category: "Engineering", required_skills: ["CAD/CAM", "Thermodynamics", "Manufacturing", "Materials Science", "Problem Solving"], viability_score: 83, demand_trend: "stable" },
  { title: "Chemical Engineer", title_th: "วิศวกรเคมี", category: "Engineering", required_skills: ["Process Design", "Chemistry", "Safety", "Simulation", "Problem Solving"], viability_score: 82, demand_trend: "stable" },
  { title: "Architect", title_th: "สถาปนิก", category: "Engineering", required_skills: ["Design", "AutoCAD/Revit", "Building Codes", "3D Modeling", "Creativity"], viability_score: 81, demand_trend: "stable" },
  { title: "Industrial Engineer", title_th: "วิศวกรอุตสาหการ", category: "Engineering", required_skills: ["Process Optimization", "Lean Manufacturing", "Data Analysis", "Project Management", "Ergonomics"], viability_score: 84, demand_trend: "growing" },
  { title: "Environmental Engineer", title_th: "วิศวกรสิ่งแวดล้อม", category: "Engineering", required_skills: ["Environmental Science", "Regulations", "Sustainability", "Data Analysis", "Project Management"], viability_score: 83, demand_trend: "growing" },
  { title: "Aerospace Engineer", title_th: "วิศวกรการบินและอวกาศ", category: "Engineering", required_skills: ["Aerodynamics", "Propulsion", "CAD", "Materials", "Systems Engineering"], viability_score: 86, demand_trend: "stable" },
  { title: "Biomedical Engineer", title_th: "วิศวกรชีวการแพทย์", category: "Engineering", required_skills: ["Medical Devices", "Biology", "CAD", "Regulations", "Problem Solving"], viability_score: 88, demand_trend: "growing" },

  // Education (7)
  { title: "Teacher", title_th: "ครู", category: "Education", required_skills: ["Curriculum Development", "Classroom Management", "Communication", "Assessment", "Patience"], viability_score: 80, demand_trend: "stable" },
  { title: "University Professor", title_th: "อาจารย์มหาวิทยาลัย", category: "Education", required_skills: ["Research", "Teaching", "Academic Writing", "Mentoring", "Subject Expertise"], viability_score: 85, demand_trend: "stable" },
  { title: "School Administrator", title_th: "ผู้บริหารโรงเรียน", category: "Education", required_skills: ["Leadership", "Education Policy", "Budget Management", "Communication", "Problem Solving"], viability_score: 82, demand_trend: "stable" },
  { title: "Curriculum Developer", title_th: "นักพัฒนาหลักสูตร", category: "Education", required_skills: ["Instructional Design", "Education Theory", "Writing", "Research", "Technology"], viability_score: 78, demand_trend: "growing" },
  { title: "Educational Consultant", title_th: "ที่ปรึกษาด้านการศึกษา", category: "Education", required_skills: ["Education Policy", "Assessment", "Communication", "Research", "Problem Solving"], viability_score: 79, demand_trend: "growing" },
  { title: "Librarian", title_th: "บรรณารักษ์", category: "Education", required_skills: ["Information Management", "Research", "Cataloging", "Technology", "Communication"], viability_score: 72, demand_trend: "stable" },
  { title: "Special Education Teacher", title_th: "ครูการศึกษาพิเศษ", category: "Education", required_skills: ["Special Needs Education", "Patience", "IEP Development", "Behavior Management", "Communication"], viability_score: 84, demand_trend: "growing" },

  // Creative & Media (10)
  { title: "Graphic Designer", title_th: "นักออกแบบกราฟิก", category: "Creative", required_skills: ["Adobe Creative Suite", "Typography", "Layout", "Branding", "Creativity"], viability_score: 78, demand_trend: "stable" },
  { title: "Video Editor", title_th: "ตัดต่อวิดีโอ", category: "Creative", required_skills: ["Premiere Pro", "After Effects", "Color Grading", "Storytelling", "Attention to Detail"], viability_score: 80, demand_trend: "growing" },
  { title: "Content Creator", title_th: "ครีเอเตอร์เนื้อหา", category: "Creative", required_skills: ["Social Media", "Video Production", "Writing", "Analytics", "Creativity"], viability_score: 75, demand_trend: "growing" },
  { title: "Photographer", title_th: "ช่างภาพ", category: "Creative", required_skills: ["Photography", "Lighting", "Photo Editing", "Composition", "Client Relations"], viability_score: 72, demand_trend: "stable" },
  { title: "Musician", title_th: "นักดนตรี", category: "Creative", required_skills: ["Musical Instrument", "Music Theory", "Performance", "Creativity", "Practice"], viability_score: 65, demand_trend: "stable" },
  { title: "Writer", title_th: "นักเขียน", category: "Creative", required_skills: ["Writing", "Research", "Editing", "Storytelling", "Creativity"], viability_score: 70, demand_trend: "stable" },
  { title: "Art Director", title_th: "ผู้กำกับศิลป์", category: "Creative", required_skills: ["Visual Design", "Leadership", "Branding", "Project Management", "Creativity"], viability_score: 82, demand_trend: "stable" },
  { title: "Animator", title_th: "นักแอนิเมชัน", category: "Creative", required_skills: ["Animation Software", "Drawing", "Storytelling", "3D Modeling", "Creativity"], viability_score: 79, demand_trend: "growing" },
  { title: "Game Designer", title_th: "นักออกแบบเกม", category: "Creative", required_skills: ["Game Mechanics", "Level Design", "Unity/Unreal", "Storytelling", "Creativity"], viability_score: 81, demand_trend: "growing" },
  { title: "Film Director", title_th: "ผู้กำกับภาพยนตร์", category: "Creative", required_skills: ["Visual Storytelling", "Leadership", "Cinematography", "Editing", "Creativity"], viability_score: 76, demand_trend: "stable" },

  // Legal & Government (5)
  { title: "Lawyer", title_th: "ทนายความ", category: "Legal", required_skills: ["Legal Research", "Negotiation", "Writing", "Critical Thinking", "Communication"], viability_score: 85, demand_trend: "stable" },
  { title: "Judge", title_th: "ผู้พิพากษา", category: "Legal", required_skills: ["Legal Knowledge", "Decision Making", "Impartiality", "Writing", "Critical Thinking"], viability_score: 90, demand_trend: "stable" },
  { title: "Police Officer", title_th: "ตำรวจ", category: "Government", required_skills: ["Law Enforcement", "Physical Fitness", "Investigation", "Communication", "Crisis Management"], viability_score: 82, demand_trend: "stable" },
  { title: "Diplomat", title_th: "นักการทูต", category: "Government", required_skills: ["International Relations", "Negotiation", "Languages", "Cultural Awareness", "Communication"], viability_score: 86, demand_trend: "stable" },
  { title: "Public Policy Analyst", title_th: "นักวิเคราะห์นโยบายสาธารณะ", category: "Government", required_skills: ["Policy Analysis", "Research", "Data Analysis", "Writing", "Economics"], viability_score: 81, demand_trend: "growing" },

  // Science & Research (6)
  { title: "Research Scientist", title_th: "นักวิจัย", category: "Science", required_skills: ["Research Methods", "Data Analysis", "Scientific Writing", "Critical Thinking", "Lab Techniques"], viability_score: 87, demand_trend: "growing" },
  { title: "Biologist", title_th: "นักชีววิทยา", category: "Science", required_skills: ["Biology", "Research", "Lab Techniques", "Data Analysis", "Scientific Writing"], viability_score: 82, demand_trend: "stable" },
  { title: "Chemist", title_th: "นักเคมี", category: "Science", required_skills: ["Chemistry", "Lab Techniques", "Analysis", "Research", "Safety"], viability_score: 83, demand_trend: "stable" },
  { title: "Physicist", title_th: "นักฟิสิกส์", category: "Science", required_skills: ["Physics", "Mathematics", "Research", "Data Analysis", "Problem Solving"], viability_score: 85, demand_trend: "stable" },
  { title: "Astronomer", title_th: "นักดาราศาสตร์", category: "Science", required_skills: ["Astronomy", "Physics", "Data Analysis", "Programming", "Research"], viability_score: 80, demand_trend: "stable" },
  { title: "Geologist", title_th: "นักธรณีวิทยา", category: "Science", required_skills: ["Geology", "Field Work", "Data Analysis", "GIS", "Research"], viability_score: 79, demand_trend: "stable" },

  // Hospitality & Tourism (5)
  { title: "Hotel Manager", title_th: "ผู้จัดการโรงแรม", category: "Hospitality", required_skills: ["Hospitality Management", "Customer Service", "Operations", "Leadership", "Communication"], viability_score: 78, demand_trend: "growing" },
  { title: "Chef", title_th: "เชฟ", category: "Hospitality", required_skills: ["Culinary Arts", "Menu Planning", "Kitchen Management", "Creativity", "Food Safety"], viability_score: 80, demand_trend: "growing" },
  { title: "Event Planner", title_th: "นักวางแผนงานอีเวนต์", category: "Hospitality", required_skills: ["Event Planning", "Budget Management", "Vendor Relations", "Communication", "Organization"], viability_score: 77, demand_trend: "growing" },
  { title: "Travel Agent", title_th: "ตัวแทนท่องเที่ยว", category: "Hospitality", required_skills: ["Travel Planning", "Customer Service", "Sales", "Geography", "Communication"], viability_score: 70, demand_trend: "declining" },
  { title: "Flight Attendant", title_th: "พนักงานต้อนรับบนเครื่องบิน", category: "Hospitality", required_skills: ["Customer Service", "Safety Procedures", "Languages", "Crisis Management", "Communication"], viability_score: 76, demand_trend: "growing" },
];

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Basic Careers Seed Script\n");
  console.log(`📊 Total careers to insert: ${CAREERS.length}\n`);

  // Initialize Supabase client
  const supabaseUrl = PRODUCTION_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    if (!supabaseUrl) console.error("   - EXPO_PUBLIC_SUPABASE_URL");
    if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Statistics
  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Process each career
  for (let i = 0; i < CAREERS.length; i++) {
    const career = CAREERS[i];
    const currentNum = i + 1;

    console.log(`[${currentNum}/${CAREERS.length}] ${career.title}`);

    try {
      // Check if career already exists
      const { data: existingJobs, error: checkError } = await supabase
        .from("jobs")
        .select("id, title")
        .ilike("title", career.title)
        .limit(1);

      if (checkError) {
        console.error(`   ❌ Error checking existing job: ${checkError.message}`);
        errors++;
        continue;
      }

      if (existingJobs && existingJobs.length > 0) {
        console.log(`   ⏭️  Skipped: Already exists (ID: ${existingJobs[0].id})`);
        skipped++;
        continue;
      }

      // Insert the career
      const { data: inserted, error: insertError } = await supabase
        .from("jobs")
        .insert({
          title: career.title,
          industry: career.category,
          category: career.category,
          required_skills: career.required_skills,
          viability_score: career.viability_score,
          demand_trend: career.demand_trend,
          automation_risk: Math.floor(Math.random() * 50), // Random 0-50%
          median_salary: 30000 + Math.floor(Math.random() * 100000), // Random 30k-130k THB
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`   ❌ Error inserting job: ${insertError.message}`);
        errors++;
        continue;
      }

      console.log(`   ✅ Created (ID: ${inserted.id})`);
      created++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Unexpected error: ${errorMessage}`);
      errors++;
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(70));
  console.log("📊 SEED COMPLETE - BASIC CAREERS");
  console.log("=".repeat(70));
  console.log(`\nTotal careers: ${CAREERS.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (already exists): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((created / CAREERS.length) * 100).toFixed(1)}%`);

  // Verification
  console.log("\n" + "=".repeat(70));
  console.log("🔍 VERIFICATION");
  console.log("=".repeat(70));

  const { data: count, error: countError } = await supabase
    .from("jobs")
    .select("count", { count: "exact" });

  if (countError) {
    console.error(`❌ Error getting count: ${countError.message}`);
  } else {
    console.log(`\nTotal careers in database: ${count?.length || 0}`);
  }

  const { data: sample } = await supabase
    .from("jobs")
    .select("title, industry, viability_score, demand_trend")
    .order("viability_score", { ascending: false })
    .limit(10);

  if (sample) {
    console.log("\nTop 10 careers by viability score:");
    sample.forEach((job: any) => {
      console.log(`  • ${job.title} (${job.industry}) - ${job.viability_score} - ${job.demand_trend}`);
    });
  }

  console.log("\n✨ Basic careers seed complete!");
  process.exit(errors > 0 ? 1 : 0);
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
