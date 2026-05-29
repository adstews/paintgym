-- paintgym: initial schema
-- Tables: projects, concepts, generations, project_images
-- Row-level security: each user can only see their own data.
-- Concepts have a per-user override model: defaults are global (user_id null),
-- user-created concepts are private (user_id = auth.uid()).

create extension if not exists "pgcrypto";

-- ===========================================================================
-- projects
-- ===========================================================================
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  client_name   text,
  product_url   text,
  product_data  jsonb,
  logo_url      text,
  created_at    timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_created_at_idx on public.projects(created_at desc);

-- ===========================================================================
-- concepts
-- ===========================================================================
create table if not exists public.concepts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  description     text not null,
  prompt_template text not null,
  sort_order      integer not null default 0,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists concepts_user_id_idx on public.concepts(user_id);
create index if not exists concepts_sort_order_idx on public.concepts(sort_order);

-- ===========================================================================
-- generations
-- ===========================================================================
create table if not exists public.generations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  concept_id  uuid not null references public.concepts(id) on delete restrict,
  prompt_text text not null,
  image_url   text,
  status      text not null default 'pending'
                check (status in ('pending', 'generating', 'completed', 'failed')),
  version     integer not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists generations_project_id_idx on public.generations(project_id);
create index if not exists generations_concept_id_idx on public.generations(concept_id);
create index if not exists generations_created_at_idx on public.generations(created_at desc);

-- ===========================================================================
-- project_images
-- ===========================================================================
create table if not exists public.project_images (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  file_url    text not null,
  file_type   text not null check (file_type in ('product', 'logo', 'reference')),
  created_at  timestamptz not null default now()
);

create index if not exists project_images_project_id_idx on public.project_images(project_id);

-- ===========================================================================
-- project_concepts (which concepts are enabled per project)
-- ===========================================================================
create table if not exists public.project_concepts (
  project_id uuid not null references public.projects(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  enabled    boolean not null default true,
  sort_order integer not null default 0,
  primary key (project_id, concept_id)
);

-- ===========================================================================
-- Row-level security
-- ===========================================================================
alter table public.projects        enable row level security;
alter table public.concepts        enable row level security;
alter table public.generations     enable row level security;
alter table public.project_images  enable row level security;
alter table public.project_concepts enable row level security;

-- projects: full CRUD restricted to owner
create policy "projects_owner_select" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_owner_insert" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_owner_update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_owner_delete" on public.projects
  for delete using (auth.uid() = user_id);

-- concepts: defaults readable by all; user concepts only by owner
create policy "concepts_read_defaults_or_own" on public.concepts
  for select using (is_default = true or auth.uid() = user_id);
create policy "concepts_owner_insert" on public.concepts
  for insert with check (auth.uid() = user_id and is_default = false);
create policy "concepts_owner_update" on public.concepts
  for update using (auth.uid() = user_id and is_default = false)
  with check (auth.uid() = user_id and is_default = false);
create policy "concepts_owner_delete" on public.concepts
  for delete using (auth.uid() = user_id and is_default = false);

-- generations: scoped through project ownership
create policy "generations_owner_select" on public.generations
  for select using (
    exists (select 1 from public.projects p
            where p.id = generations.project_id and p.user_id = auth.uid())
  );
create policy "generations_owner_insert" on public.generations
  for insert with check (
    exists (select 1 from public.projects p
            where p.id = generations.project_id and p.user_id = auth.uid())
  );
create policy "generations_owner_update" on public.generations
  for update using (
    exists (select 1 from public.projects p
            where p.id = generations.project_id and p.user_id = auth.uid())
  );
create policy "generations_owner_delete" on public.generations
  for delete using (
    exists (select 1 from public.projects p
            where p.id = generations.project_id and p.user_id = auth.uid())
  );

-- project_images: same project-ownership scoping
create policy "project_images_owner_select" on public.project_images
  for select using (
    exists (select 1 from public.projects p
            where p.id = project_images.project_id and p.user_id = auth.uid())
  );
create policy "project_images_owner_insert" on public.project_images
  for insert with check (
    exists (select 1 from public.projects p
            where p.id = project_images.project_id and p.user_id = auth.uid())
  );
create policy "project_images_owner_delete" on public.project_images
  for delete using (
    exists (select 1 from public.projects p
            where p.id = project_images.project_id and p.user_id = auth.uid())
  );

-- project_concepts: same project-ownership scoping
create policy "project_concepts_owner_select" on public.project_concepts
  for select using (
    exists (select 1 from public.projects p
            where p.id = project_concepts.project_id and p.user_id = auth.uid())
  );
create policy "project_concepts_owner_insert" on public.project_concepts
  for insert with check (
    exists (select 1 from public.projects p
            where p.id = project_concepts.project_id and p.user_id = auth.uid())
  );
create policy "project_concepts_owner_update" on public.project_concepts
  for update using (
    exists (select 1 from public.projects p
            where p.id = project_concepts.project_id and p.user_id = auth.uid())
  );
create policy "project_concepts_owner_delete" on public.project_concepts
  for delete using (
    exists (select 1 from public.projects p
            where p.id = project_concepts.project_id and p.user_id = auth.uid())
  );
