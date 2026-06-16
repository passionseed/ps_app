// tests/passion-profile-ui.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- revealState tests ---

const asyncStorageState = {
  store: new Map<string, string>(),
  reset() { asyncStorageState.store.clear(); },
};

vi.mock('../lib/asyncStorage', () => ({
  getItem: async (key: string) => asyncStorageState.store.get(key) ?? null,
  setItem: async (key: string, val: string) => { asyncStorageState.store.set(key, val); },
  removeItem: async (key: string) => { asyncStorageState.store.delete(key); },
}));

vi.mock('expo-sqlite/localStorage/install', () => ({}));

describe('revealState', () => {
  beforeEach(() => asyncStorageState.reset());

  it('hasSeenReveal returns false initially', async () => {
    const { hasSeenReveal } = await import('../lib/revealState');
    expect(await hasSeenReveal('user1')).toBe(false);
  });

  it('markRevealSeen makes hasSeenReveal return true', async () => {
    const { hasSeenReveal, markRevealSeen } = await import('../lib/revealState');
    await markRevealSeen('user1');
    expect(await hasSeenReveal('user1')).toBe(true);
  });

  it('different userIds are independent', async () => {
    const { hasSeenReveal, markRevealSeen } = await import('../lib/revealState');
    await markRevealSeen('user1');
    expect(await hasSeenReveal('user2')).toBe(false);
  });
});

// --- ProfileScreenSnapshot validator (v2) ---

describe('ProfileScreenSnapshot validator (v2)', () => {
  beforeEach(() => asyncStorageState.reset());

  it('accepts a v2 snapshot with publicProfile=null and growthCount=0', async () => {
    const snap = {
      version: 2,
      userId: 'u1',
      cachedAt: new Date().toISOString(),
      profile: null,
      interests: [],
      careers: [],
      ikigaiScores: null,
      scoreTimeline: [],
      hasScores: false,
      activityEvents: [],
      portfolioCount: 0,
      savedProgramsCount: 0,
      isAdmin: false,
      publicProfile: null,
      growthCount: 0,
    };
    const { readCachedProfileScreenSnapshot, writeCachedProfileScreenSnapshot } = await import('../lib/profileScreenCache');
    await writeCachedProfileScreenSnapshot(snap as any);
    const result = await readCachedProfileScreenSnapshot('u1');
    expect(result).not.toBeNull();
    expect(result?.growthCount).toBe(0);
    expect(result?.publicProfile).toBeNull();
  });

  it('rejects an old v1 snapshot (missing growthCount)', async () => {
    const { readCachedProfileScreenSnapshot } = await import('../lib/profileScreenCache');
    const { setItem } = await import('../lib/asyncStorage');
    // Inject a raw v1 snapshot (no growthCount/publicProfile)
    await setItem('profile-screen-cache/u2', JSON.stringify({
      version: 1,
      userId: 'u2',
      cachedAt: new Date().toISOString(),
      profile: null,
      interests: [],
      careers: [],
      ikigaiScores: null,
      scoreTimeline: [],
      hasScores: false,
      activityEvents: [],
      portfolioCount: 0,
      savedProgramsCount: 0,
      isAdmin: false,
      // missing publicProfile + growthCount
    }));
    const result = await readCachedProfileScreenSnapshot('u2');
    expect(result).toBeNull(); // v1 rejected by schema validator
  });
});
