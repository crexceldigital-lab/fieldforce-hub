import { createFileRoute } from "@tanstack/react-router";
import { StoreDetailPage } from "@/features/stores/store-detail-page";

export const Route = createFileRoute("/_authenticated/app/stores/$storeId")({
  component: StoreDetailPage,
});
