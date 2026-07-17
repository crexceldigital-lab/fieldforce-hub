import { localDB } from "@/features/offline/db";
import { enqueue } from "@/features/offline/outbox";
import { runSync } from "@/features/offline/sync-engine";
import type { Form, FormField, FormStatus } from "@/features/master-data/types";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Reads ----
export function watchForms(orgId: string) {
  return () => localDB.forms.where("organization_id").equals(orgId).sortBy("name");
}
export function watchForm(id: string) {
  return () => localDB.forms.get(id);
}

export type FormInput = {
  name: string;
  description: string | null;
  status: FormStatus;
  schema: FormField[];
};

export async function createForm(orgId: string, input: FormInput): Promise<Form> {
  const now = new Date().toISOString();
  const row: Form = {
    id: uuid(),
    organization_id: orgId,
    ...input,
    version: 1,
    created_at: now,
    updated_at: now,
  };
  await localDB.forms.put(row);
  await enqueue({
    entity: "forms", op: "create", organizationId: orgId,
    targetId: row.id, payload: row as unknown as Record<string, unknown>,
  });
  void runSync(orgId);
  return row;
}

export async function updateForm(orgId: string, id: string, input: FormInput) {
  const existing = await localDB.forms.get(id);
  const baseUpdatedAt = existing?.updated_at ?? null;
  const now = new Date().toISOString();
  const nextVersion = (existing?.version ?? 1) + 1;
  if (existing) {
    await localDB.forms.put({ ...existing, ...input, version: nextVersion, updated_at: now });
  }
  await enqueue({
    entity: "forms", op: "update", organizationId: orgId,
    targetId: id, payload: { ...input, version: nextVersion } as Record<string, unknown>, baseUpdatedAt,
  });
  void runSync(orgId);
}

export async function deleteForm(orgId: string, id: string) {
  await localDB.forms.delete(id);
  await enqueue({
    entity: "forms", op: "delete", organizationId: orgId,
    targetId: id, payload: {},
  });
  void runSync(orgId);
}

export function nextFieldOrder(fields: FormField[]) {
  return fields.length > 0 ? Math.max(...fields.map((f) => f.order)) + 1 : 1;
}
