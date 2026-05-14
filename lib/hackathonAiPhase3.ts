import type { AICoachResponse } from "../types/hackathon-phase3";
import { getSupabaseRuntimeConfig } from "./runtime-config";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseRuntimeConfig();
const DEFAULT_SUPABASE_URL = "https://iikrvgjfkuijcpvdwzvv.supabase.co";

export async function requestAIMentorFeedback(params: {
  step_type: string;
  submission_data: Record<string, unknown>;
}): Promise<AICoachResponse> {
  try {
    const response = await fetch((SUPABASE_URL || DEFAULT_SUPABASE_URL) + "/functions/v1/ai-mentor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("requestAIMentorFeedback error:", response.status, errorText);
      return {
        flags: [
          {
            severity: "warning",
            flag_id: "ai_error",
            field: "general",
            message: "AI coach temporarily unavailable.",
            suggestion: "Continue with your submission. A mentor will review manually.",
          },
        ],
        response: "AI coach is offline. Proceed with confidence.",
      };
    }

    const data = await response.json();
    return (data ?? {
      flags: [],
      response: "",
    }) as AICoachResponse;
  } catch (err) {
    console.error("requestAIMentorFeedback exception", err);
    return {
      flags: [
        {
          severity: "warning",
          flag_id: "ai_error",
          field: "general",
          message: "AI coach temporarily unavailable.",
          suggestion: "Continue with your submission. A mentor will review manually.",
        },
      ],
      response: "AI coach is offline. Proceed with confidence.",
    };
  }
}
