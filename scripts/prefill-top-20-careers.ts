#!/usr/bin/env tsx
/**
 * Top 20 Careers Viability Agent Runner
 *
 * Processes the top 20 priority careers through the Viability Agent
 * (career-research edge function) to pre-populate the jobs database.
 *
 * Usage:
 *   npx tsx scripts/prefill-top-20-careers.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Configuration ───────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 1000; // 1 second between requests

// ─── Top 20 Priority Careers (from task note) ─────────────────────────────────

interface Career {
  titleEn: string;
  titleTh: string;
  category: string;
}

const TOP_20_CAREERS: Career[] = [
  { titleEn: "Software Engineer", titleTh: "วิศวกรซอฟต์แวร์", category: "Technology" },
  { titleEn: "Data Scientist", titleTh: "นักวิทยาศาสตร์ข้อมูล", category: "Technology" },
  { titleEn: "UX Designer", titleTh: "นักออกแบบประสบการณ์ผู้ใช้", category: "Technology" },
  { titleEn: "Product Manager", titleTh: "ผู้จัดการผลิตภัณฑ์", category: "Technology" },
  { titleEn: "Doctor", titleTh: "แพทย์", category: "Healthcare" },
  { titleEn: "Nurse", titleTh: "พยาบาล", category: "Healthcare" },
  { titleEn: "Pharmacist", titleTh: "เภสัชกร", category: "Healthcare" },
  { titleEn: "Marketing Manager", titleTh: "ผู้จัดการการตลาด", category: "Business" },
  { titleEn: "Accountant", titleTh: "นักบัญชี", category: "Business" },
  { titleEn: "Business Analyst", titleTh: "นักวิเคราะห์ธุรกิจ", category: "Business" },
  { titleEn: "Civil Engineer", titleTh: "วิศวกรโยธา", category: "Engineering" },
  { titleEn: "Electrical Engineer", titleTh: "วิศวกรไฟฟ้า", category: "Engineering" },
  { titleEn: "Architect", titleTh: "สถาปนิก", category: "Engineering" },
  { titleEn: "Teacher", titleTh: "ครู", category: "Education" },
  { titleEn: "Lawyer", titleTh: "ทนายความ", category: "Legal" },
  { titleEn: "Financial Analyst", titleTh: "นักวิเคราะห์การเงิน", category: "Business" },
  { titleEn: "Entrepreneur", titleTh: "ผู้ประกอบการ", category: "Business" },
  { titleEn: "Content Creator", titleTh: "ครีเอเตอร์เนื้อหา", category: "Creative" },
  { titleEn: "Graphic Designer", titleTh: "นักออกแบบกราฟิก", category: "Creative" },
  { titleEn: "HR Specialist", titleTh: "ผู้เชี่ยวชาญด้านทรัพยากรบุคคล", category: "Business" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcessingResult {
  career: Career;
  status: "success" | "skipped" | "error";
  message: string;
  jobId?: string;
  viabilityScore?: number;
  demandTrend?: string;
  skillsCount?: number;
}

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Top 20 Careers Viability Agent Runner\n");
  console.log(`📊 Total careers to process: ${TOP_20_CAREERS.length}`);
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
  for (let i = 0; i < TOP_20_CAREERS.length; i++) {
    const career = TOP_20_CAREERS[i];
    const currentNum = i + 1;

    console.log(`\n📌 [${currentNum}/${TOP_20_CAREERS.length}] Processing: ${career.titleEn}`);
    console.log(`   Category: ${career.category}`);
    console.log(`   Thai: ${career.titleTh}`);

    try {
      // Check if career already exists
      const { data: existingJobs, error: checkError } = await supabase
        .from("jobs")
        .select("id, title, viability_score, demand_trend, required_skills")
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
        const existing = existingJobs[0];
        console.log(`   ⏭️  Skipped: Already exists (ID: ${existing.id})`);
        console.log(`   📈 Existing viability score: ${existing.viability_score}`);
        console.log(`   📊 Existing demand trend: ${existing.demand_trend}`);
        console.log(`   🛠️  Existing skills: ${existing.required_skills?.length || 0}`);
        results.push({
          career,
          status: "skipped",
          message: "Career already exists in database",
          jobId: existing.id,
          viabilityScore: existing.viability_score,
          demandTrend: existing.demand_trend,
          skillsCount: existing.required_skills?.length,
        });
        skipped++;
        continue;
      }

      // Call career-research edge function (Viability Agent)
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
      const jobData = response.job || response.jobs?.[0];

      console.log(`   ✅ Success! Source: ${source}`);
      if (jobId) {
        console.log(`   📝 Job ID: ${jobId}`);
      }
      if (jobData) {
        console.log(`   📈 Viability Score: ${jobData.viability_score}`);
        console.log(`   💰 Median Salary: ${jobData.median_salary?.toLocaleString()}`);
        console.log(`   📊 Demand Trend: ${jobData.demand_trend}`);
        console.log(`   🛠️  Skills: ${jobData.required_skills?.length || 0}`);
      }

      // Update the job with Thai title if it was created
      if (jobId && source === "apify") {
        console.log(`   🌏 Updating with Thai title...`);
        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            title_th: career.titleTh,
            category: career.category,
          })
          .eq("id", jobId);

        if (updateError) {
          console.error(`   ⚠️  Warning: Failed to update Thai title: ${updateError.message}`);
        } else {
          console.log(`   ✅ Thai title updated`);
        }
      }

      results.push({
        career,
        status: "success",
        message: `Created from ${source}`,
        jobId,
        viabilityScore: jobData?.viability_score,
        demandTrend: jobData?.demand_trend,
        skillsCount: jobData?.required_skills?.length,
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
    if (i < TOP_20_CAREERS.length - 1) {
      process.stdout.write(`   ⏳ Waiting ${RATE_LIMIT_MS}ms...`);
      await sleep(RATE_LIMIT_MS);
      process.stdout.write(" ✓\n");
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(70));
  console.log("📊 PROCESSING COMPLETE - TOP 20 CAREERS");
  console.log("=".repeat(70));
  console.log(`\nTotal careers: ${TOP_20_CAREERS.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (already exists): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((created / TOP_20_CAREERS.length) * 100).toFixed(1)}%`);

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
        console.log(`     Viability: ${r.viabilityScore}, Trend: ${r.demandTrend}, Skills: ${r.skillsCount}`);
      });
  }

  // Show skipped careers
  if (skipped > 0) {
    console.log("\n⏭️  Skipped careers (already exist):");
    results
      .filter((r) => r.status === "skipped")
      .forEach((r) => {
        console.log(`   - ${r.career.titleEn} (${r.career.category})`);
        console.log(`     Viability: ${r.viabilityScore}, Trend: ${r.demandTrend}, Skills: ${r.skillsCount}`);
      });
  }

  // Verification SQL
  console.log("\n" + "=".repeat(70));
  console.log("🔍 VERIFICATION SQL");
  console.log("=".repeat(70));
  console.log(`\nRun this SQL to verify the results:`);
  console.log(`\nSELECT title, title_th, viability_score, demand_trend, required_skills`);
  console.log(`FROM jobs`);
  console.log(`WHERE category IN ('Technology', 'Healthcare', 'Business', 'Engineering', 'Education', 'Legal', 'Creative')`);
  console.log(`ORDER BY viability_score DESC;`);

  console.log("\n✨ Top 20 careers viability agent runner complete!");
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
