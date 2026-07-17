import { createFileRoute } from "@tanstack/react-router";
import { VisitSubmitPage } from "@/features/visits/visit-submit-page";

export const Route = createFileRoute("/_authenticated/app/visits/$campaignId/$storeId/$formId")({
  component: VisitSubmitPage,
});
