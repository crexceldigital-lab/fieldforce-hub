import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MapPin, Package, Store, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/territories", label: "Territories", icon: MapPin },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/stores", label: "Stores", icon: Store },
  { to: "/app/users", label: "Team", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-background">
      {!isMobile && (
        <aside className="flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="px-5 py-5">
            <div className="text-lg font-semibold">Revoltek</div>
            <div className="text-xs text-sidebar-foreground/60">FieldForce</div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  isActive(item.to, item.exact)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3">
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>
      )}
      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-card">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px]",
                isActive(item.to, item.exact) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
