import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationRow = {
  id: string;
  user_id: string;
  type:
    | 'item_dropped'
    | 'item_sold'
    | 'deadline_passed'
    | 'fee_updated'
    | 'purchase_confirmed'
    | 'partnership_approved'
    | 'partnership_rejected';
  title: string;
  message: string;
  related_item_id: string | null;
  related_partnership_id: string | null;
};

type PushTokenRow = {
  token: string;
};

const preferenceForType: Record<NotificationRow['type'], string | null> = {
  item_dropped: 'item_dropped',
  item_sold: 'item_sold',
  partnership_approved: 'partnership_updates',
  partnership_rejected: 'partnership_updates',
  purchase_confirmed: 'purchase_confirmations',
  deadline_passed: 'deadline_reminders',
  fee_updated: null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isExpoPushToken(token: string) {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

async function canDispatch(
  admin: ReturnType<typeof createClient>,
  notification: NotificationRow,
  actorId: string
) {
  if (notification.user_id === actorId) return true;

  const { data: actorProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .maybeSingle();
  if (actorProfile?.role === 'super_admin') return true;

  if (notification.type === 'item_dropped' || notification.type === 'item_sold') {
    if (!notification.related_item_id) return false;

    const { data: item } = await admin
      .from('items')
      .select('seller_id,dropping_area_id')
      .eq('id', notification.related_item_id)
      .maybeSingle();
    if (!item) return false;

    const { data: seller } = await admin
      .from('seller_profiles')
      .select('user_id')
      .eq('id', item.seller_id)
      .maybeSingle();
    if (!seller || seller.user_id !== notification.user_id) return false;

    if (notification.type === 'item_dropped') {
      const { data: area } = await admin
        .from('dropping_areas')
        .select('admin_user_id')
        .eq('id', item.dropping_area_id)
        .maybeSingle();
      return area?.admin_user_id === actorId;
    }

    const { data: transaction } = await admin
      .from('transactions')
      .select('buyer_id')
      .eq('item_id', notification.related_item_id)
      .eq('buyer_id', actorId)
      .maybeSingle();
    return transaction?.buyer_id === actorId;
  }

  if (
    notification.type === 'partnership_approved' ||
    notification.type === 'partnership_rejected'
  ) {
    if (!notification.related_partnership_id) return false;

    const { data: partnership } = await admin
      .from('partnerships')
      .select('seller_id,dropping_area_id')
      .eq('id', notification.related_partnership_id)
      .maybeSingle();
    if (!partnership) return false;

    const { data: seller } = await admin
      .from('seller_profiles')
      .select('user_id')
      .eq('id', partnership.seller_id)
      .maybeSingle();
    const { data: area } = await admin
      .from('dropping_areas')
      .select('admin_user_id')
      .eq('id', partnership.dropping_area_id)
      .maybeSingle();
    return seller?.user_id === notification.user_id && area?.admin_user_id === actorId;
  }

  return false;
}

async function sendExpoMessages(messages: Array<Record<string, unknown>>) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API returned ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Supabase function secrets are not configured' }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Invalid session' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { notificationId?: string; excludePushToken?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.notificationId) {
    return json({ error: 'notificationId is required' }, 400);
  }

  const { data: notification, error: notificationError } = await admin
    .from('notifications')
    .select(
      'id,user_id,type,title,message,related_item_id,related_partnership_id'
    )
    .eq('id', body.notificationId)
    .single();
  if (notificationError || !notification) {
    return json({ error: 'Notification not found' }, 404);
  }

  const allowed = await canDispatch(admin, notification as NotificationRow, authData.user.id);
  if (!allowed) {
    return json({ error: 'Not allowed to deliver this notification' }, 403);
  }

  const preferenceColumn = preferenceForType[notification.type as NotificationRow['type']];
  if (preferenceColumn) {
    const { data: preferences } = await admin
      .from('notification_preferences')
      .select(preferenceColumn)
      .eq('user_id', notification.user_id)
      .maybeSingle();
    if (preferences && preferences[preferenceColumn] === false) {
      return json({ sent: 0, skipped: 'preference_disabled' });
    }
  }

  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', notification.user_id);
  if (tokenError) {
    return json({ error: `Could not load push tokens: ${tokenError.message}` }, 500);
  }

  const tokens = (tokenRows as PushTokenRow[])
    .map((row) => row.token)
    .filter(isExpoPushToken)
    .filter((token) => token !== body.excludePushToken);

  if (tokens.length === 0) {
    return json({ sent: 0, skipped: 'no_registered_devices' });
  }

  const messages = tokens.map((token) => ({
    to: token,
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: notification.id,
      itemId: notification.related_item_id ?? undefined,
      partnershipId: notification.related_partnership_id ?? undefined,
      screen: notification.related_item_id
        ? 'item'
        : notification.related_partnership_id
          ? 'partnerships'
          : 'notifications',
    },
    sound: 'default',
  }));

  const results = [];
  for (let start = 0; start < messages.length; start += 100) {
    results.push(await sendExpoMessages(messages.slice(start, start + 100)));
  }

  return json({ sent: tokens.length, results });
});