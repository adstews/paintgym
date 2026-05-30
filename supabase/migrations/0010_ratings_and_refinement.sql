-- paintgym: feedback loop (ratings) + refinement chain.
-- Adds per-generation user signals (rating, favorite, used_in_ad) that feed
-- the few-shot loop, and a self-referencing refined_from edge that lets a
-- generation point at the parent generation it was iterated from.

alter table public.generations
  add column if not exists rating integer
    check (rating is null or rating between 1 and 5),
  add column if not exists is_favorited boolean not null default false,
  add column if not exists used_in_ad boolean not null default false,
  add column if not exists refined_from uuid
    references public.generations(id) on delete set null,
  add column if not exists refinement_feedback text;

-- Rated rows are the few-shot corpus; query by rating to grab the top tier.
create index if not exists generations_rating_idx
  on public.generations(rating);

-- Favorited + used_in_ad are also part of the "top performers" filter; index
-- the booleans so partial scans are cheap.
create index if not exists generations_is_favorited_idx
  on public.generations(is_favorited);
create index if not exists generations_used_in_ad_idx
  on public.generations(used_in_ad);

-- The refinement chain is walked from a parent to its children when a user
-- views iteration history; index the parent column.
create index if not exists generations_refined_from_idx
  on public.generations(refined_from);
