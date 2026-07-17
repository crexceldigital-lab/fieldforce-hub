# Build Campaigns (Projects) + Dynamic Form Builder

The current FieldForce app has Territories, Products, Stores, and Team. It does not yet have a **Campaigns** module (which you called "projects") or a **data-collection form builder**. I will add both, wired into the existing offline-first layer.

## What you will get

1. **Campaigns (Projects)** at `/app/campaigns`
   - Create a campaign: name, description, date range, status.
   - Assign stores (multi-select from the org store list) or whole territories.
   - Link one or more data-collection forms to the campaign.
   - Offline-safe CRUD with the same Dexie outbox + sync engine used by Stores and Products.

2. **Dynamic Form Builder** at `/app/forms`
   - Create a form, name it, add fields.
   - Supported field types: text, number, date, single-select, multi-select, yes/no, note, photo, barcode, GPS point.
   - Each field has label, required toggle, helper options for select types, and ordering.
   - Form schema is stored as JSONB so it can evolve without schema migrations.
   - Offline-safe create/update.

3. **Integration**
   - Add Campaigns and Forms to the AppShell navigation.
   - Dashboard cards updated to show the new modules.
   - Forms can be linked to campaigns from either the campaign page or the form page.

4. **Database changes**
   - New tables: `campaigns`, `campaign_stores`, `campaign_forms`, `forms`, `form_submissions`.
   - RLS policies scoped to organization members.
   - `updated_at` triggers and `update_if_unchanged` allowed-tables updated to include `campaigns` and `forms`.
   - Offline core extended to include `campaigns`, `forms`, `form_submissions`, and junction tables.

## Files touched

```text
Database
  - supabase migration (new tables + RLS + triggers)

Offline core
  - src/features/offline/db.ts                add campaigns, forms, submissions tables
  - src/features/offline/sync-engine.ts     extend pull/push for new entities

New features
  - src/features/campaigns/service.ts
  - src/features/campaigns/campaigns-page.tsx
  - src/features/campaigns/campaign-form-dialog.tsx
  - src/features/forms/service.ts
  - src/features/forms/form-builder.tsx
  - src/features/forms/forms-page.tsx

Routes
  - src/routes/_authenticated/app/campaigns.tsx
  - src/routes/_authenticated/app/forms.tsx

Navigation
  - src/features/shell/app-shell.tsx          add Campaigns + Forms nav items
  - src/routes/_authenticated/app/index.tsx  add dashboard cards
```

## After this change

You will:
1. Go to **Forms** → **New form** → add your questions → publish.
2. Go to **Campaigns** → **New campaign** → set name/dates → assign stores/territories → link the form(s) → activate.
3. Field agents will see the assigned campaign in a future "Visit Planning" module.

## Scope note

This plan does **not** include the mobile execution UI (filling a form in a store). That is the next logical step: Visit Planning + Retail Audit execution. I can add it after this if you want end-to-end data collection in the field.

## Offline behavior

Campaign and form edits are queued in the same outbox. When the device is offline, the badge turns red and shows a count. When it reconnects, the sync engine pushes changes to Supabase. Conflicts use the existing optimistic-lock conflict resolver.
