import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("🚀 Starting bulk population of university insights cache...");

    // 1. Get all ground truth entries from university_static_data
    const { data: staticData, error: staticError } = await supabase
        .from("university_static_data")
        .select("*");

    if (staticError) {
        console.error("❌ Error fetching static data:", staticError.message);
        return;
    }

    if (!staticData || staticData.length === 0) {
        console.log("⚠️ No entries found in university_static_data. Run scrapers first.");
        return;
    }

    console.log(`📂 Found ${staticData.length} programs to process.`);

    // 2. Iterate and invoke edge function
    for (const entry of staticData) {
        console.log(`\n⚙️ Processing: ${entry.university_name} - ${entry.faculty_name}`);

        // We provide dummy scores for seeding, or we could run multiple combinations
        const payload = {
            universityName: entry.university_name,
            facultyName: entry.faculty_name,
            careerGoal: "Software Engineer", // Default goal for seeding
            passionScore: 80,
            futureScore: 80,
            worldScore: 80
        };

        try {
            const { data, error } = await supabase.functions.invoke("university-insights", {
                body: payload
            });

            if (error) {
                console.error(`   ❌ Edge Function Error: ${error.message}`);
            } else {
                console.log(`   ✅ Success! Source: ${data.source}, GPAX: ${data.gpaxCutoff}`);
            }
        } catch (err) {
            console.error(`   ❌ Failed to invoke edge function:`, err);
        }

        // Rate limiting to avoid slamming APIs
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("\n✨ Bulk population complete.");
}

main().catch(console.error);
