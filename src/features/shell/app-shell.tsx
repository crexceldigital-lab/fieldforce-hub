import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, MapPin, Package, Store, Users, LogOut, Flag, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SyncBadge } from "@/features/offline/sync-badge";

type NavItem = {
  to: "/app" | "/app/territories" | "/app/products" | "/app/stores" | "/app/users" | "/app/campaigns" | "/app/forms";
  label: string;
  icon: typeof MapPin;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/campaigns", label: "Campaigns", icon: Flag },
  { to: "/app/forms", label: "Forms", icon: FileText },
  { to: "/app/territories", label: "Territories", icon: MapPin },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/stores", label: "Stores", icon: Store },
  { to: "/app/users", label: "Team", icon: Users },
];

const baseLink =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition text-sidebar-foreground/80 hover:bg-sidebar-accent/40";
const activeLink = "bg-sidebar-accent text-sidebar-accent-foreground";
const baseMobile = "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground";
const activeMobile = "text-primary";

export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

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
                activeOptions={{ exact: item.exact }}
                className={baseLink}
                activeProps={{ className: cn(baseLink, activeLink) }}
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
      <main className="flex flex-1 flex-col pb-16 md:pb-0">
        <div className="flex items-center justify-end border-b bg-card/50 px-4 py-2 md:px-6">
          <SyncBadge />
        </div>
        {children}
      </main>
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-card">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className={baseMobile}
              activeProps={{ className: cn(baseMobile, activeMobile) }}
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
