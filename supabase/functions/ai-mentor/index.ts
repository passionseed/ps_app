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

function flag(
  severity: "blocking" | "warning" | "info",
  flagId: string,
  field: string,
  message: string,
  suggestion: string
) {
  return { severity, flag_id: flagId, field, message, suggestion };
}

function checkHypothesis(data: Record<string, unknown>) {
  const flags = [];
  const who = String(data?.who ?? "").trim();
  const willDo = String(data?.will_do ?? "").trim();
  const because = String(data?.because ?? "").trim();
  const measuredBy = String(data?.measured_by ?? "").trim();
  const full = String(data?.full ?? "").trim();

  if (!who || who.length < 3 || who.toLowerCase() === "users") {
    flags.push(
      flag(
        "blocking",
        "vague_who",
        "who",
        "WHO is too vague. 'Users' is not specific.",
        "Name a specific group: 'nurses on night shift', 'parents of toddlers'."
      )
    );
  }

  if (!willDo || willDo.length < 10) {
    flags.push(
      flag(
        "blocking",
        "weak_will_do",
        "will_do",
        "WILL DO is too weak or missing.",
        "Describe an observable action: 'tap the share button', 'complete the form without help'."
      )
    );
  }

  if (/\b(think|feel|believe|like|want|need|prefer)\b/i.test(willDo)) {
    flags.push(
      flag(
        "warning",
        "opinion_in_will_do",
        "will_do",
        "WILL DO contains opinion words.",
        "Replace 'will feel' with 'will tap', 'will skip', 'will return'."
      )
    );
  }

  if (!because || because.length < 10) {
    flags.push(
      flag(
        "blocking",
        "missing_because",
        "because",
        "BECAUSE is missing or too short.",
        "Add evidence from Phase 1 interviews or observations."
      )
    );
  }

  if (!measuredBy || !/\d/.test(measuredBy)) {
    flags.push(
      flag(
        "warning",
        "no_number",
        "measured_by",
        "MEASURED BY lacks a number.",
        "Add a threshold: '3 of 5 testers', '< 30 seconds', '80% completion'."
      )
    );
  }

  if (full && full.length < 40) {
    flags.push(
      flag(
        "warning",
        "short_hypothesis",
        "full",
        "Full hypothesis is very short.",
        "Expand each part with specific detail."
      )
    );
  }

  return flags;
}

function checkPretotype(data: Record<string, unknown>) {
  const flags = [];
  const method = String(data?.method ?? "").trim();
  const variable = String(data?.variable_changed ?? "").trim();
  const description = String(data?.description ?? "").trim();

  if (!method) {
    flags.push(
      flag(
        "blocking",
        "no_method",
        "method",
        "No pretotype method selected.",
        "Pick the fastest method: video prototype, one-pager, facade, or demo."
      )
    );
  }

  if (!variable || variable.length < 5) {
    flags.push(
      flag(
        "blocking",
        "no_variable",
        "variable_changed",
        "Variable not declared.",
        "State the ONE thing you changed from the last cycle."
      )
    );
  }

  if (variable && /\band\b/i.test(variable) && !/\bone\b/i.test(variable)) {
    flags.push(
      flag(
        "warning",
        "multiple_variables",
        "variable_changed",
        "Variable may contain multiple changes.",
        "Change only ONE variable per cycle. Otherwise you can't learn what worked."
      )
    );
  }

  if (!description || description.length < 20) {
    flags.push(
      flag(
        "warning",
        "weak_description",
        "description",
        "Test description is too short.",
        "Describe exactly how the tester will interact with your pretotype."
      )
    );
  }

  return flags;
}

function checkTestSession(data: Record<string, unknown>) {
  const flags = [];
  const behaviorLog = Array.isArray(data?.behavior_log)
    ? data.behavior_log
    : [];
  const painfulDetail = String(data?.painful_detail ?? "").trim();
  const result = String(data?.session_result ?? "").trim();

  const hasBehavior = behaviorLog.some(
    (entry: any) =>
      entry && String(entry.action ?? "").trim().length > 0
  );

  if (!hasBehavior) {
    flags.push(
      flag(
        "blocking",
        "no_behavior_log",
        "behavior_log",
        "No behavioral observations logged.",
        "Record what the user DID, not what they said."
      )
    );
  }

  const opinionWords = ["think", "feel", "like", "prefer", "want", "believe"];
  const joinedActions = behaviorLog
    .map((entry: any) => String(entry?.action ?? ""))
    .join(" ");
  const foundOpinions = opinionWords.filter((word) =>
    new RegExp(`\\b${word}\\b`, "i").test(joinedActions)
  );

  if (foundOpinions.length > 0) {
    flags.push(
      flag(
        "warning",
        "opinion_in_behavior",
        "behavior_log",
        `Behavior log contains opinion words: ${foundOpinions.join(", ")}`,
        "Replace with observable actions: 'tapped', 'scrolled', 'paused', 'sighed'."
      )
    );
  }

  if (!painfulDetail || painfulDetail.length < 10) {
    flags.push(
      flag(
        "warning",
        "no_painful_detail",
        "painful_detail",
        "Missing painful detail or surprise.",
        "What surprised you? What contradicted your expectation?"
      )
    );
  }

  if (!result) {
    flags.push(
      flag(
        "blocking",
        "no_result",
        "session_result",
        "No hypothesis result selected.",
        "Did the hypothesis pass, fail, or is it unclear?"
      )
    );
  }

  return flags;
}

function checkSynthesis(data: Record<string, unknown>) {
  const flags = [];
  const whatChanged = String(data?.what_changed ?? "").trim();
  const gateDecision = String(data?.gate_decision ?? "").trim();

  if (!whatChanged || whatChanged.length < 10) {
    flags.push(
      flag(
        "blocking",
        "weak_synthesis",
        "what_changed",
        "Synthesis is too shallow.",
        "Explain exactly what this cycle revealed about your assumptions."
      )
    );
  }

  if (/\b(we learned a lot|it was interesting|users liked it)\b/i.test(whatChanged)) {
    flags.push(
      flag(
        "warning",
        "vague_synthesis",
        "what_changed",
        "Synthesis uses vague praise instead of specific learning.",
        "Replace 'users liked it' with '3 of 5 testers skipped the onboarding'."
      )
    );
  }

  if (!gateDecision) {
    flags.push(
      flag(
        "blocking",
        "no_gate",
        "gate_decision",
        "No gate decision selected.",
        "Choose: Refine (new cycle), Proceed (to video), or Kill (exit)."
      )
    );
  }

  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const stepType = String(body?.step_type ?? "").trim();
    const submissionData = body?.submission_data ?? {};

    if (!stepType) {
      return json({ error: "step_type is required" }, 400);
    }

    let flags = [];
    let response = "";

    switch (stepType) {
      case "hypothesis":
        flags = checkHypothesis(submissionData);
        response = flags.length === 0
          ? "Strong hypothesis! Move on to pretotyping."
          : "Fix the flagged issues before moving on.";
        break;
      case "pretotype":
        flags = checkPretotype(submissionData);
        response = flags.length === 0
          ? "Pretotype looks good. Go test with real users!"
          : "Address the flags before testing.";
        break;
      case "test_session":
        flags = checkTestSession(submissionData);
        response = flags.length === 0
          ? "Solid test session. Keep going or synthesize."
          : "Strengthen your behavioral evidence.";
        break;
      case "synthesis":
        flags = checkSynthesis(submissionData);
        response = flags.length === 0
          ? "Honest synthesis. Make your gate decision."
          : "Dig deeper before deciding.";
        break;
      default:
        return json({ error: `Unknown step_type: ${stepType}` }, 400);
    }

    return json({
      flags,
      response,
      linked_module: flags.length > 0 ? "pretotyping-module" : undefined,
    });
  } catch (err) {
    return json({ error: String(err?.message ?? err) }, 500);
  }
});
