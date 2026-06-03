-- paintgym: second image-generation model (OpenAI) alongside Gemini.
--
-- Adds per-image model tracking so the gallery can badge which model produced
-- each image (G for Gemini, O for OpenAI). The project-level routing preference
-- ("gemini" | "openai" | "alternating" | "both") lives in projects.style_settings
-- (jsonb) and needs no column.
--
-- The job queue carries the chosen model in jobs.payload.model (jsonb), so no
-- column change is needed there either; the worker reads it via the router.

-- Which model rendered each image. Backfill every existing row as 'gemini',
-- since that was the only generator before this migration. Nullable so the app
-- can still insert without it (the UI treats null as Gemini).
alter table public.generations
  add column if not exists model_used text
    check (model_used is null or model_used in ('gemini', 'openai'));

update public.generations set model_used = 'gemini' where model_used is null;
