import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/campaigns")({ component: () => <PageStub title="Campaigns" description="Trade activations, promotions, and objectives." /> });
