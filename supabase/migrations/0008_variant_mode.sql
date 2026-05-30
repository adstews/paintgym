-- paintgym: variant mode. Every concept gets three distinct briefs and
-- three independent generation chains, labeled A, B, C.
--   A: the most natural interpretation
--   B: a different angle, headline, or composition
--   C: an unexpected take

-- Briefs: one row per (project, concept, variant) instead of (project, concept).
alter table public.briefs
  add column if not exists variant text not null default 'A'
    check (variant in ('A','B','C'));

alter table public.briefs
  drop constraint if exists briefs_project_id_concept_id_key;

alter table public.briefs
  drop constraint if exists briefs_project_id_concept_id_variant_key;

alter table public.briefs
  add constraint briefs_project_id_concept_id_variant_key
    unique (project_id, concept_id, variant);

-- Generations get a nullable concept_variant. Null on pre-existing rows and
-- recreation-based rows; one of A/B/C when produced from a variant brief.
alter table public.generations
  add column if not exists concept_variant text
    check (concept_variant is null or concept_variant in ('A','B','C'));

create index if not exists generations_concept_variant_idx
  on public.generations(concept_id, concept_variant);
