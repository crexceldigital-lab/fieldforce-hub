// Pull deltas + push outbox with optimistic locking.
import { supabase } from "@/integrations/supabase/client";
import { localDB, getMeta, setMeta, type EntityName, type OutboxItem } from "./db";
import { markConflict, removeItem } from "./outbox";

type Status = "idle" | "syncing" | "offline" | "error";
type Listener = (s: SyncState) => void;

export interface SyncState {
  status: Status;
  lastSyncAt: string | null;
  lastError: string | null;
}

let state: SyncState = { status: "idle", lastSyncAt: null, lastError: null };
const listeners = new Set<Listener>();
let inflight: Promise<void> | null = null;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let started = false;

function set(next: Partial<SyncState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export function getSyncState(): SyncState { return state; }
export function subscribeSync(fn: Listener): () => void {
  listeners.add(fn); fn(state); return () => { listeners.delete(fn); };
}

const PULL_TABLES: { entity: EntityName; timeField: "updated_at" | "created_at"; table: string }[] = [
  { entity: "stores", timeField: "updated_at", table: "stores" },
  { entity: "products", timeField: "updated_at", table: "products" },
  { entity: "brands", timeField: "created_at", table: "brands" },
  { entity: "categories", timeField: "created_at", table: "categories" },
  { entity: "timeline_events", timeField: "created_at", table: "store_timeline_events" },
];

async function pullEntity(orgId: string, spec: typeof PULL_TABLES[number]) {
  const metaKey = `${orgId}:${spec.entity}:lastPullAt`;
  const since = await getMeta(metaKey);
  let q = supabase.from(spec.table as never).select("*").eq("organization_id", orgId).order(spec.timeField, { ascending: true }).limit(500);
  if (since) q = q.gt(spec.timeField, since);
  const { data, error } = await q;
  if (error) throw new Error(`pull ${spec.entity}: ${error.message}`);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return;
  await (localDB as unknown as Record<EntityName, { bulkPut: (r: unknown[]) => Promise<unknown> }>)[spec.entity].bulkPut(rows);
  const newest = rows[rows.length - 1][spec.timeField] as string;
  await setMeta(metaKey, newest);
}

async function pushItem(item: OutboxItem): Promise<void> {
  const tableName = item.entity === "timeline_events" ? "store_timeline_events" : item.entity;
  await localDB.outbox.update(item.id, { status: "syncing" });

  try {
    if (item.op === "create") {
      const { error } = await supabase.from(tableName as never).insert(item.payload as never);
      if (error) throw error;
      await removeItem(item.id);
      return;
    }

    if (item.op === "delete") {
      const { error } = await supabase.from(tableName as never).delete().eq("id", item.payload.id as string);
      if (error) throw error;
      await removeItem(item.id);
      return;
    }

    // update — optimistic lock via RPC for lockable tables
    if (["stores", "products", "brands", "categories"].includes(item.entity)) {
      const { id: _drop, ...patch } = item.payload;
      const { data, error } = await supabase.rpc("update_if_unchanged", {
        _table: item.entity,
        _id: item.payload.id as string,
        _patch: patch as never,
        _base_updated_at: item.baseUpdatedAt ?? new Date(0).toISOString(),
      });
      if (error) throw error;
      const result = data as { status: string; current?: Record<string, unknown>; row?: Record<string, unknown> };
      if (result.status === "conflict" && result.current) {
        await markConflict(item.id, result.current);
        return;
      }
      if (result.status === "not_found") {
        await removeItem(item.id);
        return;
      }
      await removeItem(item.id);
      return;
    }

    // Fallback plain update
    const { id: _dropId, ...patch } = item.payload;
    const { error } = await supabase.from(tableName as never).update(patch as never).eq("id", item.payload.id as string);
    if (error) throw error;
    await removeItem(item.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await localDB.outbox.update(item.id, { status: "failed", lastError: msg, tries: item.tries + 1 });
    throw e;
  }
}

async function pushOutbox(): Promise<void> {
  const items = await localDB.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .sortBy("createdAt");
  for (const item of items) {
    // Skip failed items that have retried too much within this run (leave for user)
    if (item.tries >= 5) continue;
    try {
      await pushItem(item);
    } catch {
      // stop draining if network fails
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!online) return;
    }
  }
}

export async function runSync(orgId: string | null): Promise<void> {
  if (!orgId) return;
  if (inflight) return inflight;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    set({ status: "offline" });
    return;
  }
  set({ status: "syncing", lastError: null });
  inflight = (async () => {
    try {
      await pushOutbox();
      for (const spec of PULL_TABLES) await pullEntity(orgId, spec);
      set({ status: "idle", lastSyncAt: new Date().toISOString() });
    } catch (e) {
      set({ status: "error", lastError: e instanceof Error ? e.message : "sync failed" });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function startSyncLoop(getOrgId: () => string | null) {
  if (started) return;
  started = true;
  const trigger = () => { void runSync(getOrgId()); };
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => { set({ status: "idle" }); trigger(); });
    window.addEventListener("offline", () => set({ status: "offline" }));
    window.addEventListener("focus", trigger);
  }
  intervalHandle = setInterval(trigger, 60_000);
  trigger();
}

export function stopSyncLoop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
  started = false;
}
