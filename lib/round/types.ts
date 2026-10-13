/**
 * SHIFT rounds: client contract types (build spec 2026-10-13, sections 2.3, 2.4, 3.x).
 * These mirror the RPC shapes owned by lane A (pseed). Keep field names identical to the JSON.
 */

export type Lang = "th" | "en";

export const EVIDENCE_TYPES = [
  "contact",
  "interview",
  "problem_statement",
  "mvp",
  "tester",
  "change",
  "demo_post",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const MISSION_KEYS = [
  "first_contact",
  "interviews_problem",
  "mvp",
  "testers",
  "change",
  "demo_post",
] as const;
export type MissionKey = (typeof MISSION_KEYS)[number];

export type ErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "retryable"
  | "offline";

export type RoundError = {
  code: string;
  category: ErrorCategory;
  field: string | null;
  retry_after: number | null;
  details: Record<string, unknown>;
  request_id: string | null;
};

export type RoundResult<T> =
  | { ok: true; data: T; request_id: string | null }
  | { ok: false; error: RoundError; request_id: string | null };

export type MissionPart = { type: EvidenceType; have: number; need: number };
export type Mission = {
  key: MissionKey;
  n: number;
  complete: boolean;
  parts: MissionPart[];
};
export type MissionCounts = {
  missions: Mission[];
  missions_complete: number;
  people_talked_to: number;
  eligible: boolean;
};

export type EmergencyMessage = { th?: string; en?: string; url?: string } | null;

export type RoundFlags = {
  tab_enabled: boolean;
  enrollment_enabled: boolean;
  submissions_enabled: boolean;
  transcription_enabled: boolean;
  emergency_message: EmergencyMessage;
  web_base_url: string;
};

export type RoundPhase = "upcoming" | "active" | "review" | "finished";
export type Track = "high_school" | "university";
export type EntryOutcome = "in_progress" | "certified" | "not_eligible";

export type HomeEntry = {
  id: string;
  round_id: string;
  track: Track;
  handle: string;
  joined_at: string;
  joined_day: number;
  outcome: EntryOutcome;
  name_display: "handle" | "legal";
  has_legal_name: boolean;
  summary_public: boolean;
};

export type HomeRound = {
  id: string;
  number: number;
  title_th: string;
  title_en: string;
  brief_th: string;
  brief_en: string;
  starts_at: string;
  closes_at: string;
  review_ends_at: string;
  duration_days: number;
  join_cutoff_day: number;
  day: number;
  phase: RoundPhase;
  discord_url: string | null;
  join_mode: "open" | "invite";
  mentor_led: boolean;
  grace_minutes: number;
};

export type JoinableRound = {
  round_id: string;
  number: number;
  title_th: string;
  title_en: string;
  starts_at: string;
  closes_at: string;
  join_by: string;
  join_mode: "open" | "invite";
  can_join: boolean;
  reason: null | "invite_only" | "join_closed" | "already_in_active_round";
};

export type EvidenceStatus = "submitted" | "rejected" | "accepted" | "withdrawn";
export type ReasonCode =
  | "not_real_person"
  | "duplicate"
  | "missing_detail"
  | "wrong_mission"
  | "privacy"
  | "link_broken"
  | "other";
export const REASON_CODES: ReasonCode[] = [
  "not_real_person",
  "duplicate",
  "missing_detail",
  "wrong_mission",
  "privacy",
  "link_broken",
  "other",
];

export type EvidenceItem = {
  id: string;
  type: EvidenceType;
  status: EvidenceStatus;
  counted: boolean;
  after_close: boolean;
  invalidated: boolean;
  mission: MissionKey;
  submitted_at: string;
  local_date: string;
  payload: Record<string, unknown>;
  media: { kind: "photo" | "audio"; path: string }[];
  status_reason_code: ReasonCode | null;
  status_note: string | null;
  replaces_evidence_id: string | null;
  source_evidence_id: string | null;
  replaced_by: string | null;
  /** Optional: not in the 3.6 bundle today; used for "last 7 days" when present. */
  status_changed_at?: string | null;
};

export type Checkpoint = "join" | "midpoint" | "close";

export type SquadSummary = {
  id: string;
  name: string;
  members: number;
  latest: null | {
    handle: string;
    kind: "evidence_logged" | "mission_completed";
    type: EvidenceType | null;
    n: number | null;
    at: string;
  };
};

export type CertificateSummary = {
  id: string;
  public_id: string;
  status: "issued" | "revoked";
  issued_at: string;
  revoked_at: string | null;
  tombstone: boolean;
  render_version: number;
  verify_url: string;
};

export type SummaryRevision = {
  revision: number;
  status: "pending" | "approved" | "rejected" | "superseded" | "taken_down";
  title: string;
  description: string;
  demo_url: string | null;
  public_counts: PublicCounts;
  decision_reason: string | null;
};
export type PublicCounts = { people_talked_to: boolean; testers: boolean; missions: boolean };

export type HomeBundle = {
  now: string;
  flags: RoundFlags;
  entry: HomeEntry | null;
  round: HomeRound | null;
  joinable: JoinableRound[];
  next_round: null | { number: number; starts_at: string };
  on_waitlist: boolean;
  missions: MissionCounts | null;
  evidence: EvidenceItem[];
  checkins_due: Checkpoint[];
  checkins_done: Checkpoint[];
  squad: SquadSummary | null;
  certificate: CertificateSummary | null;
  summary: null | { latest: SummaryRevision | null; public_revision: SummaryRevision | null };
  past_certificates: { round_number: number; public_id: string; status: "issued" | "revoked"; verify_url: string }[];
};

export type SquadMember = {
  entry_id: string;
  handle: string;
  is_me: boolean;
  question: { id: number; th: string; en: string };
  answer: string | null;
  missions_complete: number;
};
export type SquadFeedItem = {
  evidence_id: string | null;
  entry_id: string;
  handle: string;
  kind: "evidence_logged" | "mission_completed";
  type: EvidenceType | null;
  n: number | null;
  mission: MissionKey | null;
  at: string;
  cheers: number;
  cheered_by_me: boolean;
};
export type SquadBundle = {
  state: "waiting" | "assigned" | "none";
  squad: null | {
    id: string;
    name: string;
    discord_url: string | null;
    mentor: null | { display_name: string | null };
  };
  members: SquadMember[];
  feed: SquadFeedItem[];
};

export type Receipt = {
  evidence_id: string;
  submission_id: string;
  submitted_at: string;
  replayed: boolean;
  counted: boolean;
  after_close: boolean;
  duplicate_label: boolean;
  missions: MissionCounts;
  newly_completed: MissionKey[];
};

export type WithdrawPreview = {
  /** Lane A adds `type` (mission 2 has two parts). */
  affected: { mission: MissionKey; type?: EvidenceType; have_before: number; have_after: number }[];
  invalidated_changes: string[];
  applied: boolean;
  already?: boolean;
  missions?: MissionCounts;
};

export type MediaArg = {
  kind: "photo" | "audio";
  path: string;
  bytes: number;
  duration_ms: number | null;
  consent: boolean;
};

export type TranscriptSegment = { id: number; start_ms: number; end_ms: number; text: string };
export type Transcript = { text: string; segments: TranscriptSegment[]; language: string };
