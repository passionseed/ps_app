// @ts-nocheck
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS,
    },
  });
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreSpecificity(problemStatement: string) {
  let score = 30;
  if (problemStatement.length >= 60) score += 20;
  if (/\b(nurse|doctor|patient|clinic|hospital|caregiver)\b/i.test(problemStatement)) score += 15;
  if (/\b(delay|waste|error|manual|handoff|screening|triage|follow-up)\b/i.test(problemStatement)) score += 15;
  if (/\b(sometimes|many people|everyone|all users)\b/i.test(problemStatement)) score -= 10;
  return clamp(score);
}

function scoreEvidence(evidenceBullets: string[]) {
  let score = evidenceBullets.length >= 3 ? 65 : 30 + evidenceBullets.length * 10;
  const joined = evidenceBullets.join(" ");
  if (/\b(interview|observed|hours|minutes|daily|weekly|patients|nurses)\b/i.test(joined)) {
    score += 20;
  }
  return clamp(score);
}

function scoreSeverity(problemStatement: string, evidenceBullets: string[]) {
  let score = 35;
  const combined = `${problemStatement} ${evidenceBullets.join(" ")}`;
  if (/\b(delay|burnout|risk|harm|missed|repeat|duplicate|drop[- ]?off)\b/i.test(combined)) {
    score += 25;
  }
  if (/\bminutes|hours|daily|every shift|every day|weekly\b/i.test(combined)) {
    score += 20;
  }
  return clamp(score);
}

function scoreClarity(problemStatement: string, customer: string) {
  let score = 40;
  if (problemStatement.endsWith(".")) score += 5;
  if (customer.length >= 10) score += 20;
  if (!/\b(and|or)\b/i.test(customer)) score += 10;
  if (problemStatement.length <= 180) score += 10;
  return clamp(score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const problemStatement = String(body?.problemStatement ?? "").trim();
    const customer = String(body?.customer ?? "").trim();
    const evidenceBullets = Array.isArray(body?.evidenceBullets)
      ? body.evidenceBullets.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (!problemStatement || !customer) {
      return json({ error: "problemStatement and customer are required" }, 400);
    }

    const specificityScore = scoreSpecificity(problemStatement);
    const evidenceScore = scoreEvidence(evidenceBullets);
    const severityScore = scoreSeverity(problemStatement, evidenceBullets);
    const clarityScore = scoreClarity(problemStatement, customer);

    const average =
      (specificityScore + evidenceScore + severityScore + clarityScore) / 4;
    const verdict = average >= 70 ? "pass" : "revise";
    const revisionNotes: string[] = [];

    if (specificityScore < 70) {
      revisionNotes.push(
        "Name a narrower healthcare user and the exact workflow moment where the pain happens.",
      );
    }
    if (evidenceScore < 70) {
      revisionNotes.push(
        "Add more concrete interview evidence, observations, or counts that prove this pain is real.",
      );
    }
    if (severityScore < 70) {
      revisionNotes.push(
        "Explain the cost of the problem in time, risk, money, or patient experience.",
      );
    }
    if (clarityScore < 70) {
      revisionNotes.push(
        "Rewrite the statement so the customer, pain, and context are obvious in one sentence.",
      );
    }

    return json({
      specificityScore,
      evidenceScore,
      severityScore,
      clarityScore,
      verdict,
      revisionNotes,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
