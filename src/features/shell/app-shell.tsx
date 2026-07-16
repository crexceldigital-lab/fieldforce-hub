import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BarChart3, Bell, Building2, ClipboardList, LayoutDashboard, LogOut,
  Map, Package, Settings, Store, Users, Workflow, FileText, Target,
  ClipboardCheck, TrendingUp, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentContext } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Overview",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Field Ops",
    items: [
      { to: "/app/visits", label: "Visits", icon: ClipboardList },
      { to: "/app/audits", label: "Audits", icon: ClipboardCheck },
      { to: "/app/issues", label: "Issues", icon: Zap },
    ],
  },
  {
    label: "Master Data",
    items: [
      { to: "/app/stores", label: "Stores", icon: Store },
      { to: "/app/territories", label: "Territories", icon: Map },
      { to: "/app/products", label: "Products", icon: Package },
      { to: "/app/campaigns", label: "Campaigns", icon: Target },
      { to: "/app/forms", label: "Forms", icon: FileText },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/app/reports", label: "Reports", icon: BarChart3 },
      { to: "/app/competitors", label: "Competitors", icon: TrendingUp },
      { to: "/app/kpis", label: "KPIs", icon: Target },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/app/users", label: "Users & Roles", icon: Users },
      { to: "/app/automations", label: "Automations", icon: Workflow },
      { to: "/app/organization", label: "Organization", icon: Building2 },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: ctx } = useCurrentContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            R
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">FieldForce</span>
            <span className="text-[11px] text-sidebar-foreground/60">
              {ctx?.organizationName ?? "No organization"}
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.to === "/app"
                      ? location.pathname === "/app"
                      : location.pathname.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs">
            <div className="truncate font-medium text-sidebar-foreground">
              {ctx?.fullName ?? ctx?.email}
            </div>
            <div className="truncate text-sidebar-foreground/60">
              {ctx?.roles.map((r) => r.name).join(", ") || "No role"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-card md:hidden">
        {[
          { to: "/app", label: "Today", icon: LayoutDashboard },
          { to: "/app/visits", label: "Visits", icon: ClipboardList },
          { to: "/app/stores", label: "Stores", icon: Store },
          { to: "/app/notifications", label: "Alerts", icon: Bell },
        ].map((item) => {
          const active =
            item.to === "/app"
              ? location.pathname === "/app"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
