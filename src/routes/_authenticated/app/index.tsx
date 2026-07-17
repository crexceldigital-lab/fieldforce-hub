<<<<<<< HEAD
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppShell } from "@/features/shell/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, MapPin, Package, Store, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: async () => {
    // Users without an organization must create one first.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile?.active_organization_id) {
      throw redirect({ to: "/onboarding" });
    }
  },
=======
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/features/shell/app-shell";
import { LayoutDashboard, MapPin, Package, Store, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
>>>>>>> e86c25804f54f16e4eae994d4d78f34ff2eab32b
  component: DashboardPage,
});

const CARDS = [
  { to: "/app/territories", title: "Territories", icon: MapPin, desc: "Regions, districts, routes." },
  { to: "/app/products", title: "Products", icon: Package, desc: "Catalog, brands, competitors." },
  { to: "/app/stores", title: "Stores", icon: Store, desc: "Retailer CRM & timeline." },
  { to: "/app/users", title: "Team", icon: Users, desc: "Members and roles." },
] as const;

function DashboardPage() {
  return (
    <AppShell>
      <div className="border-b bg-card px-6 py-5 md:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your retail execution command center.</p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
          >
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-medium text-foreground">{c.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
