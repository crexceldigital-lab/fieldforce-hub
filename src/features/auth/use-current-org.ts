import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Permission =
  | "org.manage" | "users.manage" | "roles.manage" | "territories.manage"
  | "stores.manage" | "stores.delete" | "products.manage" | "campaigns.manage"
  | "forms.manage" | "visits.assign" | "visits.execute" | "audits.execute"
  | "orders.approve" | "reports.export" | "finance.view" | "client_dashboards.view"
  | "issues.resolve" | "kpis.configure" | "automations.manage" | "api.access";

export type CurrentContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  organizationId: string | null;
  organizationName: string | null;
  permissions: Set<Permission>;
  roles: Array<{ id: string; name: string }>;
};

export function useCurrentContext() {
  return useQuery({
    queryKey: ["current-context"],
    queryFn: async (): Promise<CurrentContext | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, active_organization_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      let orgName: string | null = null;
      const permissions = new Set<Permission>();
      const roles: Array<{ id: string; name: string }> = [];

      const orgId = profile?.active_organization_id ?? null;
      if (orgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("id", orgId)
          .maybeSingle();
        orgName = org?.name ?? null;

        const { data: urs } = await supabase
          .from("user_roles")
          .select("role_id, roles!inner(id, name, role_permissions(permission))")
          .eq("user_id", userData.user.id)
          .eq("organization_id", orgId);

        (urs ?? []).forEach((row: any) => {
          const r = row.roles;
          if (r) {
            roles.push({ id: r.id, name: r.name });
            (r.role_permissions ?? []).forEach((p: any) => {
              permissions.add(p.permission as Permission);
            });
          }
        });
      }

      return {
        userId: userData.user.id,
        email: profile?.email ?? userData.user.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        organizationId: orgId,
        organizationName: orgName,
        permissions,
        roles,
      };
    },
    staleTime: 30_000,
  });
}

export function usePermission(perm: Permission) {
  const { data } = useCurrentContext();
  return data?.permissions.has(perm) ?? false;
}
