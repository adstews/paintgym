-- paintgym: model-targeted briefs + fractional credit costs.
--
-- 1. Gemini and GPT now get separately authored briefs (different copy and
--    visual direction) so their images diverge instead of reusing one brief.
--    A brief is now unique per (project, concept, variant, model_target).
-- 2. Regenerations/refinements cost 0.5 credits, so the wallet must hold
--    fractional balances.

-- ===========================================================================
-- briefs: per-model targeting
-- ===========================================================================
alter table public.briefs
  add column if not exists model_target text not null default 'gemini'
    check (model_target in ('gemini', 'openai'));

-- Widen the uniqueness key so a Gemini brief and a GPT brief can coexist for
-- the same concept/variant.
alter table public.briefs
  drop constraint if exists briefs_project_id_concept_id_variant_key;
alter table public.briefs
  drop constraint if exists briefs_project_id_concept_id_variant_model_target_key;
alter table public.briefs
  add constraint briefs_project_id_concept_id_variant_model_target_key
    unique (project_id, concept_id, variant, model_target);

-- ===========================================================================
-- projects: "Mix it up" is the new default aggressiveness for new projects.
-- (Existing rows keep whatever they already stored.)
-- ===========================================================================
alter table public.projects
  alter column style_settings
  set default '{"aggressiveness":"mix","tone":"professional","visual_style":"clean","platform":"meta","image_model":"gemini"}'::jsonb;

-- ===========================================================================
-- user_profiles: fractional credit balances (0.5-credit regenerations)
-- ===========================================================================
alter table public.user_profiles
  alter column credit_balance type numeric(10, 1) using credit_balance::numeric;
alter table public.user_profiles
  alter column credit_balance set default 5;
