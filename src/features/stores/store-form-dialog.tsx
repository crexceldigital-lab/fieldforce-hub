import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  STORE_CHANNELS, STORE_TIERS, type StoreRow,
} from "@/features/master-data/types";
import { fetchTerritories } from "@/features/territories/service";
import { createStore, updateStore, type StoreInput } from "./service";

const NONE = "__none__";

export function StoreFormDialog({
  orgId, store, onClose, onSaved,
}: {
  orgId: string;
  store: StoreRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StoreInput>({
    name: store?.name ?? "",
    owner_name: store?.owner_name ?? null,
    phone: store?.phone ?? null,
    latitude: store?.latitude ?? null,
    longitude: store?.longitude ?? null,
    channel: store?.channel ?? "traditional_trade",
    tier: store?.tier ?? "unclassified",
    route_id: store?.route_id ?? null,
    credit_status: store?.credit_status ?? null,
    notes: store?.notes ?? null,
  });
  const [locating, setLocating] = useState(false);

  const territoriesQ = useQuery({
    queryKey: ["territories", orgId],
    queryFn: () => fetchTerritories(orgId),
  });
  const routes = (territoriesQ.data ?? []).filter((t) => t.level === "route");

  const saveMut = useMutation({
    mutationFn: () => (store ? updateStore(orgId, store.id, form) : createStore(orgId, form).then(() => undefined)),
    onSuccess: () => { toast.success(store ? "Store updated" : "Store created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof StoreInput>(key: K, value: StoreInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", Number(pos.coords.latitude.toFixed(6)));
        set("longitude", Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        toast.success("Location captured");
      },
      () => { setLocating(false); toast.error("Could not get location — allow location access and try again"); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{store ? "Edit store" : "Add store"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Store name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Mama Ntilie Shop" />
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Input value={form.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} placeholder="+255…" />
          </div>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={form.channel} onValueChange={(v) => set("channel", v as StoreInput["channel"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v) => set("tier", v as StoreInput["tier"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Route</Label>
            <Select
              value={form.route_id ?? NONE}
              onValueChange={(v) => set("route_id", v === NONE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={routes.length ? "Pick a route" : "No routes yet — create them in Territories"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input
              type="number" step="0.000001"
              value={form.latitude ?? ""}
              onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input
              type="number" step="0.000001"
              value={form.longitude ?? ""}
              onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <Button type="button" variant="outline" className="sm:col-span-2" onClick={captureGps} disabled={locating}>
            {locating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting location…</>
              : <><Crosshair className="mr-2 h-4 w-4" /> Use my current location</>}
          </Button>
          <div className="space-y-2">
            <Label>Credit status</Label>
            <Input
              value={form.credit_status ?? ""}
              placeholder="e.g., Cash only / 7-day credit"
              onChange={(e) => set("credit_status", e.target.value || null)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.name.trim() || saveMut.isPending} onClick={() => saveMut.mutate()}>
            {store ? "Save changes" : "Create store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
