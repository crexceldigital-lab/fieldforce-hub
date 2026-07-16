import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/features/shell/page-stub";
export const Route = createFileRoute("/_authenticated/app/products")({ component: () => <PageStub title="Products" description="Your product catalog and brands." /> });
