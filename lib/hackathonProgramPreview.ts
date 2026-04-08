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
  slug: "super-seed-hackathon",
  title: "Super Seed Hackathon",
  description: "Three hackathon phases delivered as a playlist of team-based PathLab modules.",
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
    slug: "phase-1-customer-discovery",
    title: "Phase 1: Customer Discovery",
    description:
      "Find real customer pain, validate it with interviews, and synthesize it into a stronger problem direction.",
    phase_number: 1,
    status: "released",
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
        id: "playlist-customer-discovery-core",
        phase_id: previewPhases[0].id,
        slug: "customer-discovery-core",
        title: "Customer Discovery Core Playlist",
        description: "Interview, evidence, pain point, persona, research, and reflection.",
        display_order: 1,
        created_at: "2026-03-29T00:00:00.000Z",
        updated_at: "2026-03-29T00:00:00.000Z",
        modules: [
          makeModule({
            id: "module-interview-mindset",
            playlist_id: "playlist-customer-discovery-core",
            slug: "interview-mindset",
            title: "Interview Mindset",
            summary: "Practice the 5 Whys and interview behavior before talking to real users.",
            display_order: 1,
            workflow_scope: "individual",
            gate_rule: "all_members_complete",
            review_mode: "auto",
            required_member_count: 4,
          }),
          makeModule({
            id: "module-real-customer-evidence",
            playlist_id: "playlist-customer-discovery-core",
            slug: "real-customer-evidence",
            title: "Real Customer Evidence",
            summary: "Collect real interview artifacts and route them through mentor review.",
            display_order: 2,
            workflow_scope: "hybrid",
            gate_rule: "mentor_pass",
            review_mode: "mentor",
            required_member_count: 4,
          }),
          makeModule({
            id: "module-pain-point-definition",
            playlist_id: "playlist-customer-discovery-core",
            slug: "pain-point-definition",
            title: "Pain Point Definition",
            summary: "Synthesize interview evidence into a validated problem definition with AI critique.",
            display_order: 3,
            workflow_scope: "team",
            gate_rule: "team_submission_pass",
            review_mode: "auto_then_mentor",
            required_member_count: 4,
          }),
          makeModule({
            id: "module-persona-jtbd",
            playlist_id: "playlist-customer-discovery-core",
            slug: "persona-jtbd",
            title: "Persona + JTBD Workspace",
            summary: "Build the persona, journey, JTBD, and pains/gains in a shared team workspace.",
            display_order: 4,
            workflow_scope: "team",
            gate_rule: "team_submission_pass",
            review_mode: "auto",
            required_member_count: 4,
          }),
          makeModule({
            id: "module-research-reflection",
            playlist_id: "playlist-customer-discovery-core",
            slug: "research-reflection",
            title: "Research + Reflection",
            summary: "Create the NotebookLM-ready evidence pack and capture what the team learned.",
            display_order: 5,
            workflow_scope: "hybrid",
            gate_rule: "all_members_complete",
            review_mode: "auto",
            required_member_count: 4,
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
    status: phase.status,
    starts_at: phase.starts_at,
    ends_at: phase.ends_at,
    due_at: phase.due_at,
    activities: [
      {
        id: "preview-act-1",
        phase_id: phase.id,
        title: "What You'll Walk Away With",
        instructions: "By the end of Phase 1, you'll know how to find a good problem, validate a real pain point, and define the right target user with our guide.",
        display_order: 1,
        estimated_minutes: 1,
        is_required: true,
        is_draft: false,
        status: "released",
        submission_scope: "individual" as const,
        created_at: "",
        updated_at: "",
        content: [
          {
            id: "c1",
            activity_id: "preview-act-1",
            content_type: "webtoon",
            content_title: "What You'll Walk Away With",
            content_url: null,
            content_body: null,
            display_order: 1,
            metadata: {
              variant: "webtoon",
              chunks: [
                { id: "c1", order: 1, image_key: "webtoon1-1" },
                { id: "c2", order: 2, image_key: "webtoon1-2" },
                { id: "c3", order: 3, image_key: "webtoon1-3" },
                { id: "c4", order: 4, image_key: "webtoon1-4" },
              ],
            },
            created_at: "",
          },
        ],
        assessments: [],
      },
      { id: "preview-act-2", phase_id: phase.id, title: "Customer Discovery Interview", instructions: "Run an engaging Empathize + Define interview where the participant is the interviewee. The chatbot should uncover behaviors, pain, and motivation without revealing too early what they are being interviewed for.", display_order: 2, estimated_minutes: 5, is_required: true, is_draft: false, status: "locked", submission_scope: "individual" as const, created_at: "", updated_at: "", content: [{ id: "c2", activity_id: "preview-act-2", content_type: "ai_chat", content_title: "Empathize + Define Chatbot", content_url: null, content_body: "An engaging chatbot interviews the participant as the interviewee, surfacing real behavior, friction, and motivation without making the setup feel obvious or cliche.", display_order: 1, metadata: { role: "participant_as_interviewee", reveal_goal_early: false, tone: "engaging_not_cliche", design_thinking_stage: ["empathize", "define"] }, created_at: "" }], assessments: [{ id: "a2", activity_id: "preview-act-2", assessment_type: "text_answer", display_order: 1, points_possible: 15, is_graded: true, metadata: {}, created_at: "", updated_at: "" }] },
      { id: "preview-act-3", phase_id: phase.id, title: "The 5 Why Technique", instructions: "Use the 5 Why framework to find the root of a real problem.", display_order: 3, estimated_minutes: 30, is_required: true, is_draft: false, status: "locked", submission_scope: "individual" as const, created_at: "", updated_at: "", content: [{ id: "c3", activity_id: "preview-act-3", content_type: "image", content_title: "5 Why Guidelines", content_url: null, content_body: null, display_order: 1, metadata: {}, created_at: "" }, { id: "c4", activity_id: "preview-act-3", content_type: "text", content_title: "How to Use 5 Why", content_url: null, content_body: null, display_order: 2, metadata: {}, created_at: "" }], assessments: [{ id: "a3", activity_id: "preview-act-3", assessment_type: "image_upload", display_order: 1, points_possible: 20, is_graded: true, metadata: {}, created_at: "", updated_at: "" }] },
    ],
  };
}

const previewActivitiesById = new Map(
  getPreviewPhaseWithActivities(previewPhases[0].id).activities.map((a) => [a.id, a])
);

export function getPreviewActivityDetail(
  activityId: string,
): import("../types/hackathon-phase-activity").HackathonPhaseActivityDetail | null {
  return previewActivitiesById.get(activityId) ?? null;
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
