import type {
  PathActivityScope,
  PathGateRule,
  PathReviewMode,
} from "./pathlab-content";
import type { MapNode } from "./map";

export type HackathonSubmissionStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "pending_review"
  | "passed"
  | "revision_required";

export type HackathonModuleGateStatus =
  | "blocked"
  | "ready_for_team"
  | "revision_required"
  | "passed";

export interface HackathonProgram {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HackathonProgramPhase {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HackathonPhasePlaylist {
  id: string;
  phase_id: string;
  slug: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseModule {
  id: string;
  playlist_id: string;
  seed_id: string | null;
  path_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  display_order: number;
  workflow_scope: PathActivityScope;
  gate_rule: PathGateRule;
  review_mode: PathReviewMode;
  required_member_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface HackathonTrack {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  hackathon_challenges?: HackathonChallenge[];
}

export interface HackathonChallenge {
  id: string;
  track_id: string;
  num: string;
  title_en: string;
  title_th: string | null;
  hook_en: string | null;
  hook_th: string | null;
  challenge_en: string;
  challenge_th: string | null;
  tangible_equivalent_en: string | null;
  tangible_equivalent_th: string | null;
  tags: string[] | null;
  severity: number | null;
  difficulty: number | null;
  impact: number | null;
  urgency: number | null;
  created_at: string;
  updated_at: string;
  track?: HackathonTrack | null;
}

export interface HackathonTeamProgramEnrollment {
  id: string;
  team_id: string;
  program_id: string;
  current_phase_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  selected_challenge_id?: string | null;
  selected_challenge?: HackathonChallenge | null;
  created_at: string;
  updated_at: string;
}

export interface HackathonTeamMember {
  participant_id: string;
  name: string;
  university: string;
  track: string;
}

export interface HackathonTeam {
  id: string;
  name?: string | null;
  team_name?: string | null;
  created_at?: string;
  updated_at?: string;
  members?: HackathonTeamMember[];
}

export interface HackathonTeamMembership {
  id: string;
  team_id: string;
  user_id?: string | null;
  participant_id?: string | null;
  role?: string | null;
  profile?: Record<string, unknown> | null;
}

export interface HackathonProgramHome {
  team: HackathonTeam | null;
  enrollment: HackathonTeamProgramEnrollment | null;
  program: HackathonProgram | null;
  phases: HackathonProgramPhase[];
}

export interface HackathonPhaseDetail {
  phase: HackathonProgramPhase | null;
  playlists: Array<
    HackathonPhasePlaylist & {
      modules: HackathonPhaseModule[];
    }
  >;
}

export interface HackathonMemberSubmissionState {
  status: HackathonSubmissionStatus;
}

export interface HackathonModuleProgressSnapshot {
  gate_status: HackathonModuleGateStatus;
  ready_members: number;
  pending_members: number;
  revision_required_members: number;
  can_open_team_submission: boolean;
}

export type HackathonModuleStatus =
  | "blocked"
  | "not_started"
  | "in_progress"
  | "ready_for_review"
  | "completed";

export interface HackathonModuleProgress {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  orderIndex: number;
  isLocked: boolean;
  requiredIndividualCount: number;
  completedIndividualCount: number;
  requiresTeamSubmission: boolean;
  teamSubmissionStatus: "missing" | "draft" | "submitted" | "passed";
}

export interface HackathonJourneyModuleProgress {
  moduleId: string;
  totalNodes: number;
  completedNodes: number;
  currentNodeId: string | null;
  nodes: MapNode[];
  completedNodeIds: Set<string>;
}
