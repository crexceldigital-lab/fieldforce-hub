
-- ============ ENUMS ============
CREATE TYPE public.app_permission AS ENUM (
  'org.manage','users.manage','roles.manage','territories.manage','stores.manage','stores.delete',
  'products.manage','campaigns.manage','forms.manage','visits.assign','visits.execute',
  'audits.execute','orders.approve','reports.export','finance.view','client_dashboards.view',
  'issues.resolve','kpis.configure','automations.manage','api.access'
);

CREATE TYPE public.role_scope AS ENUM ('platform','organization');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  active_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ROLES ============
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope public.role_scope NOT NULL DEFAULT 'organization',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  PRIMARY KEY (role_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.organization_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _org_id UUID, _perm public.app_permission)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = _user_id
      AND (ur.organization_id = _org_id OR ur.organization_id IS NULL)
      AND rp.permission = _perm
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.scope = 'platform'
  );
$$;

-- ============ RLS POLICIES ============
CREATE POLICY "org_members_read" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "org_admin_update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), id, 'org.manage'));
CREATE POLICY "org_create_any_auth" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "roles_org_read" ON public.roles FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "roles_org_manage" ON public.roles FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.has_permission(auth.uid(), organization_id, 'roles.manage'))
  WITH CHECK (organization_id IS NOT NULL AND public.has_permission(auth.uid(), organization_id, 'roles.manage'));

CREATE POLICY "role_perms_read" ON public.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND (r.organization_id IS NULL OR public.is_org_member(auth.uid(), r.organization_id))));
CREATE POLICY "role_perms_manage" ON public.role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id IS NOT NULL AND public.has_permission(auth.uid(), r.organization_id, 'roles.manage')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id IS NOT NULL AND public.has_permission(auth.uid(), r.organization_id, 'roles.manage')));

CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), organization_id, 'users.manage'));
CREATE POLICY "user_roles_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'users.manage'))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'users.manage'));

-- ============ AUTO PROFILE + ORG BOOTSTRAP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_orgs BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_roles BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ ORG PROVISIONING RPC ============
-- Creates org, default role templates (Org Admin, Field Agent, Client), and assigns caller as Org Admin.
CREATE OR REPLACE FUNCTION public.provision_organization(_name TEXT, _slug TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  admin_role_id UUID;
  agent_role_id UUID;
  client_role_id UUID;
  perm public.app_permission;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.organizations (name, slug) VALUES (_name, _slug) RETURNING id INTO new_org_id;

  -- Org Admin: all permissions
  INSERT INTO public.roles (organization_id, name, description, is_system)
    VALUES (new_org_id, 'Org Admin', 'Full organization management', true) RETURNING id INTO admin_role_id;
  FOR perm IN SELECT unnest(enum_range(NULL::public.app_permission)) LOOP
    INSERT INTO public.role_permissions (role_id, permission) VALUES (admin_role_id, perm);
  END LOOP;

  -- Field Agent
  INSERT INTO public.roles (organization_id, name, description, is_system)
    VALUES (new_org_id, 'Field Agent', 'Executes assigned visits and audits', true) RETURNING id INTO agent_role_id;
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (agent_role_id, 'visits.execute'),
    (agent_role_id, 'audits.execute');

  -- Client
  INSERT INTO public.roles (organization_id, name, description, is_system)
    VALUES (new_org_id, 'Client', 'Read-only campaign dashboards', true) RETURNING id INTO client_role_id;
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (client_role_id, 'client_dashboards.view'),
    (client_role_id, 'reports.export');

  -- Assign caller as Org Admin
  INSERT INTO public.user_roles (user_id, organization_id, role_id) VALUES (auth.uid(), new_org_id, admin_role_id);

  -- Set active org on profile
  UPDATE public.profiles SET active_organization_id = new_org_id WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_organization(TEXT, TEXT) TO authenticated;
