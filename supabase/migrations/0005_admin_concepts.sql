-- paintgym: admin-managed default concepts.
-- Adds an "active" flag on concepts and rewrites the read policy so that
-- inactive defaults are hidden from regular users. Admin operations are
-- performed via the service role on the server, so no RLS changes are
-- needed beyond the read filter.

alter table public.concepts
  add column if not exists active boolean not null default true;

create index if not exists concepts_active_idx on public.concepts(active);

-- Replace the read policy: defaults are visible only when active.
drop policy if exists "concepts_read_defaults_or_own" on public.concepts;

create policy "concepts_read_defaults_or_own" on public.concepts
  for select using (
    (is_default = true and active = true)
    or auth.uid() = user_id
  );
