import { supabase } from "./supabase";
import type { AICoachResponse } from "../types/hackathon-phase3";

export async function requestAIMentorFeedback(params: {
  step_type: string;
  submission_data: Record<string, unknown>;
}): Promise<AICoachResponse> {
  const { data, error } = await supabase.functions.invoke("ai-mentor", {
    body: params,
  });

  if (error) {
    console.error("requestAIMentorFeedback error", error);
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

  return (data ?? {
    flags: [],
    response: "",
  }) as AICoachResponse;
}
