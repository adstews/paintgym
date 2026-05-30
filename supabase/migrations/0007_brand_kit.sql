-- paintgym: project-level brand kit.
-- Stored as jsonb so the shape can evolve without further migrations.
-- brand_colors: [{ "label": "primary", "hex": "#0F172A" }, ...]
-- brand_fonts:  [{ "role": "heading", "family": "Fraunces" }, ...]
-- brand_voice:  short paragraph describing the brand's tone of voice.

alter table public.projects
  add column if not exists brand_colors jsonb not null default '[]'::jsonb,
  add column if not exists brand_fonts  jsonb not null default '[]'::jsonb,
  add column if not exists brand_voice  text;
