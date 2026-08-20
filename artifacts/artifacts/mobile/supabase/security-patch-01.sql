-- Drop & Sell — Critical security patch
-- Run this AFTER schema.sql, once, in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (idempotent): uses create or replace / drop-if-exists throughout.

-- ============================================================================
-- 1. STOP SELF-ESCALATION OF profiles.role
--    Users may still toggle their own role between 'buyer' and 'seller'
--    (this is how "Become a Seller" works). They can never grant themselves
--    'hub_admin' or 'super_admin' — only an existing super_admin can do that.
-- ============================================================================
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = old.role then
    return new;
  end if;

  if public.is_super_admin() then
    return new;
  end if;

  if auth.uid()::text = old.id
     and old.role in ('buyer', 'seller')
     and new.role in ('buyer', 'seller') then
    return new;
  end if;

  raise exception 'Not authorized to change role from % to %', old.role, new.role;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

-- ============================================================================
-- 2. DROPPING AREAS: allow self-registration (pending approval), and stop
--    leaking not-yet-approved hubs to the public.
-- ============================================================================
drop policy if exists dropping_areas_insert_self on public.dropping_areas;
create policy dropping_areas_insert_self on public.dropping_areas for insert
  with check (admin_user_id = auth.uid()::text);

drop policy if exists dropping_areas_public_read on public.dropping_areas;
create policy dropping_areas_public_read on public.dropping_areas for select
  using (
    status = 'active'
    or admin_user_id = auth.uid()::text
    or public.is_super_admin()
  );

-- ============================================================================
-- 3. LOCK DOWN notifications — no more open insert policy.
--    From now on, notifications are only ever created by the SECURITY DEFINER
--    functions below, which already verify the actor is allowed to notify
--    that specific recipient.
-- ============================================================================
drop policy if exists notifications_insert_authenticated on public.notifications;

-- ============================================================================
-- 4. LOCK DOWN transactions — remove the open client-side insert.
--    Purchases must go through purchase_item() below, which computes the
--    fee server-side and performs the reservation atomically.
-- ============================================================================
drop policy if exists transactions_insert_buyer on public.transactions;

-- ============================================================================
-- 5. LOCK DOWN partnerships updates — responses must go through
--    respond_to_partnership() below, so the notification always matches
--    the actual decision.
-- ============================================================================
drop policy if exists partnerships_update_admin on public.partnerships;

-- ============================================================================
-- 6. RPC: create_item
--    Replaces the client's raw `items.insert(...)`. Enforces that the
--    caller has a seller profile AND an APPROVED partnership with the
--    target dropping area — this is the partnership-gating rule that
--    previously existed only in app code and could be bypassed.
-- ============================================================================
create or replace function public.create_item(
  p_dropping_area_id uuid,
  p_title text,
  p_description text,
  p_product_code text,
  p_buyer_name text,
  p_amount numeric,
  p_base_handling_fee numeric,
  p_late_handling_fee numeric,
  p_photo_url text,
  p_deadline_at timestamptz
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_partnership_status text;
  v_item public.items;
begin
  select id into v_seller_id
    from public.seller_profiles
    where user_id = auth.uid()::text;

  if v_seller_id is null then
    raise exception 'A seller profile is required to list items';
  end if;

  select status into v_partnership_status
    from public.partnerships
    where seller_id = v_seller_id and dropping_area_id = p_dropping_area_id;

  if v_partnership_status is distinct from 'approved' then
    raise exception 'You need an approved partnership with this dropping area before listing items there';
  end if;

  if p_amount < 0 or p_base_handling_fee < 0 or p_late_handling_fee < 0 then
    raise exception 'Amounts and fees cannot be negative';
  end if;

  if p_deadline_at <= now() then
    raise exception 'Deadline must be in the future';
  end if;

  insert into public.items (
    seller_id, dropping_area_id, title, description, product_code,
    buyer_name, amount, base_handling_fee, late_handling_fee,
    photo_url, status, deadline_at
  ) values (
    v_seller_id, p_dropping_area_id, trim(p_title), trim(coalesce(p_description, '')),
    trim(p_product_code), nullif(trim(coalesce(p_buyer_name, '')), ''),
    p_amount, p_base_handling_fee, p_late_handling_fee,
    p_photo_url, 'pending_dropoff', p_deadline_at
  )
  returning * into v_item;

  return v_item;
end;
$$;

grant execute on function public.create_item(
  uuid, text, text, text, text, numeric, numeric, numeric, text, timestamptz
) to authenticated;

-- ============================================================================
-- 7. RPC: mark_item_dropped
--    Replaces the client's raw `items.update({status:'dropped'})`.
--    Only the hub admin for that item's dropping area (or a super admin)
--    may confirm drop-off, and only from pending_dropoff.
-- ============================================================================
create or replace function public.mark_item_dropped(p_item_id uuid)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_area_admin text;
  v_seller_user_id text;
begin
  select * into v_item from public.items where id = p_item_id for update;
  if v_item is null then
    raise exception 'Item not found';
  end if;

  select admin_user_id into v_area_admin
    from public.dropping_areas where id = v_item.dropping_area_id;

  if v_area_admin is distinct from auth.uid()::text and not public.is_super_admin() then
    raise exception 'Only the hub admin can confirm drop-off';
  end if;

  if v_item.status <> 'pending_dropoff' then
    raise exception 'Item is not awaiting drop-off';
  end if;

  update public.items
    set status = 'dropped', dropped_at = now()
    where id = p_item_id
    returning * into v_item;

  select user_id into v_seller_user_id
    from public.seller_profiles where id = v_item.seller_id;

  if v_seller_user_id is not null then
    insert into public.notifications (user_id, type, title, message, related_item_id, is_read)
    values (
      v_seller_user_id, 'item_dropped', 'Item Arrived at Hub',
      '"' || v_item.title || '" (' || v_item.product_code || ') is ready for buyers.',
      p_item_id, false
    );
  end if;

  return v_item;
end;
$$;

grant execute on function public.mark_item_dropped(uuid) to authenticated;

-- ============================================================================
-- 8. RPC: purchase_item
--    Replaces the client's raw transaction insert + item update.
--    Atomic (row-locked with FOR UPDATE), and computes the handling fee
--    server-side from the item's actual deadline — the client can no
--    longer submit its own total.
-- ============================================================================
create or replace function public.purchase_item(p_item_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_fee numeric(12, 2);
  v_txn public.transactions;
  v_seller_user_id text;
begin
  select * into v_item from public.items where id = p_item_id for update;
  if v_item is null then
    raise exception 'Item not found';
  end if;
  if v_item.status <> 'dropped' then
    raise exception 'Item is no longer available for purchase';
  end if;

  if now() > v_item.deadline_at then
    v_fee := v_item.base_handling_fee + v_item.late_handling_fee;
  else
    v_fee := v_item.base_handling_fee;
  end if;

  update public.items set status = 'sold' where id = p_item_id;

  insert into public.transactions (item_id, buyer_id, item_amount, handling_fee_applied, total_amount, status)
  values (p_item_id, auth.uid()::text, v_item.amount, v_fee, v_item.amount + v_fee, 'completed')
  returning * into v_txn;

  insert into public.notifications (user_id, type, title, message, related_item_id, is_read)
  values (
    auth.uid()::text, 'purchase_confirmed', 'Purchase Confirmed',
    'Your purchase of "' || v_item.title || '" is confirmed. Pick it up at the hub.',
    p_item_id, false
  );

  select user_id into v_seller_user_id from public.seller_profiles where id = v_item.seller_id;
  if v_seller_user_id is not null then
    insert into public.notifications (user_id, type, title, message, related_item_id, is_read)
    values (
      v_seller_user_id, 'item_sold', 'Item Sold',
      '"' || v_item.title || '" (' || v_item.product_code || ') was purchased by a buyer.',
      p_item_id, false
    );
  end if;

  return v_txn;
end;
$$;

grant execute on function public.purchase_item(uuid) to authenticated;

-- ============================================================================
-- 9. RPC: respond_to_partnership
--    Replaces the client's raw `partnerships.update(...)` + notification
--    insert. Only the hub admin (or super admin) may approve/reject, and
--    the notification always matches the real decision.
-- ============================================================================
create or replace function public.respond_to_partnership(p_partnership_id uuid, p_status text)
returns public.partnerships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partnership public.partnerships;
  v_area_admin text;
  v_area_name text;
  v_seller_user_id text;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  select * into v_partnership from public.partnerships where id = p_partnership_id for update;
  if v_partnership is null then
    raise exception 'Partnership request not found';
  end if;

  select admin_user_id, name into v_area_admin, v_area_name
    from public.dropping_areas where id = v_partnership.dropping_area_id;

  if v_area_admin is distinct from auth.uid()::text and not public.is_super_admin() then
    raise exception 'Only the hub admin can respond to this request';
  end if;

  update public.partnerships
    set status = p_status,
        approved_at = case when p_status = 'approved' then now() else null end
    where id = p_partnership_id
    returning * into v_partnership;

  select user_id into v_seller_user_id
    from public.seller_profiles where id = v_partnership.seller_id;

  if v_seller_user_id is not null then
    insert into public.notifications (user_id, type, title, message, related_partnership_id, is_read)
    values (
      v_seller_user_id,
      case when p_status = 'approved' then 'partnership_approved' else 'partnership_rejected' end,
      case when p_status = 'approved' then 'Partnership Approved' else 'Partnership Not Approved' end,
      case when p_status = 'approved'
        then 'You can now list items at ' || coalesce(v_area_name, 'the hub') || '.'
        else 'Your request with ' || coalesce(v_area_name, 'the hub') || ' was declined.'
      end,
      p_partnership_id, false
    );
  end if;

  return v_partnership;
end;
$$;

grant execute on function public.respond_to_partnership(uuid, text) to authenticated;
