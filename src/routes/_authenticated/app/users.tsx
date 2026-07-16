import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/users")({ component: () => <PageStub title="Users & Roles" description="Invite teammates and configure the permission matrix." /> });
