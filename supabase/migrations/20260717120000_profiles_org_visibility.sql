-- ============================================================
-- Profiles: allow members of the same organization to read each
-- other's basic profile (name, email) so member lists, territory
-- assignments, and timelines can show names.
-- The existing policy only allowed reading your own profile.
-- ============================================================

CREATE OR REPLACE FUNCTION public.shares_organization(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ra
    JOIN public.user_roles rb
      ON ra.organization_id = rb.organization_id
    WHERE ra.user_id = _a
      AND rb.user_id = _b
      AND ra.organization_id IS NOT NULL
  );
$$;

DROP POLICY IF EXISTS "profiles_org_read" ON public.profiles;
CREATE POLICY "profiles_org_read" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.shares_organization(auth.uid(), id)
    OR public.is_platform_admin(auth.uid())
  );
