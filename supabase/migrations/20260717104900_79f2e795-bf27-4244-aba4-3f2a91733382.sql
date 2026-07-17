
-- Enums
CREATE TYPE public.territory_level AS ENUM ('country','region','district','ward','route');
CREATE TYPE public.store_channel AS ENUM ('modern_trade','traditional_trade','wholesale','kiosk');
CREATE TYPE public.store_tier AS ENUM ('gold','silver','bronze','unclassified');

-- Shared updated_at trigger (may already exist as tg_set_updated_at)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========== territories ===========
CREATE TABLE public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level public.territory_level NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.territories(organization_id);
CREATE INDEX ON public.territories(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.territories TO authenticated;
GRANT ALL ON public.territories TO service_role;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage territories" ON public.territories
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_territories_updated BEFORE UPDATE ON public.territories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== territory_assignments ===========
CREATE TABLE public.territory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(territory_id, user_id)
);
CREATE INDEX ON public.territory_assignments(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.territory_assignments TO authenticated;
GRANT ALL ON public.territory_assignments TO service_role;
ALTER TABLE public.territory_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage assignments" ON public.territory_assignments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- =========== brands ===========
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.brands(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- =========== categories ===========
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.categories(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- =========== products ===========
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  unit_price NUMERIC,
  package_size TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_competitor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products(organization_id);
CREATE INDEX ON public.products(brand_id);
CREATE INDEX ON public.products(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== stores ===========
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  channel public.store_channel NOT NULL DEFAULT 'traditional_trade',
  tier public.store_tier NOT NULL DEFAULT 'unclassified',
  credit_status TEXT,
  notes TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stores(organization_id);
CREATE INDEX ON public.stores(route_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members view stores" ON public.stores
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members insert stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update stores" ON public.stores
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "permitted members delete stores" ON public.stores
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'stores.delete'));
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== store_timeline_events ===========
CREATE TABLE public.store_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.store_timeline_events(store_id);
CREATE INDEX ON public.store_timeline_events(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_timeline_events TO authenticated;
GRANT ALL ON public.store_timeline_events TO service_role;
ALTER TABLE public.store_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage timeline" ON public.store_timeline_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
