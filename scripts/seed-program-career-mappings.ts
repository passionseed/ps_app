#!/usr/bin/env tsx
/**
 * Seed Program-Career Mappings (Manual)
 * 
 * This script creates basic mappings between TCAS programs and careers
 * using keyword matching. This is a fallback until the AI-powered
 * mapping script can be run with a full career database.
 * 
 * Usage: npx tsx scripts/seed-program-career-mappings.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root (try .env first for production, then .env.local)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Production Supabase URL
const PRODUCTION_SUPABASE_URL = 'https://iikrvgjfkuijcpvdwzvv.supabase.co';

// Initialize Supabase client - use production URL
const supabaseUrl = PRODUCTION_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Keyword-based mapping rules
const mappingRules: { keywords: string[]; careerTitles: string[]; confidence: 'high' | 'medium' | 'low' }[] = [
    {
        keywords: ['คอมพิวเตอร์', 'computer', 'software', 'เทคโนโลยีสารสนเทศ', 'information technology', 'วิศวกรรมซอฟต์แวร์', 'software engineering'],
        careerTitles: ['Software Engineer', 'Ai Engineer', 'Data Scientist', 'Data Analyst'],
        confidence: 'high'
    },
    {
        keywords: ['วิศวกรรม', 'engineering', 'วิศวะ'],
        careerTitles: ['Software Engineer'],
        confidence: 'medium'
    },
    {
        keywords: ['แพทย์', 'medicine', 'medical', 'doctor'],
        careerTitles: ['Medical Doctor'],
        confidence: 'high'
    },
    {
        keywords: ['ออกแบบ', 'design', 'ศิลปะ', 'art', 'นิเทศศาสตร์', 'communication arts'],
        careerTitles: ['UX Designer', 'Photographer'],
        confidence: 'medium'
    },
    {
        keywords: ['บริหาร', 'business', 'management', 'การตลาด', 'marketing'],
        careerTitles: ['Product Manager'],
        confidence: 'medium'
    },
    {
        keywords: ['วิทยาศาสตร์', 'science', 'คณิตศาสตร์', 'mathematics', 'สถิติ', 'statistics'],
        careerTitles: ['Data Scientist', 'Data Analyst'],
        confidence: 'medium'
    }
];

interface Program {
    id: string;
    program_name: string;
    program_name_en: string | null;
}

interface Career {
    id: string;
    title: string;
}

/**
 * Fetch all programs
 */
async function fetchPrograms(): Promise<Program[]> {
    console.log('📚 Fetching TCAS programs...');
    
    const { data, error } = await supabase
        .from('tcas_programs')
        .select('id, program_name, program_name_en')
        .order('program_name');

    if (error) {
        console.error('❌ Error fetching programs:', error);
        throw error;
    }

    console.log(`✅ Found ${data?.length || 0} programs`);
    return data || [];
}

/**
 * Fetch all careers
 */
async function fetchCareers(): Promise<Career[]> {
    console.log('💼 Fetching careers...');
    
    const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');

    if (error) {
        console.error('❌ Error fetching careers:', error);
        throw error;
    }

    console.log(`✅ Found ${data?.length || 0} careers`);
    return data || [];
}

/**
 * Find matching careers for a program based on keywords
 */
function findMatchingCareers(program: Program, careers: Career[]): Array<{ career: Career; confidence: 'high' | 'medium' | 'low'; reason: string }> {
    const matches: Array<{ career: Career; confidence: 'high' | 'medium' | 'low'; reason: string }> = [];
    const searchText = `${program.program_name} ${program.program_name_en || ''}`.toLowerCase();

    for (const rule of mappingRules) {
        const hasKeyword = rule.keywords.some(kw => searchText.includes(kw.toLowerCase()));
        
        if (hasKeyword) {
            for (const careerTitle of rule.careerTitles) {
                const career = careers.find(c => 
                    c.title.toLowerCase() === careerTitle.toLowerCase()
                );
                
                if (career && !matches.some(m => m.career.id === career.id)) {
                    matches.push({
                        career,
                        confidence: rule.confidence,
                        reason: `Program name contains keywords related to ${career.title}`
                    });
                }
            }
        }
    }

    return matches;
}

/**
 * Store mappings in the database
 */
async function storeMappings(programId: string, matches: Array<{ career: Career; confidence: 'high' | 'medium' | 'low'; reason: string }>): Promise<number> {
    if (matches.length === 0) return 0;

    const rows = matches.map(m => ({
        program_id: programId,
        career_id: m.career.id,
        confidence: m.confidence,
        mapping_reason: m.reason
    }));

    const { error } = await supabase
        .from('program_career_mappings')
        .upsert(rows, { onConflict: 'program_id,career_id' });

    if (error) {
        console.error('❌ Error storing mappings:', error);
        return 0;
    }

    return matches.length;
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting Program-to-Career Mapping Seed\n');

    try {
        // Fetch data
        const programs = await fetchPrograms();
        const careers = await fetchCareers();

        if (programs.length === 0) {
            console.log('⚠️ No programs found. Exiting.');
            return;
        }

        if (careers.length === 0) {
            console.log('⚠️ No careers found. Please run career prefill first. Exiting.');
            return;
        }

        // Statistics
        let processedCount = 0;
        let mappedCount = 0;
        let skippedCount = 0;

        // Process each program
        for (let i = 0; i < programs.length; i++) {
            const program = programs[i];
            
            // Progress every 100 programs
            if (i % 100 === 0) {
                console.log(`\n[${i + 1}/${programs.length}] Processing...`);
            }

            // Find matching careers
            const matches = findMatchingCareers(program, careers);
            
            if (matches.length === 0) {
                skippedCount++;
                continue;
            }

            // Store mappings
            const stored = await storeMappings(program.id, matches);
            
            if (stored > 0) {
                mappedCount += stored;
                processedCount++;
                
                if (i % 100 === 0) {
                    console.log(`  ✓ ${program.program_name} → ${matches.map(m => m.career.title).join(', ')}`);
                }
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SEED COMPLETE');
        console.log('='.repeat(50));
        console.log(`Total programs: ${programs.length}`);
        console.log(`Programs with mappings: ${processedCount}`);
        console.log(`Programs skipped (no match): ${skippedCount}`);
        console.log(`Total mappings created: ${mappedCount}`);
        console.log('='.repeat(50));

        // Show sample of results
        console.log('\n📋 Sample mappings:');
        const { data: sample } = await supabase
            .from('program_career_mapping_details')
            .select('program_name, career_title, confidence')
            .limit(10);
        
        if (sample) {
            sample.forEach((m: any) => {
                console.log(`  • ${m.program_name.substring(0, 50)}... → ${m.career_title} (${m.confidence})`);
            });
        }

        // Show distribution
        console.log('\n📈 Confidence distribution:');
        const { data: distribution } = await supabase
            .from('program_career_mappings')
            .select('confidence');
        
        const highCount = distribution?.filter((d: any) => d.confidence === 'high').length || 0;
        const mediumCount = distribution?.filter((d: any) => d.confidence === 'medium').length || 0;
        const lowCount = distribution?.filter((d: any) => d.confidence === 'low').length || 0;
        
        console.log(`  High: ${highCount}`);
        console.log(`  Medium: ${mediumCount}`);
        console.log(`  Low: ${lowCount}`);

        // Verification query
        console.log('\n✅ Verification query:');
        const { data: verification } = await supabase
            .from('program_career_mapping_details')
            .select('program_name, career_title')
            .limit(5);
        
        console.log('Sample program→career mappings:');
        verification?.forEach((v: any) => {
            console.log(`  ${v.program_name.substring(0, 40)}... → ${v.career_title}`);
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export { main };
