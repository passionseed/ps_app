# Viability Agent Plan (Track B)

## Overview

The Viability Agent is designed as an Apify Actor that gathers real-world data about a specific career or job title to calculate its "Viability Score" (demand, salary, automation risk, required skills).

Currently, the agent is implemented as a mock that returns randomized, structured JSON data.

## Location

The code is located in the mono-repo at: `apps/viability-agent/`

## How it Works

1.  **Input:** The agent expects an input parameter `jobTitle` (e.g., `{"jobTitle": "Data Scientist"}`).
2.  **Processing:**
    - (Future State): It will use `crawlee` to scrape job boards like LinkedIn or Seek to determine posting volume and median salaries.
    - (Future State): It will query an LLM or Exa/Perplexity to determine automation risk and synthesize required skills/degrees.
    - (Current State): It generates a realistic-looking mock JSON object.
3.  **Output:** It pushes the structured data to the Apify default dataset via `Actor.pushData()`.

## Next Steps for Full Implementation

To move this out of the mock phase, the following needs to happen:

1.  **Job Board Scraper Integration:** Write the Crawlee logic in `src/main.js` to actually fetch and parse job listings for the given title.
2.  **LLM Integration (Optional but recommended):** Add a lightweight call to OpenAI/Anthropic to classify "demand_trend" based on the raw scraping numbers.
3.  **Supabase Integration (The Pipeline):**
    - Create a Supabase Edge Function that acts as a webhook receiver.
    - When the Apify Actor finishes, it should send the resulting JSON to this Edge Function.
    - The Edge Function will then update the `viability_cache` and `jobs` tables in Supabase.

## Running Locally

To test the mock agent locally:

```bash
cd apps/viability-agent
export SUPABASE_URL="https://iikrvgjfkuijcpvdwzvv.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
export NODE_ENV="production"
npm install
npm start
```

_Note: You may need to create an `apify_storage` directory or set up an `apify.json` input file if you want to test specific inputs locally via the Apify CLI._
