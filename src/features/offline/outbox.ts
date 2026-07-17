import { localDB, type EntityName, type OutboxItem, type OutboxOp } from "./db";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueue(input: {
  entity: EntityName;
  op: OutboxOp;
  organizationId: string;
  targetId?: string;
  payload: Record<string, unknown>;
  baseUpdatedAt?: string | null;
}): Promise<string> {
  const id = input.targetId ?? uuid();
  const item: OutboxItem = {
    id: `${input.op}:${id}:${uuid()}`,
    entity: input.entity,
    op: input.op,
    organizationId: input.organizationId,
    payload: { ...input.payload, id },
    baseUpdatedAt: input.baseUpdatedAt ?? null,
    createdAt: new Date().toISOString(),
    tries: 0,
    lastError: null,
    status: "pending",
    serverRow: null,
  };
  await localDB.outbox.add(item);
  return id;
}

export async function pendingCount(): Promise<number> {
  return localDB.outbox.where("status").anyOf(["pending", "syncing", "failed"]).count();
}

export async function conflictCount(): Promise<number> {
  return localDB.outbox.where("status").equals("conflict").count();
}

export async function listConflicts(): Promise<OutboxItem[]> {
  return localDB.outbox.where("status").equals("conflict").toArray();
}

export async function markConflict(itemId: string, serverRow: Record<string, unknown>) {
  await localDB.outbox.update(itemId, { status: "conflict", serverRow });
}

export async function removeItem(itemId: string) {
  await localDB.outbox.delete(itemId);
}

export async function reQueue(itemId: string, patch: Partial<OutboxItem>) {
  await localDB.outbox.update(itemId, { status: "pending", tries: 0, lastError: null, ...patch });
}
