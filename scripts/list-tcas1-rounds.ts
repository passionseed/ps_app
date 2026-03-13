// Run: npx tsx scripts/list-tcas1-rounds.ts
import * as dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("tcas_admission_rounds")
    .select(`
      id, program_id, round_number, round_type, project_name, link, description, condition,
      program:tcas_programs(program_name, faculty_name, university:tcas_universities(university_name))
    `)
    .eq("round_number", 1)
    .not("link", "is", null)
    .limit(30);

  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
  console.log(`\nTotal: ${data?.length ?? 0} rounds with links`);
}

main();
