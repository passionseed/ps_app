#!/usr/bin/env npx ts-node
/**
 * PathLab Generator CLI
 * 
 * Generates a complete PathLab from an expert interview using multi-agent orchestration.
 * 
 * Usage:
 *   pnpm run generate:pathlab <expert_profile_id>
 *   pnpm run generate:pathlab <expert_profile_id> --dry-run
 *   pnpm run generate:pathlab --help
 */

import { createClient } from '@supabase/supabase-js';
import { orchestrator } from './orchestrator';

// Load environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create service role client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');
  const expertProfileId = args.find(a => !a.startsWith('--'));
  
  if (help) {
    console.log(`
PathLab Generator - Multi-agent PathLab generation from expert interviews

Usage:
  pnpm run generate:pathlab <expert_profile_id>  Generate PathLab for expert
  pnpm run generate:pathlab <id> --dry-run       Preview without writing to DB
  pnpm run generate:pathlab --help               Show this help

Options:
  --dry-run    Run agents but don't write to database
  --help, -h   Show this help message

Process:
  1. Agent 1: Extract learning objectives from interview
  2. Agent 2: Design evidence/assessments for each objective
  3. Agent 3: Research grounded content with Exa API
  4. Agent 4: Design learning activities
  5. Agent 5: Quality review

Output:
  - path_days (5 records)
  - path_activities (15-20 records)
  - path_content (15-30 records)
  - path_assessments (5-10 records)
`);
    process.exit(0);
  }
  
  if (!expertProfileId) {
    console.error('Error: expert_profile_id is required');
    console.error('Usage: pnpm run generate:pathlab <expert_profile_id>');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PathLab Generator - Multi-Agent Orchestration');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nExpert Profile ID: ${expertProfileId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no DB writes)' : 'LIVE (will write to DB)'}\n`);
  
  try {
    const result = await orchestrator(supabase, expertProfileId, { dryRun });
    
    if (result.success) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('  ✅ PathLab Generation Complete!');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\nSeed ID: ${result.seedId}`);
      console.log(`Path ID: ${result.pathId}`);
      console.log(`Days: ${result.daysCreated}`);
      console.log(`Activities: ${result.activitiesCreated}`);
      console.log(`Content items: ${result.contentCreated}`);
      console.log(`Duration: ${result.duration}s\n`);
    } else {
      console.error('\n❌ PathLab Generation Failed');
      console.error(`Error: ${result.error}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();