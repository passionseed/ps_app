import { useEffect, useState } from "react";
import { storage } from "./storage";

export const HACKATHON_MODE_KEY = "hackathon_mode";
const HACKATHON_TOKEN_KEY = "hackathon_token";
const HACKATHON_PARTICIPANT_KEY = "hackathon_participant";

export type HackathonParticipant = {
  id: string;
  name: string;
  email: string;
  university: string;
  role: string;
  team_name: string | null;
  track?: string;
  grade_level?: string;
};

export function readHackathonMode(): boolean {
  return storage.getBoolean(HACKATHON_MODE_KEY) ?? false;
}

export function saveHackathonMode(value: boolean): void {
  if (value) {
    storage.set(HACKATHON_MODE_KEY, true);
  } else {
    storage.delete(HACKATHON_MODE_KEY);
  }
}

export function saveHackathonSession(token: string, participant: HackathonParticipant): void {
  storage.set(HACKATHON_TOKEN_KEY, token);
  storage.set(HACKATHON_PARTICIPANT_KEY, JSON.stringify(participant));
}

export function readHackathonToken(): string | null {
  return storage.getString(HACKATHON_TOKEN_KEY) ?? null;
}

export function readHackathonParticipant(): HackathonParticipant | null {
  const raw = storage.getString(HACKATHON_PARTICIPANT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HackathonParticipant;
  } catch {
    return null;
  }
}

export function clearHackathonSession(): void {
  storage.delete(HACKATHON_TOKEN_KEY);
  storage.delete(HACKATHON_PARTICIPANT_KEY);
}

export function useHackathonParticipant(): HackathonParticipant | null {
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);

  useEffect(() => {
    try {
      setParticipant(readHackathonParticipant());
    } catch {
      setParticipant(null);
    }
  }, []);

  return participant;
}
