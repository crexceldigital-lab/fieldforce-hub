import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/kpis")({ component: () => <PageStub title="KPIs" description="Set targets, measure actuals, drive execution." /> });
