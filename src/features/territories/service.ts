import { db } from "@/integrations/supabase/db";
import type { Territory, TerritoryLevel, TerritoryNode } from "@/features/master-data/types";

export async function fetchTerritories(orgId: string): Promise<Territory[]> {
  const { data, error } = await db
    .from("territories")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function buildTree(rows: Territory[]): TerritoryNode[] {
  const map = new Map<string, TerritoryNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: TerritoryNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export async function createTerritory(input: {
  orgId: string;
  parentId: string | null;
  name: string;
  level: TerritoryLevel;
}) {
  const { error } = await db.from("territories").insert({
    organization_id: input.orgId,
    parent_id: input.parentId,
    name: input.name.trim(),
    level: input.level,
  });
  if (error) throw error;
}

export async function renameTerritory(id: string, name: string) {
  const { error } = await db.from("territories").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function deleteTerritory(id: string) {
  const { error } = await db.from("territories").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAssignments(orgId: string, territoryId: string) {
  const { data, error } = await db
    .from("territory_assignments")
    .select("id, user_id, territory_id")
    .eq("organization_id", orgId)
    .eq("territory_id", territoryId);
  if (error) throw error;
  return (data ?? []) as { id: string; user_id: string; territory_id: string }[];
}

export async function assignUser(orgId: string, territoryId: string, userId: string) {
  const { error } = await db.from("territory_assignments").insert({
    organization_id: orgId,
    territory_id: territoryId,
    user_id: userId,
  });
  if (error) throw error;
}

export async function unassignUser(assignmentId: string) {
  const { error } = await db.from("territory_assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}
