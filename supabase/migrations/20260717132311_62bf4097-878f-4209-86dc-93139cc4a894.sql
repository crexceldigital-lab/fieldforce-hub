CREATE TABLE public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  schema jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage forms"
ON public.forms
FOR ALL
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.campaign_stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, store_id)
);

GRANT SELECT, INSERT, DELETE ON public.campaign_stores TO authenticated;
GRANT ALL ON public.campaign_stores TO service_role;

ALTER TABLE public.campaign_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage campaign stores"
ON public.campaign_stores
FOR ALL
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.campaign_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, form_id)
);

GRANT SELECT, INSERT, DELETE ON public.campaign_forms TO authenticated;
GRANT ALL ON public.campaign_forms TO service_role;

ALTER TABLE public.campaign_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage campaign forms"
ON public.campaign_forms
FOR ALL
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  photos jsonb,
  status text not null default 'draft' check (status in ('draft','submitted','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage submissions"
ON public.form_submissions
FOR ALL
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER tg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER tg_forms_updated_at BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER tg_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_campaigns_org_updated ON public.campaigns(organization_id, updated_at);
CREATE INDEX idx_forms_org_updated ON public.forms(organization_id, updated_at);
CREATE INDEX idx_form_submissions_org_updated ON public.form_submissions(organization_id, updated_at);
CREATE INDEX idx_campaign_stores_campaign ON public.campaign_stores(campaign_id);
CREATE INDEX idx_campaign_forms_campaign ON public.campaign_forms(campaign_id);

CREATE OR REPLACE FUNCTION public.update_if_unchanged(
  _table text,
  _id uuid,
  _patch jsonb,
  _base_updated_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_updated_at timestamptz;
  current_row jsonb;
  updated_row jsonb;
  set_clause text;
  sql text;
BEGIN
  IF _table NOT IN ('stores','products','brands','categories','campaigns','forms','form_submissions') THEN
    RAISE EXCEPTION 'table % not allowed', _table;
  END IF;

  EXECUTE format('SELECT to_jsonb(t), t.updated_at FROM public.%I t WHERE id = $1', _table)
    INTO current_row, current_updated_at
    USING _id;

  IF current_row IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  IF _base_updated_at IS NOT NULL AND current_updated_at <> _base_updated_at THEN
    RETURN jsonb_build_object('status','conflict','current', current_row);
  END IF;

  SELECT string_agg(format('%I = ($2->>%L)::text', k, k), ', ')
    INTO set_clause
    FROM jsonb_object_keys(_patch) k;

  IF set_clause IS NULL THEN
    RETURN jsonb_build_object('status','ok','row', current_row);
  END IF;

  sql := format(
    'UPDATE public.%I SET %s, updated_at = now() WHERE id = $1 RETURNING to_jsonb(%I.*)',
    _table, set_clause, _table
  );
  EXECUTE sql INTO updated_row USING _id, _patch;

  RETURN jsonb_build_object('status','ok','row', updated_row);
END;
$$;