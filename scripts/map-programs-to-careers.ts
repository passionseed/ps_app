#!/usr/bin/env tsx
/**
 * Map TCAS Programs to Careers
 * 
 * This script:
 * 1. Fetches all TCAS programs and careers from the database
 * 2. Uses Gemini AI to suggest relevant career mappings for each program
 * 3. Stores the mappings with confidence scores in program_career_mappings table
 * 
 * Usage: npx tsx scripts/map-programs-to-careers.ts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error('❌ Missing Gemini API key. Set GEMINI_API_KEY in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Types
interface Program {
    id: string;
    program_name: string;
    program_name_en: string | null;
    faculty_name: string | null;
    field_name: string | null;
    university_name: string;
}

interface Career {
    id: string;
    title: string;
    category: string | null;
    subcategory: string | null;
    required_skills: string[] | null;
}

interface MappingSuggestion {
    career_id: string;
    career_title: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

interface ProgramMappingResult {
    program_id: string;
    program_name: string;
    mappings: MappingSuggestion[];
}

// Rate limiting helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all TCAS programs
 */
async function fetchPrograms(): Promise<Program[]> {
    console.log('📚 Fetching TCAS programs...');
    
    const { data, error } = await supabase
        .from('tcas_programs')
        .select(`
            id,
            program_name,
            program_name_en,
            faculty_name,
            field_name,
            tcas_universities!inner(university_name)
        `)
        .order('program_name');

    if (error) {
        console.error('❌ Error fetching programs:', error);
        throw error;
    }

    // Transform the nested university data
    const programs = data.map((p: any) => ({
        id: p.id,
        program_name: p.program_name,
        program_name_en: p.program_name_en,
        faculty_name: p.faculty_name,
        field_name: p.field_name,
        university_name: p.tcas_universities?.university_name || 'Unknown'
    }));

    console.log(`✅ Found ${programs.length} programs`);
    return programs;
}

/**
 * Fetch all careers from jobs table
 */
async function fetchCareers(): Promise<Career[]> {
    console.log('💼 Fetching careers...');
    
    const { data, error } = await supabase
        .from('jobs')
        .select('id, title, category, subcategory, required_skills')
        .order('title');

    if (error) {
        console.error('❌ Error fetching careers:', error);
        throw error;
    }

    console.log(`✅ Found ${data?.length || 0} careers`);
    return data || [];
}

/**
 * Check existing mappings for a program
 */
async function getExistingMappings(programId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('program_career_mappings')
        .select('career_id')
        .eq('program_id', programId);

    if (error) {
        console.error('❌ Error checking existing mappings:', error);
        return [];
    }

    return data?.map(m => m.career_id) || [];
}

/**
 * Use Gemini to suggest career mappings for a program
 */
async function suggestMappingsWithAI(
    program: Program,
    careers: Career[],
    existingCareerIds: string[]
): Promise<MappingSuggestion[]> {
    // Filter out already mapped careers
    const availableCareers = careers.filter(c => !existingCareerIds.includes(c.id));
    
    if (availableCareers.length === 0) {
        return [];
    }

    const prompt = `You are a career counseling expert for Thai university students.

Given this TCAS (Thai university admission) program:
- Program Name (Thai): ${program.program_name}
- Program Name (English): ${program.program_name_en || 'N/A'}
- Faculty: ${program.faculty_name || 'N/A'}
- Field: ${program.field_name || 'N/A'}
- University: ${program.university_name}

And this list of available careers:
${availableCareers.map(c => `- ${c.title} (ID: ${c.id}, Category: ${c.category || 'N/A'}, Skills: ${c.required_skills?.slice(0, 3).join(', ') || 'N/A'})`).join('\n')}

Task: Identify 3-10 careers that are MOST RELEVANT for graduates of this program.

For each career, provide:
1. career_id: The exact ID from the list above
2. confidence: "high" (direct match, e.g., Computer Science → Software Engineer), "medium" (related field), or "low" (possible but not typical)
3. reason: Brief explanation (1 sentence) of why this career fits

Respond ONLY with a JSON array in this exact format:
[
  {
    "career_id": "uuid-here",
    "career_title": "Career Name",
    "confidence": "high|medium|low",
    "reason": "Explanation of why this career fits"
  }
]

Important:
- Only use career_ids from the provided list
- Ensure confidence reflects the strength of the connection
- Return empty array [] if no good matches exist
- Do not include markdown formatting, only raw JSON`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn(`⚠️ No JSON found in response for ${program.program_name}`);
            return [];
        }

        const suggestions: MappingSuggestion[] = JSON.parse(jsonMatch[0]);
        
        // Validate suggestions
        return suggestions.filter(s => {
            const careerExists = careers.some(c => c.id === s.career_id);
            const validConfidence = ['high', 'medium', 'low'].includes(s.confidence);
            return careerExists && validConfidence;
        });
    } catch (error) {
        console.error(`❌ Error getting AI suggestions for ${program.program_name}:`, error);
        return [];
    }
}

/**
 * Store mappings in the database
 */
async function storeMappings(programId: string, mappings: MappingSuggestion[]): Promise<number> {
    if (mappings.length === 0) return 0;

    const rows = mappings.map(m => ({
        program_id: programId,
        career_id: m.career_id,
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

    return mappings.length;
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting Program-to-Career Mapping Script\n');

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
        let errorCount = 0;

        // Process each program
        for (let i = 0; i < programs.length; i++) {
            const program = programs[i];
            const progress = `[${i + 1}/${programs.length}]`;
            
            console.log(`\n${progress} Processing: ${program.program_name} (${program.university_name})`);

            try {
                // Check existing mappings
                const existingIds = await getExistingMappings(program.id);
                
                if (existingIds.length >= 10) {
                    console.log(`  ⏭️ Already has ${existingIds.length} mappings, skipping`);
                    skippedCount++;
                    continue;
                }

                // Get AI suggestions
                const suggestions = await suggestMappingsWithAI(program, careers, existingIds);
                
                if (suggestions.length === 0) {
                    console.log(`  ⚠️ No suggestions generated`);
                    skippedCount++;
                    continue;
                }

                console.log(`  💡 Got ${suggestions.length} suggestions:`, 
                    suggestions.map(s => `${s.career_title}(${s.confidence[0]})`).join(', '));

                // Store mappings
                const stored = await storeMappings(program.id, suggestions);
                mappedCount += stored;
                processedCount++;

                // Rate limiting - wait between requests
                if (i < programs.length - 1) {
                    await sleep(1000);
                }

            } catch (error) {
                console.error(`  ❌ Error processing program:`, error);
                errorCount++;
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 MAPPING COMPLETE');
        console.log('='.repeat(50));
        console.log(`Total programs: ${programs.length}`);
        console.log(`Processed: ${processedCount}`);
        console.log(`Skipped (already mapped): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total new mappings created: ${mappedCount}`);
        console.log('='.repeat(50));

        // Show sample of results
        console.log('\n📋 Sample mappings (first 10):');
        const { data: sample } = await supabase
            .from('program_career_mapping_details')
            .select('*')
            .limit(10);
        
        if (sample) {
            sample.forEach((m: any) => {
                console.log(`  • ${m.program_name} → ${m.career_title} (${m.confidence})`);
            });
        }

        // Show distribution
        console.log('\n📈 Confidence distribution:');
        const { data: distribution } = await supabase
            .from('program_career_mappings')
            .select('confidence, count')
            .select('confidence');
        
        const highCount = distribution?.filter((d: any) => d.confidence === 'high').length || 0;
        const mediumCount = distribution?.filter((d: any) => d.confidence === 'medium').length || 0;
        const lowCount = distribution?.filter((d: any) => d.confidence === 'low').length || 0;
        
        console.log(`  High: ${highCount}`);
        console.log(`  Medium: ${mediumCount}`);
        console.log(`  Low: ${lowCount}`);

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
