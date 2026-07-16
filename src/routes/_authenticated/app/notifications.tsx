import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/notifications")({ component: () => <PageStub title="Notifications" description="Alerts across your organization." /> });
