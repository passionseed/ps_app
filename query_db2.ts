import { supabase } from "./lib/supabase";

async function main() {
  const { data: team, error: e1 } = await supabase.from("hackathon_teams").select("*").limit(1);
  console.log("Team:", team, e1);

  const { data: q, error: e2 } = await supabase.from("hackathon_pre_questionnaires").select("*").limit(1);
  console.log("Questionnaire:", q, e2);
}

main().catch(console.error);
