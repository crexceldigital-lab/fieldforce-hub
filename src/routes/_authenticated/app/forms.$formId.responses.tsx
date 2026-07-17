import { createFileRoute } from "@tanstack/react-router";
import { FormResponsesPage } from "@/features/forms/form-responses-page";

export const Route = createFileRoute("/_authenticated/app/forms/$formId/responses")({
  component: FormResponsesPage,
});
