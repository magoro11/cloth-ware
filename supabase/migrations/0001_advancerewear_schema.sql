-- AdvanceReWear Supabase schema + RLS
-- Run with: supabase db push

create extension if not exists pgcrypto;

create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.listing_status as enum ('pending', 'approved', 'rejected');
create type public.rental_status as enum ('pending', 'confirmed', 'active', 'completed', 'canceled', 'late');
create type public.payout_status as enum ('pending', 'released', 'failed');
create type public.deposit_status as enum ('held', 'partially_refunded', 'refunded', 'forfeited');
create type public.dispute_status as enum ('open', 'in_review', 'resolved', 'rejected');

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  stripe_connect_id text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  brand text not null,
  category text not null,
  size text not null,
  condition text not null,
  rental_price integer not null check (rental_price > 0),
  buy_price integer,
  deposit_amount integer not null check (deposit_amount > 0),
  availability_dates daterange[] not null default '{}',
  images text[] not null default '{}',
  status public.listing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.users(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  rental_days integer not null,
  rental_amount integer not null,
  deposit_amount integer not null,
  commission_amount integer not null,
  seller_payout_amount integer not null,
  status public.rental_status not null default 'pending',
  return_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_dates_valid check (end_date >= start_date)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.users(id) on delete restrict,
  amount integer not null,
  stripe_payment_intent text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rentals(id) on delete cascade,
  amount integer not null,
  status public.deposit_status not null default 'held',
  released_amount integer,
  deduction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rentals(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  status public.payout_status not null default 'pending',
  stripe_transfer_id text,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete set null,
  raised_by uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status public.dispute_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists idx_listings_status_category on public.listings(status, category);
create index if not exists idx_rentals_listing_dates on public.rentals(listing_id, start_date, end_date);
create index if not exists idx_messages_users on public.messages(sender_id, recipient_id, created_at desc);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.rentals enable row level security;
alter table public.purchases enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.deposits enable row level security;
alter table public.payouts enable row level security;
alter table public.disputes enable row level security;
alter table public.wishlists enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(select 1 from public.users where auth_user_id = uid and role = 'admin');
$$;

create policy "Users read self" on public.users
for select using (auth.uid() = auth_user_id or public.is_admin(auth.uid()));

create policy "Users update self" on public.users
for update using (auth.uid() = auth_user_id or public.is_admin(auth.uid()));

create policy "Profiles public read" on public.profiles
for select using (true);

create policy "Profiles owner manage" on public.profiles
for all using (
  exists (
    select 1 from public.users u
    where u.id = profiles.user_id and (u.auth_user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

create policy "Listings public approved read" on public.listings
for select using (status = 'approved' or public.is_admin(auth.uid()) or exists (
  select 1 from public.users u where u.id = listings.seller_id and u.auth_user_id = auth.uid()
));

create policy "Listings seller create" on public.listings
for insert with check (
  exists (
    select 1 from public.users u
    where u.id = listings.seller_id and u.auth_user_id = auth.uid() and u.role in ('seller', 'admin')
  )
);

create policy "Listings seller update when unbooked" on public.listings
for update using (
  public.is_admin(auth.uid()) or (
    exists (
      select 1 from public.users u
      where u.id = listings.seller_id and u.auth_user_id = auth.uid()
    )
    and not exists (
      select 1 from public.rentals r
      where r.listing_id = listings.id and r.status in ('pending', 'confirmed', 'active', 'late')
    )
  )
);

create policy "Rentals participants read" on public.rentals
for select using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid() and (u.id = rentals.buyer_id or u.id in (select seller_id from public.listings where id = rentals.listing_id))
  ) or public.is_admin(auth.uid())
);

create policy "Rentals buyer create" on public.rentals
for insert with check (
  exists (select 1 from public.users u where u.id = rentals.buyer_id and u.auth_user_id = auth.uid())
);

create policy "Wishlists owner manage" on public.wishlists
for all using (
  exists (select 1 from public.users u where u.id = wishlists.user_id and u.auth_user_id = auth.uid())
);

create policy "Messages participants read" on public.messages
for select using (
  exists (select 1 from public.users u where u.auth_user_id = auth.uid() and (u.id = messages.sender_id or u.id = messages.recipient_id))
);

create policy "Messages sender insert" on public.messages
for insert with check (
  exists (select 1 from public.users u where u.id = messages.sender_id and u.auth_user_id = auth.uid())
);

create policy "Admin manage disputes" on public.disputes
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public brands read" on public.brands for select using (true);
create policy "Public categories read" on public.categories for select using (true);

insert into public.categories(name)
values ('Dress'), ('Suit'), ('Coat'), ('Shoes'), ('Bag'), ('Accessories')
on conflict (name) do nothing;

insert into public.brands(name, featured)
values
  ('Chanel', true),
  ('Dior', true),
  ('Saint Laurent', true),
  ('Valentino', true),
  ('Gucci', true),
  ('Prada', true)
on conflict (name) do nothing;
