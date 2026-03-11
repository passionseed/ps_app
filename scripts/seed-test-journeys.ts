// scripts/seed-test-journeys.ts
// Run: npx tsx scripts/seed-test-journeys.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function seed() {
  // Get a real user ID from profiles
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .single();

  if (profileErr || !profile) {
    console.error("No user found. Sign in first via the app.");
    process.exit(1);
  }

  // Get some real TCAS programs
  const { data: programs, error: progErr } = await supabase
    .from("tcas_programs")
    .select("id, university_id, faculty_name, program_name, program_id")
    .limit(3);

  if (progErr || !programs || programs.length === 0) {
    console.error("No TCAS programs found. Run scrapers first.");
    process.exit(1);
  }

  const journeys = [
    {
      student_id: profile.id,
      title: "แผน A: สายออกแบบ",
      career_goal: "UX Designer",
      source: "manual",
      steps: [
        {
          type: "university",
          tcas_program_id: programs[0]?.program_id ?? null,
          label: programs[0]?.program_name ?? "Program",
          details: {
            university_name: programs[0]?.university_id ?? "University",
            faculty_name: programs[0]?.faculty_name ?? "Faculty",
          },
        },
        {
          type: "internship",
          tcas_program_id: null,
          label: "UX Intern",
          details: { company_type: "Tech", salary_range: "15,000-20,000" },
        },
        {
          type: "job",
          tcas_program_id: null,
          label: "UX Designer",
          details: { company_type: "Tech", salary_range: "45,000-65,000" },
        },
      ],
      scores: { passion: 85, future: 70, world: 60 },
      is_active: true,
    },
  ];

  const { error } = await supabase.from("student_journeys").insert(journeys);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  } else {
    console.log(`Seeded ${journeys.length} test journey(s) for user ${profile.id}`);
  }
}

seed();
