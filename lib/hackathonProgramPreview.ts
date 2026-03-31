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
  id: "preview-program",
  slug: "super-seed-hackathon",
  title: "Super Seed Hackathon",
  description: "A multi-phase hackathon delivered as a playlist of PathLabs.",
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
    id: "phase-customer-discovery",
    program_id: previewProgram.id,
    slug: "customer-discovery",
    title: "Phase 1: Customer Discovery",
    description:
      "Validate a real healthcare pain point through interviews, persona work, and research.",
    phase_number: 1,
    starts_at: "2026-04-07T00:00:00.000Z",
    ends_at: "2026-04-26T23:59:59.000Z",
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
  },
  {
    id: "phase-solution-design",
    program_id: previewProgram.id,
    slug: "solution-design",
    title: "Phase 2: Solution Design",
    description:
      "Turn the validated pain point into a focused product direction, prototype, and story.",
    phase_number: 2,
    starts_at: null,
    ends_at: null,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
  },
  {
    id: "phase-build-launch",
    program_id: previewProgram.id,
    slug: "build-launch",
    title: "Phase 3: Build and Launch",
    description:
      "Build a compelling MVP, sharpen the pitch, and prepare for judges and users.",
    phase_number: 3,
    starts_at: null,
    ends_at: null,
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
  started_at: "2026-04-07T00:00:00.000Z",
  completed_at: null,
  created_at: "2026-03-29T00:00:00.000Z",
  updated_at: "2026-03-29T00:00:00.000Z",
};

type PreviewPlaylist = HackathonPhasePlaylist & {
  modules: HackathonPhaseModule[];
};

const previewPhaseDetails: Record<string, HackathonPhaseDetail> = {
  "phase-customer-discovery": {
    phase: previewPhases[0],
    playlists: [
      {
        id: "playlist-customer-discovery-core",
        phase_id: previewPhases[0].id,
        slug: "customer-discovery-core",
        title: "Customer Discovery Core Loop",
        description:
          "Practice interviewing, gather real evidence, synthesize the pain point, and back it with research.",
        display_order: 1,
        created_at: "2026-03-29T00:00:00.000Z",
        updated_at: "2026-03-29T00:00:00.000Z",
        modules: [
          makeModule({
            id: "module-interview-mindset",
            playlist_id: "playlist-customer-discovery-core",
            slug: "interview-mindset",
            title: "Interview Mindset",
            summary:
              "Practice the 5 Whys, interviewer behavior, and question quality before talking to real customers.",
            display_order: 1,
            workflow_scope: "individual",
            gate_rule: "all_members_complete",
            review_mode: "auto",
            required_member_count: 3,
          }),
          makeModule({
            id: "module-real-customer-evidence",
            playlist_id: "playlist-customer-discovery-core",
            slug: "real-customer-evidence",
            title: "Real Customer Evidence",
            summary:
              "Each member uploads one real interview and extracts concrete pain-point evidence.",
            display_order: 2,
            workflow_scope: "hybrid",
            gate_rule: "mentor_pass",
            review_mode: "auto_then_mentor",
            required_member_count: 3,
          }),
          makeModule({
            id: "module-pain-point-definition",
            playlist_id: "playlist-customer-discovery-core",
            slug: "pain-point-definition",
            title: "Pain Point Definition",
            summary:
              "Turn raw evidence into a sharp healthcare pain point and iterate with AI feedback.",
            display_order: 3,
            workflow_scope: "team",
            gate_rule: "team_submission_pass",
            review_mode: "auto_then_mentor",
            required_member_count: 3,
          }),
          makeModule({
            id: "module-persona-jtbd",
            playlist_id: "playlist-customer-discovery-core",
            slug: "persona-jtbd-workspace",
            title: "Persona + JTBD Workspace",
            summary:
              "Build the persona, customer journey, jobs-to-be-done, and pains/gains from interview evidence.",
            display_order: 4,
            workflow_scope: "team",
            gate_rule: "team_submission_pass",
            review_mode: "auto_then_mentor",
            required_member_count: 3,
          }),
          makeModule({
            id: "module-research-reflection",
            playlist_id: "playlist-customer-discovery-core",
            slug: "research-and-reflection",
            title: "Research + Reflection",
            summary:
              "Back the pain point with external evidence, then capture what the team learned.",
            display_order: 5,
            workflow_scope: "hybrid",
            gate_rule: "min_members_complete",
            review_mode: "mentor",
            required_member_count: 3,
          }),
        ],
      },
    ],
  },
  "phase-solution-design": {
    phase: previewPhases[1],
    playlists: [
      makePlaceholderPlaylist(
        previewPhases[1].id,
        "solution-design-preview",
        "Solution Design Preview",
        "Phase 2 will turn validated demand into product direction, prototype choices, and a clearer wedge.",
      ),
    ],
  },
  "phase-build-launch": {
    phase: previewPhases[2],
    playlists: [
      makePlaceholderPlaylist(
        previewPhases[2].id,
        "build-launch-preview",
        "Build and Launch Preview",
        "Phase 3 will focus on MVP execution, storytelling, and shipping pressure tests.",
      ),
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
