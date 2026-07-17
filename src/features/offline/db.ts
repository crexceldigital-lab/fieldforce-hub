import Dexie, { type Table } from "dexie";
import type {
  Brand, Campaign, CampaignForm, CampaignStore, Category, Form, FormSubmission,
  Product, StoreRow, TimelineEvent,
} from "@/features/master-data/types";

export type EntityName =
  | "stores" | "products" | "brands" | "categories" | "timeline_events"
  | "campaigns" | "forms" | "campaign_stores" | "campaign_forms" | "form_submissions";

export type OutboxOp = "create" | "update" | "delete";

export interface OutboxItem {
  id: string;
  entity: EntityName;
  op: OutboxOp;
  organizationId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
  createdAt: string;
  tries: number;
  lastError: string | null;
  status: "pending" | "syncing" | "conflict" | "failed";
  serverRow: Record<string, unknown> | null;
}

export interface MetaRow {
  key: string;
  value: string;
}

class FieldForceDB extends Dexie {
  stores!: Table<StoreRow, string>;
  products!: Table<Product, string>;
  brands!: Table<Brand, string>;
  categories!: Table<Category, string>;
  timeline_events!: Table<TimelineEvent, string>;
  campaigns!: Table<Campaign, string>;
  forms!: Table<Form, string>;
  campaign_stores!: Table<CampaignStore, string>;
  campaign_forms!: Table<CampaignForm, string>;
  form_submissions!: Table<FormSubmission, string>;
  outbox!: Table<OutboxItem, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("revoltek_fieldforce");
    this.version(2).stores({
      stores: "id, organization_id, updated_at, name, tier, channel, route_id",
      products: "id, organization_id, updated_at, brand_id, category_id, name, is_active",
      brands: "id, organization_id, name",
      categories: "id, organization_id, name",
      timeline_events: "id, organization_id, store_id, created_at",
      campaigns: "id, organization_id, updated_at, status, name",
      forms: "id, organization_id, updated_at, status, name",
      campaign_stores: "id, organization_id, campaign_id, store_id",
      campaign_forms: "id, organization_id, campaign_id, form_id",
      form_submissions: "id, organization_id, updated_at, form_id, campaign_id, store_id, submitted_by",
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
