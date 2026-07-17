import { createFileRoute } from "@tanstack/react-router";
import { StoresPage } from "@/features/stores/stores-page";

export const Route = createFileRoute("/_authenticated/app/stores")({
  component: StoresPage,
});
