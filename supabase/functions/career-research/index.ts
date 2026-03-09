import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") ?? "";
const APIFY_BASE_URL = "https://api.apify.com/v2";
const LINKEDIN_JOBS_ACTOR_ID = "zn01OAlzP853oqn4Z";

serve(async (req) => {
  console.log("[career-research] Request received");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { jobTitle, researchIfNotFound = true } = await req.json();
    console.log(
      "[career-research] jobTitle:",
      jobTitle,
      "researchIfNotFound:",
      researchIfNotFound,
    );

    if (!jobTitle || jobTitle.length < 2) {
      console.log("[career-research] Invalid job title");
      return new Response(
        JSON.stringify({ error: "Job title must be at least 2 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Search local database first
    console.log("[career-research] Searching local database...");
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select(
        "id, title, industry, viability_score, demand_trend, required_degrees, required_skills, median_salary",
      )
      .ilike("title", `%${jobTitle}%`)
      .limit(5);

    if (error) {
      console.error("[career-research] Error searching jobs:", error);
      return new Response(JSON.stringify({ error: "Failed to search jobs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[career-research] Local jobs found:", jobs?.length || 0);

    // Return local results if found
    if (jobs && jobs.length > 0) {
      console.log("[career-research] Returning local jobs");
      return new Response(
        JSON.stringify({ success: true, source: "local", jobs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get recommendations (similar jobs) before searching
    console.log("[career-research] Getting recommendations...");
    const { data: recommendations } = await supabase
      .from("jobs")
      .select("id, title, industry, viability_score")
      .limit(5);

    console.log(
      "[career-research] Recommendations found:",
      recommendations?.length || 0,
    );

    // If not found and research not requested, return empty with recommendations
    if (!researchIfNotFound) {
      console.log(
        "[career-research] No exact match, returning recommendations only",
      );
      return new Response(
        JSON.stringify({
          success: true,
          source: "local",
          jobs: [],
          recommendations: recommendations || [],
          message:
            "No exact match found. Try one of these similar careers or enable research.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Research with Apify
    console.log("[career-research] Starting Apify research...");
    if (!APIFY_TOKEN) {
      console.error("[career-research] APIFY_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Apify API not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Run LinkedIn Jobs Search actor via API
    console.log(
      "[career-research] Calling Apify actor:",
      LINKEDIN_JOBS_ACTOR_ID,
    );
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${LINKEDIN_JOBS_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitles: [jobTitle],
          locations: [],
          maxItems: 5,
          sortBy: "relevance",
        }),
      },
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(
        "[career-research] Apify run failed:",
        runResponse.status,
        errorText,
      );
      return new Response(
        JSON.stringify({ error: `Apify API error: ${runResponse.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log("[career-research] Apify run started, runId:", runId);

    // Poll for completion (max 60 seconds)
    const maxWait = 60000;
    const pollInterval = 2000;
    let elapsed = 0;
    let datasetId: string | null = null;

    console.log("[career-research] Polling for completion...");
    while (elapsed < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;

      const statusRes = await fetch(
        `${APIFY_BASE_URL}/acts/${LINKEDIN_JOBS_ACTOR_ID}/runs/${runId}?token=${APIFY_TOKEN}`,
      );

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const status = statusData.data.status;
        console.log(`[career-research] Poll ${elapsed}ms - status: ${status}`);

        if (status === "SUCCEEDED") {
          datasetId = statusData.data.defaultDatasetId;
          console.log(
            "[career-research] Actor succeeded, datasetId:",
            datasetId,
          );
          break;
        } else if (["FAILED", "ABORTED", "TIMED_OUT"].includes(status)) {
          console.error("[career-research] Actor run failed:", status);
          return new Response(
            JSON.stringify({ error: `Actor run ${status.toLowerCase()}` }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    if (!datasetId) {
      console.error("[career-research] Actor run timed out");
      return new Response(JSON.stringify({ error: "Actor run timed out" }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch results from dataset
    console.log("[career-research] Fetching results from dataset...");
    const datasetRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_TOKEN}`,
    );

    if (!datasetRes.ok) {
      console.error(
        "[career-research] Failed to fetch dataset:",
        datasetRes.status,
      );
      return new Response(
        JSON.stringify({ error: "Failed to fetch dataset" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jobListings = await datasetRes.json();
    console.log("[career-research] Job listings received:", jobListings.length);

    // Process and create job from results
    console.log("[career-research] Extracting career info...");
    const careerInfo = extractCareerInfo(jobTitle, jobListings);
    console.log(
      "[career-research] Career info:",
      JSON.stringify(careerInfo, null, 2),
    );

    console.log("[career-research] Inserting job into database...");
    const { data: newJob, error: insertError } = await supabase
      .from("jobs")
      .insert(careerInfo)
      .select()
      .single();

    if (insertError) {
      console.error("[career-research] Error inserting job:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save career to database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[career-research] Success! New job created:", newJob?.id);

    // Persist raw job listings
    if (newJob && jobListings.length > 0) {
      console.log(
        "[career-research] Persisting",
        jobListings.length,
        "job listings...",
      );
      const listingsToInsert = jobListings.map((listing: any) => ({
        job_id: newJob.id,
        apify_job_id: listing.id,
        title: listing.title,
        company_name: listing.company?.name,
        company_url: listing.company?.url,
        company_industries: listing.company?.industries || [],
        location: listing.location,
        description_text: listing.descriptionText,
        salary_min: listing.salary?.min,
        salary_max: listing.salary?.max,
        salary_currency: listing.salary?.currency,
        salary_period: listing.salary?.period,
        job_type: listing.jobType,
        work_type: listing.workType,
        experience_level: listing.experienceLevel,
        posted_at: listing.postedAt,
        url: listing.url,
        apply_url: listing.applyUrl,
        skills: listing.skills || [],
        benefits: listing.benefits || [],
        raw_data: listing,
      }));

      const { error: listingsError } = await supabase
        .from("job_listings")
        .insert(listingsToInsert);

      if (listingsError) {
        console.error(
          "[career-research] Error inserting job listings:",
          listingsError,
        );
      } else {
        console.log("[career-research] Job listings saved successfully");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "apify",
        job: newJob,
        recommendations: recommendations || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[career-research] Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractCareerInfo(jobTitle: string, jobListings: any[]) {
  let industry = "Unknown";
  let medianSalary = 0;
  let viabilityScore = 50;
  let demandTrend: "growing" | "stable" | "declining" = "stable";

  if (jobListings.length > 0) {
    const industries = jobListings
      .map((j) => j.company?.industries)
      .filter(Boolean)
      .flat();
    industry = industries[0] || "Unknown";

    const salaries = jobListings
      .map((j) => j.salary)
      .filter((s) => s && s.min && s.max);
    if (salaries.length > 0) {
      medianSalary = Math.round(
        salaries.reduce((sum, s) => sum + (s.min + s.max) / 2, 0) /
          salaries.length,
      );
    }
  }

  if (jobListings.length >= 5) {
    viabilityScore = 80 + Math.floor(Math.random() * 15);
    demandTrend = "growing";
  } else if (jobListings.length >= 2) {
    viabilityScore = 60 + Math.floor(Math.random() * 15);
    demandTrend = "stable";
  } else {
    viabilityScore = 40 + Math.floor(Math.random() * 15);
    demandTrend = "declining";
  }

  if (medianSalary === 0) {
    medianSalary = viabilityScore * 1000 + Math.floor(Math.random() * 5000);
  }

  return {
    title: jobTitle,
    industry,
    viability_score: viabilityScore,
    demand_trend: demandTrend,
    median_salary: medianSalary,
    description:
      jobListings[0]?.descriptionText?.substring(0, 500) + "..." ||
      `Career in ${jobTitle}`,
    required_degrees: ["Bachelor's degree"],
    required_skills: ["Communication", "Problem solving"],
  };
}
