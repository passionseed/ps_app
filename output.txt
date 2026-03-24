#!/usr/bin/env tsx
/**
 * Career Enrichment Script
 *
 * Enriches career data in the jobs table using:
 * 1. Exa API for news, notable people, and companies
 * 2. Gemini API for day-in-life descriptions (Thai + English)
 *
 * Prerequisites:
 *   1. Run the SQL in apply-migration.sql first to add required columns
 *   2. Set EXA_API_KEY in .env.local
 *   3. Optional: Set GEMINI_API_KEY for AI-generated descriptions
 *
 * Usage:
 *   npx tsx scripts/enrich-career-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  buildExaNewsSearchBody,
  buildExaPeopleSearchBody,
  mapExaNewsResult,
  type ExaNewsResult,
} from "./lib/exa-search";

dotenv.config({ path: ".env.local" });

// ─── Configuration ───────────────────────────────────────────────────────────

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_API_URL = "https://api.exa.ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const RATE_LIMIT_MS = 500; // 500ms between Exa requests
const GEMINI_RATE_LIMIT_MS = 1000; // 1s between Gemini requests

// ─── Types ───────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  category?: string;
  news_items?: any[];
  notable_people?: any[];
  day_in_life_th?: string;
  day_in_life_en?: string;
}

interface ExaPeopleResult {
  title: string;
  url: string;
  text: string;
  score: number;
}

interface EnrichmentResult {
  job: Job;
  status: "success" | "skipped" | "error";
  message: string;
  newsCount?: number;
  peopleCount?: number;
  hasDayInLifeTh?: boolean;
  hasDayInLifeEn?: boolean;
}

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Career Enrichment Script\n");

  // Check environment variables
  if (!EXA_API_KEY) {
    console.error("❌ EXA_API_KEY not found in environment");
    console.error("   Add EXA_API_KEY to your .env.local file");
    process.exit(1);
  }

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

  // Check if required columns exist
  console.log("🔍 Checking database schema...");
  const columnsExist = await checkColumnsExist(supabase);

  if (!columnsExist) {
    console.error("\n❌ Required columns don't exist in the jobs table.");
    console.error("   Please run the SQL in scripts/sql/apply-migration.sql first.");
    console.error("\n   You can do this via:");
    console.error("   1. Supabase Dashboard → SQL Editor");
    console.error("   2. Or run: npx supabase db push (if local Supabase is running)");
    process.exit(1);
  }

  console.log("✅ Database schema verified\n");

  // Fetch top 20 careers from jobs table
  console.log("📊 Fetching top 20 careers from database...");
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, category, news_items, notable_people, day_in_life_th, day_in_life_en")
    .order("viability_score", { ascending: false })
    .limit(20);

  if (jobsError) {
    console.error("❌ Error fetching jobs:", jobsError.message);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.error("❌ No jobs found in database");
    process.exit(1);
  }

  console.log(`✅ Found ${jobs.length} careers to enrich\n`);

  const results: EnrichmentResult[] = [];
  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  // Process each career
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const currentNum = i + 1;

    console.log(`\n📌 [${currentNum}/${jobs.length}] Processing: ${job.title}`);

    try {
      // Check if already enriched
      const hasNews = job.news_items && Array.isArray(job.news_items) && job.news_items.length > 0;
      const hasPeople = job.notable_people && Array.isArray(job.notable_people) && job.notable_people.length > 0;
      const hasDayInLifeTh = job.day_in_life_th && job.day_in_life_th.length > 50;
      const hasDayInLifeEn = job.day_in_life_en && job.day_in_life_en.length > 50;

      if (hasNews && hasPeople && hasDayInLifeTh && hasDayInLifeEn) {
        console.log(`   ⏭️  Skipped: Already fully enriched`);
        results.push({
          job,
          status: "skipped",
          message: "Already enriched",
          newsCount: job.news_items?.length,
          peopleCount: job.notable_people?.length,
          hasDayInLifeTh,
          hasDayInLifeEn,
        });
        skipped++;
        continue;
      }

      // Fetch news from Exa
      let newsItems: any[] = job.news_items || [];
      if (!hasNews) {
        console.log(`   🔍 Fetching news from Exa...`);
        newsItems = await fetchNewsFromExa(job.title);
        console.log(`   ✅ Found ${newsItems.length} news items`);
      }

      // Wait between Exa requests
      if (!hasNews && i < jobs.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }

      // Fetch notable people from Exa
      let notablePeople: any[] = job.notable_people || [];
      if (!hasPeople) {
        console.log(`   🔍 Fetching notable people from Exa...`);
        notablePeople = await fetchNotablePeopleFromExa(job.title);
        console.log(`   ✅ Found ${notablePeople.length} notable people`);
      }

      // Wait between Exa requests
      if (!hasPeople && i < jobs.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }

      // Generate day-in-life descriptions with Gemini
      let dayInLifeTh = job.day_in_life_th || "";
      let dayInLifeEn = job.day_in_life_en || "";

      if (!hasDayInLifeTh || !hasDayInLifeEn) {
        if (GEMINI_API_KEY) {
          console.log(`   🤖 Generating day-in-life descriptions with Gemini...`);
          const descriptions = await generateDayInLifeDescriptions(job.title, job.category);
          dayInLifeTh = descriptions.thai;
          dayInLifeEn = descriptions.english;
          console.log(`   ✅ Generated descriptions (${dayInLifeTh.length} chars TH, ${dayInLifeEn.length} chars EN)`);
        } else {
          console.log(`   ⚠️  Skipping Gemini generation (no GEMINI_API_KEY)`);
        }
      }

      // Update database
      console.log(`   💾 Saving to database...`);
      const updateData: any = {};
      if (!hasNews) updateData.news_items = newsItems;
      if (!hasPeople) updateData.notable_people = notablePeople;
      if (!hasDayInLifeTh) updateData.day_in_life_th = dayInLifeTh;
      if (!hasDayInLifeEn) updateData.day_in_life_en = dayInLifeEn;

      const { error: updateError } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", job.id);

      if (updateError) {
        console.error(`   ❌ Database update error: ${updateError.message}`);
        results.push({
          job,
          status: "error",
          message: `Database error: ${updateError.message}`,
        });
        errors++;
        continue;
      }

      console.log(`   ✅ Successfully enriched!`);
      results.push({
        job,
        status: "success",
        message: "Enriched successfully",
        newsCount: newsItems.length,
        peopleCount: notablePeople.length,
        hasDayInLifeTh: dayInLifeTh.length > 50,
        hasDayInLifeEn: dayInLifeEn.length > 50,
      });
      enriched++;

      // Wait between Gemini requests
      if (GEMINI_API_KEY && (!hasDayInLifeTh || !hasDayInLifeEn) && i < jobs.length - 1) {
        await sleep(GEMINI_RATE_LIMIT_MS);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${errorMessage}`);
      results.push({
        job,
        status: "error",
        message: errorMessage,
      });
      errors++;
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("📊 ENRICHMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nTotal careers: ${jobs.length}`);
  console.log(`✅ Enriched: ${enriched}`);
  console.log(`⏭️  Skipped (already enriched): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((enriched / jobs.length) * 100).toFixed(1)}%`);

  // Show enriched careers
  if (enriched > 0) {
    console.log("\n✅ Newly enriched careers:");
    results
      .filter((r) => r.status === "success")
      .forEach((r) => {
        console.log(`   - ${r.job.title}: ${r.newsCount} news, ${r.peopleCount} people, day-in-life: ${r.hasDayInLifeTh ? 'TH✓' : '✗'}/${r.hasDayInLifeEn ? 'EN✓' : '✗'}`);
      });
  }

  // Show errors if any
  if (errors > 0) {
    console.log("\n❌ Failed careers:");
    results
      .filter((r) => r.status === "error")
      .forEach((r) => {
        console.log(`   - ${r.job.title}: ${r.message}`);
      });
  }

  console.log("\n✨ Enrichment script complete!");
  process.exit(errors > 0 ? 1 : 0);
}

// ─── Database Functions ──────────────────────────────────────────────────────

async function checkColumnsExist(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("jobs")
      .select("news_items, notable_people, day_in_life_th, day_in_life_en")
      .limit(1);

    return !error || !error.message.includes("news_items");
  } catch {
    return false;
  }
}

// ─── Exa API Functions ───────────────────────────────────────────────────────

async function fetchNewsFromExa(jobTitle: string): Promise<any[]> {
  const response = await fetch(`${EXA_API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY!,
    },
    body: JSON.stringify(buildExaNewsSearchBody(jobTitle)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((result: ExaNewsResult) => mapExaNewsResult(result));
}

async function fetchNotablePeopleFromExa(jobTitle: string): Promise<any[]> {
  const response = await fetch(`${EXA_API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY!,
    },
    body: JSON.stringify(buildExaPeopleSearchBody(jobTitle)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((result: ExaPeopleResult) => ({
    name: extractPersonName(result.title),
    url: result.url,
    description: result.text?.substring(0, 200) + "..." || "",
  })).filter((p: any) => p.name && p.name.length > 2);
}

// ─── Gemini API Functions ────────────────────────────────────────────────────

async function generateDayInLifeDescriptions(jobTitle: string, category?: string): Promise<{ thai: string; english: string }> {
  if (!GEMINI_API_KEY) {
    return { thai: "", english: "" };
  }

  const categoryContext = category ? ` in the ${category} industry` : "";

  const prompt = `Write a "day in the life" description for a ${jobTitle}${categoryContext}.

Requirements:
1. Write in English first (200-300 words)
2. Then translate to Thai (200-300 words)
3. Make it realistic and engaging
4. Include morning routine, typical tasks, challenges, and rewarding moments
5. Use professional but accessible language

Format your response exactly like this:

---ENGLISH---
[English description here]

---THAI---
[Thai description here]`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    return { thai: "", english: "" };
  }

  const generatedText = data.candidates[0].content.parts[0].text || "";

  // Parse the response
  const englishMatch = generatedText.match(/---ENGLISH---\s*([\s\S]*?)(?=---THAI---|$)/);
  const thaiMatch = generatedText.match(/---THAI---\s*([\s\S]*?)$/);

  const english = englishMatch ? englishMatch[1].trim() : "";
  const thai = thaiMatch ? thaiMatch[1].trim() : "";

  return { thai, english };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractPersonName(title: string): string {
  // Try to extract a person's name from the title
  // Common patterns: "John Smith - Job Title", "John Smith | Company", etc.
  const patterns = [
    /^([^\-|–—:]+)[\-|–—:]/,  // Name before dash or colon
    /^([^,]+),/,               // Name before comma
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      // Check if it looks like a name (at least 2 words, reasonable length)
      if (candidate.split(/\s+/).length >= 2 && candidate.length > 5 && candidate.length < 50) {
        return candidate;
      }
    }
  }

  // If no pattern matches, return the first part of the title
  return title.split(/[\-|–—:,]/)[0].trim().substring(0, 50);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
