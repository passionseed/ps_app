import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ============================================
// Types for Analytics Dashboard
// ============================================

export interface DAUData {
  activity_date: string;
  dau: number;
  avg_events_per_user: number;
  power_users: number;
  new_daily_users: number;
}

export interface WAUData {
  activity_week: string;
  wau: number;
  avg_events_per_user: number;
  avg_active_days: number;
  highly_engaged_users: number;
  new_weekly_users: number;
}

export interface MAUData {
  activity_month: string;
  mau: number;
  avg_events_per_user: number;
  avg_active_weeks: number;
  retained_users: number;
  new_monthly_users: number;
}

export interface RetentionSummary {
  report_date: string;
  current_dau: number;
  current_wau: number;
  current_mau: number;
  prev_dau: number;
  prev_wau: number;
  prev_mau: number;
  total_users_ever: number;
  active_users_7d: number;
  active_users_30d: number;
  avg_session_min: number;
  dau_change_pct: number;
  wau_change_pct: number;
  mau_change_pct: number;
}

export interface CohortRetentionData {
  cohort_week: string;
  week_number: number;
  users_active: number;
  cohort_size: number;
  retention_rate_pct: number;
}

export interface SessionDurationData {
  session_date: string;
  total_sessions: number;
  avg_session_duration_min: number;
  median_session_duration_min: number;
  p90_session_duration_min: number;
  avg_events_per_session: number;
  unique_users: number;
  engaged_sessions: number;
  long_sessions: number;
}

export interface FunnelData {
  total_users: number;
  step_1_app_opened: number;
  step_5_onboarding_completed: number;
  pct_overall_conversion: number;
  drop_off_before_onboarding: number;
  drop_off_during_onboarding: number;
}

export interface UserJourneyData {
  total_tracked_users: number;
  journey_onboarding: number;
  journey_engaged: number;
  journey_high_intent: number;
  overall_engagement_rate: number;
  avg_seeds_per_user: number;
  avg_portfolio_per_user: number;
}

// ============================================
// Fetch Functions
// ============================================

export async function fetchDAUData(days: number = 30): Promise<DAUData[]> {
  const { data, error } = await supabase
    .from('analytics_daily_active_users')
    .select('*')
    .order('activity_date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('Error fetching DAU:', error);
    return [];
  }

  return data || [];
}

export async function fetchWAUData(weeks: number = 12): Promise<WAUData[]> {
  const { data, error } = await supabase
    .from('analytics_weekly_active_users')
    .select('*')
    .order('activity_week', { ascending: false })
    .limit(weeks);

  if (error) {
    console.error('Error fetching WAU:', error);
    return [];
  }

  return data || [];
}

export async function fetchMAUData(months: number = 6): Promise<MAUData[]> {
  const { data, error } = await supabase
    .from('analytics_monthly_active_users')
    .select('*')
    .order('activity_month', { ascending: false })
    .limit(months);

  if (error) {
    console.error('Error fetching MAU:', error);
    return [];
  }

  return data || [];
}

export async function fetchRetentionSummary(): Promise<RetentionSummary | null> {
  const { data, error } = await supabase
    .from('analytics_retention_summary')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching retention summary:', error);
    return null;
  }

  return data;
}

export async function fetchCohortRetention(weeks: number = 12): Promise<CohortRetentionData[]> {
  const { data, error } = await supabase
    .from('analytics_cohort_retention_weekly')
    .select('*')
    .order('cohort_week', { ascending: false })
    .order('week_number', { ascending: true })
    .limit(weeks * 9); // 9 weeks of retention per cohort

  if (error) {
    console.error('Error fetching cohort retention:', error);
    return [];
  }

  return data || [];
}

export async function fetchSessionDuration(days: number = 30): Promise<SessionDurationData[]> {
  const { data, error } = await supabase
    .from('analytics_session_duration')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('Error fetching session duration:', error);
    return [];
  }

  return data || [];
}

export async function fetchOnboardingFunnel(): Promise<FunnelData | null> {
  const { data, error } = await supabase
    .from('analytics_onboarding_funnel')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching onboarding funnel:', error);
    return null;
  }

  return data;
}

export async function fetchUserJourney(): Promise<UserJourneyData | null> {
  const { data, error } = await supabase
    .from('analytics_complete_user_journey')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching user journey:', error);
    return null;
  }

  return data;
}

// ============================================
// React Hooks
// ============================================

export function useRetentionSummary() {
  const [data, setData] = useState<RetentionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchRetentionSummary();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load retention summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDAUData(days: number = 30) {
  const [data, setData] = useState<DAUData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDAUData(days);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load DAU data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useWAUData(weeks: number = 12) {
  const [data, setData] = useState<WAUData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchWAUData(weeks);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load WAU data');
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCohortRetention(weeks: number = 12) {
  const [data, setData] = useState<CohortRetentionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchCohortRetention(weeks);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load cohort retention');
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useOnboardingFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchOnboardingFunnel();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useUserJourney() {
  const [data, setData] = useState<UserJourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchUserJourney();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load user journey data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Real-time Subscriptions (for live dashboards)
// ============================================

export function subscribeToAnalyticsUpdates(callback: () => void) {
  const subscription = supabase
    .channel('analytics-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_events',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
