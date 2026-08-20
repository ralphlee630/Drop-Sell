-- Drop & Sell Supabase schema
-- Run this whole file once in Supabase Dashboard → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  full_name text not null default '',
  email text not null unique,
  phone text,
  is_seller boolean not null default false,
  role text not null default 'buyer'
    check (role in ('buyer', 'seller', 'hub_admin', 'super_admin')),
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown'
    check (platform in ('ios', 'android', 'unknown')),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create table if not exists public.notification_preferences (
  user_id text primary key references public.profiles(id) on delete cascade,
  item_dropped boolean not null default true,
  item_sold boolean not null default true,
  partnership_updates boolean not null default true,
  purchase_confirmations boolean not null default true,
  deadline_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.dropping_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  contact_info text not null default '',
  admin_user_id text references public.profiles(id) on delete set null,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  business_name text not null,
  bio text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  dropping_area_id uuid not null references public.dropping_areas(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'terminated')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (seller_id, dropping_area_id)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  dropping_area_id uuid not null references public.dropping_areas(id) on delete restrict,
  title text not null,
  description text not null default '',
  product_code text not null unique,
  buyer_name text,
  amount numeric(12, 2) not null check (amount >= 0),
  base_handling_fee numeric(12, 2) not null default 0 check (base_handling_fee >= 0),
  late_handling_fee numeric(12, 2) not null default 0 check (late_handling_fee >= 0),
  photo_url text,
  status text not null default 'pending_dropoff'
    check (status in ('pending_dropoff', 'dropped', 'sold', 'expired', 'cancelled')),
  dropped_at timestamptz,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  buyer_id text not null references public.profiles(id) on delete restrict,
  item_amount numeric(12, 2) not null,
  handling_fee_applied numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  status text not null default 'completed'
    check (status in ('reserved', 'paid', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('item_dropped', 'item_sold', 'deadline_passed', 'fee_updated',
                    'purchase_confirmed', 'partnership_approved', 'partnership_rejected')),
  title text not null,
  message text not null,
  related_item_id uuid references public.items(id) on delete cascade,
  related_partnership_id uuid references public.partnerships(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists related_partnership_id uuid references public.partnerships(id) on delete cascade;

create index if not exists items_area_status_idx on public.items (dropping_area_id, status);
create index if not exists items_seller_idx on public.items (seller_id);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists partnerships_area_status_idx on public.partnerships (dropping_area_id, status);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- Helper used by admin policies. It is security-definer to avoid policy recursion.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'super_admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.dropping_areas enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.items enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can manage their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  using (id = auth.uid()::text or public.is_super_admin());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert
  with check (id = auth.uid()::text);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()::text or public.is_super_admin())
  with check (id = auth.uid()::text or public.is_super_admin());

-- Push tokens and notification preferences are private to each account.
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens for select
  using (user_id = auth.uid()::text);
drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own on public.push_tokens for insert
  with check (user_id = auth.uid()::text);
drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens for delete
  using (user_id = auth.uid()::text);

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences for select
  using (user_id = auth.uid()::text);
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences for insert
  with check (user_id = auth.uid()::text);
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- Public browsing tables.
drop policy if exists dropping_areas_public_read on public.dropping_areas;
create policy dropping_areas_public_read on public.dropping_areas for select using (true);
drop policy if exists seller_profiles_public_read on public.seller_profiles;
create policy seller_profiles_public_read on public.seller_profiles for select using (true);
drop policy if exists items_public_read on public.items;
create policy items_public_read on public.items for select using (true);

-- Sellers manage their own profile; super admins can verify/edit.
drop policy if exists seller_profiles_insert_own on public.seller_profiles;
create policy seller_profiles_insert_own on public.seller_profiles for insert
  with check (user_id = auth.uid()::text);
drop policy if exists seller_profiles_update_own on public.seller_profiles;
create policy seller_profiles_update_own on public.seller_profiles for update
  using (user_id = auth.uid()::text or public.is_super_admin())
  with check (user_id = auth.uid()::text or public.is_super_admin());

-- Partnerships: seller requests/reads own; hub admin and super admin manage.
drop policy if exists partnerships_select on public.partnerships;
create policy partnerships_select on public.partnerships for select using (
  exists (
    select 1 from public.seller_profiles sp
    where sp.id = seller_id and sp.user_id = auth.uid()::text
  )
  or exists (
    select 1 from public.dropping_areas da
    where da.id = dropping_area_id and da.admin_user_id = auth.uid()::text
  )
  or public.is_super_admin()
);
drop policy if exists partnerships_insert_own on public.partnerships;
create policy partnerships_insert_own on public.partnerships for insert
  with check (
    exists (
      select 1 from public.seller_profiles sp
      where sp.id = seller_id and sp.user_id = auth.uid()::text
    )
  );
drop policy if exists partnerships_update_admin on public.partnerships;
create policy partnerships_update_admin on public.partnerships for update
  using (
    exists (
      select 1 from public.dropping_areas da
      where da.id = dropping_area_id and da.admin_user_id = auth.uid()::text
    )
    or public.is_super_admin()
  );

-- Transactions: buyer, seller, hub admin, and super admin can read; buyers create.
drop policy if exists transactions_select_participants on public.transactions;
create policy transactions_select_participants on public.transactions for select using (
  buyer_id = auth.uid()::text
  or exists (
    select 1 from public.items i
    join public.seller_profiles sp on sp.id = i.seller_id
    where i.id = item_id and sp.user_id = auth.uid()::text
  )
  or public.is_super_admin()
);
drop policy if exists transactions_insert_buyer on public.transactions;
create policy transactions_insert_buyer on public.transactions for insert
  with check (buyer_id = auth.uid()::text);

-- Notifications belong to their recipient.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select
  using (user_id = auth.uid()::text);
drop policy if exists notifications_insert_authenticated on public.notifications;
create policy notifications_insert_authenticated on public.notifications for insert
  with check (auth.uid() is not null);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- Hub admins/super admins can update area state; public users cannot.
drop policy if exists dropping_areas_update_admin on public.dropping_areas;
create policy dropping_areas_update_admin on public.dropping_areas for update
  using (admin_user_id = auth.uid()::text or public.is_super_admin())
  with check (admin_user_id = auth.uid()::text or public.is_super_admin());

-- Storage bucket and policies for public item photos.
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = true;

drop policy if exists item_photos_public_read on storage.objects;
create policy item_photos_public_read on storage.objects for select
  using (bucket_id = 'item-photos');
drop policy if exists item_photos_authenticated_upload on storage.objects;
create policy item_photos_authenticated_upload on storage.objects for insert
  with check (bucket_id = 'item-photos' and auth.uid() is not null);
drop policy if exists item_photos_owner_update on storage.objects;
create policy item_photos_owner_update on storage.objects for update
  using (bucket_id = 'item-photos' and owner_id = auth.uid()::text);
drop policy if exists item_photos_owner_delete on storage.objects;
create policy item_photos_owner_delete on storage.objects for delete
  using (bucket_id = 'item-photos' and owner_id = auth.uid()::text);

-- Initial Baguio hubs. Safe to run more than once.
insert into public.dropping_areas
  (name, address, latitude, longitude, contact_info, status)
select * from (values
  ('Session Road Hub', '22 Session Road, Baguio City', 16.4123, 120.5960, '+63 917 555 0101', 'active'),
  ('Burnham Park Hub', 'Burnham Park Perimeter Road, Baguio City', 16.4096, 120.5962, '+63 917 555 0102', 'active'),
  ('Mines View Hub', 'Mines View Road, Baguio City', 16.4170, 120.6300, '+63 917 555 0103', 'active')
) as seed(name, address, latitude, longitude, contact_info, status)
where not exists (
  select 1 from public.dropping_areas existing where existing.name = seed.name
);