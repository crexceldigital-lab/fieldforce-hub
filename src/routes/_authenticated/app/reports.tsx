import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/reports")({ component: () => <PageStub title="Reports" description="Executive dashboards and CSV export." /> });
