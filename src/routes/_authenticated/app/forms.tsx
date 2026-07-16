import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/forms")({ component: () => <PageStub title="Forms" description="Kobo-inspired dynamic form builder." /> });
