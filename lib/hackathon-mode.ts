// lib/hackathon-mode.ts
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function readHackathonMode(): Promise<boolean> {
  const value = await AsyncStorage.getItem(HACKATHON_MODE_KEY);
  return value === "true";
}

export async function saveHackathonMode(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(HACKATHON_MODE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(HACKATHON_MODE_KEY);
  }
}

export async function saveHackathonSession(token: string, participant: HackathonParticipant): Promise<void> {
  await AsyncStorage.multiSet([
    [HACKATHON_TOKEN_KEY, token],
    [HACKATHON_PARTICIPANT_KEY, JSON.stringify(participant)],
  ]);
}

export async function readHackathonToken(): Promise<string | null> {
  return AsyncStorage.getItem(HACKATHON_TOKEN_KEY);
}

export async function readHackathonParticipant(): Promise<HackathonParticipant | null> {
  const raw = await AsyncStorage.getItem(HACKATHON_PARTICIPANT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HackathonParticipant;
  } catch {
    return null;
  }
}

export async function clearHackathonSession(): Promise<void> {
  await AsyncStorage.multiRemove([HACKATHON_TOKEN_KEY, HACKATHON_PARTICIPANT_KEY]);
}

export function useHackathonParticipant(): HackathonParticipant | null {
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);

  useEffect(() => {
    readHackathonParticipant().then(setParticipant).catch(() => setParticipant(null));
  }, []);

  return participant;
}
