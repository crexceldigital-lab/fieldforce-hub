// Field-agent submission screen. Fills the assigned form for a store, captures
// photos + GPS, and queues the submission offline-first.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, CheckCircle2, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDB } from "@/features/offline/db";
import type { Campaign, Form, StoreRow } from "@/features/master-data/types";
import { FormRenderer, validateAnswers, type Answers } from "@/features/forms/form-renderer";
import { submitForm } from "@/features/visits/service";

export function VisitSubmitPage() {
  const { campaignId, storeId, formId } = useParams({
    from: "/_authenticated/app/visits/$campaignId/$storeId/$formId",
  });
  const navigate = useNavigate();
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const userId = ctx?.userId ?? null;

  const campaign = useLiveQuery(() => localDB.campaigns.get(campaignId), [campaignId]) as Campaign | undefined;
  const store = useLiveQuery(() => localDB.stores.get(storeId), [storeId]) as StoreRow | undefined;
  const form = useLiveQuery(() => localDB.forms.get(formId), [formId]) as Form | undefined;

  const [answers, setAnswers] = useState<Answers>({});
  const missing = useMemo(
    () => (form?.schema ? validateAnswers(form.schema, answers) : []),
    [form?.schema, answers],
  );

  const submitMut = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      if (!orgId || !userId || !form || !store) throw new Error("Not ready");
      const { photos, cleaned } = extractPhotos(answers, form);
      return submitForm(orgId, userId, {
        form_id: form.id,
        campaign_id: campaign?.id ?? null,
        store_id: store.id,
        answers: cleaned,
        photos,
        status,
      });
    },
    onSuccess: (_row, status) => {
      toast.success(status === "submitted" ? "Submission queued for sync" : "Draft saved");
      navigate({ to: "/app/visits" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!orgId || !form || !store) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">Loading visit…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <Link to="/app/visits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to visits
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{form.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Store: <span className="font-medium text-foreground">{store.name}</span></span>
            {campaign && <span>· Campaign: <span className="font-medium text-foreground">{campaign.name}</span></span>}
            <Badge variant="outline">{store.channel}</Badge>
            <Badge variant="outline">{store.tier}</Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
        <FormRenderer schema={form.schema ?? []} answers={answers} onChange={setAnswers} />

        {missing.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Missing required: {missing.join(", ")}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            disabled={submitMut.isPending}
            onClick={() => submitMut.mutate("draft")}
          >
            {submitMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button
            disabled={submitMut.isPending || missing.length > 0}
            onClick={() => submitMut.mutate("submitted")}
          >
            {submitMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit
          </Button>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          Works offline — submissions queue locally and sync automatically when your device is online.
        </p>
      </div>
    </AppShell>
  );
}

// Photos can be large data URLs; split them into a separate `photos` object so
// the answers payload stays lean when it's queried in the responses dashboard.
function extractPhotos(answers: Answers, form: Form) {
  const photos: Record<string, unknown> = {};
  const cleaned: Answers = { ...answers };
  for (const field of form.schema ?? []) {
    if (field.type !== "photo") continue;
    const v = answers[field.id];
    if (typeof v === "string" && v.startsWith("data:")) {
      photos[field.id] = v;
      cleaned[field.id] = "[photo]";
    }
  }
  return { photos: Object.keys(photos).length ? photos : null, cleaned };
}
