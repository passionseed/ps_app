// lib/savedPrograms.ts

import { supabase } from './supabase';
import { logProgramSaved, logProgramUnsaved } from './eventLogger';
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
        university_id,
        degree_level
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