import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/competitors")({ component: () => <PageStub title="Competitors" description="Competitor pricing, promotions, and shelf share." /> });
