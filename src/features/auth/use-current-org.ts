import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/db";

export interface CurrentContext {
  userId: string;
  organizationId: string | null;
  permissions: Set<string>;
  roles: string[];
}

async function loadContext(): Promise<CurrentContext | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data: memberships } = await db
    .from("user_roles")
    .select("organization_id, roles(name, role_permissions(permission_key))")
    .eq("user_id", user.id);

  const first = (memberships ?? [])[0];
  const permissions = new Set<string>();
  const roles: string[] = [];
  (memberships ?? []).forEach((m: any) => {
    if (m.roles?.name) roles.push(m.roles.name);
    (m.roles?.role_permissions ?? []).forEach((rp: any) => {
      if (rp.permission_key) permissions.add(rp.permission_key);
    });
  });

  return {
    userId: user.id,
    organizationId: first?.organization_id ?? null,
    permissions,
    roles,
  };
}

export function useCurrentContext() {
  return useQuery({
    queryKey: ["current-context"],
    queryFn: loadContext,
    staleTime: 60_000,
  });
}

export function usePermission(key: string): boolean {
  const { data } = useCurrentContext();
  if (!data) return false;
  // Super admin bypass
  if (data.roles.includes("super_admin") || data.roles.includes("org_admin")) return true;
  return data.permissions.has(key);
}
