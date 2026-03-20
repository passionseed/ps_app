#!/usr/bin/env npx ts-node
/**
 * PathLab Batch Processor
 *
 * Processes multiple pending expert interviews with validation and repair loop.
 *
 * Usage:
 *   pnpm run generate:pathlab:batch
 *   pnpm run generate:pathlab:batch <expert_id_1> <expert_id_2>
 *   pnpm run generate:pathlab:batch --dry-run
 *   pnpm run generate:pathlab:batch --max-retries=5
 */

import { createClient } from '@supabase/supabase-js';
import { orchestrator } from './orchestrator';
import { BatchResult } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxRetriesArg = args.find(a => a.startsWith('--max-retries='));
  const maxRetries = maxRetriesArg ? parseInt(maxRetriesArg.split('=')[1]) : 3;
  const expertIds = args.filter(a => !a.startsWith('--'));

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PathLab Batch Processor');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nMode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Max retries: ${maxRetries}`);
  console.log(`Expert IDs: ${expertIds.length > 0 ? expertIds.join(', ') : 'All pending'}\n`);

  const startTime = Date.now();

  // Get pending experts
  let query = supabase
    .from('expert_pathlabs')
    .select('expert_profile_id, expert_profiles(id, name, title)')
    .eq('generation_status', 'pending');

  if (expertIds.length > 0) {
    query = query.in('expert_profile_id', expertIds);
  }

  const { data: pendingExperts, error } = await query;

  if (error) {
    console.error('Error fetching pending experts:', error);
    process.exit(1);
  }

  if (!pendingExperts || pendingExperts.length === 0) {
    console.log('No pending experts found.');
    process.exit(0);
  }

  console.log(`Found ${pendingExperts.length} pending expert(s)\n`);

  const result: BatchResult = {
    totalProcessed: pendingExperts.length,
    completed: 0,
    failed: 0,
    failedExperts: [],
    totalTimeMs: 0
  };

  // Process each expert
  for (const expert of pendingExperts) {
    const expertId = expert.expert_profile_id;
    const expertName = (expert.expert_profiles as any)?.name || 'Unknown';

    console.log(`\n───────────────────────────────────────────────────────────────`);
    console.log(`Processing: ${expertName} (${expertId})`);
    console.log(`───────────────────────────────────────────────────────────────\n`);

    try {
      const genResult = await orchestrator(supabase, expertId, {
        dryRun,
        maxRetries,
        enableValidation: true
      });

      if (genResult.success) {
        result.completed++;
        console.log(`✅ Completed: ${expertName}`);
      } else {
        result.failed++;
        result.failedExperts.push({ expertId, error: genResult.error || 'Unknown error' });
        console.log(`❌ Failed: ${expertName} - ${genResult.error}`);
      }
    } catch (err) {
      result.failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.failedExperts.push({ expertId, error: errorMsg });
      console.log(`❌ Error: ${expertName} - ${errorMsg}`);
    }
  }

  result.totalTimeMs = Date.now() - startTime;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Batch Processing Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nProcessed: ${result.totalProcessed}`);
  console.log(`Completed: ${result.completed} (${Math.round(result.completed / result.totalProcessed * 100)}%)`);
  console.log(`Failed: ${result.failed} (${Math.round(result.failed / result.totalProcessed * 100)}%)`);
  console.log(`Total time: ${Math.round(result.totalTimeMs / 1000 / 60)}m ${Math.round(result.totalTimeMs / 1000 % 60)}s`);
  console.log(`Avg time: ${Math.round(result.totalTimeMs / result.totalProcessed / 1000)}s per PathLab\n`);

  if (result.failedExperts.length > 0) {
    console.log('Failed experts:');
    for (const failed of result.failedExperts) {
      console.log(`  - ${failed.expertId}: ${failed.error}`);
    }
    console.log('');
  }
}

main();
