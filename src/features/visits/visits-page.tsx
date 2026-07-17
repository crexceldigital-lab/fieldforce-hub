// Field-agent visit inbox: shows campaigns/stores/forms assigned to the user's
// organization so an agent can pick one and submit responses.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardCheck, Search } from "lucide-react";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext } from "@/features/auth/use-current-org";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { localDB } from "@/features/offline/db";
import type {
  Campaign, CampaignForm, CampaignStore, Form, FormSubmission, StoreRow,
} from "@/features/master-data/types";

interface VisitTask {
  campaign: Campaign;
  store: StoreRow;
  form: Form;
  submissions: number;
}

export function VisitsPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const userId = ctx?.userId ?? null;
  const [q, setQ] = useState("");

  const tasks = useLiveQuery(async (): Promise<VisitTask[]> => {
    if (!orgId) return [];
    const [campaigns, campaignStores, campaignForms, stores, forms, submissions] = await Promise.all([
      localDB.campaigns.where("organization_id").equals(orgId).toArray(),
      localDB.campaign_stores.where("organization_id").equals(orgId).toArray(),
      localDB.campaign_forms.where("organization_id").equals(orgId).toArray(),
      localDB.stores.where("organization_id").equals(orgId).toArray(),
      localDB.forms.where("organization_id").equals(orgId).toArray(),
      localDB.form_submissions.where("organization_id").equals(orgId).toArray(),
    ]);
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const formMap = new Map(forms.map((f) => [f.id, f]));
    const list: VisitTask[] = [];
    const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "draft");
    for (const c of activeCampaigns) {
      const cs = campaignStores.filter((x: CampaignStore) => x.campaign_id === c.id);
      const cf = campaignForms.filter((x: CampaignForm) => x.campaign_id === c.id);
      for (const s of cs) {
        const store = storeMap.get(s.store_id);
        if (!store) continue;
        for (const f of cf) {
          const form = formMap.get(f.form_id);
          if (!form) continue;
          const submissionCount = submissions.filter((sub: FormSubmission) =>
            sub.campaign_id === c.id && sub.store_id === store.id &&
            sub.form_id === form.id && (!userId || sub.submitted_by === userId),
          ).length;
          list.push({ campaign: c, store, form, submissions: submissionCount });
        }
      }
    }
    return list;
  }, [orgId, userId], [] as VisitTask[]) ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((t) =>
      t.campaign.name.toLowerCase().includes(term) ||
      t.store.name.toLowerCase().includes(term) ||
      t.form.name.toLowerCase().includes(term),
    );
  }, [tasks, q]);

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardCheck className="h-4 w-4" /> Field visits
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">My visit tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a store + form to collect data. Submissions sync automatically when online.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by campaign, store, or form…"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No visit tasks assigned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              An admin needs to link stores and forms to an active campaign.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {filtered.map((t) => (
              <li key={`${t.campaign.id}-${t.store.id}-${t.form.id}`}>
                <Link
                  to="/app/visits/$campaignId/$storeId/$formId"
                  params={{ campaignId: t.campaign.id, storeId: t.store.id, formId: t.form.id }}
                  className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.campaign.name}</p>
                      <p className="mt-1 font-semibold text-foreground">{t.store.name}</p>
                      <p className="text-sm text-muted-foreground">{t.form.name}</p>
                    </div>
                    {t.submissions > 0 && (
                      <Badge variant="secondary">{t.submissions} sent</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{t.store.channel}</Badge>
                    <Badge variant="outline">{t.store.tier}</Badge>
                    <Badge variant="outline">{t.form.schema?.length ?? 0} question(s)</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
