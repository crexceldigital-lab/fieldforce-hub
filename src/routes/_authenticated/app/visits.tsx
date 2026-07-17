import { createFileRoute } from "@tanstack/react-router";
import { VisitsPage } from "@/features/visits/visits-page";

export const Route = createFileRoute("/_authenticated/app/visits")({
  component: VisitsPage,
});
