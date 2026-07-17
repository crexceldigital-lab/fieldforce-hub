// Offline-first submissions service: queues form_submissions in the outbox.
import { localDB } from "@/features/offline/db";
import { enqueue } from "@/features/offline/outbox";
import { runSync } from "@/features/offline/sync-engine";
import type { FormSubmission, SubmissionStatus } from "@/features/master-data/types";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function watchSubmissions(orgId: string) {
  return async () => {
    const rows = await localDB.form_submissions.where("organization_id").equals(orgId).toArray();
    return rows.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  };
}

export function watchSubmissionsForForm(orgId: string, formId: string) {
  return async () => {
    const rows = await localDB.form_submissions
      .where("form_id").equals(formId).toArray();
    return rows
      .filter((r) => r.organization_id === orgId)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  };
}

export function watchMySubmissions(orgId: string, userId: string) {
  return async () => {
    const rows = await localDB.form_submissions
      .where("submitted_by").equals(userId).toArray();
    return rows
      .filter((r) => r.organization_id === orgId)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  };
}

export type SubmissionInput = {
  form_id: string;
  campaign_id: string | null;
  store_id: string;
  answers: Record<string, unknown>;
  photos: Record<string, unknown> | null;
  status: SubmissionStatus;
};

export async function submitForm(
  orgId: string,
  userId: string,
  input: SubmissionInput,
): Promise<FormSubmission> {
  const now = new Date().toISOString();
  const row: FormSubmission = {
    id: uuid(),
    organization_id: orgId,
    form_id: input.form_id,
    campaign_id: input.campaign_id,
    store_id: input.store_id,
    submitted_by: userId,
    submitted_at: now,
    answers: input.answers,
    photos: input.photos,
    status: input.status,
    created_at: now,
    updated_at: now,
  };
  await localDB.form_submissions.put(row);
  await enqueue({
    entity: "form_submissions", op: "create", organizationId: orgId,
    targetId: row.id, payload: row as unknown as Record<string, unknown>,
  });
  void runSync(orgId);
  return row;
}
