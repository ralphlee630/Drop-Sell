-- Drop & Sell — Patch 02: fees belong to the dropping area, not the seller
-- Run this AFTER schema.sql and security-patch-01.sql, once, in the
-- Supabase Dashboard → SQL Editor. Safe to re-run (idempotent).

-- ============================================================================
-- 1. Dropping areas now own the handling fee. Every item dropped at a hub
--    uses that hub's fee — sellers can no longer set their own.
-- ============================================================================
alter table public.dropping_areas
  add column if not exists base_handling_fee numeric(12, 2) not null default 0
    check (base_handling_fee >= 0),
  add column if not exists late_handling_fee numeric(12, 2) not null default 0
    check (late_handling_fee >= 0);

-- Backfill existing hubs with a sensible default so nothing breaks if this
-- runs on a project that already has seeded dropping areas.
update public.dropping_areas
  set base_handling_fee = 25, late_handling_fee = 15
  where base_handling_fee = 0 and late_handling_fee = 0;

-- ============================================================================
-- 2. create_item: no longer accepts fee parameters from the client at all.
--    Fees are looked up from the dropping area server-side, so a modified
--    client can never submit its own fee for an item.
-- ============================================================================
drop function if exists public.create_item(
  uuid, text, text, text, text, numeric, numeric, numeric, text, timestamptz
);

create or replace function public.create_item(
  p_dropping_area_id uuid,
  p_title text,
  p_description text,
  p_product_code text,
  p_buyer_name text,
  p_amount numeric,
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
  v_area public.dropping_areas;
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

  select * into v_area from public.dropping_areas where id = p_dropping_area_id;
  if v_area is null or v_area.status <> 'active' then
    raise exception 'This dropping area is not currently active';
  end if;

  if p_amount < 0 then
    raise exception 'Amount cannot be negative';
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
    p_amount, v_area.base_handling_fee, v_area.late_handling_fee,
    p_photo_url, 'pending_dropoff', p_deadline_at
  )
  returning * into v_item;

  return v_item;
end;
$$;

grant execute on function public.create_item(
  uuid, text, text, text, text, numeric, text, timestamptz
) to authenticated;

-- ============================================================================
-- 3. register_dropping_area: any signed-in user can propose a new hub.
--    It always starts at 'pending_approval' — never goes live until you
--    (super admin) approve it. This replaces relying on a raw client insert
--    so the status/admin_user_id can never be spoofed by the client.
-- ============================================================================
create or replace function public.register_dropping_area(
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_contact_info text,
  p_base_handling_fee numeric,
  p_late_handling_fee numeric
)
returns public.dropping_areas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area public.dropping_areas;
begin
  if p_base_handling_fee < 0 or p_late_handling_fee < 0 then
    raise exception 'Fees cannot be negative';
  end if;

  insert into public.dropping_areas (
    name, address, latitude, longitude, contact_info,
    admin_user_id, status, base_handling_fee, late_handling_fee
  ) values (
    trim(p_name), trim(p_address), p_latitude, p_longitude, trim(coalesce(p_contact_info, '')),
    auth.uid()::text, 'pending_approval', p_base_handling_fee, p_late_handling_fee
  )
  returning * into v_area;

  return v_area;
end;
$$;

grant execute on function public.register_dropping_area(
  text, text, double precision, double precision, text, numeric, numeric
) to authenticated;

-- Client-side raw inserts into dropping_areas are no longer needed now that
-- register_dropping_area() exists and is security definer. Close that path.
drop policy if exists dropping_areas_insert_self on public.dropping_areas;

-- ============================================================================
-- 4. review_dropping_area: super-admin-only approve/reject for a pending hub,
--    with the ability to adjust the proposed fees before going live.
-- ============================================================================
create or replace function public.review_dropping_area(
  p_area_id uuid,
  p_status text,
  p_base_handling_fee numeric default null,
  p_late_handling_fee numeric default null
)
returns public.dropping_areas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area public.dropping_areas;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can review dropping areas';
  end if;

  if p_status not in ('active', 'rejected', 'suspended') then
    raise exception 'Invalid status';
  end if;

  update public.dropping_areas
    set status = p_status,
        base_handling_fee = coalesce(p_base_handling_fee, base_handling_fee),
        late_handling_fee = coalesce(p_late_handling_fee, late_handling_fee)
    where id = p_area_id
    returning * into v_area;

  if v_area is null then
    raise exception 'Dropping area not found';
  end if;

  return v_area;
end;
$$;

grant execute on function public.review_dropping_area(
  uuid, text, numeric, numeric
) to authenticated;

-- Raw client updates to dropping_areas (e.g. an owner editing their own hub)
-- still go through the existing dropping_areas_update_admin policy — that's
-- fine for name/address/contact_info, but status changes and fee approval
-- for *pending* hubs should only happen through review_dropping_area above.
-- Add a trigger so a hub owner can't just approve their own submission by
-- calling a raw update directly.
create or replace function public.prevent_self_area_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if public.is_super_admin() then
    return new;
  end if;
  raise exception 'Only a super admin can change a dropping area''s status';
end;
$$;

drop trigger if exists trg_prevent_self_area_approval on public.dropping_areas;
create trigger trg_prevent_self_area_approval
before update on public.dropping_areas
for each row execute function public.prevent_self_area_approval();