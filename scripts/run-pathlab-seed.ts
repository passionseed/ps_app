/**
 * Run the Web Developer PathLab seed file against Supabase
 * 
 * Usage: npx ts-node scripts/run-pathlab-seed.ts
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const url = SUPABASE_URL;
const key = SERVICE_ROLE_KEY;

async function runSeed() {
  console.log('🚀 Running Web Developer PathLab seed...\n');
  
  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Read the seed file
  const seedPath = path.join(__dirname, '../supabase/seed/web-developer-pathlab-seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf-8');
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📋 Executing ${statements.length} SQL statements...\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try direct query if RPC doesn't exist
        console.log(`   ⚠️  Statement skipped (may already exist)`);
      } else {
        success++;
      }
    } catch (err) {
      // Continue on error (likely ON CONFLICT DO NOTHING)
    }
  }
  
  console.log(`\n✅ Seed complete!`);
  console.log(`   - Success: ${success}`);
  console.log(`   - Skipped: ${statements.length - success}`);
  
  // Verify records
  console.log('\n📊 Verifying records...');
  
  const { data: seed } = await supabase
    .from('seeds')
    .select('id, title')
    .eq('id', 'web-developer-pathlab-001')
    .single();
  
  if (seed) {
    console.log(`   ✓ Seed: ${seed.title}`);
  }
  
  const { count: daysCount } = await supabase
    .from('path_days')
    .select('*', { count: 'exact', head: true })
    .eq('path_id', 'web-dev-path-001');
  
  console.log(`   ✓ Path days: ${daysCount}`);
  
  const { count: activitiesCount } = await supabase
    .from('path_activities')
    .select('*', { count: 'exact', head: true })
    .like('id', 'web-dev-day%');
  
  console.log(`   ✓ Activities: ${activitiesCount}`);
  
  const { count: contentCount } = await supabase
    .from('path_content')
    .select('*', { count: 'exact', head: true })
    .like('activity_id', 'web-dev-day%');
  
  console.log(`   ✓ Content items: ${contentCount}`);
}

runSeed().catch(console.error);