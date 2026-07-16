import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/organization")({ component: () => <PageStub title="Organization" description="Company profile and branding." /> });
