# Revoltek FieldForce — Phase 1 Build Plan

This is a large, multi-module platform. I'll build Phase 1 in sequenced milestones so we get a working, demoable product at each step rather than a half-finished monolith. Please confirm the plan (or tell me which milestone to prioritize/skip) before I start.

## Foundation (Milestone 0)

- Enable Lovable Cloud (Supabase: auth, DB, storage, realtime, edge functions).
- Feature-based folder structure: `src/features/{territories,products,campaigns,forms,stores,visits,audits,competitors,issues,tasks,notifications,kpis,dashboards,automation,permissions}` + shared `src/lib`, `src/types`, `src/services`.
- Design system: dark sidebar shell, emerald accent, Inter font, semantic tokens in `styles.css`, score/status/sync badges, empty states.
- Auth (email/password + Google), org creation on signup, multi-tenant `organization_id` on every table with RLS.
- Permission matrix: `permissions` enum, `roles` (org-scoped, editable), `role_permissions`, `user_roles`, `has_permission()` security-definer function. Seed 4 role templates (Super Admin, Org Admin, Field Agent, Client).
- App shell: dark sidebar (desktop) / bottom nav (mobile/agents), notification bell, org switcher, profile menu.
- Offline infrastructure: IndexedDB (Dexie) write queue, sync service with exp. backoff, sync-status indicators, connectivity banner, conflict log table.
- API settings page (org API key + endpoint docs).

## Milestone 1 — Core master data

- Territory tree (Country→Region→District→Ward→Route) with editor + CSV import.
- Product catalog: products, brands, categories, CSV import.
- Store CRM: profiles, channel, tier, GPS, photos, map view (OpenStreetMap/Leaflet), CSV import, store timeline table + event writers.
- Users: invite, assign role, assign agents to routes / managers to regions.

## Milestone 2 — Campaigns + Form Engine

- Campaigns CRUD + status + targeting (regions, products, managers, budget).
- Kobo-inspired form builder: drag-and-drop, all field types (incl. product grid, GPS, photo, signature, barcode, audio), skip logic, required flags, bilingual EN/SW labels, versioning.
- Form fill-out UI: mobile-first, one-section-per-screen, progress, drafts in IndexedDB, offline submit queue.

## Milestone 3 — Visits, Audits, Competitors

- Visit plans (one-off + recurring), agent "Today" screen offline.
- Check-in/out with GPS + 200m mismatch flagging, time-on-site.
- Retail Audit specialized form (per-product availability, facings, price, promo, expiry, cooler); auto-computed Execution/Visibility/Compliance scores; auto out-of-stock records.
- Competitor intelligence entries + report (price table, promo feed, shelf-share trends).
- Photo pipeline: client-side compression, Supabase Storage, `ai_status`/`ai_results` metadata.

## Milestone 4 — Issues, Tasks, Notifications, Automation, KPIs, Dashboards

- Issue reporting + status workflow.
- Task module (assign, deadline, photo-proof).
- Notification center: realtime, per-user preferences, all event types.
- Generic events→conditions→actions automation engine; ship the OOS→notify+restock-task rule.
- KPI engine: define targets, compute actuals, RAG status.
- Manager Ops dashboard (live tiles, agent map, alert feed, drill-downs).
- Client dashboard (read-only, chart-heavy, CSV export).

## Milestone 5 — Seed data

- Demo FMCG Ltd org: TZ territory tree, 15 SKUs across 2 brands + competitors, 1 campaign, 2 managers, 5 agents, 30 stores, 1 audit template, 1 consumer survey, 2 weeks of visits/audits/OOS/competitor/issue/notification data.

## Technical notes

- Data model highlights: `organizations`, `profiles`, `roles`, `permissions`, `user_roles`, `territories` (self-referential), `territory_assignments`, `brands`, `categories`, `products`, `stores`, `store_timeline_events`, `campaigns`, `campaign_targets`, `forms`, `form_versions`, `form_submissions`, `visits`, `visit_plans`, `audit_results`, `product_availability`, `competitor_entries`, `photos`, `issues`, `tasks`, `notifications`, `notification_preferences`, `kpi_definitions`, `kpi_results`, `automation_rules`, `automation_runs`, `sync_conflicts`, `api_keys`.
- Every table: `organization_id`, RLS by org + permission checks, `GRANT` block per rules, `created_at/updated_at/created_by`.
- Photos in Storage bucket `photos` (private) + signed URLs.
- Edge functions: `submit-visit` (server-side scoring, timeline writes, automation trigger), `run-automation`, webhook stubs.
- Frontend: TanStack Query for reads, service layer per feature, Dexie for offline queue, background sync via `navigator.onLine` + focus events, Zod validation everywhere.

## What I need from you

1. Approve the plan (or say which milestones to drop/reorder).
2. Confirm I should **enable Lovable Cloud** now.
3. Two design decisions:
   - Emerald accent shade preference? (I'll pick a deep emerald if you have no opinion.)
   - Agents on mobile: bottom nav with 4 tabs (Today, Stores, Forms, Me) — OK?
4. Given the scale, this will run across many turns. **Confirm you want me to proceed milestone by milestone** and I'll start with Milestone 0 immediately after approval.
