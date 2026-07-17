import { createFileRoute } from "@tanstack/react-router";
import { TerritoriesPage } from "@/features/territories/territories-page";

export const Route = createFileRoute("/_authenticated/app/territories")({
  component: TerritoriesPage,
});
