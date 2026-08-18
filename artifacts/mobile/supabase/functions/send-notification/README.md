# Drop & Sell remote notifications

Deploy this function to the same Supabase project after running
`artifacts/mobile/supabase/schema.sql`:

```bash
supabase functions deploy send-notification
```

The function uses Supabase's managed `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` runtime variables. Do
not put the service role key in the Expo app or commit it to the repository.

The mobile app invokes this function after creating a notification row. The
function validates the signed-in actor, checks the recipient's synced
notification preference, and sends the alert through Expo Push to every
registered device for that account.