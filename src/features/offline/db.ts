// Local IndexedDB mirror + write outbox for offline-first sync.
import Dexie, { type Table } from "dexie";
import type {
  Brand, Category, Product, StoreRow, TimelineEvent,
} from "@/features/master-data/types";

export type EntityName = "stores" | "products" | "brands" | "categories" | "timeline_events";

export type OutboxOp = "create" | "update" | "delete";

export interface OutboxItem {
  id: string;                       // uuid — same as target row id for create/update
  entity: EntityName;
  op: OutboxOp;
  organizationId: string;
  payload: Record<string, unknown>; // full row for create; patch for update; {} for delete
  baseUpdatedAt: string | null;     // for optimistic-lock on update/delete
  createdAt: string;
  tries: number;
  lastError: string | null;
  status: "pending" | "syncing" | "conflict" | "failed";
  serverRow: Record<string, unknown> | null; // populated on conflict
}

export interface MetaRow {
  key: string;   // `${orgId}:${entity}:lastPullAt`
  value: string;
}

class FieldForceDB extends Dexie {
  stores!: Table<StoreRow, string>;
  products!: Table<Product, string>;
  brands!: Table<Brand, string>;
  categories!: Table<Category, string>;
  timeline_events!: Table<TimelineEvent, string>;
  outbox!: Table<OutboxItem, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("revoltek_fieldforce");
    this.version(1).stores({
      stores: "id, organization_id, updated_at, name, tier, channel, route_id",
      products: "id, organization_id, updated_at, brand_id, category_id, name, is_active",
      brands: "id, organization_id, name",
      categories: "id, organization_id, name",
      timeline_events: "id, organization_id, store_id, created_at",
      outbox: "id, status, createdAt, entity, organizationId",
      meta: "key",
    });
  }
}

export const localDB = new FieldForceDB();

export async function getMeta(key: string): Promise<string | null> {
  const row = await localDB.meta.get(key);
  return row?.value ?? null;
}
export async function setMeta(key: string, value: string): Promise<void> {
  await localDB.meta.put({ key, value });
}
