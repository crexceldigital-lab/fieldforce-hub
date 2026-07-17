#!/usr/bin/env node
// Smoke test: verifies critical routes are registered in the generated route tree.
// Runs against src/routeTree.gen.ts, which the TanStack Router Vite plugin
// regenerates on every dev/build. If a critical route is renamed or removed,
// this fails loudly before we ship.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const routeTree = readFileSync(join(here, "..", "src", "routeTree.gen.ts"), "utf8");

const REQUIRED_ROUTE_IDS = [
  "/_authenticated",
  "/_authenticated/app/",
  "/_authenticated/app/territories",
  "/_authenticated/app/products",
  "/_authenticated/app/stores",
  "/_authenticated/app/users",
  "/_authenticated/app/stores/$storeId",
];

const missing = REQUIRED_ROUTE_IDS.filter((id) => !routeTree.includes(`'${id}'`));

if (missing.length) {
  console.error("[smoke-routes] Missing route registrations:");
  for (const id of missing) console.error("  -", id);
  process.exit(1);
}

console.log(`[smoke-routes] OK — ${REQUIRED_ROUTE_IDS.length} critical routes registered.`);
