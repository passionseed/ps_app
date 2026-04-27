import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("hackathon_phase_activities")
    .select("content_type, content_body")
    .eq("content_type", "chat_comic")
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
