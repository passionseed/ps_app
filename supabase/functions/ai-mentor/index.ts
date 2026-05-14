// @ts-nocheck
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS
    }
  });
}
function flag(severity, flagId, field, message, suggestion) {
  return {
    severity,
    flag_id: flagId,
    field,
    message,
    suggestion
  };
}
function detectLanguage(text) {
  const thaiChars = /[\u0E00-\u0E7F]/;
  const thaiCount = (text.match(new RegExp(thaiChars, "g")) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  if (totalChars === 0) return "en";
  return thaiCount / totalChars > 0.3 ? "th" : "en";
}
function buildHypothesisGradingPrompt(who, willDo, because, measuredBy, full, lang) {
  const isThai = lang === "th";
  const thaiPrompt = "คุณเป็นโค้ชการวิจัยที่เชี่ยวชาญในการทดสอบสมมติฐานสำหรับผู้ประกอบการสุขภาพ (healthcare startup)\n\nนักศึกษาได้เขียน hypothesis ดังนี้:\n\nWHO: " + who + "\nWILL DO: " + willDo + "\nBECAUSE: " + because + "\nMEASURED BY: " + measuredBy + "\n\nฉบับเต็ม: " + full + "\n\nกรุณาให้คะแนนคุณภาพของ hypothesis นี้ (0-100) โดยประเมินตามเกณฑ์ต่อไปนี้:\n\n1. **ความเฉพาะเจาะจงของ WHO (25%)** - ระบุกลุ่มผู้ใช้ที่เฉพาะเจาะจง ไม่ใช่ \"users\" ทั่วไป\n2. **ความสังเกตได้ของ WILL DO (25%)** - เป็นการกระทำที่สังเกตได้ ไม่ใช่ความคิด/ความรู้สึก\n3. **ความมีหลักฐานของ BECAUSE (25%)** - อ้างอิงหลักฐานจากการสัมภาษณ์หรือการสังเกตจริง\n4. **ความวัดผลได้ของ MEASURED BY (25%)** - มีเกณฑ์เฉพาะ มีตัวเลข สามารถวัดผลได้จริง\n\n**กฎสำคัญ:**\n- response: สรุปสั้น 1 ประโยค ตรงประเด็น ไม่เกิน 15 คำ\n- flags: ข้อความสั้น ตรงไปตรงมา บอกว่าต้องแก้อะไรยังไง ไม่ต้องอธิบายเหตุผลยาว\n- suggestion: บอกคำสั่งตรงๆ เช่น \"เปลี่ยน X เป็น Y\" ไม่ใช่ \"ควรพิจารณา...\"\n\nตอบกลับในรูปแบบ JSON:\n{\n  \"score\": number (0-100),\n  \"breakdown\": {\n    \"who\": number (0-25),\n    \"will_do\": number (0-25),\n    \"because\": number (0-25),\n    \"measured_by\": number (0-25)\n  },\n  \"flags\": [\n    {\n      \"severity\": \"blocking\" | \"warning\" | \"info\",\n      \"field\": \"who\" | \"will_do\" | \"because\" | \"measured_by\",\n      \"message\": \"ปัญหาสั้น ตรงไปตรงมา\",\n      \"suggestion\": \"คำสั่งแก้ไขตรงๆ\"\n    }\n  ],\n  \"response\": \"สรุปสั้น 1 ประโยค\"\n}";
  const enPrompt = "You are a research coach specializing in hypothesis testing for healthcare startups.\n\nThe student wrote this hypothesis:\n\nWHO: " + who + "\nWILL DO: " + willDo + "\nBECAUSE: " + because + "\nMEASURED BY: " + measuredBy + "\n\nFull: " + full + "\n\nPlease grade the quality of this hypothesis (0-100) using these criteria:\n\n1. **WHO Specificity (25%)** - Names a specific user group, not \"users\" in general\n2. **WILL DO Observability (25%)** - Is an observable action, not a thought/feeling\n3. **BECAUSE Evidence (25%)** - References real evidence from interviews or observations\n4. **MEASURED BY Measurability (25%)** - Has a specific threshold with numbers, can actually be measured\n\n**IMPORTANT RULES:**\n- response: Keep it to 1 short sentence, max 15 words. Punchy and direct.\n- flags: Short and actionable. State the problem and fix directly. No fluff.\n- suggestion: Use imperative commands like \"Replace X with Y\" not \"Consider...\" or \"You might want to...\"\n\nRespond in this JSON format:\n{\n  \"score\": number (0-100),\n  \"breakdown\": {\n    \"who\": number (0-25),\n    \"will_do\": number (0-25),\n    \"because\": number (0-25),\n    \"measured_by\": number (0-25)\n  },\n  \"flags\": [\n    {\n      \"severity\": \"blocking\" | \"warning\" | \"info\",\n      \"field\": \"who\" | \"will_do\" | \"because\" | \"measured_by\",\n      \"message\": \"Short, direct problem statement\",\n      \"suggestion\": \"Direct imperative fix\"\n    }\n  ],\n  \"response\": \"One short punchy sentence\"\n}";
  return isThai ? thaiPrompt : enPrompt;
}
async function gradeHypothesisWithLLM(who, willDo, because, measuredBy, full) {
  if (!DEEPSEEK_API_KEY) {
    return { score: null, flags: [], response: "AI grader not configured." };
  }

  const lang = detectLanguage(full || who || willDo || because || measuredBy);
  const prompt = buildHypothesisGradingPrompt(who, willDo, because, measuredBy, full, lang);
  const response = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + DEEPSEEK_API_KEY
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });
  if (!response.ok) {
    const errorText = await response.text().catch(()=>"");
    console.error("[ai-mentor] DeepSeek API error: status=" + response.status + " body=" + errorText);
    return {
      score: null,
      flags: [flag("warning", "deepseek_api_error", "general", "DeepSeek API returned " + response.status, errorText.substring(0, 200))],
      response: "AI grading failed (status " + response.status + "). Using rule-based checks only."
    };
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[ai-mentor] No JSON found in DeepSeek response, content preview:", content.substring(0, 200));
    return {
      score: null,
      flags: [],
      response: "AI grading failed. Using rule-based checks only."
    };
  }
  try {
    const result = JSON.parse(jsonMatch[0]);
    return {
      score: result.score ?? null,
      breakdown: result.breakdown ?? null,
      flags: (result.flags ?? []).map((f)=>flag(f.severity, f.field + "_ai", f.field, f.message, f.suggestion)),
      response: result.response ?? ""
    };
  } catch (e) {
    console.error("[ai-mentor] Failed to parse DeepSeek response:", String(e));
    return {
      score: null,
      flags: [],
      response: "AI grading failed. Using rule-based checks only."
    };
  }
}

function gradeHypothesisWithRules(who, willDo, because, measuredBy, full, flags) {
  let whoScore = 25;
  let willDoScore = 25;
  let becauseScore = 25;
  let measuredByScore = 25;

  for (const f of flags) {
    switch (f.flag_id) {
      case "vague_who":
        whoScore = Math.max(0, whoScore - 25);
        break;
      case "weak_will_do":
        willDoScore = Math.max(0, willDoScore - 25);
        break;
      case "opinion_in_will_do":
        willDoScore = Math.max(0, willDoScore - 15);
        break;
      case "missing_because":
        becauseScore = Math.max(0, becauseScore - 25);
        break;
      case "no_number":
        measuredByScore = Math.max(0, measuredByScore - 15);
        break;
      case "short_hypothesis":
        whoScore = Math.max(0, whoScore - 5);
        willDoScore = Math.max(0, willDoScore - 5);
        becauseScore = Math.max(0, becauseScore - 5);
        measuredByScore = Math.max(0, measuredByScore - 5);
        break;
    }
  }

  const totalScore = whoScore + willDoScore + becauseScore + measuredByScore;

  let response = "";
  if (totalScore >= 90) {
    response = "Excellent hypothesis! Strong specificity, clear action, evidence-based, and measurable. Move on to pretotyping.";
  } else if (totalScore >= 75) {
    response = "Good hypothesis with solid structure. Minor improvements possible. Proceed to pretotyping.";
  } else if (totalScore >= 60) {
    response = "Decent hypothesis but needs refinement in flagged areas before testing.";
  } else if (totalScore >= 40) {
    response = "Weak hypothesis. Address the blocking issues to make it testable.";
  } else {
    response = "Hypothesis needs significant work. Follow the suggestions to rebuild it.";
  }

  return {
    score: totalScore,
    breakdown: {
      who: whoScore,
      will_do: willDoScore,
      because: becauseScore,
      measured_by: measuredByScore
    },
    flags: [],
    response
  };
}
function checkHypothesis(data) {
  const flags = [];
  const who = String(data?.who ?? "").trim();
  const willDo = String(data?.will_do ?? "").trim();
  const because = String(data?.because ?? "").trim();
  const measuredBy = String(data?.measured_by ?? "").trim();
  const full = String(data?.full ?? "").trim();
  if (!who || who.length < 3 || who.toLowerCase() === "users") {
    flags.push(flag("blocking", "vague_who", "who", "WHO is too vague. 'Users' is not specific.", "Name a specific group: 'nurses on night shift', 'parents of toddlers'."));
  }
  if (!willDo || willDo.length < 10) {
    flags.push(flag("blocking", "weak_will_do", "will_do", "WILL DO is too weak or missing.", "Describe an observable action: 'tap the share button', 'complete the form without help'."));
  }
  if (/\b(think|feel|believe|like|want|need|prefer)\b/i.test(willDo)) {
    flags.push(flag("warning", "opinion_in_will_do", "will_do", "WILL DO contains opinion words.", "Replace 'will feel' with 'will tap', 'will skip', 'will return'."));
  }
  if (!because || because.length < 10) {
    flags.push(flag("blocking", "missing_because", "because", "BECAUSE is missing or too short.", "Add evidence from Phase 1 interviews or observations."));
  }
  if (!measuredBy || !/\d/.test(measuredBy)) {
    flags.push(flag("warning", "no_number", "measured_by", "MEASURED BY lacks a number.", "Add a threshold: '3 of 5 testers', '< 30 seconds', '80% completion'."));
  }
  if (full && full.length < 40) {
    flags.push(flag("warning", "short_hypothesis", "full", "Full hypothesis is very short.", "Expand each part with specific detail."));
  }
  return {
    flags,
    who,
    willDo,
    because,
    measuredBy,
    full
  };
}
function checkPretotype(data) {
  const flags = [];
  const method = String(data?.method ?? "").trim();
  const variable = String(data?.variable_changed ?? "").trim();
  const description = String(data?.description ?? "").trim();
  if (!method) {
    flags.push(flag("blocking", "no_method", "method", "No pretotype method selected.", "Pick the fastest method: video prototype, one-pager, facade, or demo."));
  }
  if (!variable || variable.length < 5) {
    flags.push(flag("blocking", "no_variable", "variable_changed", "Variable not declared.", "State the ONE thing you changed from the last cycle."));
  }
  if (variable && /\band\b/i.test(variable) && !/\bone\b/i.test(variable)) {
    flags.push(flag("warning", "multiple_variables", "variable_changed", "Variable may contain multiple changes.", "Change only ONE variable per cycle. Otherwise you can't learn what worked."));
  }
  if (!description || description.length < 20) {
    flags.push(flag("warning", "weak_description", "description", "Test description is too short.", "Describe exactly how the tester will interact with your pretotype."));
  }
  return flags;
}
function checkTestSession(data) {
  const flags = [];
  const behaviorLog = Array.isArray(data?.behavior_log) ? data.behavior_log : [];
  const painfulDetail = String(data?.painful_detail ?? "").trim();
  const result = String(data?.session_result ?? "").trim();
  const hasBehavior = behaviorLog.some((entry)=>entry && String(entry.action ?? "").trim().length > 0);
  if (!hasBehavior) {
    flags.push(flag("blocking", "no_behavior_log", "behavior_log", "No behavioral observations logged.", "Record what the user DID, not what they said."));
  }
  const opinionWords = [
    "think",
    "feel",
    "like",
    "prefer",
    "want",
    "believe"
  ];
  const joinedActions = behaviorLog.map((entry)=>String(entry?.action ?? "")).join(" ");
  const foundOpinions = opinionWords.filter((word)=>new RegExp("\\b" + word + "\\b", "i").test(joinedActions));
  if (foundOpinions.length > 0) {
    flags.push(flag("warning", "opinion_in_behavior", "behavior_log", "Behavior log contains opinion words: " + foundOpinions.join(", "), "Replace with observable actions: 'tapped', 'scrolled', 'paused', 'sighed'."));
  }
  if (!painfulDetail || painfulDetail.length < 10) {
    flags.push(flag("warning", "no_painful_detail", "painful_detail", "Missing painful detail or surprise.", "What surprised you? What contradicted your expectation?"));
  }
  if (!result) {
    flags.push(flag("blocking", "no_result", "session_result", "No hypothesis result selected.", "Did the hypothesis pass, fail, or is it unclear?"));
  }
  return flags;
}
function checkSynthesis(data) {
  const flags = [];
  const whatChanged = String(data?.what_changed ?? "").trim();
  const gateDecision = String(data?.gate_decision ?? "").trim();
  if (!whatChanged || whatChanged.length < 10) {
    flags.push(flag("blocking", "weak_synthesis", "what_changed", "Synthesis is too shallow.", "Explain exactly what this cycle revealed about your assumptions."));
  }
  if (/\b(we learned a lot|it was interesting|users liked it)\b/i.test(whatChanged)) {
    flags.push(flag("warning", "vague_synthesis", "what_changed", "Synthesis uses vague praise instead of specific learning.", "Replace 'users liked it' with '3 of 5 testers skipped the onboarding'."));
  }
  if (!gateDecision) {
    flags.push(flag("blocking", "no_gate", "gate_decision", "No gate decision selected.", "Choose: Refine (new cycle), Proceed (to video), or Kill (exit)."));
  }
  return flags;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS
    });
  }
  try {
    const body = await req.json();
    const stepType = String(body?.step_type ?? "").trim();
    const submissionData = body?.submission_data ?? {};
    const useLLM = body?.use_llm !== false;
    if (!stepType) {
      return json({
        error: "step_type is required"
      }, 400);
    }
    let flags = [];
    let response = "";
    let score = null;
    let breakdown = null;
    switch(stepType){
      case "hypothesis":
        {
          const check = checkHypothesis(submissionData);
          flags = check.flags;
          let llmResult;
          if (useLLM && DEEPSEEK_API_KEY) {
            llmResult = await gradeHypothesisWithLLM(check.who, check.willDo, check.because, check.measuredBy, check.full);
            flags = [...flags, ...llmResult.flags];
            if (llmResult.score === null) {
              llmResult = gradeHypothesisWithRules(check.who, check.willDo, check.because, check.measuredBy, check.full, flags);
            }
          } else {
            llmResult = gradeHypothesisWithRules(check.who, check.willDo, check.because, check.measuredBy, check.full, flags);
          }
          score = llmResult.score;
          breakdown = llmResult.breakdown;
          response = llmResult.response || (flags.length === 0 ? "Strong hypothesis! Move on to pretotyping." : "Fix the flagged issues before moving on.");
          break;
        }
      case "pretotype":
        flags = checkPretotype(submissionData);
        response = flags.length === 0 ? "Pretotype looks good. Go test with real users!" : "Address the flags before testing.";
        break;
      case "test_session":
        flags = checkTestSession(submissionData);
        response = flags.length === 0 ? "Solid test session. Keep going or synthesize." : "Strengthen your behavioral evidence.";
        break;
      case "synthesis":
        flags = checkSynthesis(submissionData);
        response = flags.length === 0 ? "Honest synthesis. Make your gate decision." : "Dig deeper before deciding.";
        break;
      default:
        return json({
          error: "Unknown step_type: " + stepType
        }, 400);
    }
    return json({
      flags,
      response,
      score,
      breakdown,
      linked_module: flags.length > 0 ? "pretotyping-module" : undefined
    });
  } catch (err) {
    return json({
      error: String(err?.message ?? err)
    }, 500);
  }
});
