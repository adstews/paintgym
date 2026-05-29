-- paintgym: brief generation feature
-- Extends projects with structured product inputs and style settings,
-- adds a briefs table for Claude-generated copy, and a storage bucket for
-- user-uploaded product images and logos.

-- ===========================================================================
-- projects: extra structured fields
-- ===========================================================================
alter table public.projects
  add column if not exists brand_name          text,
  add column if not exists product_name        text,
  add column if not exists product_description text,
  add column if not exists key_selling_points  text,
  add column if not exists target_audience     text,
  add column if not exists price_point         text,
  add column if not exists proof_points        text,
  add column if not exists style_settings      jsonb not null
    default '{"aggressiveness":"average","tone":"professional","visual_style":"clean","platform":"meta"}'::jsonb;

-- ===========================================================================
-- briefs: one Claude-generated brief per (project, concept), editable
-- ===========================================================================
create table if not exists public.briefs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  concept_id  uuid not null references public.concepts(id) on delete cascade,
  brief_text  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, concept_id)
);

create index if not exists briefs_project_id_idx on public.briefs(project_id);

alter table public.briefs enable row level security;

create policy "briefs_owner_select" on public.briefs
  for select using (
    exists (select 1 from public.projects p
            where p.id = briefs.project_id and p.user_id = auth.uid())
  );
create policy "briefs_owner_insert" on public.briefs
  for insert with check (
    exists (select 1 from public.projects p
            where p.id = briefs.project_id and p.user_id = auth.uid())
  );
create policy "briefs_owner_update" on public.briefs
  for update using (
    exists (select 1 from public.projects p
            where p.id = briefs.project_id and p.user_id = auth.uid())
  );
create policy "briefs_owner_delete" on public.briefs
  for delete using (
    exists (select 1 from public.projects p
            where p.id = briefs.project_id and p.user_id = auth.uid())
  );

-- ===========================================================================
-- Storage bucket for product images and logos
-- ===========================================================================
insert into storage.buckets (id, name, public)
  values ('paintgym-assets', 'paintgym-assets', true)
  on conflict (id) do nothing;

-- Read: bucket is public so unauthenticated read works.
-- Write/Delete: restricted to authenticated users on paths under their user id.

create policy "paintgym_assets_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'paintgym-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "paintgym_assets_update"
  on storage.objects for update
  using (
    bucket_id = 'paintgym-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "paintgym_assets_delete"
  on storage.objects for delete
  using (
    bucket_id = 'paintgym-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
