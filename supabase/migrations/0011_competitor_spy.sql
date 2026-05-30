-- paintgym: competitor spy.
-- Projects carry an optional scraped snapshot of a competitor product. Each
-- generation produced from a competitor brief is tagged so the gallery can
-- show them in a separate competitive section.

alter table public.projects
  add column if not exists competitor_data jsonb;

alter table public.generations
  add column if not exists is_competitive boolean not null default false,
  add column if not exists competitor_name text;

create index if not exists generations_is_competitive_idx
  on public.generations(is_competitive);
