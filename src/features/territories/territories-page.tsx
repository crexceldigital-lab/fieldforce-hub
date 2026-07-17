import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, MapPin, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TerritoryLevel, TerritoryNode } from "@/features/master-data/types";
import { nextLevel } from "@/features/master-data/types";
import {
  assignUser, buildTree, createTerritory, deleteTerritory, fetchAssignments,
  fetchTerritories, renameTerritory, unassignUser,
} from "./service";
import { fetchOrgMembers } from "@/features/users/service";

const LEVEL_LABEL: Record<TerritoryLevel, string> = {
  country: "Country", region: "Region", district: "District", ward: "Ward", route: "Route",
};

export function TerritoriesPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("territories.manage");
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addUnder, setAddUnder] = useState<TerritoryNode | "root" | null>(null);
  const [renaming, setRenaming] = useState<TerritoryNode | null>(null);
  const [nameInput, setNameInput] = useState("");

  const territoriesQuery = useQuery({
    queryKey: ["territories", orgId],
    queryFn: () => fetchTerritories(orgId!),
    enabled: !!orgId,
  });

  const tree = useMemo(() => buildTree(territoriesQuery.data ?? []), [territoriesQuery.data]);
  const flat = territoriesQuery.data ?? [];
  const selected = flat.find((t) => t.id === selectedId) ?? null;
  const selectedNode = useMemo(() => {
    const find = (nodes: TerritoryNode[]): TerritoryNode | null => {
      for (const n of nodes) {
        if (n.id === selectedId) return n;
        const hit = find(n.children);
        if (hit) return hit;
      }
      return null;
    };
    return find(tree);
  }, [tree, selectedId]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["territories", orgId] });

  const createMut = useMutation({
    mutationFn: (vars: { parentId: string | null; name: string; level: TerritoryLevel }) =>
      createTerritory({ orgId: orgId!, ...vars }),
    onSuccess: () => { invalidate(); setAddUnder(null); setNameInput(""); toast.success("Territory created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const renameMut = useMutation({
    mutationFn: (vars: { id: string; name: string }) => renameTerritory(vars.id, vars.name),
    onSuccess: () => { invalidate(); setRenaming(null); setNameInput(""); toast.success("Renamed"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTerritory(id),
    onSuccess: () => { invalidate(); setSelectedId(null); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const renderNode = (node: TerritoryNode, depth: number) => (
    <div key={node.id}>
      <button
        type="button"
        onClick={() => { setSelectedId(node.id); if (node.children.length) toggle(node.id); }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
          selectedId === node.id && "bg-accent font-medium",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.children.length > 0 ? (
          expanded.has(node.id)
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
        <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
          {LEVEL_LABEL[node.level]}
        </Badge>
      </button>
      {expanded.has(node.id) && node.children.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Territories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Country → Region → District → Ward → Route. Every store belongs to a route.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => { setAddUnder("root"); setNameInput(""); }}>
              <Plus className="mr-1 h-4 w-4" /> Add country
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-8">
        {/* Tree */}
        <div className="rounded-xl border bg-card p-3">
          {territoriesQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : tree.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">No territories yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start by adding a country (e.g., Tanzania), then build down to routes.
              </p>
            </div>
          ) : (
            tree.map((n) => renderNode(n, 0))
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected && selectedNode ? (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{LEVEL_LABEL[selected.level]}</p>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setRenaming(selectedNode); setNameInput(selected.name); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      disabled={selectedNode.children.length > 0}
                      title={selectedNode.children.length > 0 ? "Delete children first" : "Delete"}
                      onClick={() => { if (confirm(`Delete "${selected.name}"?`)) deleteMut.mutate(selected.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {canManage && nextLevel(selected.level) && (
                <Button
                  variant="outline" size="sm" className="mt-3 w-full"
                  onClick={() => { setAddUnder(selectedNode); setNameInput(""); }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add {LEVEL_LABEL[nextLevel(selected.level)!]}
                </Button>
              )}

              <AssignmentsPanel orgId={orgId} territoryId={selected.id} canManage={canManage} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              Select a territory to manage it and assign people.
            </div>
          )}
        </div>
      </div>

      {/* Add dialog */}
      <Dialog open={addUnder !== null} onOpenChange={(o) => !o && setAddUnder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addUnder === "root"
                ? "Add country"
                : addUnder
                  ? `Add ${LEVEL_LABEL[nextLevel(addUnder.level) ?? "route"]} under ${addUnder.name}`
                  : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="t-name">Name</Label>
            <Input
              id="t-name" value={nameInput} autoFocus
              placeholder={addUnder === "root" ? "e.g., Tanzania" : "e.g., Kinondoni"}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && submitAdd()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUnder(null)}>Cancel</Button>
            <Button disabled={!nameInput.trim() || createMut.isPending} onClick={submitAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename territory</DialogTitle></DialogHeader>
          <Input value={nameInput} autoFocus onChange={(e) => setNameInput(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              disabled={!nameInput.trim() || renameMut.isPending}
              onClick={() => renaming && renameMut.mutate({ id: renaming.id, name: nameInput })}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );

  function submitAdd() {
    if (!addUnder || !nameInput.trim()) return;
    if (addUnder === "root") {
      createMut.mutate({ parentId: null, name: nameInput, level: "country" });
    } else {
      const lvl = nextLevel(addUnder.level);
      if (lvl) createMut.mutate({ parentId: addUnder.id, name: nameInput, level: lvl });
    }
  }
}

function AssignmentsPanel({
  orgId, territoryId, canManage,
}: { orgId: string | null; territoryId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);

  const assignmentsQuery = useQuery({
    queryKey: ["territory-assignments", orgId, territoryId],
    queryFn: () => fetchAssignments(orgId!, territoryId),
    enabled: !!orgId,
  });
  const membersQuery = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["territory-assignments", orgId, territoryId] });

  const assignMut = useMutation({
    mutationFn: (userId: string) => assignUser(orgId!, territoryId, userId),
    onSuccess: () => { invalidate(); setPicking(false); toast.success("Assigned"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unassignMut = useMutation({
    mutationFn: (id: string) => unassignUser(id),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = membersQuery.data ?? [];
  const assigned = assignmentsQuery.data ?? [];
  const assignedIds = new Set(assigned.map((a) => a.user_id));
  const unassigned = members.filter((m) => !assignedIds.has(m.userId));
  const nameOf = (userId: string) => {
    const m = members.find((x) => x.userId === userId);
    return m?.fullName ?? m?.email ?? "Unknown user";
  };

  return (
    <div className="mt-5 border-t pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Assigned people</p>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={() => setPicking((p) => !p)}>
            <UserPlus className="mr-1 h-4 w-4" /> Assign
          </Button>
        )}
      </div>

      {picking && (
        <Select onValueChange={(v) => assignMut.mutate(v)}>
          <SelectTrigger className="mt-2"><SelectValue placeholder="Pick a person…" /></SelectTrigger>
          <SelectContent>
            {unassigned.length === 0 ? (
              <SelectItem value="__none" disabled>Everyone is already assigned</SelectItem>
            ) : (
              unassigned.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.fullName ?? m.email ?? m.userId}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      <div className="mt-2 space-y-1">
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one assigned yet.</p>
        ) : (
          assigned.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md bg-accent/50 px-2 py-1.5 text-sm">
              <span>{nameOf(a.user_id)}</span>
              {canManage && (
                <button type="button" onClick={() => unassignMut.mutate(a.id)} aria-label="Remove">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
