import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/stores")({ component: () => <PageStub title="Stores" description="Your retail CRM. Every store is the hub of activity." /> });
