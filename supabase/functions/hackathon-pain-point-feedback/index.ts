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

    const style = String(body?.style ?? "").trim();

    const noteBank = {
      specificity: {
        default: "Name a narrower healthcare user and the exact workflow moment where the pain happens.",
        concise: "Narrow the user segment and pinpoint the workflow moment.",
        kind: "You're on the right track — try zooming in on a specific user and the exact moment the pain hits.",
        actionable: "Pick one user role (e.g. triage nurse) and one workflow step (e.g. insurance pre-auth). Rewrite the statement around that pair.",
      },
      evidence: {
        default: "Add more concrete interview evidence, observations, or counts that prove this pain is real.",
        concise: "Add specific interview quotes or observed counts.",
        kind: "Great start on evidence — a few more concrete observations or numbers would really strengthen this.",
        actionable: "List 3 interview moments with who, what happened, and a number (time lost, frequency, patients affected).",
      },
      severity: {
        default: "Explain the cost of the problem in time, risk, money, or patient experience.",
        concise: "Quantify the cost: time, money, or risk.",
        kind: "The severity is implied but not yet explicit — try putting a number on the impact so reviewers feel the urgency.",
        actionable: "Add one sentence: 'This costs [who] [amount of time/money/risk] per [time period].'",
      },
      clarity: {
        default: "Rewrite the statement so the customer, pain, and context are obvious in one sentence.",
        concise: "One sentence: who, what pain, where.",
        kind: "Almost there — try condensing into a single sentence that a stranger could understand without context.",
        actionable: "Use this template: '[Customer] struggles with [pain] during [context], causing [consequence].'",
      },
    };

    function pickNote(dimension: keyof typeof noteBank) {
      if (style === "all") {
        return `${noteBank[dimension].concise} ${noteBank[dimension].kind} ${noteBank[dimension].actionable}`;
      }
      if (style === "concise" || style === "kind" || style === "actionable") {
        return noteBank[dimension][style];
      }
      return noteBank[dimension].default;
    }

    const revisionNotes: string[] = [];
    if (specificityScore < 70) revisionNotes.push(pickNote("specificity"));
    if (evidenceScore < 70) revisionNotes.push(pickNote("evidence"));
    if (severityScore < 70) revisionNotes.push(pickNote("severity"));
    if (clarityScore < 70) revisionNotes.push(pickNote("clarity"));

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
