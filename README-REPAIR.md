# FieldForce — Repair Pack (login + store detail fixes)

Verified against your uploaded project: `vite build` PASS, `tsc --noEmit` PASS.

## What was broken in your current version

1. **Login was broken.** The `/auth` page was deleted, but the app still redirects
   logged-out users to `/auth` — so anyone signed out hits a dead page and can
   never sign in. (You may not have noticed because your browser session is
   still active.)
2. **Signup was broken.** The `/onboarding` page (where new users create their
   organization) was also deleted, and the dashboard no longer checked for it.
   A brand-new user would land in an app with no organization and see nothing.
3. **Store detail page was unreachable.** The route file was renamed to
   `stores.$storeId.tsx`, which nests it *inside* the stores list route. The
   list page doesn't render child routes, so clicking a store name showed
   nothing — and the page itself referenced the old route path, which is also
   why `tsc` failed.
4. `src/integrations/lovable/index.ts` (used by the auth page for Google
   sign-in) was deleted along with it.

## How to apply

1. Copy the `src/` folder from this pack into your repo, overwriting when asked.
2. **Delete this one file manually:**
   `src/routes/_authenticated/app/stores.$storeId.tsx`
   (it is replaced by `stores_.$storeId.tsx` — note the underscore — which
   makes the detail page a standalone route instead of a nested one).
3. Run `npm run dev` (this regenerates `src/routeTree.gen.ts`), then test:
   - Log out → you should see the sign-in page again at `/auth`.
   - Click a store name → the detail page with timeline should open.
4. Commit and push (no force-push) so it syncs back to Lovable.

## Files in this pack

- `src/routes/auth.tsx` — restored sign-in/sign-up page
- `src/routes/onboarding.tsx` — restored organization-creation page
- `src/integrations/lovable/index.ts` — restored (auth dependency)
- `src/routes/_authenticated/app/index.tsx` — your new dashboard, unchanged
  visually, with the "no organization → go to onboarding" check added back
- `src/routes/_authenticated/app/stores_.$storeId.tsx` — fixed detail route
