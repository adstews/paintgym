-- paintgym: per-project compliance / hard rules.
-- A free-text field where the user lists hard rules, compliance requirements,
-- and things to avoid (banned claims, required disclaimers, words/imagery to
-- stay away from). It is injected into every brief-writing prompt as a
-- non-negotiable constraint, enforced like the price rule.

alter table public.projects
  add column if not exists compliance_rules text;
