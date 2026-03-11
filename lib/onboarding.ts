import { supabase } from './supabase'
import type {
  OnboardingStep,
  ChatMessage,
  CollectedData,
  InterestCategory,
  CareerGoal,
  MobileSettings,
  Profile,
  OnboardingChatResponse,
} from '../types/onboarding'

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, education_level, preferred_language, school_name, is_onboarded, onboarded_at, mobile_settings')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as Profile
}

// ── Onboarding State ──────────────────────────────────────────────────────────

export async function getOnboardingState(userId: string) {
  const { data } = await supabase
    .from('onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function upsertOnboardingState(
  userId: string,
  updates: {
    current_step?: OnboardingStep
    chat_history?: ChatMessage[]
    collected_data?: Partial<CollectedData>
  }
) {
  await supabase.from('onboarding_state').upsert({
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

// ── Step saves ────────────────────────────────────────────────────────────────

export async function saveProfileStep(userId: string, data: CollectedData) {
  await supabase.from('profiles').update({
    education_level: data.education_level,
    preferred_language: data.preferred_language,
    school_name: data.school_name ?? null,
    date_of_birth: data.date_of_birth ?? null,
  }).eq('id', userId)

  await upsertOnboardingState(userId, {
    current_step: 'chat',
    collected_data: data,
  })
}

export async function saveInterests(userId: string, categories: InterestCategory[]) {
  // Delete previous interests (re-onboarding edge case)
  await supabase.from('user_interests').delete().eq('user_id', userId)

  const rows = categories.map((c) => ({
    user_id: userId,
    category_name: c.category_name,
    statements: c.statements,
    selected: c.selected,
  }))

  await supabase.from('user_interests').insert(rows)
  await upsertOnboardingState(userId, { current_step: 'careers' })
}

export async function saveCareers(userId: string, careers: CareerGoal[]) {
  await supabase.from('career_goals').delete().eq('user_id', userId)

  const rows = careers.map((c) => ({
    user_id: userId,
    career_name: c.career_name,
    source: c.source,
  }))

  if (rows.length > 0) await supabase.from('career_goals').insert(rows)
  await upsertOnboardingState(userId, { current_step: 'settings' })
}

export async function completeOnboarding(userId: string, settings: MobileSettings) {
  await supabase.from('profiles').update({
    mobile_settings: settings,
    is_onboarded: true,
    onboarded_at: new Date().toISOString(),
  }).eq('id', userId)

  await supabase.from('onboarding_state').delete().eq('user_id', userId)
}

// ── Edge Function call ────────────────────────────────────────────────────────

export async function callOnboardingChat(params: {
  mode: 'chat' | 'generate_interests' | 'suggest_careers'
  chat_history: ChatMessage[]
  user_context: { name: string; education_level: string; selected_interests?: string[] }
}): Promise<OnboardingChatResponse> {
  const { data, error } = await supabase.functions.invoke('onboarding-chat', {
    body: params,
  })
  if (error) {
    // Log full error details for debugging
    const context = (error as any).context
    if (context) {
      try {
        const body = await context.json()
        console.error('Edge Function error body:', JSON.stringify(body))
      } catch {
        console.error('Edge Function error status:', context.status)
      }
    }
    throw error
  }
  return data as OnboardingChatResponse
}

// ── TCAS Profile ──────────────────────────────────────────────────────────────

/**
 * Save TCAS profile fields (GPAX, budget, location, interests).
 */
export async function saveTcasProfile(
  userId: string,
  data: {
    gpax?: number | null;
    budget_per_year?: number | null;
    preferred_location?: string | null;
    subject_interests?: string[];
  }
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      tcas_profile_completed: true,
    })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Get TCAS profile fields for a user.
 */
export async function getTcasProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gpax, budget_per_year, preferred_location, subject_interests, tcas_profile_completed")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
