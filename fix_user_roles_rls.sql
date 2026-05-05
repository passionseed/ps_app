-- =====================================================
-- COMPREHENSIVE FIX: ANON USER ROLES PERMISSION DENIED
-- =====================================================
-- DESCRIPTION:
-- Many RLS policies perform direct subqueries to the 'user_roles' table.
-- Since guest users ('anon' role) do not have SELECT permission on 'user_roles',
-- these queries fail with "permission denied for table user_roles".
-- 
-- SOLUTION:
-- 1. Grant EXECUTE on the 'is_admin_or_instructor' SECURITY DEFINER function to 'anon'.
-- 2. Update all affected policies to use this function instead of direct subqueries.
-- =====================================================

BEGIN;

-- 1. Ensure helper function is accessible to anon
GRANT EXECUTE ON FUNCTION public.is_admin_or_instructor(uuid) TO anon;

-- 2. Update expert_profiles policies
DROP POLICY IF EXISTS "admins_manage_expert_profiles" ON public.expert_profiles;
CREATE POLICY "admins_manage_expert_profiles" ON public.expert_profiles
    FOR ALL USING (public.is_admin_or_instructor(auth.uid()));

-- 3. Update expert_pathlabs policies
DROP POLICY IF EXISTS "admins_manage_expert_pathlabs" ON public.expert_pathlabs;
CREATE POLICY "admins_manage_expert_pathlabs" ON public.expert_pathlabs
    FOR ALL USING (public.is_admin_or_instructor(auth.uid()));

-- 4. Update mentor_sessions policies
DROP POLICY IF EXISTS "admins_manage_sessions" ON public.mentor_sessions;
CREATE POLICY "admins_manage_sessions" ON public.mentor_sessions
    FOR ALL USING (public.is_admin_or_instructor(auth.uid()));

-- 5. Update paths policies
DROP POLICY IF EXISTS "Paths are manageable by seed creator and admins" ON public.paths;
CREATE POLICY "Paths are manageable by seed creator and admins"
  ON public.paths FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.seeds s
      WHERE s.id = paths.seed_id
      AND (s.created_by = auth.uid() OR public.is_admin_or_instructor(auth.uid()))
    )
  );

-- 6. Update path_days policies
DROP POLICY IF EXISTS "Path days are viewable by enrolled users and admins" ON public.path_days;
DROP POLICY IF EXISTS "Path days are viewable for preview and enrolled users" ON public.path_days;
CREATE POLICY "Path days are viewable for preview and enrolled users"
  ON public.path_days FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.path_enrollments pe WHERE pe.path_id = path_id AND pe.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.paths p JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id AND (s.created_by = auth.uid() OR public.is_admin_or_instructor(auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.paths p JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id AND s.seed_type = 'pathlab'
    )
  );

DROP POLICY IF EXISTS "Path days are manageable by seed creator and admins" ON public.path_days;
CREATE POLICY "Path days are manageable by seed creator and admins"
  ON public.path_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.paths p JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id AND (s.created_by = auth.uid() OR public.is_admin_or_instructor(auth.uid()))
    )
  );

-- 7. Update path_activities policies (Students can view)
DROP POLICY IF EXISTS "Students can view published activities in enrolled paths" ON public.path_activities;
CREATE POLICY "Students can view published activities in enrolled paths"
  ON public.path_activities FOR SELECT
  USING (
    is_draft = false
    OR public.is_admin_or_instructor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.path_days pd JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_day_id AND p.created_by = auth.uid()
    )
  );

-- 8. Update path_activities policies (Manage)
DROP POLICY IF EXISTS "Path creators and admins can manage activities" ON public.path_activities;
CREATE POLICY "Path creators and admins can manage activities"
  ON public.path_activities FOR ALL
  USING (
    public.is_admin_or_instructor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.path_days pd JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_day_id AND p.created_by = auth.uid()
    )
  );

-- 9. Update path_activity_progress policies
DROP POLICY IF EXISTS "Students cannot track progress on draft activities" ON public.path_activity_progress;
CREATE POLICY "Students cannot track progress on draft activities"
  ON public.path_activity_progress FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.path_activities WHERE id = activity_id AND is_draft = false)
    OR public.is_admin_or_instructor(auth.uid())
  );

-- 10. Update path_enrollments policies
DROP POLICY IF EXISTS "Users can read their own path enrollments" ON public.path_enrollments;
CREATE POLICY "Users can read their own path enrollments"
  ON public.path_enrollments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.paths p JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_enrollments.path_id AND (s.created_by = auth.uid() OR public.is_admin_or_instructor(auth.uid()))
    )
  );

-- 11. Update path_reflections policies
DROP POLICY IF EXISTS "Users can read reflections for own enrollment" ON public.path_reflections;
CREATE POLICY "Users can read reflections for own enrollment"
  ON public.path_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.path_enrollments pe
      WHERE pe.id = path_reflections.enrollment_id
      AND (
        pe.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.paths p JOIN public.seeds s ON s.id = p.seed_id
          WHERE p.id = pe.path_id AND (s.created_by = auth.uid() OR public.is_admin_or_instructor(auth.uid()))
        )
      )
    )
  );

-- 12. Update path_reports policies
DROP POLICY IF EXISTS "Admins can read all path reports" ON public.path_reports;
CREATE POLICY "Admins can read all path reports"
  ON public.path_reports FOR SELECT
  USING (
    public.is_admin_or_instructor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.path_enrollments pe JOIN public.paths p ON p.id = pe.path_id JOIN public.seeds s ON s.id = p.seed_id
      WHERE pe.id = path_reports.enrollment_id AND s.created_by = auth.uid()
    )
  );

COMMIT;
