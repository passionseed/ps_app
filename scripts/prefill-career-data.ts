#!/usr/bin/env tsx
/**
 * Career Prefill Seed Script
 *
 * Batch-processes 50-100 priority careers through the Viability Agent
 * (career-research edge function) to pre-populate the jobs database.
 *
 * Usage:
 *   npx tsx scripts/prefill-career-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Configuration ───────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 1000; // 1 second between requests
const BATCH_SIZE = 100; // Process up to 100 careers

// ─── Priority Careers List (EN + TH + Category) ───────────────────────────────

interface Career {
  titleEn: string;
  titleTh: string;
  category: string;
}

const PRIORITY_CAREERS: Career[] = [
  // Technology
  { titleEn: "Software Engineer", titleTh: "วิศวกรซอฟต์แวร์", category: "Technology" },
  { titleEn: "Data Scientist", titleTh: "นักวิทยาศาสตร์ข้อมูล", category: "Technology" },
  { titleEn: "UX Designer", titleTh: "นักออกแบบประสบการณ์ผู้ใช้", category: "Technology" },
  { titleEn: "Product Manager", titleTh: "ผู้จัดการผลิตภัณฑ์", category: "Technology" },
  { titleEn: "DevOps Engineer", titleTh: "วิศวกรเดฟออปส์", category: "Technology" },
  { titleEn: "Cloud Architect", titleTh: "สถาปนิกคลาวด์", category: "Technology" },
  { titleEn: "Cybersecurity Analyst", titleTh: "นักวิเคราะห์ความปลอดภัยไซเบอร์", category: "Technology" },
  { titleEn: "Mobile App Developer", titleTh: "นักพัฒนาแอปมือถือ", category: "Technology" },
  { titleEn: "AI/ML Engineer", titleTh: "วิศวกรเอไอ/แมชชีนเลิร์นนิง", category: "Technology" },
  { titleEn: "Blockchain Developer", titleTh: "นักพัฒนาบล็อกเชน", category: "Technology" },
  { titleEn: "Full Stack Developer", titleTh: "นักพัฒนาฟูลสแต็ก", category: "Technology" },
  { titleEn: "Data Engineer", titleTh: "วิศวกรข้อมูล", category: "Technology" },
  { titleEn: "QA Engineer", titleTh: "วิศวกรควบคุมคุณภาพ", category: "Technology" },
  { titleEn: "Technical Writer", titleTh: "นักเขียนเทคนิค", category: "Technology" },
  { titleEn: "IT Project Manager", titleTh: "ผู้จัดการโครงการไอที", category: "Technology" },

  // Healthcare
  { titleEn: "Doctor", titleTh: "แพทย์", category: "Healthcare" },
  { titleEn: "Nurse", titleTh: "พยาบาล", category: "Healthcare" },
  { titleEn: "Pharmacist", titleTh: "เภสัชกร", category: "Healthcare" },
  { titleEn: "Dentist", titleTh: "ทันตแพทย์", category: "Healthcare" },
  { titleEn: "Physical Therapist", titleTh: "นักกายภาพบำบัด", category: "Healthcare" },
  { titleEn: "Medical Technologist", titleTh: "นักเทคนิคการแพทย์", category: "Healthcare" },
  { titleEn: "Psychologist", titleTh: "นักจิตวิทยา", category: "Healthcare" },
  { titleEn: "Veterinarian", titleTh: "สัตวแพทย์", category: "Healthcare" },
  { titleEn: "Nutritionist", titleTh: "นักโภชนาการ", category: "Healthcare" },
  { titleEn: "Radiologist", titleTh: "รังสีแพทย์", category: "Healthcare" },

  // Business & Finance
  { titleEn: "Accountant", titleTh: "นักบัญชี", category: "Business" },
  { titleEn: "Financial Analyst", titleTh: "นักวิเคราะห์การเงิน", category: "Business" },
  { titleEn: "Marketing Manager", titleTh: "ผู้จัดการการตลาด", category: "Business" },
  { titleEn: "HR Manager", titleTh: "ผู้จัดการฝ่ายทรัพยากรบุคคล", category: "Business" },
  { titleEn: "Business Consultant", titleTh: "ที่ปรึกษาธุรกิจ", category: "Business" },
  { titleEn: "Investment Banker", titleTh: "นักลงทุนการธนาคาร", category: "Business" },
  { titleEn: "Sales Manager", titleTh: "ผู้จัดการฝ่ายขาย", category: "Business" },
  { titleEn: "Supply Chain Manager", titleTh: "ผู้จัดการห่วงโซ่อุปทาน", category: "Business" },
  { titleEn: "Entrepreneur", titleTh: "ผู้ประกอบการ", category: "Business" },
  { titleEn: "Risk Analyst", titleTh: "นักวิเคราะห์ความเสี่ยง", category: "Business" },

  // Engineering
  { titleEn: "Civil Engineer", titleTh: "วิศวกรโยธา", category: "Engineering" },
  { titleEn: "Electrical Engineer", titleTh: "วิศวกรไฟฟ้า", category: "Engineering" },
  { titleEn: "Mechanical Engineer", titleTh: "วิศวกรเครื่องกล", category: "Engineering" },
  { titleEn: "Chemical Engineer", titleTh: "วิศวกรเคมี", category: "Engineering" },
  { titleEn: "Architect", titleTh: "สถาปนิก", category: "Engineering" },
  { titleEn: "Industrial Engineer", titleTh: "วิศวกรอุตสาหการ", category: "Engineering" },
  { titleEn: "Environmental Engineer", titleTh: "วิศวกรสิ่งแวดล้อม", category: "Engineering" },
  { titleEn: "Aerospace Engineer", titleTh: "วิศวกรการบินและอวกาศ", category: "Engineering" },
  { titleEn: "Biomedical Engineer", titleTh: "วิศวกรชีวการแพทย์", category: "Engineering" },

  // Education
  { titleEn: "Teacher", titleTh: "ครู", category: "Education" },
  { titleEn: "University Professor", titleTh: "อาจารย์มหาวิทยาลัย", category: "Education" },
  { titleEn: "School Administrator", titleTh: "ผู้บริหารโรงเรียน", category: "Education" },
  { titleEn: "Curriculum Developer", titleTh: "นักพัฒนาหลักสูตร", category: "Education" },
  { titleEn: "Educational Consultant", titleTh: "ที่ปรึกษาด้านการศึกษา", category: "Education" },
  { titleEn: "Librarian", titleTh: "บรรณารักษ์", category: "Education" },
  { titleEn: "Special Education Teacher", titleTh: "ครูการศึกษาพิเศษ", category: "Education" },

  // Creative & Media
  { titleEn: "Graphic Designer", titleTh: "นักออกแบบกราฟิก", category: "Creative" },
  { titleEn: "Video Editor", titleTh: "ตัดต่อวิดีโอ", category: "Creative" },
  { titleEn: "Content Creator", titleTh: "ครีเอเตอร์เนื้อหา", category: "Creative" },
  { titleEn: "Photographer", titleTh: "ช่างภาพ", category: "Creative" },
  { titleEn: "Musician", titleTh: "นักดนตรี", category: "Creative" },
  { titleEn: "Writer", titleTh: "นักเขียน", category: "Creative" },
  { titleEn: "Art Director", titleTh: "ผู้กำกับศิลป์", category: "Creative" },
  { titleEn: "Animator", titleTh: "นักแอนิเมชัน", category: "Creative" },
  { titleEn: "Game Designer", titleTh: "นักออกแบบเกม", category: "Creative" },
  { titleEn: "Film Director", titleTh: "ผู้กำกับภาพยนตร์", category: "Creative" },

  // Legal & Government
  { titleEn: "Lawyer", titleTh: "ทนายความ", category: "Legal" },
  { titleEn: "Judge", titleTh: "ผู้พิพากษา", category: "Legal" },
  { titleEn: "Police Officer", titleTh: "ตำรวจ", category: "Government" },
  { titleEn: "Diplomat", titleTh: "นักการทูต", category: "Government" },
  { titleEn: "Public Policy Analyst", titleTh: "นักวิเคราะห์นโยบายสาธารณะ", category: "Government" },

  // Science & Research
  { titleEn: "Research Scientist", titleTh: "นักวิจัย", category: "Science" },
  { titleEn: "Biologist", titleTh: "นักชีววิทยา", category: "Science" },
  { titleEn: "Chemist", titleTh: "นักเคมี", category: "Science" },
  { titleEn: "Physicist", titleTh: "นักฟิสิกส์", category: "Science" },
  { titleEn: "Astronomer", titleTh: "นักดาราศาสตร์", category: "Science" },
  { titleEn: "Geologist", titleTh: "นักธรณีวิทยา", category: "Science" },

  // Hospitality & Tourism
  { titleEn: "Hotel Manager", titleTh: "ผู้จัดการโรงแรม", category: "Hospitality" },
  { titleEn: "Chef", titleTh: "เชฟ", category: "Hospitality" },
  { titleEn: "Event Planner", titleTh: "นักวางแผนงานอีเวนต์", category: "Hospitality" },
  { titleEn: "Travel Agent", titleTh: "ตัวแทนท่องเที่ยว", category: "Hospitality" },
  { titleEn: "Flight Attendant", titleTh: "พนักงานต้อนรับบนเครื่องบิน", category: "Hospitality" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcessingResult {
  career: Career;
  status: "success" | "skipped" | "error";
  message: string;
  jobId?: string;
}

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Career Prefill Seed Script\n");
  console.log(`📊 Total careers to process: ${PRIORITY_CAREERS.length}`);
  console.log(`⏱️  Rate limit: ${RATE_LIMIT_MS}ms between requests\n`);

  // Initialize Supabase client
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    if (!supabaseUrl) console.error("   - EXPO_PUBLIC_SUPABASE_URL");
    if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: ProcessingResult[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let created = 0;

  // Process each career
  for (let i = 0; i < PRIORITY_CAREERS.length; i++) {
    const career = PRIORITY_CAREERS[i];
    const currentNum = i + 1;

    console.log(`\n📌 [${currentNum}/${PRIORITY_CAREERS.length}] Processing: ${career.titleEn}`);
    console.log(`   Category: ${career.category}`);
    console.log(`   Thai: ${career.titleTh}`);

    try {
      // Check if career already exists
      const { data: existingJobs, error: checkError } = await supabase
        .from("jobs")
        .select("id, title")
        .ilike("title", career.titleEn)
        .limit(1);

      if (checkError) {
        console.error(`   ❌ Error checking existing job: ${checkError.message}`);
        results.push({
          career,
          status: "error",
          message: `Database check error: ${checkError.message}`,
        });
        errors++;
        continue;
      }

      if (existingJobs && existingJobs.length > 0) {
        console.log(`   ⏭️  Skipped: Already exists (ID: ${existingJobs[0].id})`);
        results.push({
          career,
          status: "skipped",
          message: "Career already exists in database",
          jobId: existingJobs[0].id,
        });
        skipped++;
        continue;
      }

      // Call career-research edge function
      console.log(`   🔍 Calling Viability Agent...`);

      const { data: response, error: invokeError } = await supabase.functions.invoke(
        "career-research",
        {
          body: {
            jobTitle: career.titleEn,
            researchIfNotFound: true,
          },
        }
      );

      if (invokeError) {
        console.error(`   ❌ Edge function error: ${invokeError.message}`);
        results.push({
          career,
          status: "error",
          message: `Edge function error: ${invokeError.message}`,
        });
        errors++;
        continue;
      }

      if (!response) {
        console.error(`   ❌ No response from edge function`);
        results.push({
          career,
          status: "error",
          message: "No response from edge function",
        });
        errors++;
        continue;
      }

      if (response.error) {
        console.error(`   ❌ Edge function returned error: ${response.error}`);
        results.push({
          career,
          status: "error",
          message: `Edge function error: ${response.error}`,
        });
        errors++;
        continue;
      }

      // Success!
      const jobId = response.job?.id || response.jobs?.[0]?.id;
      const source = response.source || "unknown";

      console.log(`   ✅ Success! Source: ${source}`);
      if (jobId) {
        console.log(`   📝 Job ID: ${jobId}`);
      }
      if (response.job) {
        console.log(`   📈 Viability Score: ${response.job.viability_score}`);
        console.log(`   💰 Median Salary: ${response.job.median_salary?.toLocaleString()}`);
        console.log(`   📊 Demand Trend: ${response.job.demand_trend}`);
      }

      results.push({
        career,
        status: "success",
        message: `Created from ${source}`,
        jobId,
      });
      created++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Unexpected error: ${errorMessage}`);
      results.push({
        career,
        status: "error",
        message: `Unexpected error: ${errorMessage}`,
      });
      errors++;
    }

    processed++;

    // Rate limiting - wait before next request (except for last item)
    if (i < PRIORITY_CAREERS.length - 1) {
      process.stdout.write(`   ⏳ Waiting ${RATE_LIMIT_MS}ms...`);
      await sleep(RATE_LIMIT_MS);
      process.stdout.write(" ✓\n");
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("📊 PROCESSING COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nTotal careers: ${PRIORITY_CAREERS.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (already exists): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((created / PRIORITY_CAREERS.length) * 100).toFixed(1)}%`);

  // Show errors if any
  if (errors > 0) {
    console.log("\n❌ Failed careers:");
    results
      .filter((r) => r.status === "error")
      .forEach((r) => {
        console.log(`   - ${r.career.titleEn}: ${r.message}`);
      });
  }

  // Show created careers
  if (created > 0) {
    console.log("\n✅ Newly created careers:");
    results
      .filter((r) => r.status === "success")
      .forEach((r) => {
        console.log(`   - ${r.career.titleEn} (${r.career.category})`);
      });
  }

  console.log("\n✨ Prefill script complete!");
  process.exit(errors > 0 ? 1 : 0);
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
