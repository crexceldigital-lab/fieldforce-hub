import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  Activity, ArrowLeft, ExternalLink, MapPin, Pencil, Phone, User,
} from "lucide-react";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STORE_CHANNELS, STORE_TIERS, type StoreRow,
} from "@/features/master-data/types";
import { fetchTerritories } from "@/features/territories/service";
import { fetchStore, fetchTimeline } from "./service";
import { StoreFormDialog } from "./store-form-dialog";

export function StoreDetailPage() {
  const { storeId } = useParams({ from: "/_authenticated/app/stores_/$storeId" });
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("stores.manage");
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const storeQ = useQuery({
    queryKey: ["store", storeId],
    queryFn: () => fetchStore(storeId),
  });
  const timelineQ = useQuery({
    queryKey: ["store-timeline", storeId],
    queryFn: () => fetchTimeline(storeId),
  });
  const territoriesQ = useQuery({
    queryKey: ["territories", orgId],
    queryFn: () => fetchTerritories(orgId!),
    enabled: !!orgId,
  });

  const store = storeQ.data as StoreRow | null | undefined;
  const routeName = store?.route_id
    ? (territoriesQ.data ?? []).find((t) => t.id === store.route_id)?.name ?? "—"
    : "Unassigned";

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/app/stores"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {store?.name ?? (storeQ.isLoading ? "Loading…" : "Store not found")}
              </h1>
              {store && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    {STORE_TIERS.find((t) => t.value === store.tier)?.label}
                  </Badge>
                  <span>{STORE_CHANNELS.find((c) => c.value === store.channel)?.label}</span>
                  <span>·</span>
                  <span>Route: {routeName}</span>
                </div>
              )}
            </div>
          </div>
          {store && canManage && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {store && (
        <div className="grid gap-6 p-6 md:grid-cols-[340px_1fr] md:p-8">
          {/* Info card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Store details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={User} label="Owner" value={store.owner_name ?? "—"} />
              <InfoRow
                icon={Phone} label="Phone"
                value={store.phone ? <a className="text-primary hover:underline" href={`tel:${store.phone}`}>{store.phone}</a> : "—"}
              />
              <InfoRow
                icon={MapPin} label="Location"
                value={
                  store.latitude != null && store.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "Not captured"
                }
              />
              <InfoRow icon={Activity} label="Credit" value={store.credit_status ?? "—"} />
              {store.notes && (
                <div className="rounded-md bg-accent/50 p-3 text-muted-foreground">{store.notes}</div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              {timelineQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (timelineQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Visits, audits, orders, and issues will appear here.
                </p>
              ) : (
                <ol className="relative space-y-5 border-l pl-5">
                  {(timelineQ.data ?? []).map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.description && (
                        <p className="text-sm text-muted-foreground">{ev.description}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {editing && store && (
        <StoreFormDialog
          orgId={orgId!}
          store={store}
          onClose={() => setEditing(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["store", storeId] });
            qc.invalidateQueries({ queryKey: ["store-timeline", storeId] });
            setEditing(false);
          }}
        />
      )}
    </AppShell>
  );
}

function InfoRow({
  icon: Icon, label, value,
}: { icon: typeof User; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div>{value}</div>
      </div>
    </div>
  );
}
