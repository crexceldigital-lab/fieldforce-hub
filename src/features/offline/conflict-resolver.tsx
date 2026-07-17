import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDB, type OutboxItem } from "./db";
import { removeItem, reQueue } from "./outbox";
import { runSync } from "./sync-engine";
import { useCurrentContext } from "@/features/auth/use-current-org";

export function ConflictResolver({ onClose }: { onClose: () => void }) {
  const conflicts = useLiveQuery(
    () => localDB.outbox.where("status").equals("conflict").toArray(),
    [], [] as OutboxItem[],
  );
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;

  const keepMine = async (item: OutboxItem) => {
    // Force overwrite: bump baseUpdatedAt to server's current and requeue as update
    const serverUpdatedAt = (item.serverRow?.updated_at as string) ?? null;
    await reQueue(item.id, { baseUpdatedAt: serverUpdatedAt, serverRow: null });
    await runSync(orgId);
    toast.success("Your version queued to overwrite");
  };
  const keepTheirs = async (item: OutboxItem) => {
    await removeItem(item.id);
    toast.message("Discarded your local change");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve sync conflicts</DialogTitle>
        </DialogHeader>
        {conflicts && conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conflicts left. Nicely done.</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-auto">
            {(conflicts ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.entity}</Badge>
                  <Badge variant="outline">{c.op}</Badge>
                  <span className="text-xs text-muted-foreground">
                    queued {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <ChangeColumn title="Your change" data={c.payload} />
                  <ChangeColumn title="Current on server" data={c.serverRow ?? {}} highlight />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => keepTheirs(c)}>
                    Keep server version
                  </Button>
                  <Button size="sm" onClick={() => keepMine(c)}>
                    Overwrite with mine
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeColumn({
  title, data, highlight,
}: { title: string; data: Record<string, unknown>; highlight?: boolean }) {
  const entries = Object.entries(data).filter(([k]) => !["id", "organization_id", "created_at", "created_by"].includes(k));
  return (
    <div className={highlight ? "rounded-md bg-accent/40 p-2" : "p-2"}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
      <dl className="space-y-1 text-xs">
        {entries.length === 0 && <p className="text-muted-foreground">—</p>}
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="truncate text-muted-foreground">{k}</dt>
            <dd className="truncate font-mono">{formatValue(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
