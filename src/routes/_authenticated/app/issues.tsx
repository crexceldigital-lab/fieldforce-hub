import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/issues")({ component: () => <PageStub title="Issues" description="Store issues reported from the field." /> });
