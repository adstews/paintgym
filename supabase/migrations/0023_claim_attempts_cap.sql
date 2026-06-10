-- Queue hardening (review findings on 0022's server-side autonomy):
--
-- 1. claim_next_job now enforces max_attempts at the claim boundary. A job
--    whose worker is killed by the platform (maxDuration/OOM) never reaches the
--    code-level failJob, so it used to cycle stale-reset -> reclaim forever —
--    unattended, now that the server chain drives the queue. Exhausted jobs are
--    terminally failed (and their generation marked failed) instead of recycled.
--
-- 2. A partial unique index guarantees at most ONE live generate job per
--    generation, so two racing settlers (client finalize + server drain) can
--    never double-enqueue the same row no matter how their snapshots interleave.
--    Recovery treats a unique violation as "another settler owns this row".

create unique index if not exists jobs_live_generate_per_gen_idx
  on public.jobs (generation_id)
  where (type = 'generate' and status in ('pending', 'processing'));

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
  -- Recover jobs whose worker died mid-flight (browser closed, function
  -- killed)… but only while they have attempts left. An exhausted stale job is
  -- terminally failed so it can never loop.
  update public.jobs
     set status = 'pending', started_at = null
   where project_id = p_project_id
     and status = 'processing'
     and attempts < max_attempts
     and started_at < now() - make_interval(secs => p_stale_seconds);

  update public.jobs
     set status = 'failed',
         error = coalesce(error, 'worker killed mid-run; attempts exhausted'),
         completed_at = now()
   where project_id = p_project_id
     and status = 'processing'
     and attempts >= max_attempts
     and started_at < now() - make_interval(secs => p_stale_seconds);

  -- Generations driven by a job that just exhausted: fail them so the card
  -- shows Retry instead of spinning (the settle sweep may auto-recover them).
  update public.generations g
     set status = 'failed'
   where g.project_id = p_project_id
     and g.status = 'generating'
     and exists (
       select 1 from public.jobs j
        where j.generation_id = g.id
          and j.type = 'generate'
          and j.status = 'failed'
          and j.completed_at > now() - interval '1 minute'
     )
     and not exists (
       select 1 from public.jobs j2
        where j2.generation_id = g.id
          and j2.type = 'generate'
          and j2.status in ('pending', 'processing')
     );

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
          and attempts < max_attempts
        order by created_at
        limit 1
        for update skip locked
     )
  returning j.*;
end;
$$;
