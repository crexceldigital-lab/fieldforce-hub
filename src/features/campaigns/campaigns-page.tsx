import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { Flag, Link2, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Campaign, CampaignForm, CampaignStore, Form, StoreRow } from "@/features/master-data/types";
import { CAMPAIGN_STATUSES } from "@/features/master-data/types";
import { watchStores } from "@/features/stores/service";
import { watchForms } from "@/features/forms/service";
import {
  assignForm, assignStore, createCampaign, deleteCampaign,
  unassignForm, unassignStore, updateCampaign, watchCampaignForms,
  watchCampaigns, watchCampaignStores, type CampaignInput,
} from "./service";

export function CampaignsPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("campaigns.manage");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);

  const campaigns = useLiveQuery(
    orgId ? watchCampaigns(orgId) : () => [],
    [orgId], [] as Campaign[],
  ) ?? [];

  const filtered = campaigns.filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
  });

  const statusLabel = (value: string) => CAMPAIGN_STATUSES.find((s) => s.value === value)?.label ?? value;
  const statusVariant = (value: string) => {
    if (value === "active") return "default";
    if (value === "completed") return "secondary";
    if (value === "paused") return "outline";
    return "outline";
  };

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Campaigns</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan rollouts, link forms, and assign stores to field teams.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="mr-1 h-4 w-4" /> New campaign
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search campaigns…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {campaigns.length} campaigns
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Flag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a campaign to bundle stores, forms, and a schedule.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Stores</TableHead>
                  <TableHead>Forms</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    canManage={canManage}
                    onEdit={() => setEditing(c)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && orgId && (
        <CampaignDialog
          orgId={orgId}
          campaign={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
}

function CampaignRow({
  campaign, canManage, onEdit,
}: { campaign: Campaign; canManage: boolean; onEdit: () => void }) {
  const stores = useLiveQuery(
    () => watchCampaignStores(campaign.id)(),
    [campaign.id], [] as CampaignStore[],
  ) ?? [];
  const forms = useLiveQuery(
    () => watchCampaignForms(campaign.id)(),
    [campaign.id], [] as CampaignForm[],
  ) ?? [];

  const deleteMut = useMutation({
    mutationFn: () => deleteCampaign(campaign.organization_id, campaign.id),
    onSuccess: () => toast.success("Campaign deleted"),
    onError: (e: Error) => toast.error(e.message),
  });

  const period = [campaign.starts_at, campaign.ends_at]
    .filter(Boolean)
    .map((d) => new Date(d!).toLocaleDateString())
    .join(" — ");

  const statusLabel = (value: string) => CAMPAIGN_STATUSES.find((s) => s.value === value)?.label ?? value;
  const statusVariant = (value: string) => {
    if (value === "active") return "default";
    if (value === "completed") return "secondary";
    return "outline";
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {campaign.name}
        <p className="max-w-xs truncate text-xs text-muted-foreground">{campaign.description}</p>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(campaign.status) as never}>{statusLabel(campaign.status)}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{period || "—"}</TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1 text-sm"><Store className="h-3.5 w-3.5" /> {stores.length}</span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1 text-sm"><Link2 className="h-3.5 w-3.5" /> {forms.length}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {canManage && (
            <>
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => { if (confirm(`Delete "${campaign.name}"?`)) deleteMut.mutate(); }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CampaignDialog({
  orgId, campaign, onClose,
}: { orgId: string; campaign: Campaign | null; onClose: () => void }) {
  const [input, setInput] = useState<CampaignInput>({
    name: campaign?.name ?? "",
    description: campaign?.description ?? null,
    status: campaign?.status ?? "draft",
    starts_at: campaign?.starts_at ?? null,
    ends_at: campaign?.ends_at ?? null,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (campaign) await updateCampaign(orgId, campaign.id, input);
      else await createCampaign(orgId, input);
    },
    onSuccess: () => {
      toast.success(campaign ? "Campaign updated" : "Campaign created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "New campaign"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            {campaign && <TabsTrigger value="stores">Stores</TabsTrigger>}
            {campaign && <TabsTrigger value="forms">Forms</TabsTrigger>}
          </TabsList>
          <CampaignDetailsTab value={input} onChange={setInput} />
          {campaign && <CampaignStoresTab orgId={orgId} campaignId={campaign.id} />}
          {campaign && <CampaignFormsTab orgId={orgId} campaignId={campaign.id} />}
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!input.name.trim() || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {campaign ? "Save changes" : "Create campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailsTab({
  value, onChange,
}: { value: CampaignInput; onChange: (input: CampaignInput) => void }) {
  const set = <K extends keyof CampaignInput>(key: K, val: CampaignInput[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label>Campaign name</Label>
        <Input
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., July Cooler Availability Drive"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
          placeholder="Objective, target SKUs, and instructions for field agents."
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(v) => set("status", v as CampaignInput["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Starts at</Label>
          <Input
            type="date"
            value={value.starts_at ? value.starts_at.slice(0, 10) : ""}
            onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ends at</Label>
          <Input
            type="date"
            value={value.ends_at ? value.ends_at.slice(0, 10) : ""}
            onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </div>
      </div>
    </div>
  );
}

function CampaignStoresTab({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const allStores = useLiveQuery(orgId ? watchStores(orgId) : () => [], [orgId], [] as StoreRow[]) ?? [];
  const assigned = useLiveQuery(() => watchCampaignStores(campaignId)(), [campaignId], [] as CampaignStore[]) ?? [];
  const assignedIds = useMemo(() => new Set(assigned.map((s) => s.store_id)), [assigned]);

  const assignMut = useMutation({
    mutationFn: (storeId: string) => assignStore(orgId, campaignId, storeId),
    onError: (e: Error) => toast.error(e.message),
  });
  const unassignMut = useMutation({
    mutationFn: (junctionId: string) => unassignStore(orgId, junctionId),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{assigned.length} store(s) assigned</p>
      <div className="max-h-80 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Store</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allStores.map((s) => {
              const junction = assigned.find((a) => a.store_id === s.id);
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Checkbox
                      checked={assignedIds.has(s.id)}
                      onCheckedChange={(checked) => {
                        if (checked) assignMut.mutate(s.id);
                        else if (junction) unassignMut.mutate(junction.id);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.channel}</TableCell>
                  <TableCell className="text-muted-foreground">{s.tier}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CampaignFormsTab({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const allForms = useLiveQuery(orgId ? watchForms(orgId) : () => [], [orgId], [] as Form[]) ?? [];
  const assigned = useLiveQuery(() => watchCampaignForms(campaignId)(), [campaignId], [] as CampaignForm[]) ?? [];
  const assignedIds = useMemo(() => new Set(assigned.map((f) => f.form_id)), [assigned]);

  const assignMut = useMutation({
    mutationFn: (formId: string) => assignForm(orgId, campaignId, formId),
    onError: (e: Error) => toast.error(e.message),
  });
  const unassignMut = useMutation({
    mutationFn: (junctionId: string) => unassignForm(orgId, junctionId),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{assigned.length} form(s) linked</p>
      <div className="max-h-80 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Form</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allForms.map((f) => {
              const junction = assigned.find((a) => a.form_id === f.id);
              return (
                <TableRow key={f.id}>
                  <TableCell>
                    <Checkbox
                      checked={assignedIds.has(f.id)}
                      onCheckedChange={(checked) => {
                        if (checked) assignMut.mutate(f.id);
                        else if (junction) unassignMut.mutate(junction.id);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground">{f.status}</TableCell>
                  <TableCell className="text-muted-foreground">{f.schema?.length ?? 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
