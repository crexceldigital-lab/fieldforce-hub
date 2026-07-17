// Step-by-step wizard for creating a new campaign. Handles details, schedule,
// store assignments and form assignments before persisting.
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Form, StoreRow } from "@/features/master-data/types";
import { CAMPAIGN_STATUSES } from "@/features/master-data/types";
import { watchStores } from "@/features/stores/service";
import { watchForms } from "@/features/forms/service";
import {
  assignForm as assignFormJunction,
  assignStore as assignStoreJunction,
  createCampaign,
  type CampaignInput,
} from "@/features/campaigns/service";

const STEPS = ["Details", "Schedule", "Stores", "Forms", "Review"] as const;

export function CampaignWizard({
  orgId, onClose, onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated?: (campaignId: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<CampaignInput>({
    name: "", description: null, status: "draft", starts_at: null, ends_at: null,
  });
  const [storeIds, setStoreIds] = useState<Set<string>>(new Set());
  const [formIds, setFormIds] = useState<Set<string>>(new Set());

  const stores = useLiveQuery(orgId ? watchStores(orgId) : () => [], [orgId], [] as StoreRow[]) ?? [];
  const forms = useLiveQuery(orgId ? watchForms(orgId) : () => [], [orgId], [] as Form[]) ?? [];

  const canAdvance = useMemo(() => {
    if (step === 0) return details.name.trim().length > 0;
    if (step === 1) {
      if (details.starts_at && details.ends_at) {
        return new Date(details.starts_at) <= new Date(details.ends_at);
      }
      return true;
    }
    if (step === 2) return storeIds.size > 0;
    if (step === 3) return formIds.size > 0;
    return true;
  }, [step, details, storeIds, formIds]);

  const createMut = useMutation({
    mutationFn: async () => {
      const c = await createCampaign(orgId, details);
      for (const sId of storeIds) await assignStoreJunction(orgId, c.id, sId);
      for (const fId of formIds) await assignFormJunction(orgId, c.id, fId);
      return c;
    },
    onSuccess: (c) => {
      toast.success(`Campaign "${c.name}" created`);
      onCreated?.(c.id);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
        </DialogHeader>

        <Stepper current={step} />

        <div className="mt-2">
          {step === 0 && <StepDetails value={details} onChange={setDetails} />}
          {step === 1 && <StepSchedule value={details} onChange={setDetails} />}
          {step === 2 && (
            <StepPick
              title="Assign stores"
              subtitle="Pick the retail outlets this campaign covers."
              rows={stores.map((s) => ({ id: s.id, primary: s.name, secondary: `${s.channel} · ${s.tier}` }))}
              selected={storeIds}
              onToggle={(id) => setStoreIds((prev) => toggle(prev, id))}
              emptyLabel="No stores in your organization yet."
            />
          )}
          {step === 3 && (
            <StepPick
              title="Link forms"
              subtitle="Choose the data-collection forms agents will fill during visits."
              rows={forms.map((f) => ({
                id: f.id,
                primary: f.name,
                secondary: `${f.status} · ${f.schema?.length ?? 0} question(s)`,
              }))}
              selected={formIds}
              onToggle={(id) => setFormIds((prev) => toggle(prev, id))}
              emptyLabel="No forms yet — create one on the Forms page first."
            />
          )}
          {step === 4 && (
            <StepReview
              details={details}
              stores={stores.filter((s) => storeIds.has(s.id))}
              forms={forms.filter((f) => formIds.has(f.id))}
            />
          )}
        </div>

        <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {!isLast && (
              <Button disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {isLast && (
              <Button
                disabled={createMut.isPending || !canAdvance}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create campaign
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-2">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
            i < current && "border-primary bg-primary text-primary-foreground",
            i === current && "border-primary text-primary",
            i > current && "border-muted-foreground/30 text-muted-foreground",
          )}>
            {i + 1}
          </div>
          <span className={cn("text-sm", i === current ? "font-medium text-foreground" : "text-muted-foreground")}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground/40">›</span>}
        </li>
      ))}
    </ol>
  );
}

function StepDetails({
  value, onChange,
}: { value: CampaignInput; onChange: (v: CampaignInput) => void }) {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label>Campaign name <span className="text-destructive">*</span></Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g., July Cooler Availability Drive"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={4}
          value={value.description ?? ""}
          onChange={(e) => onChange({ ...value, description: e.target.value || null })}
          placeholder="Objective, target SKUs, and instructions for field agents."
        />
      </div>
    </div>
  );
}

function StepSchedule({
  value, onChange,
}: { value: CampaignInput; onChange: (v: CampaignInput) => void }) {
  const invalidRange =
    value.starts_at && value.ends_at &&
    new Date(value.starts_at) > new Date(value.ends_at);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ ...value, status: v as CampaignInput["status"] })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Starts</Label>
        <Input
          type="date"
          value={value.starts_at ? value.starts_at.slice(0, 10) : ""}
          onChange={(e) => onChange({
            ...value,
            starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
          })}
        />
      </div>
      <div className="space-y-2">
        <Label>Ends</Label>
        <Input
          type="date"
          value={value.ends_at ? value.ends_at.slice(0, 10) : ""}
          onChange={(e) => onChange({
            ...value,
            ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
          })}
        />
      </div>
      {invalidRange && (
        <p className="sm:col-span-3 text-sm text-destructive">End date must be after start date.</p>
      )}
    </div>
  );
}

function StepPick({
  title, subtitle, rows, selected, onToggle, emptyLabel,
}: {
  title: string;
  subtitle: string;
  rows: { id: string; primary: string; secondary: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.size} selected of {rows.length}
      </p>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => onToggle(r.id)}>
                  <TableCell>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => onToggle(r.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{r.primary}</TableCell>
                  <TableCell className="text-muted-foreground">{r.secondary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StepReview({
  details, stores, forms,
}: { details: CampaignInput; stores: StoreRow[]; forms: Form[] }) {
  const period = [details.starts_at, details.ends_at]
    .filter(Boolean).map((d) => new Date(d!).toLocaleDateString()).join(" — ") || "Not set";
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold">Details</h4>
        <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Name</dt><dd>{details.name}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{details.status}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Period</dt><dd>{period}</dd></div>
          {details.description && (
            <div className="sm:col-span-2"><dt className="text-muted-foreground">Description</dt><dd>{details.description}</dd></div>
          )}
        </dl>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold">Stores <Badge variant="outline" className="ml-1">{stores.length}</Badge></h4>
        <ul className="mt-2 flex flex-wrap gap-1 text-sm">
          {stores.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
        </ul>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold">Forms <Badge variant="outline" className="ml-1">{forms.length}</Badge></h4>
        <ul className="mt-2 flex flex-wrap gap-1 text-sm">
          {forms.map((f) => <Badge key={f.id} variant="secondary">{f.name}</Badge>)}
        </ul>
      </div>
    </div>
  );
}
