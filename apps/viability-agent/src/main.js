import { Actor } from "apify";
import { CheerioCrawler } from "crawlee";

// Initialize the Apify SDK
await Actor.init();

console.log("Viability Agent (Mock) Started.");

// Get input from the Apify interface
const input = await Actor.getInput();
const jobTitle = input?.jobTitle || "Software Engineer";
const jobId = input?.jobId || "11111111-1111-1111-1111-111111111111";

console.log(`Analyzing viability for job title: ${jobTitle}`);

// MOCK DATA: In a real scenario, we would use Crawlee to scrape LinkedIn/Seek
// and call Exa/Perplexity APIs for degree prerequisites and trends.
const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

const mockOutput = {
  job_id: jobId,
  job_title: jobTitle,
  industry: "Technology",
  posting_volume_30d: Math.floor(Math.random() * 5000) + 500,
  median_salary: Math.floor(Math.random() * 80000) + 60000,
  salary_growth_yoy: 0.05,
  automation_risk: Math.random().toFixed(2), // 0.0 - 1.0
  demand_trend: "growing",
  top_hiring_regions: ["Sydney", "Remote", "London"],
  prerequisite_degrees: ["Computer Science", "Information Technology"],
  required_skills: ["JavaScript", "React", "Problem Solving"],
  source_urls: ["https://mock-linkedin.com/jobs", "https://mock-seek.com"],
  viability_score: Math.floor(Math.random() * 40) + 60, // 60 - 100
  fetched_at: new Date().toISOString(),
};

// Mock sending to Supabase webhook
console.log("Sending data to Supabase webhook...");
if (process.env.NODE_ENV !== "development") {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/viability-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(mockOutput)
    });
    const data = await response.json();
    console.log("Webhook response:", data);
  } catch (error) {
    console.error("Failed to send webhook:", error);
  }
}

// Save the resulting data to the default dataset
await Actor.pushData(mockOutput);

console.log("Data successfully extracted and saved.");

// Exit successfully
await Actor.exit();
