import { useState } from "react";
import { CheckCircle2, CloudOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useSyncStatus } from "./use-sync";
import { ConflictResolver } from "./conflict-resolver";
import { cn } from "@/lib/utils";

export function SyncBadge({ className }: { className?: string }) {
  const s = useSyncStatus();
  const [resolverOpen, setResolverOpen] = useState(false);

  const tone =
    s.conflicts > 0 ? "amber" :
    !s.online ? "red" :
    s.status === "syncing" ? "blue" :
    s.pending > 0 ? "slate" :
    "green";

  const label =
    s.conflicts > 0 ? `${s.conflicts} conflict${s.conflicts > 1 ? "s" : ""}` :
    !s.online ? (s.pending > 0 ? `Offline · ${s.pending} queued` : "Offline") :
    s.status === "syncing" ? "Syncing…" :
    s.pending > 0 ? `${s.pending} pending` :
    "Synced";

  const Icon =
    s.conflicts > 0 ? TriangleAlert :
    !s.online ? CloudOff :
    s.status === "syncing" ? Loader2 :
    CheckCircle2;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-2 px-2 text-xs", className)}
          >
            <Icon className={cn("h-3.5 w-3.5", s.status === "syncing" && "animate-spin")} />
            <Badge
              variant="outline"
              className={cn(
                "border-0 px-1.5 py-0 text-[10px] font-medium",
                tone === "green" && "bg-emerald-100 text-emerald-800",
                tone === "amber" && "bg-amber-100 text-amber-800",
                tone === "red" && "bg-red-100 text-red-800",
                tone === "blue" && "bg-blue-100 text-blue-800",
                tone === "slate" && "bg-slate-100 text-slate-700",
              )}
            >
              {label}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div>
            <p className="text-sm font-medium">Sync status</p>
            <p className="text-xs text-muted-foreground">
              {s.lastSyncAt ? `Last sync: ${new Date(s.lastSyncAt).toLocaleTimeString()}` : "Not yet synced"}
            </p>
            {s.lastError && (
              <p className="mt-1 text-xs text-destructive">{s.lastError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatRow label="Connection" value={s.online ? "Online" : "Offline"} />
            <StatRow label="Pending" value={String(s.pending)} />
            <StatRow label="Conflicts" value={String(s.conflicts)} />
            <StatRow label="State" value={s.status} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => s.syncNow()} disabled={!s.online}>
              <RefreshCw className="mr-1 h-3 w-3" /> Sync now
            </Button>
            {s.conflicts > 0 && (
              <Button size="sm" className="flex-1" onClick={() => setResolverOpen(true)}>
                Resolve
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {resolverOpen && <ConflictResolver onClose={() => setResolverOpen(false)} />}
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded bg-muted/50 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
