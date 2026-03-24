#!/usr/bin/env tsx
/**
 * TCAS Program Description Generator
 *
 * Generates Thai descriptions for all TCAS programs using Gemini API.
 *
 * Prerequisites:
 *   - Set GEMINI_API_KEY in .env.local
 *   - Ensure tcas_programs table has description_th column
 *
 * Usage:
 *   npx tsx scripts/generate-tcas-descriptions.ts
 *   npx tsx scripts/generate-tcas-descriptions.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Configuration ───────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const RATE_LIMIT_MS = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const BATCH_SIZE = 10; // Process in batches for better progress tracking

// ─── Types ───────────────────────────────────────────────────────────────────

interface TcasProgram {
  id: string;
  program_id: string;
  university_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string | null;
  faculty_name_en: string | null;
  field_name: string | null;
  field_name_en: string | null;
  program_type: string | null;
  program_type_name: string | null;
  description_th: string | null;
}

interface ProcessingResult {
  program: TcasProgram;
  status: "success" | "skipped" | "error";
  message: string;
  description?: string;
}

// ─── Main Script ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting TCAS Program Description Generation\n");

  // Check environment variables
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    console.error("   Add GEMINI_API_KEY to your .env.local file");
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

  // Check if description_th column exists
  console.log("🔍 Checking database schema...");
  const hasColumn = await checkDescriptionColumn(supabase);

  if (!hasColumn) {
    console.error("❌ description_th column not found in tcas_programs table");
    console.error("\n📋 To fix this, run the following SQL in Supabase Dashboard:");
    console.error("   File: scripts/sql/add-tcas-description-column.sql");
    console.error("\n   SQL:");
    console.error("   ALTER TABLE public.tcas_programs ADD COLUMN IF NOT EXISTS description_th TEXT;");
    console.error("   CREATE INDEX IF NOT EXISTS idx_tcas_programs_description_th ON public.tcas_programs(description_th) WHERE description_th IS NOT NULL;");
    process.exit(1);
  }

  console.log("✅ Database schema verified\n");

  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (dryRun) {
    console.log("⚠️  DRY RUN MODE - No database updates will be made\n");
  }

  // Fetch all TCAS programs
  console.log("📊 Fetching TCAS programs from database...");
  const { data: programs, error: programsError } = await supabase
    .from("tcas_programs")
    .select("id, program_id, university_id, program_name, program_name_en, faculty_name, faculty_name_en, field_name, field_name_en, program_type, program_type_name, description_th")
    .order("program_name");

  if (programsError) {
    console.error("❌ Error fetching programs:", programsError.message);
    process.exit(1);
  }

  if (!programs || programs.length === 0) {
    console.error("❌ No TCAS programs found in database");
    process.exit(1);
  }

  console.log(`✅ Found ${programs.length} TCAS programs\n`);

  // Filter programs that need descriptions
  const programsNeedingDescriptions = programs.filter(
    (p) => !p.description_th || p.description_th.length < 10
  );

  console.log(`📝 Programs needing descriptions: ${programsNeedingDescriptions.length}`);
  console.log(`⏭️  Programs already have descriptions: ${programs.length - programsNeedingDescriptions.length}\n`);

  if (programsNeedingDescriptions.length === 0) {
    console.log("✨ All programs already have descriptions!");
    process.exit(0);
  }

  const results: ProcessingResult[] = [];
  let success = 0;
  let skipped = 0;
  let errors = 0;

  // Process programs in batches
  for (let i = 0; i < programsNeedingDescriptions.length; i++) {
    const program = programsNeedingDescriptions[i];
    const currentNum = i + 1;

    console.log(`\n📌 [${currentNum}/${programsNeedingDescriptions.length}] Processing: ${program.program_name}`);
    if (program.faculty_name) {
      console.log(`   Faculty: ${program.faculty_name}`);
    }

    try {
      // Generate description with retry logic
      const description = await generateDescriptionWithRetry(program);

      if (!description || description.length < 10) {
        console.log(`   ⚠️  Generated description too short, skipping`);
        results.push({
          program,
          status: "error",
          message: "Generated description too short",
        });
        errors++;
        continue;
      }

      console.log(`   ✅ Generated description (${description.length} chars)`);

      // Update database (unless dry run)
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("tcas_programs")
          .update({ description_th: description })
          .eq("id", program.id);

        if (updateError) {
          console.error(`   ❌ Database update error: ${updateError.message}`);
          results.push({
            program,
            status: "error",
            message: `Database error: ${updateError.message}`,
          });
          errors++;
          continue;
        }
        console.log(`   💾 Saved to database`);
      } else {
        console.log(`   💾 Would save (dry run)`);
      }

      results.push({
        program,
        status: "success",
        message: "Description generated successfully",
        description,
      });
      success++;

      // Rate limiting
      if (i < programsNeedingDescriptions.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${errorMessage}`);
      results.push({
        program,
        status: "error",
        message: errorMessage,
      });
      errors++;
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("📊 GENERATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nTotal programs processed: ${programsNeedingDescriptions.length}`);
  console.log(`✅ Successfully generated: ${success}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📈 Success rate: ${((success / programsNeedingDescriptions.length) * 100).toFixed(1)}%`);

  // Show sample descriptions
  if (success > 0) {
    console.log("\n✅ Sample generated descriptions:");
    results
      .filter((r) => r.status === "success")
      .slice(0, 3)
      .forEach((r) => {
        console.log(`\n   📚 ${r.program.program_name}`);
        if (r.program.faculty_name) {
          console.log(`      Faculty: ${r.program.faculty_name}`);
        }
        console.log(`      ${r.description?.substring(0, 150)}...`);
      });
  }

  // Show errors if any
  if (errors > 0) {
    console.log("\n❌ Failed programs:");
    results
      .filter((r) => r.status === "error")
      .slice(0, 5)
      .forEach((r) => {
        console.log(`   - ${r.program.program_name}: ${r.message}`);
      });
    if (errors > 5) {
      console.log(`   ... and ${errors - 5} more`);
    }
  }

  console.log("\n✨ TCAS description generation complete!");
  process.exit(errors > 0 ? 1 : 0);
}

// ─── Database Functions ──────────────────────────────────────────────────────

async function checkDescriptionColumn(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("tcas_programs")
      .select("description_th")
      .limit(1);

    return !error || !error.message.includes("description_th");
  } catch {
    return false;
  }
}

// ─── Gemini API Functions ────────────────────────────────────────────────────

async function generateDescriptionWithRetry(program: TcasProgram): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const description = await generateDescription(program);
      return description;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`   ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`   ⏳ Waiting ${backoffMs}ms before retry...`);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

async function generateDescription(program: TcasProgram): Promise<string> {
  const facultyContext = program.faculty_name ? `ในคณะ${program.faculty_name}` : "";
  const fieldContext = program.field_name ? `สาขา${program.field_name}` : "";
  const typeContext = program.program_type_name ? `ประเภท${program.program_type_name}` : "";

  const prompt = `เขียนคำอธิบายหลักสูตรในภาษาไทย 2-3 ประโยค

ข้อมูลหลักสูตร:
- ชื่อหลักสูตร: ${program.program_name}
${facultyContext ? `- คณะ: ${program.faculty_name}` : ""}
${fieldContext ? `- สาขา: ${program.field_name}` : ""}
${typeContext ? `- ประเภท: ${program.program_type_name}` : ""}

Requirements:
1. เขียนเป็นภาษาไทยที่เป็นธรรมชาติ อ่านง่าย
2. 2-3 ประโยค ไม่เกิน 200 ตัวอักษร
3. อธิบายว่าหลักสูตรนี้เรียนเกี่ยวกับอะไร จบไปทำงานอะไรได้บ้าง
4. ใช้ภาษาที่เหมาะสมกับนักเรียนระดับมัธยมปลาย
5. ไม่ต้องมีคำนำหรือคำสรุป ตอบเฉพาะคำอธิบายเลย

ตัวอย่างรูปแบบ:
"หลักสูตรวิศวกรรมคอมพิวเตอร์เน้นการออกแบบและพัฒนาระบบซอฟต์แวร์ เรียนรู้ทั้งฮาร์ดแวร์และซอฟต์แวร์ จบไปสามารถทำงานเป็นโปรแกรมเมอร์ วิศวกรซอฟต์แวร์ หรือนักวิเคราะห์ระบบได้"`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response from Gemini API");
  }

  const generatedText = data.candidates[0].content.parts[0].text || "";

  // Clean up the response
  let description = generatedText.trim();

  // Remove quotes if present
  description = description.replace(/^["']|["']$/g, "");

  // Ensure it ends with proper punctuation
  if (!description.match(/[.!?。！？]$/)) {
    description += "。";
  }

  return description;
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
