import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  const { data: team, error: e1 } = await supabase.from("hackathon_teams").select("*").limit(1);
  console.log("Team:", team, e1);

  const { data: q, error: e2 } = await supabase.from("hackathon_pre_questionnaires").select("*").limit(1);
  console.log("Questionnaire:", q, e2);
}
main().catch(console.error);
