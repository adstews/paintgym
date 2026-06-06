-- SEO + content foundation: blog posts, email captures for the free tools, and
-- a small IP usage table used to rate-limit the public demo tools.

-- ---------------------------------------------------------------------------
-- Blog posts
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  description     text,
  content         text not null,
  author          text not null default 'Paintgym Team',
  published_at    timestamptz not null default now(),
  is_published    boolean not null default true,
  meta_title      text,
  meta_description text,
  og_image_url    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

-- Published posts are readable by everyone (anon + authenticated). Writes have
-- no policy, so only the service role (which bypasses RLS) can insert or edit.
drop policy if exists "blog_posts_read_published" on public.blog_posts;
create policy "blog_posts_read_published" on public.blog_posts
  for select using (is_published = true);

create index if not exists blog_posts_published_idx
  on public.blog_posts (published_at desc);

-- ---------------------------------------------------------------------------
-- Email captures (free tools lead capture)
-- ---------------------------------------------------------------------------
create table if not exists public.email_captures (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.email_captures enable row level security;
-- No policies: every insert goes through a service-role API route.

create index if not exists email_captures_email_idx
  on public.email_captures (email);
create index if not exists email_captures_source_idx
  on public.email_captures (source);

-- ---------------------------------------------------------------------------
-- Tool usage (per-IP, per-day rate limiting for the public demo tools)
-- ---------------------------------------------------------------------------
create table if not exists public.tool_usage (
  id_key      text primary key,        -- "<ip>:<tool>:<yyyy-mm-dd>"
  ip          text not null,
  tool        text not null,
  day         date not null,
  count       integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.tool_usage enable row level security;
-- No policies: read + write only via the service role.

create index if not exists tool_usage_day_idx on public.tool_usage (day);
