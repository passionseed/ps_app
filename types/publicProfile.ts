// Public passion-identity profile.
//
// Stored in the `public_profiles` table (1:1 with users). This table holds ONLY
// publicly-safe fields by construction — never PII, email, or raw ikigai scores.
// RLS is the entire security boundary (the app talks to Supabase directly from
// the device), and RLS is row-level not column-level, so anything placed here is
// potentially world-readable. Private data stays on `profiles`.
//
// Default posture is PRIVATE / share-only: `is_public` defaults to false and the
// public viewer renders only the sections named in `published_sections`.

/** One of the 6 RPG classes. Null until the student picks one in Browse. */
export type ClassSlug =
  | "builder"
  | "strategist"
  | "creator"
  | "analyst"
  | "healer"
  | "producer";

/** Sections a student can opt into publishing on their public viewer. */
export type PublishableSection = "class" | "ikigai" | "growth";

export interface PublicProfile {
  user_id: string;
  /** Self-chosen public handle (NOT legal name). Null until activated. */
  handle: string | null;
  /** Picked in Browse. Null => seedling identity state. */
  class_slug: ClassSlug | null;
  /** Refined as the student evolves. Null until a subclass is reached. */
  subclass_slug: string | null;
  /** The seed (career path) the student is currently progressing. */
  current_path: string | null;
  /** 0 = seedling, increments as Class -> Subclass -> Path evolves. */
  evolution_stage: number;
  /** Server-derived count of completed quests. Read-only on the client. */
  growth_count: number;
  /** Master private/public switch. Defaults to false (private/share-only). */
  is_public: boolean;
  /** Sections the student opted into publishing. Empty => nothing public. */
  published_sections: PublishableSection[];
  created_at: string;
  updated_at: string;
}

/**
 * Identity render state.
 *
 *   class_slug == null ──▶ "seedling"  (invitation: pick your class)
 *   class_slug != null ──▶ "revealed"  (Class hero renders)
 *
 * NOTE: a fetch error or missing taxonomy is NOT seedling — callers must
 * distinguish "no class yet" from "load failed" and show a retry, never let a
 * deploy failure masquerade as user state.
 */
export type IdentityStage = "seedling" | "revealed";
