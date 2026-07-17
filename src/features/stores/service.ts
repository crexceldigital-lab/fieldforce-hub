import { db } from "@/integrations/supabase/db";
import { supabase } from "@/integrations/supabase/client";
import type { StoreChannel, StoreRow, StoreTier, TimelineEvent } from "@/features/master-data/types";

export async function fetchStores(orgId: string): Promise<StoreRow[]> {
  const { data, error } = await db
    .from("stores")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchStore(id: string): Promise<StoreRow | null> {
  const { data, error } = await db.from("stores").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type StoreInput = {
  name: string;
  owner_name: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  channel: StoreChannel;
  tier: StoreTier;
  route_id: string | null;
  credit_status: string | null;
  notes: string | null;
};

export async function writeTimelineEvent(input: {
  orgId: string;
  storeId: string;
  eventType: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await db.from("store_timeline_events").insert({
    organization_id: input.orgId,
    store_id: input.storeId,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    actor_id: userData.user?.id ?? null,
    metadata: input.metadata ?? {},
  });
  // Timeline writes are best-effort; don't block the main action.
  if (error) console.error("timeline write failed", error);
}

export async function createStore(orgId: string, input: StoreInput): Promise<StoreRow> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db
    .from("stores")
    .insert({ organization_id: orgId, created_by: userData.user?.id ?? null, ...input })
    .select()
    .single();
  if (error) throw error;
  await writeTimelineEvent({
    orgId,
    storeId: data.id,
    eventType: "store_created",
    title: "Store created",
    description: `${input.name} added to the CRM`,
  });
  return data as StoreRow;
}

export async function updateStore(orgId: string, id: string, input: StoreInput) {
  const { error } = await db.from("stores").update(input).eq("id", id);
  if (error) throw error;
  await writeTimelineEvent({
    orgId,
    storeId: id,
    eventType: "store_updated",
    title: "Store details updated",
  });
}

export async function deleteStore(id: string) {
  const { error } = await db.from("stores").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTimeline(storeId: string): Promise<TimelineEvent[]> {
  const { data, error } = await db
    .from("store_timeline_events")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

/**
 * Import stores from pasted CSV lines:
 *   name, owner, phone, latitude, longitude
 * Only name is required. Returns per-line results.
 * Note: simple comma split — values themselves must not contain commas.
 */
export async function importStoresFromCsv(
  orgId: string,
  csv: string,
  defaults: { channel: StoreChannel; tier: StoreTier; route_id: string | null },
): Promise<{ ok: number; failed: { line: number; reason: string }[] }> {
  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let ok = 0;
  const failed: { line: number; reason: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Skip a header row if present
    if (i === 0 && /^name\s*,/i.test(raw)) continue;
    const [name, owner, phone, lat, lng] = raw.split(",").map((s) => s?.trim() ?? "");
    if (!name) {
      failed.push({ line: i + 1, reason: "Missing name" });
      continue;
    }
    const latitude = lat ? Number(lat) : null;
    const longitude = lng ? Number(lng) : null;
    if ((lat && Number.isNaN(latitude)) || (lng && Number.isNaN(longitude))) {
      failed.push({ line: i + 1, reason: "Invalid coordinates" });
      continue;
    }
    try {
      await createStore(orgId, {
        name,
        owner_name: owner || null,
        phone: phone || null,
        latitude,
        longitude,
        channel: defaults.channel,
        tier: defaults.tier,
        route_id: defaults.route_id,
        credit_status: null,
        notes: null,
      });
      ok++;
    } catch (e) {
      failed.push({ line: i + 1, reason: e instanceof Error ? e.message : "Insert failed" });
    }
  }
  return { ok, failed };
}
