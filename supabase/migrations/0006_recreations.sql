-- paintgym: Recreate from example.
-- A recreation is a single example image uploaded by the user. Claude analyzes
-- it once and writes five distinct variant briefs. Each variant becomes a row
-- in generations, linked back to the recreation. Generations can now come
-- from a concept (the original pipeline) OR a recreation, but never both at
-- once and never neither.

create table if not exists public.recreations (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  source_image_url text not null,
  analysis         text,
  created_at       timestamptz not null default now()
);

create index if not exists recreations_project_id_idx on public.recreations(project_id);
create index if not exists recreations_created_at_idx on public.recreations(created_at desc);

-- Generations: allow null concept_id, add recreation linkage, enforce
-- exactly-one-source.
alter table public.generations
  alter column concept_id drop not null;

alter table public.generations
  add column if not exists recreation_id uuid
    references public.recreations(id) on delete cascade,
  add column if not exists variant_label text
    check (variant_label is null or variant_label in
      ('faithful','simplified','bold','alt_palette','platform_adapted'));

create index if not exists generations_recreation_id_idx
  on public.generations(recreation_id);

-- Exactly one of concept_id or recreation_id must be set on every row.
alter table public.generations
  drop constraint if exists generations_source_check;
alter table public.generations
  add constraint generations_source_check check (
    (concept_id is not null) <> (recreation_id is not null)
  );

-- RLS for recreations, scoped through project ownership (same pattern as
-- generations and briefs).
alter table public.recreations enable row level security;

create policy "recreations_owner_select" on public.recreations
  for select using (
    exists (select 1 from public.projects p
            where p.id = recreations.project_id and p.user_id = auth.uid())
  );
create policy "recreations_owner_insert" on public.recreations
  for insert with check (
    exists (select 1 from public.projects p
            where p.id = recreations.project_id and p.user_id = auth.uid())
  );
create policy "recreations_owner_update" on public.recreations
  for update using (
    exists (select 1 from public.projects p
            where p.id = recreations.project_id and p.user_id = auth.uid())
  );
create policy "recreations_owner_delete" on public.recreations
  for delete using (
    exists (select 1 from public.projects p
            where p.id = recreations.project_id and p.user_id = auth.uid())
  );
