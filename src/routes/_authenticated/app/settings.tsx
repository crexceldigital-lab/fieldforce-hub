import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/settings")({ component: () => <PageStub title="Settings" description="API keys, integrations, notification preferences." /> });
