import { createFileRoute } from "@tanstack/react-router";
import { CampaignsPage } from "@/features/campaigns/campaigns-page";

export const Route = createFileRoute("/_authenticated/app/campaigns")({
  component: CampaignsPage,
});
