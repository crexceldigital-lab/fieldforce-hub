import { createFileRoute } from "@tanstack/react-router";
import { FormsPage } from "@/features/forms/forms-page";

export const Route = createFileRoute("/_authenticated/app/forms")({
  component: FormsPage,
});
