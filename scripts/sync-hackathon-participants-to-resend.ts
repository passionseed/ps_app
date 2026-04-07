#!/usr/bin/env tsx
/**
 * Sync Hackathon Participants to Resend Contacts
 *
 * Fetches all hackathon_participants from Supabase and creates
 * contacts in Resend for email marketing.
 *
 * Usage:
 *   npx tsx scripts/sync-hackathon-participants-to-resend.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_P2hKXtZ7_5WFqwtTirN4jJGFmhiKF75pQ";
const SEGMENT_ID = "b8b1f255-f929-4680-8fdd-b3627dc79a53";

interface HackathonParticipant {
  id: string;
  name: string;
  email: string;
  university: string;
  role: string;
  team_name: string | null;
  track: string | null;
  grade_level: string | null;
  experience_level: number | null;
  referral_source: string | null;
  bio: string | null;
  phone: string | null;
  line_id: string | null;
  instagram_handle: string | null;
  discord_username: string | null;
  team_emoji: string | null;
}

interface ResendContact {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed?: boolean;
  segments?: { id: string }[];
}

async function fetchParticipants(): Promise<HackathonParticipant[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("📥 Fetching hackathon participants from Supabase...");

  const { data, error } = await supabase
    .from("hackathon_participants")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`);
  }

  console.log(`✅ Found ${data.length} participants`);
  return data;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

async function createResendContact(contact: ResendContact): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contact),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log("🚀 Syncing hackathon participants to Resend contacts...\n");

  // Validate environment
  if (!SUPABASE_URL) {
    console.error("❌ EXPO_PUBLIC_SUPABASE_URL not found in environment");
    process.exit(1);
  }
  if (!SUPABASE_SERVICE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY not found in environment");
    process.exit(1);
  }

  // Fetch participants
  const participants = await fetchParticipants();

  // Reverse order to process remaining participants first (if previous run was interrupted)
  const reversedParticipants = [...participants].reverse();

  // Create contacts
  console.log("\n📤 Creating contacts in Resend (processing in reverse order)...\n");

  const results = {
    success: 0,
    failed: 0,
    duplicates: 0,
    errors: [] as { email: string; error: string }[],
  };

  for (const participant of reversedParticipants) {
    const { firstName, lastName } = parseName(participant.name);

    const contact: ResendContact = {
      email: participant.email,
      first_name: firstName,
      last_name: lastName,
      unsubscribed: false,
      segments: [{ id: SEGMENT_ID }],
    };

    const result = await createResendContact(contact);

    if (result.success) {
      results.success++;
      console.log(`  ✅ ${participant.email} (${participant.name})`);
    } else {
      // Check if it's a duplicate error
      if (result.error?.includes("already exists") || result.error?.includes("duplicate")) {
        results.duplicates++;
        console.log(`  ⚠️  ${participant.email} - already exists`);
      } else {
        results.failed++;
        results.errors.push({ email: participant.email, error: result.error || "Unknown error" });
        console.log(`  ❌ ${participant.email} - ${result.error}`);
      }
    }

    // Rate limiting: Resend allows 2 requests/second by default
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Summary
  console.log("\n📊 Summary:");
  console.log(`   ✅ Created: ${results.success}`);
  console.log(`   ⚠️  Duplicates: ${results.duplicates}`);
  console.log(`   ❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const { email, error } of results.errors) {
      console.log(`   ${email}: ${error}`);
    }
  }

  console.log("\n✨ Sync complete!");
}

main();