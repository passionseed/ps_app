import type { HackathonProgramPhase, HackathonTeam } from "./hackathon-program";
import type { HackathonPhaseActivitySubmissionStatus } from "./hackathon-phase-activity";

export type HackathonAdminProgramRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type HackathonAdminActivityRow = {
  id: string;
  phase_id: string;
  title: string;
  display_order: number;
  is_required?: boolean | null;
  is_draft?: boolean | null;
  status?: string | null;
  submission_scope?: "individual" | "team" | null;
};

export type HackathonAdminParticipantRow = {
  id: string;
  display_name?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  team_emoji?: string | null;
};

export type HackathonAdminTeamMemberRow = {
  team_id: string;
  participant_id: string;
};

export type HackathonAdminTeamScoreRow = {
  team_id: string;
  total_score: number | null;
};

export type HackathonAdminSubmissionRow = {
  id: string;
  activity_id: string;
  participant_id?: string | null;
  team_id?: string | null;
  submitted_by?: string | null;
  assessment_id?: string | null;
  text_answer?: string | null;
  image_url?: string | null;
  file_urls?: string[] | null;
  submitted_at: string;
  status?: HackathonPhaseActivitySubmissionStatus | string | null;
};

export type HackathonAdminTeamSubmissionRow = HackathonAdminSubmissionRow & {
  team_id: string;
  submitted_by?: string | null;
};

export type HackathonAdminOverview = {
  participantCount: number;
  teamCount: number;
  assignedParticipantCount: number;
  unassignedParticipantCount: number;
  submissionsLast24h: number;
  currentPhaseSubmissionRate: number;
  stuckTeamCount: number;
  teamsOnTrackCount: number;
  currentPhaseId: string | null;
};

export type HackathonAdminPhaseSummary = Pick<
  HackathonProgramPhase,
  "id" | "program_id" | "slug" | "title" | "description" | "phase_number" | "status" | "starts_at" | "ends_at" | "due_at" | "created_at" | "updated_at"
> & {
  isCurrent: boolean;
  activityCount: number;
  requiredActivityCount: number;
  completedRequiredActivityCount: number;
  completionRate: number;
};

export type HackathonAdminActivitySubmission = {
  id: string;
  activityId: string;
  participantId: string | null;
  participantName: string | null;
  teamId: string | null;
  teamName: string | null;
  submittedAt: string;
  assessmentId: string | null;
  textAnswer: string | null;
  imageUrl: string | null;
  fileUrls: string[] | null;
  status: string | null;
};

export type HackathonAdminActivitySummary = {
  id: string;
  phaseId: string;
  phaseNumber: number;
  title: string;
  displayOrder: number;
  isRequired: boolean;
  submissionScope: "individual" | "team";
  submittedCount: number;
  representedTeamCount: number;
  missingCount: number;
  latestSubmittedAt: string | null;
  submissions: HackathonAdminActivitySubmission[];
};

export type HackathonAdminTeamMember = {
  participantId: string;
  name: string | null;
  avatarUrl: string | null;
  teamEmoji: string | null;
};

export type HackathonAdminTeamSummary = Pick<
  HackathonTeam,
  "id" | "name" | "team_name" | "team_avatar_url" | "created_at" | "updated_at"
> & {
  members: HackathonAdminTeamMember[];
  currentPhase: HackathonAdminPhaseSummary | null;
  completedRequiredActivities: number;
  totalRequiredActivities: number;
  missingRequiredActivities: number;
  latestSubmittedAt: string | null;
  score: number | null;
  rank: number | null;
  onTrack: boolean;
  offTrackReason: string | null;
};

export type HackathonAdminDashboard = {
  overview: HackathonAdminOverview;
  phases: HackathonAdminPhaseSummary[];
  activities: HackathonAdminActivitySummary[];
  teams: HackathonAdminTeamSummary[];
};

export type HackathonAdminInboxItem = {
  submissionId: string;
  activityId: string;
  activityTitle: string;
  phaseId: string;
  phaseNumber: number;
  phaseTitle: string;
  participantId: string | null;
  participantName: string | null;
  teamId: string | null;
  teamName: string | null;
  submittedAt: string;
  scope: "individual" | "team";
  textAnswer: string | null;
  imageUrl: string | null;
  fileUrls: string[] | null;
  status: string | null;
};

export type HackathonAdminAttentionItem = {
  type: "team";
  id: string;
  name: string;
  reason: string;
  severity: "critical" | "warning";
  missingCount: number;
  lastActiveAt: string | null;
  score: number | null;
  rank: number | null;
};

export type HackathonAdminStudentRow = {
  participantId: string;
  name: string | null;
  teamId: string | null;
  teamName: string | null;
  teamEmoji: string | null;
  avatarUrl: string | null;
  submissionCount: number;
  latestSubmittedAt: string | null;
};
