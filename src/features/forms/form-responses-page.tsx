// Responses dashboard for a single form with campaign / store / date filters
// and CSV export. Reads from the offline-first Dexie mirror.
import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, Inbox } from "lucide-react";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { localDB } from "@/features/offline/db";
import type {
  Campaign, Form, FormField, FormSubmission, StoreRow,
} from "@/features/master-data/types";

export function FormResponsesPage() {
  const { formId } = useParams({ from: "/_authenticated/app/forms/$formId/responses" });
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;

  const form = useLiveQuery(() => localDB.forms.get(formId), [formId]) as Form | undefined;

  const campaigns = useLiveQuery(
    () => (orgId ? localDB.campaigns.where("organization_id").equals(orgId).toArray() : []),
    [orgId], [] as Campaign[],
  ) ?? [];
  const stores = useLiveQuery(
    () => (orgId ? localDB.stores.where("organization_id").equals(orgId).toArray() : []),
    [orgId], [] as StoreRow[],
  ) ?? [];
  const submissions = useLiveQuery(
    async () => {
      if (!orgId) return [];
      const rows = await localDB.form_submissions.where("form_id").equals(formId).toArray();
      return rows
        .filter((r) => r.organization_id === orgId)
        .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    },
    [orgId, formId], [] as FormSubmission[],
  ) ?? [];

  const [campaignId, setCampaignId] = useState<string>("all");
  const [storeId, setStoreId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const campaignMap = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (campaignId !== "all" && s.campaign_id !== campaignId) return false;
      if (storeId !== "all" && s.store_id !== storeId) return false;
      if (fromDate && s.submitted_at < new Date(fromDate).toISOString()) return false;
      if (toDate) {
        const end = new Date(toDate); end.setHours(23, 59, 59, 999);
        if (s.submitted_at > end.toISOString()) return false;
      }
      return true;
    });
  }, [submissions, campaignId, storeId, fromDate, toDate]);

  const exportCsv = () => {
    if (!form) return;
    const fields = [...(form.schema ?? [])].sort((a, b) => a.order - b.order);
    const header = [
      "submitted_at", "campaign", "store", "status",
      ...fields.map((f) => sanitize(f.label)),
    ];
    const lines = [header.join(",")];
    for (const s of filtered) {
      const row = [
        s.submitted_at,
        campaignMap.get(s.campaign_id ?? "")?.name ?? "",
        storeMap.get(s.store_id)?.name ?? "",
        s.status,
        ...fields.map((f) => csvCell(s.answers?.[f.id], f)),
      ];
      lines.push(row.map(escapeCsv).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(form.name || "form").replace(/[^a-z0-9]+/gi, "_")}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!form) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">Loading form…</div>
      </AppShell>
    );
  }

  const fields = [...(form.schema ?? [])].sort((a, b) => a.order - b.order);

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <Link to="/app/forms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to forms
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{form.name}</h1>
              <p className="text-sm text-muted-foreground">Responses dashboard</p>
            </div>
            <Button onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stores</SelectItem>
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filtered.length} of {submissions.length} response(s)
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No responses match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  {fields.map((f) => (
                    <TableHead key={f.id} className="min-w-[140px]">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.submitted_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{campaignMap.get(s.campaign_id ?? "")?.name ?? "—"}</TableCell>
                    <TableCell>{storeMap.get(s.store_id)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "submitted" ? "default" : "outline"}>{s.status}</Badge>
                    </TableCell>
                    {fields.map((f) => (
                      <TableCell key={f.id} className="max-w-xs truncate">
                        {renderCell(s.answers?.[f.id], f)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function renderCell(v: unknown, field: FormField): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field.type === "multi_select" && Array.isArray(v)) return v.join(", ");
  if (field.type === "gps" && v && typeof v === "object") {
    const p = v as { lat?: number; lng?: number };
    if (typeof p.lat === "number" && typeof p.lng === "number") {
      return `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
    }
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function csvCell(v: unknown, field: FormField): string {
  return renderCell(v, field);
}

function escapeCsv(v: string): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, " ");
}
