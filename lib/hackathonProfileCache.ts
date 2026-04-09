import { storage } from "./storage";
import type { HackathonTeam } from "../types/hackathon-program";

export const HACKATHON_PROFILE_CACHE_SCHEMA_VERSION = 1;
export const HACKATHON_PROFILE_CACHE_KEY = "hackathon-profile-cache";
export const HACKATHON_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export type HackathonProfileSnapshot = {
  version: number;
  cachedAt: string;
  team: HackathonTeam | null;
  questionnaire: any | null;
  instagramHandle: string;
  discordUsername: string;
  teamEmoji: string | null;
  emojiRollCount: number;
  teamAvatarUrl: string | null;
};

const memoryCache = new Map<string, HackathonProfileSnapshot>();

function getCacheKey(participantId: string): string {
  return `${HACKATHON_PROFILE_CACHE_KEY}/${participantId}`;
}

function isValidSnapshot(value: unknown): value is HackathonProfileSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<HackathonProfileSnapshot>;
  return (
    s.version === HACKATHON_PROFILE_CACHE_SCHEMA_VERSION &&
    typeof s.cachedAt === "string"
  );
}

export function getHackathonProfileCacheStatus(
  snapshot: HackathonProfileSnapshot | null,
  now = Date.now(),
  ttlMs = HACKATHON_PROFILE_CACHE_TTL_MS,
) {
  const cachedAt = snapshot ? new Date(snapshot.cachedAt).getTime() : Number.NaN;
  const isFresh = Number.isFinite(cachedAt) && now - cachedAt <= ttlMs;
  return { isFresh, isUsableWhileRevalidating: Boolean(snapshot) };
}

export function readCachedHackathonProfile(
  participantId: string,
): HackathonProfileSnapshot | null {
  const memory = memoryCache.get(participantId);
  if (memory) return memory;

  const raw = storage.getString(getCacheKey(participantId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSnapshot(parsed)) return null;
    memoryCache.set(participantId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedHackathonProfile(
  participantId: string,
  snapshot: HackathonProfileSnapshot,
): void {
  memoryCache.set(participantId, snapshot);
  storage.set(getCacheKey(participantId), JSON.stringify(snapshot));
}

export function clearCachedHackathonProfile(
  participantId: string,
): void {
  memoryCache.delete(participantId);
  storage.delete(getCacheKey(participantId));
}
