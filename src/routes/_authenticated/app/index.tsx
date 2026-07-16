import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext } from "@/features/auth/use-current-org";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Store, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: async () => {
    // Ensure user has an org; otherwise send to onboarding.
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
  component: Dashboard,
});

function Dashboard() {
  const { data: ctx, isLoading } = useCurrentContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && ctx && !ctx.organizationId) {
      navigate({ to: "/onboarding" });
    }
  }, [isLoading, ctx, navigate]);

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome, {ctx?.fullName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ctx?.organizationName} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's Coverage", value: "—", hint: "0 of 0 visits", icon: Target },
            { label: "Active Stores", value: "0", hint: "Add stores to begin", icon: Store },
            { label: "Audit Score", value: "—", hint: "No audits yet", icon: BarChart3 },
            { label: "Out of Stock", value: "0", hint: "Last 7 days", icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Get started</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your organization is ready. Next steps: build your territory tree, upload your
            product catalog, and onboard stores. Then create your first campaign and audit form.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
