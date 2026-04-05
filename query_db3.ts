import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env" });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  const { data: q, error: e2 } = await supabase.from("hackathon_pre_questionnaires").select("*").limit(1);
  console.log("Questionnaire schema:", q ? Object.keys(q[0] || {}) : null, e2?.message);
}

main().catch(console.error);
