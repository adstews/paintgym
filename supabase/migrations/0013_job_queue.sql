-- paintgym: database-backed background job queue.
-- Image generation used to run as one long client-orchestrated chain: the browser
-- looped /api/generate + /api/review-image with in-memory concurrency. Closing the
-- tab killed the batch and there was no resume. This moves the work into a durable
-- queue so each generation is an independent, retryable, resumable job.
--
-- Lifecycle per job:
--   pending    -> waiting to be claimed (next_run_at gates retry backoff)
--   processing -> claimed by a worker (started_at set; auto-reset if stale)
--   completed  -> done
--   failed     -> attempts exhausted (surfaced in the UI with a Retry button)
--
-- type:
--   generate -> render an image for a generation row via Gemini
--   review   -> Claude QA on a generation (includes the auto-rewrite walk)
--   rewrite  -> reserved; the auto-rewrite is currently handled inside review

create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  generation_id   uuid references public.generations(id) on delete cascade,
  concept_id      uuid,
  concept_variant text,
  type            text not null
    check (type in ('generate','review','rewrite')),
  status          text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  payload         jsonb not null default '{}'::jsonb,
  attempts        integer not null default 0,
  max_attempts    integer not null default 3,
  error           text,
  next_run_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

create index if not exists jobs_project_status_idx on public.jobs(project_id, status);
create index if not exists jobs_claim_idx on public.jobs(status, next_run_at);

-- ===========================================================================
-- Row-level security: users read their own jobs (scoped through the project).
-- All writes go through the service-role worker, which bypasses RLS, so there
-- are deliberately no user insert/update/delete policies.
-- ===========================================================================
alter table public.jobs enable row level security;

create policy "jobs_owner_select" on public.jobs
  for select using (exists (select 1 from public.projects p
            where p.id = jobs.project_id and p.user_id = auth.uid()));

-- ===========================================================================
-- claim_next_job: atomically reset stale jobs, then claim the oldest runnable
-- pending job for a project. FOR UPDATE SKIP LOCKED lets several workers tick
-- the same project concurrently without ever grabbing the same row.
-- Runs as definer so the service-role worker (and only it, via the API) uses it.
-- ===========================================================================
create or replace function public.claim_next_job(
  p_project_id   uuid,
  p_stale_seconds integer default 300
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recover jobs whose worker died mid-flight (browser closed, function killed).
  update public.jobs
     set status = 'pending', started_at = null
   where project_id = p_project_id
     and status = 'processing'
     and started_at < now() - make_interval(secs => p_stale_seconds);

  return query
  update public.jobs j
     set status     = 'processing',
         started_at = now(),
         attempts   = j.attempts + 1
   where j.id = (
       select id from public.jobs
        where project_id = p_project_id
          and status = 'pending'
          and next_run_at <= now()
        order by created_at
        limit 1
        for update skip locked
     )
  returning j.*;
end;
$$;
