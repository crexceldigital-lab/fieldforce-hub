import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fetchOrgMembers, fetchOrgRoles, setMemberRole } from "./service";

export function UsersPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("users.manage");
  const qc = useQueryClient();

  const membersQ = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });
  const rolesQ = useQuery({
    queryKey: ["org-roles", orgId],
    queryFn: () => fetchOrgRoles(orgId!),
    enabled: !!orgId,
  });

  const roleMut = useMutation({
    mutationFn: (vars: { userId: string; roleId: string }) =>
      setMemberRole(orgId!, vars.userId, vars.roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = membersQ.data ?? [];
  const roles = rolesQ.data ?? [];

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <h1 className="text-2xl font-semibold text-foreground">Users &amp; Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team members and their permission roles in this organization.
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {membersQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No members visible</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New members appear here once they sign up and are added to your organization.
              Email invitations arrive in a later milestone.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {canManage && <TableHead className="w-[220px]">Change role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">
                      {m.fullName ?? "—"}
                      {m.userId === ctx?.userId && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.roles.map((r) => (
                          <Badge key={r.userRoleId} variant="outline">{r.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Select
                          value={m.roles[0]?.id ?? ""}
                          disabled={m.userId === ctx?.userId}
                          onValueChange={(roleId) => roleMut.mutate({ userId: m.userId, roleId })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={m.userId === ctx?.userId ? "Cannot change own role" : "Pick role"} />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
