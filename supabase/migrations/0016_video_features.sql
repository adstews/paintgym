-- paintgym: AI video ad workflows.
-- A standalone section (/video) for building AI UGC video ads. Completely
-- separate from the static-image pipeline (projects/concepts/generations).
--
-- A video_project pins one ad format (ugc, claymation, cartoon, lofi,
-- talking_head, cinematic) and the product details. Under it live scripts
-- (Claude-written, hook + scene breakdown + test angle), and under each script
-- live scenes (one per beat) and the per-scene video generations that will be
-- produced once external tools (Higgsfield, Arcads, Veo, Kling, Creatify) are
-- wired up. For now generation rows are placeholders.
--
-- Every table is user-owned and guarded by the same RLS owner pattern used
-- across the rest of the schema. Ownership on the leaf tables is resolved by
-- walking back up to video_projects.user_id.

-- ===========================================================================
-- video_projects
-- ===========================================================================
create table if not exists public.video_projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  name            text not null,
  format          text not null
    check (format in ('ugc','claymation','cartoon','lofi','talking_head','cinematic')),
  product_details jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists video_projects_user_id_idx on public.video_projects(user_id);
create index if not exists video_projects_project_id_idx on public.video_projects(project_id);
create index if not exists video_projects_created_at_idx on public.video_projects(created_at desc);

-- ===========================================================================
-- video_scripts
-- ===========================================================================
create table if not exists public.video_scripts (
  id               uuid primary key default gen_random_uuid(),
  video_project_id uuid not null references public.video_projects(id) on delete cascade,
  hook_text        text not null,
  full_script      text not null,
  scene_breakdown  jsonb not null default '[]'::jsonb,
  angle            text
    check (angle in ('problem_agitation','transformation','product_demo','social_proof','lifestyle_aspiration')),
  is_favorite      boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists video_scripts_project_idx on public.video_scripts(video_project_id);

-- ===========================================================================
-- video_scenes
-- ===========================================================================
create table if not exists public.video_scenes (
  id               uuid primary key default gen_random_uuid(),
  video_script_id  uuid not null references public.video_scripts(id) on delete cascade,
  scene_number     integer not null,
  description      text,
  prompt           text,
  duration_seconds integer,
  video_url        text,
  status           text not null default 'pending'
    check (status in ('pending','prompt_ready','generating','completed','failed')),
  created_at       timestamptz not null default now()
);

create index if not exists video_scenes_script_idx on public.video_scenes(video_script_id);

-- ===========================================================================
-- video_generations
-- ===========================================================================
create table if not exists public.video_generations (
  id             uuid primary key default gen_random_uuid(),
  video_scene_id uuid not null references public.video_scenes(id) on delete cascade,
  model          text not null
    check (model in ('seedance','kling','veo','arcads','creatify','heygen','higgsfield')),
  prompt         text not null,
  video_url      text,
  status         text not null default 'pending'
    check (status in ('pending','generating','completed','failed')),
  created_at     timestamptz not null default now()
);

create index if not exists video_generations_scene_idx on public.video_generations(video_scene_id);

-- ===========================================================================
-- Row-level security: every table is owned through video_projects.user_id.
-- ===========================================================================
alter table public.video_projects    enable row level security;
alter table public.video_scripts     enable row level security;
alter table public.video_scenes      enable row level security;
alter table public.video_generations enable row level security;

-- video_projects: direct ownership
create policy "video_projects_owner_select" on public.video_projects
  for select using (user_id = auth.uid());
create policy "video_projects_owner_insert" on public.video_projects
  for insert with check (user_id = auth.uid());
create policy "video_projects_owner_update" on public.video_projects
  for update using (user_id = auth.uid());
create policy "video_projects_owner_delete" on public.video_projects
  for delete using (user_id = auth.uid());

-- video_scripts: owned through video_projects
create policy "video_scripts_owner_select" on public.video_scripts
  for select using (exists (select 1 from public.video_projects vp
            where vp.id = video_scripts.video_project_id and vp.user_id = auth.uid()));
create policy "video_scripts_owner_insert" on public.video_scripts
  for insert with check (exists (select 1 from public.video_projects vp
            where vp.id = video_scripts.video_project_id and vp.user_id = auth.uid()));
create policy "video_scripts_owner_update" on public.video_scripts
  for update using (exists (select 1 from public.video_projects vp
            where vp.id = video_scripts.video_project_id and vp.user_id = auth.uid()));
create policy "video_scripts_owner_delete" on public.video_scripts
  for delete using (exists (select 1 from public.video_projects vp
            where vp.id = video_scripts.video_project_id and vp.user_id = auth.uid()));

-- video_scenes: owned through video_scripts -> video_projects
create policy "video_scenes_owner_select" on public.video_scenes
  for select using (exists (select 1 from public.video_scripts vs
            join public.video_projects vp on vp.id = vs.video_project_id
            where vs.id = video_scenes.video_script_id and vp.user_id = auth.uid()));
create policy "video_scenes_owner_insert" on public.video_scenes
  for insert with check (exists (select 1 from public.video_scripts vs
            join public.video_projects vp on vp.id = vs.video_project_id
            where vs.id = video_scenes.video_script_id and vp.user_id = auth.uid()));
create policy "video_scenes_owner_update" on public.video_scenes
  for update using (exists (select 1 from public.video_scripts vs
            join public.video_projects vp on vp.id = vs.video_project_id
            where vs.id = video_scenes.video_script_id and vp.user_id = auth.uid()));
create policy "video_scenes_owner_delete" on public.video_scenes
  for delete using (exists (select 1 from public.video_scripts vs
            join public.video_projects vp on vp.id = vs.video_project_id
            where vs.id = video_scenes.video_script_id and vp.user_id = auth.uid()));

-- video_generations: owned through video_scenes -> video_scripts -> video_projects
create policy "video_generations_owner_select" on public.video_generations
  for select using (exists (select 1 from public.video_scenes sc
            join public.video_scripts vs on vs.id = sc.video_script_id
            join public.video_projects vp on vp.id = vs.video_project_id
            where sc.id = video_generations.video_scene_id and vp.user_id = auth.uid()));
create policy "video_generations_owner_insert" on public.video_generations
  for insert with check (exists (select 1 from public.video_scenes sc
            join public.video_scripts vs on vs.id = sc.video_script_id
            join public.video_projects vp on vp.id = vs.video_project_id
            where sc.id = video_generations.video_scene_id and vp.user_id = auth.uid()));
create policy "video_generations_owner_update" on public.video_generations
  for update using (exists (select 1 from public.video_scenes sc
            join public.video_scripts vs on vs.id = sc.video_script_id
            join public.video_projects vp on vp.id = vs.video_project_id
            where sc.id = video_generations.video_scene_id and vp.user_id = auth.uid()));
create policy "video_generations_owner_delete" on public.video_generations
  for delete using (exists (select 1 from public.video_scenes sc
            join public.video_scripts vs on vs.id = sc.video_script_id
            join public.video_projects vp on vp.id = vs.video_project_id
            where sc.id = video_generations.video_scene_id and vp.user_id = auth.uid()));
