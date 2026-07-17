import { localDB } from "@/features/offline/db";
import { enqueue } from "@/features/offline/outbox";
import { runSync } from "@/features/offline/sync-engine";
import type { Campaign, CampaignForm, CampaignStatus, CampaignStore, Form } from "@/features/master-data/types";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Reads ----
export function watchCampaigns(orgId: string) {
  return () => localDB.campaigns.where("organization_id").equals(orgId).sortBy("name");
}
export function watchCampaign(id: string) {
  return () => localDB.campaigns.get(id);
}
export function watchCampaignStores(campaignId: string) {
  return () => localDB.campaign_stores.where("campaign_id").equals(campaignId).toArray();
}
export function watchCampaignForms(campaignId: string) {
  return () => localDB.campaign_forms.where("campaign_id").equals(campaignId).toArray();
}

export type CampaignInput = {
  name: string;
  description: string | null;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
};

export async function createCampaign(orgId: string, input: CampaignInput): Promise<Campaign> {
  const now = new Date().toISOString();
  const row: Campaign = {
    id: uuid(),
    organization_id: orgId,
    ...input,
    created_at: now,
    updated_at: now,
  };
  await localDB.campaigns.put(row);
  await enqueue({
    entity: "campaigns", op: "create", organizationId: orgId,
    targetId: row.id, payload: row as unknown as Record<string, unknown>,
  });
  void runSync(orgId);
  return row;
}

export async function updateCampaign(orgId: string, id: string, input: CampaignInput) {
  const existing = await localDB.campaigns.get(id);
  const baseUpdatedAt = existing?.updated_at ?? null;
  const now = new Date().toISOString();
  if (existing) await localDB.campaigns.put({ ...existing, ...input, updated_at: now });
  await enqueue({
    entity: "campaigns", op: "update", organizationId: orgId,
    targetId: id, payload: input as Record<string, unknown>, baseUpdatedAt,
  });
  void runSync(orgId);
}

export async function deleteCampaign(orgId: string, id: string) {
  await localDB.campaigns.delete(id);
  await localDB.campaign_stores.where("campaign_id").equals(id).delete();
  await localDB.campaign_forms.where("campaign_id").equals(id).delete();
  await enqueue({
    entity: "campaigns", op: "delete", organizationId: orgId,
    targetId: id, payload: {},
  });
  void runSync(orgId);
}

export async function assignStore(orgId: string, campaignId: string, storeId: string) {
  const existing = await localDB.campaign_stores
    .where({ campaign_id: campaignId, store_id: storeId })
    .first();
  if (existing) return existing;
  const row: CampaignStore = {
    id: uuid(), organization_id: orgId, campaign_id: campaignId, store_id: storeId, created_at: new Date().toISOString(),
  };
  await localDB.campaign_stores.put(row);
  await enqueue({
    entity: "campaign_stores", op: "create", organizationId: orgId,
    targetId: row.id, payload: row as unknown as Record<string, unknown>,
  });
  void runSync(orgId);
  return row;
}

export async function unassignStore(orgId: string, junctionId: string) {
  await localDB.campaign_stores.delete(junctionId);
  await enqueue({
    entity: "campaign_stores", op: "delete", organizationId: orgId,
    targetId: junctionId, payload: {},
  });
  void runSync(orgId);
}

export async function assignForm(orgId: string, campaignId: string, formId: string) {
  const existing = await localDB.campaign_forms
    .where({ campaign_id: campaignId, form_id: formId })
    .first();
  if (existing) return existing;
  const row: CampaignForm = {
    id: uuid(), organization_id: orgId, campaign_id: campaignId, form_id: formId, created_at: new Date().toISOString(),
  };
  await localDB.campaign_forms.put(row);
  await enqueue({
    entity: "campaign_forms", op: "create", organizationId: orgId,
    targetId: row.id, payload: row as unknown as Record<string, unknown>,
  });
  void runSync(orgId);
  return row;
}

export async function unassignForm(orgId: string, junctionId: string) {
  await localDB.campaign_forms.delete(junctionId);
  await enqueue({
    entity: "campaign_forms", op: "delete", organizationId: orgId,
    targetId: junctionId, payload: {},
  });
  void runSync(orgId);
}

export function campaignFormIds(forms: CampaignForm[]) {
  return new Set(forms.map((f) => f.form_id));
}
export function campaignStoreIds(stores: CampaignStore[]) {
  return new Set(stores.map((s) => s.store_id));
}
