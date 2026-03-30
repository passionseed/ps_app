#!/usr/bin/env tsx
/**
 * Apply Migration Script
 *
 * Applies the enrichment columns migration directly to the database.
 *
 * Usage:
 *   npx tsx scripts/apply-migration.ts
 */

import type { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MIGRATION_SQL = `
-- Add columns for news, notable people, and companies from Exa API
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS news_items JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS notable_people JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS top_companies_enriched JSONB DEFAULT '[]';

-- Create GIN indexes for JSONB array queries
CREATE INDEX IF NOT EXISTS idx_jobs_news_items ON public.jobs USING GIN(news_items);
CREATE INDEX IF NOT EXISTS idx_jobs_notable_people ON public.jobs USING GIN(notable_people);

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.news_items IS 'Array of news articles about this career from Exa API: [{title, url, published_date, source, summary}]';
COMMENT ON COLUMN public.jobs.notable_people IS 'Array of notable people in this career from Exa API: [{name, url, description}]';
COMMENT ON COLUMN public.jobs.top_companies_enriched IS 'Array of top companies from Exa API: [{name, url, description}]';
`;

async function main() {
  console.log("🚀 Applying migration to add enrichment columns...\n");

  // Get database URL from environment
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("❌ DATABASE_URL not found in environment");
    console.error("   Please set DATABASE_URL in your .env.local file");
    console.error("   Format: postgresql://user:password@host:port/database");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("🔌 Connecting to database...");
    await client.connect();
    console.log("✅ Connected\n");

    console.log("📊 Applying migration...");
    await client.query(MIGRATION_SQL);
    console.log("✅ Migration applied successfully!\n");

    // Verify columns were added
    console.log("🔍 Verifying columns...");
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      AND column_name IN ('news_items', 'notable_people', 'top_companies_enriched')
      ORDER BY column_name;
    `);

    console.log("📋 New columns:");
    for (const row of result.rows) {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    }

    console.log("\n✨ Migration complete!");
    console.log("   You can now run: npx tsx scripts/enrich-career-data.ts");

  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
