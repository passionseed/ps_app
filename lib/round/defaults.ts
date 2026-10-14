/** Dependency-free defaults shared by pure modules (no Supabase or storage imports). */
import type { RoundFlags } from "./types";

/**
 * Flags when nothing is readable. `tab_enabled` false means "in-round features off": Home shows
 * the built-in landing (D10) until the server says otherwise.
 */
export const DEFAULT_FLAGS: RoundFlags = {
  tab_enabled: false,
  enrollment_enabled: true,
  submissions_enabled: true,
  transcription_enabled: false,
  emergency_message: null,
  web_base_url: "https://www.passionseed.org",
};
