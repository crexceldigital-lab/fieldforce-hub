import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Revoltek FieldForce</p>
        <h1 className="text-4xl font-semibold text-foreground">Retail execution, built for the field.</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Territory, product, and store intelligence for FMCG brands across Africa.
        </p>
      </div>
      <Link
        to="/app"
        className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Open the app
      </Link>
    </div>
  );
}
