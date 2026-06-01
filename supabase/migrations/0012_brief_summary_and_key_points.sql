-- Condensed brief view: store a one-line summary and 3 key points alongside
-- the full brief so the UI can show highlights instead of the whole brief.
-- Applied to the remote project on 2026-06-01 via the Supabase MCP.
alter table public.briefs add column if not exists summary text;
alter table public.briefs add column if not exists key_points jsonb not null default '[]'::jsonb;
