# Drop & Sell

Drop & Sell is a Baguio City-exclusive drop-off marketplace where sellers list items at approved physical hubs and buyers purchase items after hub confirmation.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app and web preview
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required mobile env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Before using marketplace data, run `artifacts/mobile/supabase/schema.sql` in the Supabase SQL Editor.
- Deploy `artifacts/mobile/supabase/functions/send-notification` as the Supabase Edge Function named `send-notification` to enable cross-device push delivery.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Mobile screens and routes: `artifacts/mobile/app`
- Shared mobile state and Supabase mutations: `artifacts/mobile/context`
- Supabase client and storage upload helpers: `artifacts/mobile/lib/supabase.ts` and `artifacts/mobile/lib/supabaseStorage.ts`
- Supabase source-of-truth schema, RLS policies, storage setup, and Baguio hub seeds: `artifacts/mobile/supabase/schema.sql`
- Expo push registration and local notification handling: `artifacts/mobile/lib/pushNotifications.ts`

## Architecture decisions

- Marketplace records are persisted directly in Supabase; AsyncStorage is reserved for the Supabase auth session, local notification preferences, and cached device token.
- Listing photos are compressed locally before upload to the public `item-photos` Supabase Storage bucket.
- The app accepts either a Supabase project URL or a copied `/rest/v1/` URL and normalizes it before creating the client.
- Push tokens and notification records are stored in Supabase, while local tray notifications are shown only for the currently signed-in user until trusted server-side delivery is added.

## Product

- Browse active Baguio dropping hubs and their listed items.
- Register as a buyer or seller, create seller profiles, and request hub partnerships.
- Create listings with real photos, drop items at a hub, and complete purchases.
- Hub admins can confirm drop-offs and approve or reject seller partnerships.
- Users can view persisted alerts for dropped items, sold items, purchases, and partnership status changes.

## User preferences

- Keep the product focused on Baguio City physical drop-off hubs.

## Gotchas

- The Supabase SQL migration is a one-time manual setup step and must be run before the home screen can show hubs.
- Cross-device push delivery requires a trusted server or Supabase Edge Function; the mobile client must not send pushes using privileged credentials.
- The Edge Function must be deployed separately after the SQL schema; its managed service-role secret is never bundled into the mobile app.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
