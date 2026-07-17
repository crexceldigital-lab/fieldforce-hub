import { db } from "@/integrations/supabase/db";
import type { OrgMember } from "@/features/master-data/types";

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data: userRoles, error } = await db
    .from("user_roles")
    .select("id, user_id, role_id, roles(id, name)")
    .eq("organization_id", orgId);
  if (error) throw error;

  const userIds = Array.from(new Set((userRoles ?? []).map((r: any) => r.user_id)));
  if (userIds.length === 0) return [];

  // Requires the "profiles_org_visibility" migration so org members can read
  // each other's names. Without it this returns only the current user.
  const { data: profiles, error: pErr } = await db
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);
  if (pErr) throw pErr;

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));

  const members = new Map<string, OrgMember>();
  (userRoles ?? []).forEach((ur: any) => {
    if (!members.has(ur.user_id)) {
      const prof = profileMap.get(ur.user_id);
      members.set(ur.user_id, {
        userId: ur.user_id,
        fullName: prof?.full_name ?? null,
        email: prof?.email ?? null,
        roles: [],
      });
    }
    if (ur.roles) {
      members.get(ur.user_id)!.roles.push({
        id: ur.roles.id,
        name: ur.roles.name,
        userRoleId: ur.id,
      });
    }
  });
  return Array.from(members.values()).sort((a, b) =>
    (a.fullName ?? a.email ?? "").localeCompare(b.fullName ?? b.email ?? ""),
  );
}

export async function fetchOrgRoles(orgId: string) {
  const { data, error } = await db
    .from("roles")
    .select("id, name, description")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; description: string | null }[];
}

/** Replace a member's roles in this org with a single role. */
export async function setMemberRole(orgId: string, userId: string, roleId: string) {
  const { error: delErr } = await db
    .from("user_roles")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (delErr) throw delErr;
  const { error: insErr } = await db.from("user_roles").insert({
    organization_id: orgId,
    user_id: userId,
    role_id: roleId,
  });
  if (insErr) throw insErr;
}
