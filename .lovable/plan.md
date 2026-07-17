# Offline-First Rebuild — Products, Stores, Timeline

You picked: **rebuild all four from scratch** + **full write queue with conflict resolution**. This is a large change (~15–20 files). Here's the plan.

## What we'll build

### 1. Offline core (`src/features/offline/`)
- `db.ts` — Dexie schema with 4 tables: `stores`, `products`, `brands`, `categories`, `timeline_events`, `outbox` (pending mutations), `meta` (last-sync timestamps per org).
- `outbox.ts` — enqueue/dequeue mutations `{ id, entity, op, payload, baseVersion, createdAt, tries, lastError }`.
- `sync-engine.ts`:
  - **Pull**: since-last-sync fetch per entity, upsert into Dexie, update meta.
  - **Push**: drain outbox in FIFO, replay against Supabase, on conflict (row `updated_at` newer than `baseVersion`) mark item as conflicted.
  - Runs on: app mount, `online` event, focus, and every 60s while online.
- `use-sync.ts` — React hook exposing `{ status, pending, conflicts, lastSyncAt, syncNow, resolveConflict }`.
- `use-offline-query.ts` — thin wrapper: reads from Dexie first, falls back to network, subscribes to Dexie liveQuery so UI updates when sync lands.

### 2. Conflict resolution
- Each mutation carries `baseVersion` (the `updated_at` seen when queued).
- On push, service function compares `baseVersion` vs current row `updated_at`.
- Mismatch → item goes to `conflicts` state; UI shows a "Resolve" dialog with **mine / theirs / merged** choice per field.
- New RPC `update_if_unchanged(table, id, patch, base_version)` — atomic optimistic lock; returns the fresh row or a conflict flag.

### 3. Sync status indicator (`src/features/offline/sync-badge.tsx`)
Mounted in `AppShell` header:
- 🟢 Online, all synced
- 🟡 Syncing (spinner + N pending)
- 🔴 Offline (N queued)
- ⚠️ Conflicts (N) — opens resolver drawer

### 4. Rebuilt pages
- **`src/features/products/products-page.tsx`** — brands sidebar + categories tabs + product grid, all reading from `useOfflineQuery('products')`. Mutations via `enqueue()`.
- **`src/features/stores/stores-page.tsx`** — offline-capable list, search/filter run against Dexie so it works offline.
- **`src/features/stores/store-timeline-page.tsx`** — new dedicated route `/app/stores/$storeId/timeline` rendering events with metadata JSON expander; reads from Dexie liveQuery.
- Existing `stores-page`, `products-page`, `store-detail-page` get replaced.

### 5. Backend
- Migration: add `update_if_unchanged` RPC, add index on `(organization_id, updated_at)` for each synced table for efficient delta pulls.

## Files touched (approx.)

```text
src/features/offline/
  db.ts                    (new)
  outbox.ts                (new)
  sync-engine.ts           (new)
  use-sync.ts              (new)
  use-offline-query.ts     (new)
  sync-badge.tsx           (new)
  conflict-resolver.tsx    (new)
src/features/products/
  products-page.tsx        (rewrite)
  service.ts               (rewrite → outbox-backed)
src/features/stores/
  stores-page.tsx          (rewrite)
  store-timeline-page.tsx  (new)
  service.ts               (rewrite → outbox-backed)
src/routes/_authenticated/app/
  stores.$storeId.timeline.tsx  (new)
src/features/shell/app-shell.tsx (add sync badge)
supabase migration: update_if_unchanged RPC + indexes
```

## Scope check before I start

This will take multiple large tool batches and touches critical paths. A few things worth flagging:

1. **Timeline events are append-only** — they don't need conflict resolution, just outbox replay. I'll treat them separately.
2. **Deletes with conflict** — if someone else edited a row you queued a delete for, I default to "your delete wins" unless you'd rather prompt.
3. **First sync on a big org** could pull thousands of rows. I'll paginate at 500/page.
4. I'll keep the existing `useCurrentContext` / `usePermission` and RLS behavior — offline layer just caches the same authorized data.

Reply **go** and I'll build it in one pass, or tell me to trim scope (e.g. skip conflict UI and just do last-write-wins, or ship offline reads only first).
