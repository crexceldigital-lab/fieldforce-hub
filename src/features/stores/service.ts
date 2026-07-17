// Offline-first store + timeline service.
import { supabase } from "@/integrations/supabase/client";
import { localDB } from "@/features/offline/db";
import { enqueue } from "@/features/offline/outbox";
import { runSync } from "@/features/offline/sync-engine";
import type {
  StoreChannel, StoreRow, StoreTier, TimelineEvent,
} from "@/features/master-data/types";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Reads ----
export function watchStores(orgId: string) {
  return () => localDB.stores.where("organization_id").equals(orgId).sortBy("name");
}
export function watchStore(id: string) {
  return () => localDB.stores.get(id);
}
export function watchTimeline(storeId: string) {
  return async () => {
    const rows = await localDB.timeline_events.where("store_id").equals(storeId).toArray();
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  };
}

// Best-effort direct fetch (used to hydrate on first load if Dexie is empty)
export async function fetchStore(id: string): Promise<StoreRow | null> {
  const local = await localDB.stores.get(id);
  if (local) return local;
  const { data, error } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (data) await localDB.stores.put(data as StoreRow);
  return (data as StoreRow) ?? null;
}

// ---- Writes ----
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

async function writeTimelineLocal(input: {
  orgId: string; storeId: string; eventType: string;
  title: string; description?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as never));
  const ev: TimelineEvent = {
    id: uuid(),
    organization_id: input.orgId,
    store_id: input.storeId,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    actor_id: userData?.user?.id ?? null,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  };
  await localDB.timeline_events.put(ev);
  await enqueue({
    entity: "timeline_events", op: "create", organizationId: input.orgId,
    targetId: ev.id, payload: ev as unknown as Record<string, unknown>,
  });
}

export async function createStore(orgId: string, input: StoreInput): Promise<StoreRow> {
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as never));
  const now = new Date().toISOString();
  const row: StoreRow = {
    id: uuid(),
    organization_id: orgId,
    photo_url: null,
    created_at: now,
    updated_at: now,
    ...input,
  };
  await localDB.stores.put(row);
  await enqueue({
    entity: "stores", op: "create", organizationId: orgId,
    targetId: row.id, payload: { ...row, created_by: userData?.user?.id ?? null },
  });
  await writeTimelineLocal({
    orgId, storeId: row.id, eventType: "store_created",
    title: "Store created", description: `${input.name} added to the CRM`,
  });
  void runSync(orgId);
  return row;
}

export async function updateStore(orgId: string, id: string, input: StoreInput) {
  const existing = await localDB.stores.get(id);
  const baseUpdatedAt = existing?.updated_at ?? null;
  const now = new Date().toISOString();
  if (existing) await localDB.stores.put({ ...existing, ...input, updated_at: now });
  await enqueue({
    entity: "stores", op: "update", organizationId: orgId,
    targetId: id, payload: input as Record<string, unknown>, baseUpdatedAt,
  });
  await writeTimelineLocal({
    orgId, storeId: id, eventType: "store_updated", title: "Store details updated",
  });
  void runSync(orgId);
}

export async function deleteStore(orgId: string, id: string) {
  await localDB.stores.delete(id);
  await enqueue({ entity: "stores", op: "delete", organizationId: orgId, targetId: id, payload: {} });
  void runSync(orgId);
}

/**
 * Import stores from pasted CSV lines. Runs fully offline — rows land in the
 * outbox and replay when back online.
 */
export async function importStoresFromCsv(
  orgId: string,
  csv: string,
  defaults: { channel: StoreChannel; tier: StoreTier; route_id: string | null },
): Promise<{ ok: number; failed: { line: number; reason: string }[] }> {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  let ok = 0;
  const failed: { line: number; reason: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (i === 0 && /^name\s*,/i.test(raw)) continue;
    const [name, owner, phone, lat, lng] = raw.split(",").map((s) => s?.trim() ?? "");
    if (!name) { failed.push({ line: i + 1, reason: "Missing name" }); continue; }
    const latitude = lat ? Number(lat) : null;
    const longitude = lng ? Number(lng) : null;
    if ((lat && Number.isNaN(latitude)) || (lng && Number.isNaN(longitude))) {
      failed.push({ line: i + 1, reason: "Invalid coordinates" }); continue;
    }
    try {
      await createStore(orgId, {
        name, owner_name: owner || null, phone: phone || null,
        latitude, longitude,
        channel: defaults.channel, tier: defaults.tier, route_id: defaults.route_id,
        credit_status: null, notes: null,
      });
      ok++;
    } catch (e) {
      failed.push({ line: i + 1, reason: e instanceof Error ? e.message : "Insert failed" });
    }
  }
  return { ok, failed };
}
