import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ClipboardCheck,
  Map,
  Package,
  ShieldCheck,
  Wifi,
} from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              R
            </div>
            <span className="font-semibold text-foreground">Revoltek FieldForce</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Retail Execution Platform for FMCG
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            The Operating System for{" "}
            <span className="text-primary">Field Marketing</span> & Retail Execution.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Manage campaigns, territories, field visits, retail audits, product availability,
            competitor intel, and live executive dashboards — offline-first, multi-tenant,
            built for Africa.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg">Start free trial</Button>
            </Link>
            <Button size="lg" variant="outline">
              Book a demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Map,
              title: "Territory & Store CRM",
              body: "Country → Region → District → Ward → Route hierarchy. Every store is the hub — visits, audits, orders, photos all hang off it.",
            },
            {
              icon: ClipboardCheck,
              title: "Kobo-inspired Form Engine",
              body: "Drag-and-drop builder with skip logic, GPS, photos, signatures, bilingual labels, and product grids from your catalog.",
            },
            {
              icon: Package,
              title: "Retail Audits & Availability",
              body: "Per-product availability, facings, price, promotions. Auto-computed Execution, Visibility, and Compliance scores.",
            },
            {
              icon: Wifi,
              title: "Offline-first",
              body: "Agents work where signal disappears. Local write queue, background sync, conflict resolution, zero data loss.",
            },
            {
              icon: BarChart3,
              title: "Live Executive Dashboards",
              body: "Coverage, compliance, availability, competitor intelligence. Chart-heavy, drill-down, client-ready.",
            },
            {
              icon: ShieldCheck,
              title: "Granular Permissions",
              body: "Custom roles per organization. Not hardcoded — build the permission matrix that fits your operation.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Revoltek FieldForce
        </div>
      </footer>
    </div>
  );
}
