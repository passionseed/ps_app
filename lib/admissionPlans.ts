// lib/admissionPlans.ts

import { supabase } from './supabase';
import { logAdmissionPlanCreated } from './eventLogger';
import type { TcasProgram } from '../types/tcas';

/**
 * Maximum number of admission plans per user.
 */
export const MAX_PLANS_PER_USER = 3;

/**
 * Admission plan with rounds and programs.
 */
export interface AdmissionPlan {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  rounds?: AdmissionPlanRound[];
}

/**
 * A program entry in an admission plan round.
 */
export interface AdmissionPlanRound {
  id: string;
  plan_id: string;
  round_number: number;
  program_id: string;
  priority: number;
  created_at: string;
  program?: TcasProgram;
}

/**
 * Create a new admission plan.
 */
export async function createPlan(name: string = 'My Plan'): Promise<AdmissionPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check plan limit
  const { count, error: countError } = await supabase
    .from('admission_plans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) throw countError;
  if (count && count >= MAX_PLANS_PER_USER) {
    throw new Error(`Maximum ${MAX_PLANS_PER_USER} plans allowed`);
  }

  const { data, error } = await supabase
    .from('admission_plans')
    .insert({
      user_id: user.id,
      name,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AdmissionPlan;
}

/**
 * Get all admission plans for the current user.
 */
export async function getPlans(): Promise<AdmissionPlan[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('admission_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdmissionPlan[];
}

/**
 * Get a single admission plan with all rounds and programs.
 */
export async function getPlanById(planId: string): Promise<AdmissionPlan | null> {
  const { data: plan, error: planError } = await supabase
    .from('admission_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) return null;

  // Fetch rounds with program details
  const { data: rounds, error: roundsError } = await supabase
    .from('admission_plan_rounds')
    .select(`
      id,
      plan_id,
      round_number,
      program_id,
      priority,
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
    .eq('plan_id', planId)
    .order('round_number')
    .order('priority');

  if (roundsError) throw roundsError;

  return {
    ...plan,
    rounds: (rounds ?? []).map((r: any) => ({
      id: r.id,
      plan_id: r.plan_id,
      round_number: r.round_number,
      program_id: r.program_id,
      priority: r.priority,
      created_at: r.created_at,
      program: r.tcas_programs as TcasProgram,
    })),
  } as AdmissionPlan;
}

/**
 * Add a program to a specific round in a plan.
 */
export async function addProgramToRound(
  planId: string,
  roundNumber: number,
  programId: string,
  priority?: number
): Promise<AdmissionPlanRound> {
  // Get current max priority for this round
  const { data: existing } = await supabase
    .from('admission_plan_rounds')
    .select('priority')
    .eq('plan_id', planId)
    .eq('round_number', roundNumber)
    .order('priority', { ascending: false })
    .limit(1);

  const nextPriority = priority ?? ((existing?.[0]?.priority ?? 0) + 1);

  const { data, error } = await supabase
    .from('admission_plan_rounds')
    .insert({
      plan_id: planId,
      round_number: roundNumber,
      program_id: programId,
      priority: nextPriority,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Program already in this round');
    }
    throw error;
  }

  // Update plan's updated_at
  await supabase
    .from('admission_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId);

  return data as AdmissionPlanRound;
}

/**
 * Remove a program from a round.
 */
export async function removeProgramFromRound(
  planId: string,
  roundNumber: number,
  programId: string
): Promise<void> {
  const { error } = await supabase
    .from('admission_plan_rounds')
    .delete()
    .eq('plan_id', planId)
    .eq('round_number', roundNumber)
    .eq('program_id', programId);

  if (error) throw error;

  // Update plan's updated_at
  await supabase
    .from('admission_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId);
}

/**
 * Reorder programs within a round.
 */
export async function reorderProgramsInRound(
  planId: string,
  roundNumber: number,
  programIds: string[]
): Promise<void> {
  // Update priorities in batch
  const updates = programIds.map((programId, index) => ({
    plan_id: planId,
    round_number: roundNumber,
    program_id: programId,
    priority: index + 1,
  }));

  // Delete existing and re-insert with new priorities
  await supabase
    .from('admission_plan_rounds')
    .delete()
    .eq('plan_id', planId)
    .eq('round_number', roundNumber);

  const { error } = await supabase
    .from('admission_plan_rounds')
    .insert(updates);

  if (error) throw error;

  // Update plan's updated_at
  await supabase
    .from('admission_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId);
}

/**
 * Update plan name.
 */
export async function updatePlanName(planId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('admission_plans')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', planId);

  if (error) throw error;
}

/**
 * Delete an admission plan and all its rounds.
 */
export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('admission_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

/**
 * Create a plan with initial programs (for the create flow).
 */
export async function createPlanWithPrograms(
  name: string,
  programsByRound: Record<number, string[]>
): Promise<AdmissionPlan> {
  const plan = await createPlan(name);

  // Add programs to each round
  for (const [roundNum, programIds] of Object.entries(programsByRound)) {
    for (const programId of programIds) {
      await addProgramToRound(plan.id, parseInt(roundNum, 10), programId);
    }
  }

  // Log event
  const allProgramIds = Object.values(programsByRound).flat();
  logAdmissionPlanCreated(Object.keys(programsByRound).length, allProgramIds).catch(() => {});

  return plan;
}

/**
 * Get plan count for the current user.
 */
export async function getPlanCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('admission_plans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) throw error;
  return count ?? 0;
}