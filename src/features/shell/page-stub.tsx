import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

export function PageStub({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="px-6 py-5 md:px-8">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="p-6 md:p-8">
        {children ?? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <div className="text-sm font-medium text-foreground">Coming soon</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This module is part of Phase 1 and will be built in the next milestone.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
