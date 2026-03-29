export type PainPointFeedbackVerdict = "pass" | "revise";

export interface PainPointFeedbackInput {
  problemStatement: string;
  customer: string;
  evidenceBullets: string[];
}

export interface PainPointFeedbackResult {
  specificityScore: number;
  evidenceScore: number;
  severityScore: number;
  clarityScore: number;
  verdict: PainPointFeedbackVerdict;
  revisionNotes: string[];
}

export function buildPainPointFeedbackInput(params: {
  problemStatement: string;
  customer: string;
  evidenceText: string;
}): PainPointFeedbackInput {
  return {
    problemStatement: params.problemStatement.trim(),
    customer: params.customer.trim(),
    evidenceBullets: params.evidenceText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export function getPainPointFeedbackVerdictLabel(
  verdict: PainPointFeedbackVerdict,
) {
  return verdict === "pass"
    ? "Ready for team refinement"
    : "Needs another iteration";
}

export async function requestPainPointFeedback(
  input: PainPointFeedbackInput,
): Promise<PainPointFeedbackResult> {
  const { supabase } = require("./supabase") as typeof import("./supabase");

  const { data, error } = await supabase.functions.invoke(
    "hackathon-pain-point-feedback",
    {
      body: input,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as PainPointFeedbackResult;
}
