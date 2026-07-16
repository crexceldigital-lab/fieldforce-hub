import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/audits")({ component: () => <PageStub title="Audits" description="Retail audits and availability checks." /> });
