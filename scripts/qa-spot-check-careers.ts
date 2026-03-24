#!/usr/bin/env tsx
/**
 * QA Spot Check Careers Script
 *
 * Fetches 10 random careers from the jobs table for manual verification.
 * Generates a QA report with all data fields for review.
 *
 * Usage:
 *   npx tsx scripts/qa-spot-check-careers.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  company: string | null;
  viability_score: number | null;
  demand_trend: string | null;
  automation_risk: number | null;
  salary_range_thb: {
    entry?: number;
    mid?: number;
    senior?: number;
  } | null;
  category: string | null;
  subcategory: string | null;
  required_skills: string[] | null;
  top_companies: string[] | null;
  description_th: string | null;
  description_en: string | null;
  day_in_life_th: string | null;
  day_in_life_en: string | null;
  education_requirements: string[] | null;
  certifications: string[] | null;
  work_environment: string | null;
  stress_level: number | null;
  work_life_balance: number | null;
  source: string | null;
  last_updated: string | null;
  created_at: string;
}

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 QA Spot Check: Fetching 10 random careers for verification\n");

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

  // Fetch 10 random jobs
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .not("viability_score", "is", null) // Only get jobs with data
    .order("id") // Need ordering for randomization
    .limit(100); // Get more than we need

  if (error) {
    console.error("❌ Error fetching jobs:", error.message);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.error("❌ No jobs found in database");
    process.exit(1);
  }

  // Shuffle and pick 10
  const shuffled = jobs.sort(() => 0.5 - Math.random());
  const selectedJobs = shuffled.slice(0, 10) as Job[];

  console.log(`✅ Selected ${selectedJobs.length} careers for QA review\n`);
  console.log("=".repeat(80));

  // Display each career
  selectedJobs.forEach((job, index) => {
    console.log(`\n📋 CAREER #${index + 1}: ${job.title}`);
    console.log("-".repeat(80));

    // Basic Info
    console.log("\n📊 BASIC INFO:");
    console.log(`   ID: ${job.id}`);
    console.log(`   Category: ${job.category || "N/A"}`);
    console.log(`   Subcategory: ${job.subcategory || "N/A"}`);
    console.log(`   Company: ${job.company || "N/A"}`);

    // Viability & Market Data
    console.log("\n📈 VIABILITY & MARKET DATA:");
    console.log(`   Viability Score: ${job.viability_score ?? "N/A"}/100`);
    console.log(`   Demand Trend: ${job.demand_trend || "N/A"}`);
    console.log(`   Automation Risk: ${job.automation_risk ?? "N/A"}/100`);

    // Salary
    console.log("\n💰 SALARY RANGE (THB):");
    if (job.salary_range_thb) {
      const sr = job.salary_range_thb;
      console.log(`   Entry: ${sr.entry?.toLocaleString() || "N/A"}`);
      console.log(`   Mid: ${sr.mid?.toLocaleString() || "N/A"}`);
      console.log(`   Senior: ${sr.senior?.toLocaleString() || "N/A"}`);
    } else {
      console.log("   N/A");
    }

    // Skills
    console.log("\n🛠️  REQUIRED SKILLS:");
    if (job.required_skills && job.required_skills.length > 0) {
      job.required_skills.forEach((skill) => {
        console.log(`   - ${skill}`);
      });
    } else {
      console.log("   N/A");
    }

    // Top Companies
    console.log("\n🏢 TOP COMPANIES:");
    if (job.top_companies && job.top_companies.length > 0) {
      job.top_companies.forEach((company) => {
        console.log(`   - ${company}`);
      });
    } else {
      console.log("   N/A");
    }

    // Descriptions
    console.log("\n📝 DESCRIPTIONS:");
    console.log(`   EN: ${job.description_en ? job.description_en.substring(0, 100) + "..." : "N/A"}`);
    console.log(`   TH: ${job.description_th ? job.description_th.substring(0, 100) + "..." : "N/A"}`);

    // Day in Life
    console.log("\n🌅 DAY IN LIFE:");
    console.log(`   EN: ${job.day_in_life_en ? job.day_in_life_en.substring(0, 100) + "..." : "N/A"}`);
    console.log(`   TH: ${job.day_in_life_th ? job.day_in_life_th.substring(0, 100) + "..." : "N/A"}`);

    // Education & Certifications
    console.log("\n🎓 EDUCATION REQUIREMENTS:");
    if (job.education_requirements && job.education_requirements.length > 0) {
      job.education_requirements.forEach((edu) => {
        console.log(`   - ${edu}`);
      });
    } else {
      console.log("   N/A");
    }

    console.log("\n📜 CERTIFICATIONS:");
    if (job.certifications && job.certifications.length > 0) {
      job.certifications.forEach((cert) => {
        console.log(`   - ${cert}`);
      });
    } else {
      console.log("   N/A");
    }

    // Work Environment
    console.log("\n🏢 WORK ENVIRONMENT:");
    console.log(`   Environment: ${job.work_environment || "N/A"}`);
    console.log(`   Stress Level: ${job.stress_level ?? "N/A"}/10`);
    console.log(`   Work-Life Balance: ${job.work_life_balance ?? "N/A"}/10`);

    // Metadata
    console.log("\n📋 METADATA:");
    console.log(`   Source: ${job.source || "N/A"}`);
    console.log(`   Created: ${job.created_at}`);
    console.log(`   Last Updated: ${job.last_updated || "N/A"}`);

    console.log("\n" + "=".repeat(80));
  });

  // Generate summary
  console.log("\n\n📊 QA SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nTotal careers reviewed: ${selectedJobs.length}`);

  // Calculate data completeness
  const completeness = {
    viability_score: selectedJobs.filter((j) => j.viability_score !== null).length,
    salary_range: selectedJobs.filter((j) => j.salary_range_thb !== null).length,
    required_skills: selectedJobs.filter((j) => j.required_skills && j.required_skills.length > 0).length,
    description_th: selectedJobs.filter((j) => j.description_th !== null).length,
    description_en: selectedJobs.filter((j) => j.description_en !== null).length,
    day_in_life_th: selectedJobs.filter((j) => j.day_in_life_th !== null).length,
    day_in_life_en: selectedJobs.filter((j) => j.day_in_life_en !== null).length,
    top_companies: selectedJobs.filter((j) => j.top_companies && j.top_companies.length > 0).length,
  };

  console.log("\n📈 DATA COMPLETENESS:");
  Object.entries(completeness).forEach(([field, count]) => {
    const percentage = ((count / selectedJobs.length) * 100).toFixed(0);
    console.log(`   ${field}: ${count}/${selectedJobs.length} (${percentage}%)`);
  });

  // List job IDs for reference
  console.log("\n📝 JOB IDs FOR REFERENCE:");
  selectedJobs.forEach((job, index) => {
    console.log(`   ${index + 1}. ${job.title} (${job.id})`);
  });

  console.log("\n✅ QA spot check complete!");
  console.log("\nNext steps:");
  console.log("1. Review each career above");
  console.log("2. Verify salary ranges against JobThai/JobsDB");
  console.log("3. Check Thai translations for accuracy");
  console.log("4. Validate skills match actual job postings");
  console.log("5. Update any incorrect data in Supabase");
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
