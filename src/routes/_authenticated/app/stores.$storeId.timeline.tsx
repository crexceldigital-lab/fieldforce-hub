import { createFileRoute } from "@tanstack/react-router";
import { StoreTimelinePage } from "@/features/stores/store-timeline-page";

export const Route = createFileRoute("/_authenticated/app/stores/$storeId/timeline")({
  component: StoreTimelinePage,
});
