-- Queue autonomy: server-side draining + counter-based auto-recovery.
--
-- recovery_attempts replaces the one-shot recovery_attempted boolean as the
-- auto-recovery guard. A failed/stuck generation can now be auto-recovered up
-- to MAX_RECOVERY_ATTEMPTS (2) times instead of exactly once; the value 1000
-- is a sentinel meaning "never auto-recover" (set when the user cancels a
-- batch, so recovery does not resurrect cancelled placeholders).
-- recovery_attempted stays for backward compatibility but is no longer read.

alter table public.generations
  add column if not exists recovery_attempts integer not null default 0;

-- Rows already swept once under the boolean regime keep that history.
update public.generations
   set recovery_attempts = 1
 where recovery_attempted = true
   and recovery_attempts = 0;

-- The orphan sweep scans for rows stuck on 'generating'; keep that cheap.
create index if not exists generations_generating_idx
  on public.generations (project_id, created_at)
  where status = 'generating';
