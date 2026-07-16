import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/visits")({ component: () => <PageStub title="Visits" description="Plan and execute field visits." /> });
