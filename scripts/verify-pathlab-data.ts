import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
    console.log("🔍 Verifying Pathlab seed data...");

    const { data: seed, error } = await supabase
        .from("seeds")
        .select("id, title")
        .eq("id", "ux-designer-pathlab-001")
        .maybeSingle();

    if (error) {
        console.error("❌ Error fetching seed:", error.message);
        process.exit(1);
    }

    if (!seed) {
        console.log("❌ Seed 'ux-designer-pathlab-001' not found. (Expected in Red Phase)");
        process.exit(1);
    }

    console.log(`✅ Seed found: ${seed.title}`);
}

main().catch(console.error);
