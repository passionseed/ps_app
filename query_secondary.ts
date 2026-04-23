import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  // Search for secondary research in metadata
  const { data, error } = await supabase
    .from("hackathon_phase_activity_assessments")
    .select("*")
    .ilike("metadata", "%secondary%")
    .limit(20);
  
  console.log("Secondary research assessments:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
  
  // Also try fetching all assessments with their activity info
  const { data: data2, error: e2 } = await supabase
    .from("hackathon_phase_activity_assessments")
    .select("*, hackathon_phase_activities(title)")
    .limit(5);
  
  console.log("\nAll assessments (sample):", JSON.stringify(data2, null, 2));
}
main().catch(console.error);
