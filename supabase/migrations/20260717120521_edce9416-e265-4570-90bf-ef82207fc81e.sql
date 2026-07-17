
-- Optimistic-locking RPC for offline write replay
CREATE OR REPLACE FUNCTION public.update_if_unchanged(
  _table text,
  _id uuid,
  _patch jsonb,
  _base_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_updated_at timestamptz;
  current_row jsonb;
  updated_row jsonb;
  set_clause text;
  sql text;
BEGIN
  IF _table NOT IN ('stores','products','brands','categories') THEN
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

  -- Build SET clause from patch keys
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

GRANT EXECUTE ON FUNCTION public.update_if_unchanged(text, uuid, jsonb, timestamptz) TO authenticated;

-- Delta-sync indexes
CREATE INDEX IF NOT EXISTS idx_stores_org_updated ON public.stores(organization_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_products_org_updated ON public.products(organization_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_brands_org_updated ON public.brands(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_categories_org_updated ON public.categories(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_org_created ON public.store_timeline_events(organization_id, created_at);
