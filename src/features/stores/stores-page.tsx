import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil, Plus, Store as StoreIcon, Trash2, Upload } from "lucide-react";
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
import {
  STORE_CHANNELS, STORE_TIERS, type StoreRow, type StoreTier,
} from "@/features/master-data/types";
import { fetchTerritories } from "@/features/territories/service";
import { deleteStore, importStoresFromCsv, watchStores } from "./service";
import { StoreFormDialog } from "./store-form-dialog";

const tierBadgeClass: Record<StoreTier, string> = {
  gold: "bg-amber-100 text-amber-800 border-amber-200",
  silver: "bg-slate-100 text-slate-700 border-slate-200",
  bronze: "bg-orange-100 text-orange-800 border-orange-200",
  unclassified: "bg-muted text-muted-foreground",
};

export function StoresPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("stores.manage");
  const canDelete = usePermission("stores.delete");

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [editing, setEditing] = useState<StoreRow | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  const stores = useLiveQuery(
    orgId ? watchStores(orgId) : () => [],
    [orgId], [] as StoreRow[],
  ) ?? [];
  const territoriesQ = useQuery({
    queryKey: ["territories", orgId], queryFn: () => fetchTerritories(orgId!),
    enabled: !!orgId,
  });
  const routeName = (id: string | null) =>
    (territoriesQ.data ?? []).find((t) => t.id === id)?.name ?? "—";

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStore(orgId!, id),
    onSuccess: () => toast.success("Store deleted (offline-safe)"),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (tierFilter !== "all" && s.tier !== tierFilter) return false;
      if (channelFilter !== "all" && s.channel !== channelFilter) return false;
      if (q && !`${s.name} ${s.owner_name ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stores, search, tierFilter, channelFilter]);

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Stores</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your retail CRM. Search, edit, and add stores even without a signal.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImporting(true)}>
                <Upload className="mr-1 h-4 w-4" /> Import CSV
              </Button>
              <Button onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> Add store
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search name, owner, phone…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {STORE_TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {STORE_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {stores.length} stores
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <StoreIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No stores found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stores.length ? "Adjust your filters." : "Add stores one by one or import a CSV to build your retail universe."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/app/stores/$storeId"
                        params={{ storeId: s.id }}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell>{s.owner_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                    <TableCell>{STORE_CHANNELS.find((c) => c.value === s.channel)?.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tierBadgeClass[s.tier as StoreTier]}>
                        {STORE_TIERS.find((t) => t.value === s.tier)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{routeName(s.route_id)}</TableCell>
                    <TableCell>
                      {s.latitude != null && s.longitude != null ? (
                        <a
                          href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Map <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canManage && (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm(`Delete "${s.name}"? This removes its history too.`)) deleteMut.mutate(s.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && orgId && (
        <StoreFormDialog
          orgId={orgId}
          store={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {importing && orgId && (
        <ImportDialog orgId={orgId} onClose={() => setImporting(false)} onDone={() => { /* live-query auto-refreshes */ }} />
      )}
    </AppShell>
  );
}

function ImportDialog({
  orgId, onClose, onDone,
}: { orgId: string; onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [tier, setTier] = useState<StoreTier>("unclassified");
  const [channel, setChannel] = useState("traditional_trade");
  const [routeId, setRouteId] = useState<string>("__none__");

  const territoriesQ = useQuery({
    queryKey: ["territories", orgId],
    queryFn: () => fetchTerritories(orgId),
  });
  const routes = (territoriesQ.data ?? []).filter((t) => t.level === "route");

  const importMut = useMutation({
    mutationFn: () =>
      importStoresFromCsv(orgId, csv, {
        channel: channel as never,
        tier,
        route_id: routeId === "__none__" ? null : routeId,
      }),
    onSuccess: (res) => {
      toast.success(`Queued ${res.ok} store${res.ok === 1 ? "" : "s"} (offline-safe)`);
      if (res.failed.length) {
        toast.error(`${res.failed.length} line(s) failed — first: line ${res.failed[0].line}: ${res.failed[0].reason}`);
      }
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import stores from CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          One store per line: <code>name, owner, phone, latitude, longitude</code>.
          Only the name is required.
        </p>
        <Textarea
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"Duka la Mama Amina, Amina Hassan, +255712000001, -6.7924, 39.2083"}
          className="font-mono text-xs"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Default channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as StoreTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!csv.trim() || importMut.isPending} onClick={() => importMut.mutate()}>
            {importMut.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
