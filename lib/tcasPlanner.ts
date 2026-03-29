import type {
  PlannerDeadlineStatus,
  ProgramPlannerCandidate,
  ProgramPlannerSection,
} from "../types/tcas";

type RankOptions = {
  userGpax?: number | null;
  nowIso?: string;
};

type SectionOptions = {
  userGpax?: number | null;
  isThai: boolean;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function includesEveryToken(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

function countTokenHits(haystack: string, tokens: string[]): number {
  return tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
}

function parseCost(cost: string | null): number | null {
  if (!cost) return null;
  const digits = cost.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSearchCorpus(candidate: ProgramPlannerCandidate): string {
  return normalize(
    [
      candidate.program_name,
      candidate.program_name_en,
      candidate.faculty_name,
      candidate.faculty_name_en,
      candidate.field_name,
      candidate.field_name_en,
      candidate.program_type_name,
      candidate.university_name,
      candidate.university_name_en,
      candidate.description_th,
    ].join(" "),
  );
}

function getDeadlineStatus(
  folioClosedDate: string | null,
  nowIso: string,
): { status: PlannerDeadlineStatus; daysUntilDeadline: number | null } {
  if (!folioClosedDate) {
    return { status: "unknown", daysUntilDeadline: null };
  }

  const now = new Date(nowIso).getTime();
  const deadline = new Date(folioClosedDate).getTime();
  if (Number.isNaN(deadline)) {
    return { status: "unknown", daysUntilDeadline: null };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilDeadline = Math.ceil((deadline - now) / dayMs);
  if (daysUntilDeadline < 0) {
    return { status: "expired", daysUntilDeadline };
  }
  if (daysUntilDeadline <= 14) {
    return { status: "soon", daysUntilDeadline };
  }
  return { status: "open", daysUntilDeadline };
}

function compareCandidates(
  left: ProgramPlannerCandidate,
  right: ProgramPlannerCandidate,
): number {
  if (right.score_breakdown.total !== left.score_breakdown.total) {
    return right.score_breakdown.total - left.score_breakdown.total;
  }

  const leftRound = left.best_round?.round_number ?? Number.MAX_SAFE_INTEGER;
  const rightRound = right.best_round?.round_number ?? Number.MAX_SAFE_INTEGER;
  if (leftRound !== rightRound) {
    return leftRound - rightRound;
  }

  const universityOrder = left.university_id.localeCompare(right.university_id);
  if (universityOrder !== 0) {
    return universityOrder;
  }

  return left.program_name.localeCompare(right.program_name);
}

export function buildPlannerReason(
  candidate: ProgramPlannerCandidate,
  isThai: boolean,
): string {
  const roundNumber = candidate.best_round?.round_number;
  const minGpax = candidate.best_round?.min_gpax;
  const eligible = candidate.best_round?.is_eligible;
  const hasRequirements = candidate.has_requirements;

  if (isThai) {
    const gpaxCopy =
      minGpax != null
        ? eligible === false
          ? `เกณฑ์ GPAX ขั้นต่ำ ${minGpax.toFixed(2)}`
          : `GPAX ของคุณยังอยู่ในโซนลุ้น (ขั้นต่ำ ${minGpax.toFixed(2)})`
        : "ไม่มีเกณฑ์ GPAX ชัดเจน";
    const roundCopy = roundNumber ? `เหมาะสุดที่รอบ ${roundNumber}` : "มีหลายรอบให้วางแผน";
    const portfolioCopy = hasRequirements
      ? "มีสัญญาณว่าพอร์ตของคุณเข้าทาง"
      : "ยังไม่มีข้อมูลพอร์ตลึก แต่ยังใช้วางแผนต่อได้";

    return `${roundCopy} · ${gpaxCopy} · ${portfolioCopy}`;
  }

  const gpaxCopy =
    minGpax != null
      ? eligible === false
        ? `eligibility is tighter here (min GPAX ${minGpax.toFixed(2)})`
        : `your eligibility looks realistic (min GPAX ${minGpax.toFixed(2)})`
      : "eligibility looks flexible";
  const roundCopy = roundNumber ? `best path starts in Round ${roundNumber}` : "multiple rounds stay open";
  const fitCopy = hasRequirements
    ? "portfolio-fit signals are available"
    : "fit data is sparse, so this stays a lighter planning lead";

  return `${roundCopy} · ${gpaxCopy} · ${fitCopy}`;
}

export function buildTradeoffSummary(
  candidate: ProgramPlannerCandidate,
  isThai: boolean,
): string {
  const cost = parseCost(candidate.cost);
  const deadlineStatus = candidate.best_round?.deadline_status;

  if (isThai) {
    const urgency =
      deadlineStatus === "soon"
        ? "ปิดรับเร็ว"
        : deadlineStatus === "expired"
          ? "รอบนี้ปิดรับแล้ว"
          : "ยังพอมีเวลา";
    const affordability =
      cost != null && cost <= 25000
        ? "ค่าใช้จ่ายต่ำกว่า"
        : cost != null && cost >= 60000
          ? "ค่าใช้จ่ายสูงกว่า"
          : "ค่าใช้จ่ายกลางๆ";
    return `${urgency} · ${affordability}`;
  }

  const urgency =
    deadlineStatus === "soon"
      ? "deadline soon"
      : deadlineStatus === "expired"
        ? "current round expired"
        : "timeline still workable";
  const affordability =
    cost != null && cost <= 25000
      ? "more affordable"
      : cost != null && cost >= 60000
        ? "higher cost"
        : "mid-range cost";

  return `${urgency} · ${affordability}`;
}

export function rankPlannerCandidates(
  candidates: ProgramPlannerCandidate[],
  query: string,
  options: RankOptions = {},
): ProgramPlannerCandidate[] {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const tokens = tokenize(query);
  const hasQuery = tokens.length > 0;

  return candidates
    .map((candidate) => {
      const corpus = getSearchCorpus(candidate);
      const exactSource = [
        candidate.program_name,
        candidate.program_name_en,
        candidate.faculty_name,
        candidate.faculty_name_en,
        candidate.field_name,
        candidate.field_name_en,
        candidate.university_name,
        candidate.university_name_en,
      ]
        .map(normalize)
        .filter(Boolean);

      const exact = hasQuery
        ? exactSource.some((value) => value === normalize(query))
          ? 120
          : 0
        : 0;
      const prefix = hasQuery
        ? exactSource.some((value) => tokens.some((token) => value.startsWith(token)))
          ? 35
          : 0
        : 0;
      const text = hasQuery ? countTokenHits(corpus, tokens) * 12 : 0;
      const semantics = hasQuery && !exact && includesEveryToken(corpus, tokens) ? 18 : 0;

      let availability = 0;
      if (candidate.best_round) availability += 8;
      if (candidate.description_th) availability += 6;
      if (candidate.has_requirements) availability += 8;
      if (candidate.has_embedding) availability += 4;
      if ((candidate.round_numbers?.length ?? 0) > 1) availability += 3;

      let penalties = 0;
      let profile = 0;
      if (options.userGpax != null) {
        if (candidate.best_round?.is_eligible === true) profile += 14;
        if (candidate.best_round?.is_eligible === false) penalties -= 28;
      }
      if (candidate.best_round?.deadline_status === "soon") profile += 4;
      if (candidate.best_round?.deadline_status === "open") profile += 2;
      if (candidate.best_round?.deadline_status === "expired") penalties -= 24;
      if (!candidate.best_round) penalties -= 10;
      if (hasQuery && text === 0 && !includesEveryToken(corpus, tokens)) penalties -= 16;

      const total = exact + prefix + text + semantics + availability + profile + penalties;

      const nextBestRound = candidate.best_round
        ? {
            ...candidate.best_round,
            ...getDeadlineStatus(candidate.best_round.folio_closed_date, nowIso),
          }
        : null;

      const nextCandidate: ProgramPlannerCandidate = {
        ...candidate,
        best_round: nextBestRound,
        score_breakdown: {
          exact,
          prefix,
          text,
          semantics,
          availability,
          profile,
          penalties,
          total,
        },
      };

      return nextCandidate;
    })
    .sort(compareCandidates);
}

export function buildPlannerSections(
  candidates: ProgramPlannerCandidate[],
  query: string,
  options: SectionOptions,
): ProgramPlannerSection[] {
  const sorted = rankPlannerCandidates(candidates, query, {
    userGpax: options.userGpax,
  });

  if (tokenize(query).length > 0) {
    return [
      {
        key: "search-results",
        title: options.isThai ? "ผลลัพธ์ที่น่าลองต่อ" : "Search Results That Lead Somewhere",
        subtitle: options.isThai
          ? "ไม่ใช่แค่สาขาที่ตรงคำค้น แต่คือทางเลือกที่เอาไปวางแผนต่อได้"
          : "Results ranked for planning value, not just text overlap.",
        items: sorted,
      },
    ];
  }

  const bestMatches = sorted.filter((candidate) => candidate.best_round?.is_eligible !== false).slice(0, 6);
  const hiddenGems = sorted
    .filter((candidate) => candidate.university_name !== "จุฬาลงกรณ์มหาวิทยาลัย")
    .slice(0, 6);
  const prestigeVsFit = sorted
    .filter((candidate) => candidate.university_name === "จุฬาลงกรณ์มหาวิทยาลัย")
    .slice(0, 3);

  const sections: ProgramPlannerSection[] = [];

  if (bestMatches.length > 0) {
    sections.push({
      key: "best-matches",
      title: options.isThai ? "Best Matches For You" : "Best Matches For You",
      subtitle: options.isThai
        ? "ตัวเลือกที่มีเหตุผลรองรับและต่อยอดไปสู่แผนจริงได้"
        : "The strongest planning leads from your current profile.",
      items: bestMatches,
    });
  }

  if (hiddenGems.length > 0) {
    sections.push({
      key: "hidden-gems",
      title: options.isThai ? "Good Options You Might Miss" : "Good Options You Might Miss",
      subtitle: options.isThai
        ? "ตัวเลือกที่ไม่ได้ชนะด้วยชื่อเสียง แต่ชนะด้วยความเข้าทาง"
        : "Less default, more realistic-fit options worth a serious look.",
      items: hiddenGems,
    });
  }

  if (prestigeVsFit.length > 0) {
    sections.push({
      key: "prestige-vs-fit",
      title: options.isThai ? "Prestige vs Fit" : "Prestige vs Fit",
      subtitle: options.isThai
        ? "ตั้งใจโชว์ตัวเลือกชื่อดังข้างๆ ตัวเลือกที่เข้ากับคุณจริง"
        : "Use prestige as context, not as autopilot.",
      items: prestigeVsFit,
    });
  }

  return sections;
}
