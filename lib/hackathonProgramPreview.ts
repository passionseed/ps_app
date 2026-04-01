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
    title: "Phase 1: Ideation",
    description:
      "Discover your strengths, identify a problem worth solving, brainstorm solutions, and pick your best idea.",
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
