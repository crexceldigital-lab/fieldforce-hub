import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDB } from "./db";
import { getSyncState, subscribeSync, runSync, startSyncLoop, type SyncState } from "./sync-engine";
import { useCurrentContext } from "@/features/auth/use-current-org";

export function useSyncStatus() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const [state, setState] = useState<SyncState>(getSyncState());
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => subscribeSync(setState), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!orgId) return;
    startSyncLoop(() => orgId);
  }, [orgId]);

  const pending = useLiveQuery(
    () => localDB.outbox.where("status").anyOf(["pending", "syncing", "failed"]).count(),
    [], 0,
  );
  const conflicts = useLiveQuery(
    () => localDB.outbox.where("status").equals("conflict").count(),
    [], 0,
  );

  return {
    status: state.status,
    online,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    pending: pending ?? 0,
    conflicts: conflicts ?? 0,
    syncNow: () => runSync(orgId),
  };
}
