import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/automations")({ component: () => <PageStub title="Automations" description="Events → conditions → actions." /> });
