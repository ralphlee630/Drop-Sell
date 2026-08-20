# Drop & Sell

Drop & Sell is a Baguio City-exclusive drop-off marketplace where sellers list items at approved physical hubs and buyers purchase items after hub confirmation.

## First-time local setup

1. Install [Node.js 24](https://nodejs.org/) and [pnpm](https://pnpm.io/installation) (`corepack enable` works if you already have Node).
2. Clone the repo and install dependencies from the root:
   ```
   pnpm install
   ```
3. Create `artifacts/mobile/.env` (this file is gitignored — never commit it) with your Supabase project's credentials, found in Supabase Dashboard → Settings → API:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. If you haven't already, run `artifacts/mobile/supabase/schema.sql` and then `artifacts/mobile/supabase/security-patch-01.sql` (in that order) in the Supabase Dashboard → SQL Editor.
5. Deploy `artifacts/mobile/supabase/functions/send-notification` as a Supabase Edge Function named `send-notification` to enable push delivery.

## Run & operate

- `pnpm --filter @workspace/mobile run dev` — start the Expo dev server. Scan the QR code with the **Expo Go** app on your phone, or press `w` for the web preview.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native), Expo Router
- API: Express 5
- DB: PostgreSQL via Supabase (Auth, Row Level Security, Storage, Realtime)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Mobile screens and routes: `artifacts/mobile/app`
- Shared mobile state and Supabase mutations: `artifacts/mobile/context`
- Supabase client and storage upload helpers: `artifacts/mobile/lib/supabase.ts` and `artifacts/mobile/lib/supabaseStorage.ts`
- Supabase source-of-truth schema, RLS policies, storage setup, and Baguio hub seeds: `artifacts/mobile/supabase/schema.sql`
- Security/RLS patch (run after schema.sql): `artifacts/mobile/supabase/security-patch-01.sql`
- Expo push registration and local notification handling: `artifacts/mobile/lib/pushNotifications.ts`
- Known engineering gotchas (Metro/web bundler quirks, dependency version pins): `agents/.agents/memory/`

## Architecture decisions

- Marketplace records are persisted directly in Supabase; the mobile client is a thin layer over Supabase's client SDK, not a separate backend.
- **Sensitive mutations go through `SECURITY DEFINER` Postgres functions, not raw table writes** — item creation, marking an item dropped, purchasing, and responding to partnership requests are all RPCs (`create_item`, `mark_item_dropped`, `purchase_item`, `respond_to_partnership`) defined in `security-patch-01.sql`. This keeps business rules (approved-partnership gating, server-computed handling fees, role checks) enforced in the database, not just in app code that a modified client could bypass.
- Listing photos are compressed locally before upload to the public `item-photos` Supabase Storage bucket.
- The app accepts either a Supabase project URL or a copied `/rest/v1/` URL and normalizes it before creating the client.
- Push tokens and notification records are stored in Supabase. Local (same-device) notifications work today; true cross-device push delivery for the *other* party in a flow (e.g., notifying a seller when a buyer purchases, from the buyer's device) still needs a trusted server-side trigger — see Known Gaps below.

## Known gaps (tracked, not yet built)

- Google OAuth sign-in — only local email/password exists today.
- No scheduled job auto-expires overdue listings or sends the `deadline_passed` notification.
- `items.buyer_name` is free text, not linked to a real account — "only the reserved buyer can see it" can't be fully enforced until this is a proper foreign key.
- No in-app UI for hub self-registration yet (the database supports it as of `security-patch-01.sql`, the app doesn't expose it).
- Cross-device push delivery for the *counterparty* in a flow isn't wired up server-side yet (see Architecture decisions above).

## User preferences

- Keep the product focused on Baguio City physical drop-off hubs.

## Gotchas

- The Supabase SQL migrations (`schema.sql`, then `security-patch-01.sql`) are one-time manual setup steps and must both be run before the app is fully functional.
- The `send-notification` Edge Function must be deployed separately after the SQL schema; its managed service-role secret is never bundled into the mobile app.