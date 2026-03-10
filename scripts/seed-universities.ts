// Run: npx tsx scripts/seed-universities.ts
// Requires EXA_API_KEY + ANTHROPIC_API_KEY set as Supabase secrets,
// and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TO_SEED = [
    { universityName: "มหาวิทยาลัยศิลปากร", facultyName: "คณะมัณฑนศิลป์", careerGoal: "UX Designer" },
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะพาณิชยศาสตร์และการบัญชี", careerGoal: "Product Manager" },
    { universityName: "มหาวิทยาลัยเกษตรศาสตร์", facultyName: "คณะวิทยาศาสตร์", careerGoal: "Data Scientist" },
    // Expand this list before launch
];

async function seedOne(entry: typeof TO_SEED[0]) {
    console.log(`Seeding: ${entry.universityName} / ${entry.facultyName}...`);
    const { data, error } = await supabase.functions.invoke("university-insights", {
        body: { ...entry, passionScore: 75, futureScore: 70, worldScore: 80 },
    });
    if (error) { console.error(`  ✗ ${error.message}`); return; }
    console.log(`  ✓ AI match: ${data.aiMatchScore}%`);
    // Promote to seeded with 30-day TTL
    await supabase
        .from("university_insights_cache")
        .update({
            source: "seeded",
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("university_name", entry.universityName)
        .eq("faculty_name", entry.facultyName)
        .eq("career_goal", entry.careerGoal);
}

async function main() {
    for (const entry of TO_SEED) {
        await seedOne(entry);
        await new Promise((r) => setTimeout(r, 1500)); // rate limit
    }
    console.log("All done.");
}

main();
