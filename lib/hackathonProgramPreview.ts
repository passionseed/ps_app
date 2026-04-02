import type {
  HackathonPhaseDetail,
  HackathonPhaseModule,
  HackathonPhasePlaylist,
  HackathonProgram,
  HackathonProgramHome,
  HackathonProgramPhase,
  HackathonTeam,
  HackathonTeamProgramEnrollment,
} from "../types/hackathon-program";
import type { HackathonPhaseWithActivities } from "../types/hackathon-phase-activity";

const previewProgram: HackathonProgram = {
  id: "4ae8f785-64eb-4038-9614-f471f035110f",
  slug: "epic-sprint",
  title: "Epic Sprint",
  description: "A multi-phase hackathon to take you from idea to launch.",
  status: "active",
  created_at: "2026-03-29T00:00:00.000Z",
  updated_at: "2026-03-29T00:00:00.000Z",
};

const previewTeam: HackathonTeam = {
  id: "preview-team",
  team_name: "Preview Team",
};

const previewPhases: HackathonProgramPhase[] = [
  {
    id: "099eb24b-5f7c-4c2f-b971-dd5451fa743f",
    program_id: previewProgram.id,
    slug: "ideation",
    title: "Where is Da Problem",
    description:
      "Discover your interests, identify problems worth solving, and find your idea.",
    phase_number: 1,
    starts_at: "2026-04-01T00:00:00.000Z",
    ends_at: "2026-04-08T23:59:59.000Z",
    due_at: "2026-04-08T23:59:59.000Z",
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
  },
];

const previewEnrollment: HackathonTeamProgramEnrollment = {
  id: "preview-enrollment",
  team_id: previewTeam.id,
  program_id: previewProgram.id,
  current_phase_id: previewPhases[0].id,
  status: "active",
  started_at: "2026-04-01T00:00:00.000Z",
  completed_at: null,
  created_at: "2026-03-29T00:00:00.000Z",
  updated_at: "2026-03-29T00:00:00.000Z",
};

type PreviewPlaylist = HackathonPhasePlaylist & {
  modules: HackathonPhaseModule[];
};

const previewPhaseDetails: Record<string, HackathonPhaseDetail> = {
  "099eb24b-5f7c-4c2f-b971-dd5451fa743f": {
    phase: previewPhases[0],
    playlists: [
      {
        id: "playlist-ideation-core",
        phase_id: previewPhases[0].id,
        slug: "ideation-core",
        title: "Ideation",
        description: "Discover your strengths, find a problem, brainstorm solutions, and pick your idea.",
        display_order: 1,
        created_at: "2026-03-29T00:00:00.000Z",
        updated_at: "2026-03-29T00:00:00.000Z",
        modules: [
          makeModule({
            id: "activity-know-yourself",
            playlist_id: "playlist-ideation-core",
            slug: "know-yourself",
            title: "Know Yourself",
            summary: "Explore your interests and strengths with an AI career chat to find what drives you.",
            display_order: 1,
            workflow_scope: "individual",
            gate_rule: "complete",
            review_mode: "auto",
            required_member_count: null,
          }),
          makeModule({
            id: "activity-find-a-problem",
            playlist_id: "playlist-ideation-core",
            slug: "find-a-problem",
            title: "Find a Problem",
            summary: "Use the Problem Framework to identify a real pain point worth solving.",
            display_order: 2,
            workflow_scope: "individual",
            gate_rule: "complete",
            review_mode: "auto",
            required_member_count: null,
          }),
          makeModule({
            id: "activity-brainstorm-solutions",
            playlist_id: "playlist-ideation-core",
            slug: "brainstorm-solutions",
            title: "Brainstorm Solutions",
            summary: "Generate your top 3 solution ideas with help from the Idea Generator AI.",
            display_order: 3,
            workflow_scope: "individual",
            gate_rule: "complete",
            review_mode: "auto",
            required_member_count: null,
          }),
          makeModule({
            id: "activity-pick-your-solution",
            playlist_id: "playlist-ideation-core",
            slug: "pick-your-solution",
            title: "Pick Your Solution",
            summary: "Apply selection criteria and craft a pitch deck for your chosen solution.",
            display_order: 4,
            workflow_scope: "individual",
            gate_rule: "complete",
            review_mode: "auto",
            required_member_count: null,
          }),
        ],
      },
    ],
  },
};

const previewModules = new Map(
  Object.values(previewPhaseDetails)
    .flatMap((detail) => detail.playlists)
    .flatMap((playlist) => playlist.modules)
    .map((module) => [module.id, module]),
);

function makeModule(
  input: Omit<
    HackathonPhaseModule,
    "created_at" | "updated_at" | "seed_id" | "path_id"
  >,
): HackathonPhaseModule {
  return {
    ...input,
    seed_id: null,
    path_id: null,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
  };
}

function makePlaceholderPlaylist(
  phaseId: string,
  slug: string,
  title: string,
  description: string,
): PreviewPlaylist {
  return {
    id: `${slug}-playlist`,
    phase_id: phaseId,
    slug,
    title,
    description,
    display_order: 1,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
    modules: [
      makeModule({
        id: `${slug}-module`,
        playlist_id: `${slug}-playlist`,
        slug,
        title,
        summary: description,
        display_order: 1,
        workflow_scope: "team",
        gate_rule: "team_submission_pass",
        review_mode: "mentor",
        required_member_count: 3,
      }),
    ],
  };
}

export function getPreviewHackathonProgramHome(): HackathonProgramHome {
  return {
    team: previewTeam,
    enrollment: previewEnrollment,
    program: previewProgram,
    phases: previewPhases,
  };
}

export function getPreviewPhaseDetail(phaseId: string): HackathonPhaseDetail {
  return (
    previewPhaseDetails[phaseId] ?? {
      phase: previewPhases.find((phase) => phase.id === phaseId) ?? previewPhases[0],
      playlists: [],
    }
  );
}

export function getPreviewModuleDetail(
  moduleId: string,
): HackathonPhaseModule | null {
  return previewModules.get(moduleId) ?? null;
}

export function getPreviewPhaseWithActivities(phaseId: string): HackathonPhaseWithActivities {
  const phase = previewPhases.find((p) => p.id === phaseId) ?? previewPhases[0];
  return {
    id: phase.id,
    program_id: phase.program_id,
    slug: phase.slug,
    title: phase.title,
    description: phase.description,
    phase_number: phase.phase_number,
    starts_at: phase.starts_at,
    ends_at: phase.ends_at,
    due_at: phase.due_at,
    activities: [
      { id: "preview-act-1", phase_id: phase.id, title: "Show the Outcome", instructions: "Chat with your future self to see where your path leads.", display_order: 1, estimated_minutes: 20, is_required: true, is_draft: false, created_at: "", updated_at: "", content: [{ id: "c1", activity_id: "preview-act-1", content_type: "npc_chat", content_title: "Your Future Self", content_url: null, content_body: null, display_order: 1, metadata: {}, created_at: "" }], assessment: { id: "a1", activity_id: "preview-act-1", assessment_type: "text_answer", points_possible: 10, is_graded: true, metadata: {}, created_at: "", updated_at: "" } },
      { id: "preview-act-2", phase_id: phase.id, title: "You Are the Interviewee", instructions: "An AI interviews you to uncover what you truly care about.", display_order: 2, estimated_minutes: 25, is_required: true, is_draft: false, created_at: "", updated_at: "", content: [{ id: "c2", activity_id: "preview-act-2", content_type: "ai_chat", content_title: "Discovery Interview", content_url: null, content_body: null, display_order: 1, metadata: {}, created_at: "" }], assessment: { id: "a2", activity_id: "preview-act-2", assessment_type: "text_answer", points_possible: 15, is_graded: true, metadata: {}, created_at: "", updated_at: "" } },
      { id: "preview-act-3", phase_id: phase.id, title: "The 5 Why Technique", instructions: "Use the 5 Why framework to find the root of a real problem.", display_order: 3, estimated_minutes: 30, is_required: true, is_draft: false, created_at: "", updated_at: "", content: [{ id: "c3", activity_id: "preview-act-3", content_type: "image", content_title: "5 Why Guidelines", content_url: null, content_body: null, display_order: 1, metadata: {}, created_at: "" }, { id: "c4", activity_id: "preview-act-3", content_type: "text", content_title: "How to Use 5 Why", content_url: null, content_body: null, display_order: 2, metadata: {}, created_at: "" }], assessment: { id: "a3", activity_id: "preview-act-3", assessment_type: "image_upload", points_possible: 20, is_graded: true, metadata: {}, created_at: "", updated_at: "" } },
    ],
  };
}

export function getPreviewJourneyModules(
  phaseId: string,
): Array<HackathonPhaseModule & { ends_at: string | null }> {
  const detail = previewPhaseDetails[phaseId];
  if (!detail) return [];
  const phase = previewPhases.find((p) => p.id === phaseId) ?? null;
  const endsAt = phase?.ends_at ?? null;
  return detail.playlists
    .flatMap((playlist) => playlist.modules)
    .map((m) => ({ ...m, ends_at: endsAt }));
}
