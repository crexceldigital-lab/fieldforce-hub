import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/territories")({ component: () => <PageStub title="Territories" description="Country → Region → District → Ward → Route." /> });
