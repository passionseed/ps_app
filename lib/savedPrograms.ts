// lib/savedPrograms.ts

import { supabase } from './supabase';
import { logProgramSaved, logProgramUnsaved } from './eventLogger';
import { storage } from './storage';
import type { TcasProgram, TcasProgramWithRounds } from '../types/tcas';

/**
 * Saved program with program details.
 */
export interface SavedProgram {
  id: string;
  user_id: string;
  program_id: string;
  created_at: string;
  program?: TcasProgram;
}

// ============ Saved Programs Cache ============
const SAVED_PROGRAMS_CACHE_KEY_PREFIX = "saved-programs-cache";
const SAVED_PROGRAMS_CACHE_TTL_MS = 5 * 60 * 1000;
const SAVED_PROGRAMS_CACHE_SCHEMA_VERSION = 1;

type SavedProgramsCacheEntry = {
  version: number;
  userId: string;
  cachedAt: string;
  programs: SavedProgram[];
};

const memoryCache = new Map<string, SavedProgramsCacheEntry>();

function getCacheKey(userId: string): string {
  return `${SAVED_PROGRAMS_CACHE_KEY_PREFIX}/${userId}`;
}

function isValidCacheEntry(value: unknown): value is SavedProgramsCacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<SavedProgramsCacheEntry>;
  return (
    entry.version === SAVED_PROGRAMS_CACHE_SCHEMA_VERSION &&
    typeof entry.userId === "string" &&
    typeof entry.cachedAt === "string" &&
    Array.isArray(entry.programs)
  );
}

export function readCachedSavedPrograms(userId: string): SavedProgramsCacheEntry | null {
  const memory = memoryCache.get(userId);
  if (memory) return memory;

  const raw = storage.getString(getCacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidCacheEntry(parsed) || parsed.userId !== userId) return null;
    memoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedSavedPrograms(userId: string, programs: SavedProgram[]): void {
  const entry: SavedProgramsCacheEntry = {
    version: SAVED_PROGRAMS_CACHE_SCHEMA_VERSION,
    userId,
    cachedAt: new Date().toISOString(),
    programs,
  };
  memoryCache.set(userId, entry);
  storage.set(getCacheKey(userId), JSON.stringify(entry));
}

export function clearCachedSavedPrograms(userId: string): void {
  memoryCache.delete(userId);
  storage.delete(getCacheKey(userId));
}

export function isSavedProgramsCacheFresh(entry: SavedProgramsCacheEntry | null): boolean {
  if (!entry) return false;
  const cachedAt = new Date(entry.cachedAt).getTime();
  return Number.isFinite(cachedAt) && Date.now() - cachedAt <= SAVED_PROGRAMS_CACHE_TTL_MS;
}

/**
 * Save a program for the current user.
 */
export async function saveProgram(programId: string, universityId: string): Promise<SavedProgram> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('saved_programs')
    .insert({
      user_id: user.id,
      program_id: programId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - already saved
      throw new Error('Program already saved');
    }
    throw error;
  }

  // Log event (fire-and-forget)
  logProgramSaved(programId, universityId).catch(() => {});

  return data as SavedProgram;
}

/**
 * Unsave a program for the current user.
 */
export async function unsaveProgram(programId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('saved_programs')
    .delete()
    .eq('user_id', user.id)
    .eq('program_id', programId);

  if (error) throw error;

  // Log event (fire-and-forget)
  logProgramUnsaved(programId).catch(() => {});
}

/**
 * Get all saved programs for the current user with program details.
 */
export async function getSavedPrograms(): Promise<SavedProgram[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_programs')
    .select(`
      id,
      user_id,
      program_id,
      created_at,
      tcas_programs (
        program_id,
        program_name,
        program_name_en,
        faculty_name,
        faculty_name_en,
        university_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform the nested structure
  return (data ?? []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    program_id: item.program_id,
    created_at: item.created_at,
    program: item.tcas_programs as TcasProgram,
  }));
}

/**
 * Check if a program is saved by the current user.
 */
export async function isProgramSaved(programId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('saved_programs')
    .select('id')
    .eq('user_id', user.id)
    .eq('program_id', programId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Get saved program IDs for the current user (lightweight check).
 */
export async function getSavedProgramIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('saved_programs')
    .select('program_id')
    .eq('user_id', user.id);

  if (error) throw error;
  return new Set((data ?? []).map((item) => item.program_id));
}

/**
 * Toggle save state for a program.
 * Returns true if now saved, false if now unsaved.
 */
export async function toggleSaveProgram(
  programId: string,
  universityId: string,
  currentlySaved: boolean
): Promise<boolean> {
  if (currentlySaved) {
    await unsaveProgram(programId);
    return false;
  } else {
    await saveProgram(programId, universityId);
    return true;
  }
}