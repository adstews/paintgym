-- paintgym: watermarks, credits, and Stripe.

-- Every generation now keeps both a clean image and a watermarked preview.
-- is_unlocked controls whether the user has paid to download the clean copy.
alter table public.generations
  add column if not exists watermarked_url text,
  add column if not exists is_unlocked boolean not null default false;

create index if not exists generations_is_unlocked_idx
  on public.generations(is_unlocked);

-- Per-user wallet. One row per auth user. credit_balance starts at the free
-- preview allotment (5). stripe_customer_id is filled on first checkout.
create table if not exists public.user_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  credit_balance     integer not null default 5,
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_owner_select" on public.user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_owner_update" on public.user_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One row per successful Stripe checkout. Idempotency is enforced by the
-- unique stripe_session_id index on the webhook handler.
create table if not exists public.credit_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  credits           integer not null,
  amount_paid_cents integer not null,
  stripe_session_id text unique not null,
  created_at        timestamptz not null default now()
);

create index if not exists credit_purchases_user_id_idx
  on public.credit_purchases(user_id);

alter table public.credit_purchases enable row level security;

create policy "credit_purchases_owner_select" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- Auto-create user_profiles when a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users.
insert into public.user_profiles (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;
