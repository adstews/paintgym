-- paintgym: free regeneration budget + batch missing-image auto-recovery.
--
-- 1. projects.regen_budget — free regenerations included with a completed batch.
--    When a full batch finishes, the budget resets to a fixed allotment (4). A
--    regeneration spends this budget before it spends paid credits, so the user
--    gets a few free reps per batch.
-- 2. generations.recovery_attempted — marks a generation that the post-batch
--    sweep has already auto-retried once, so the sweep never loops on a row that
--    keeps failing. A row that fails again after recovery stays failed and the
--    gallery shows a manual Retry button.
-- 3. consume_regen_budget() — atomic single-decrement RPC. Returns the new budget
--    when a free regen was applied, or null when the budget was already zero, so
--    the caller can fall back to charging credits without a read-modify-write race.

-- ===========================================================================
-- 1. projects.regen_budget — free regenerations remaining for the project.
-- ===========================================================================
alter table public.projects
  add column if not exists regen_budget integer not null default 0;

-- ===========================================================================
-- 2. generations.recovery_attempted — one auto-retry per generation, max.
-- ===========================================================================
alter table public.generations
  add column if not exists recovery_attempted boolean not null default false;

-- ===========================================================================
-- 3. consume_regen_budget — atomic decrement. Definer so the service-role API
--    consumes the budget without RLS getting in the way, scoped to one project.
-- ===========================================================================
create or replace function public.consume_regen_budget(
  p_project_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update public.projects
     set regen_budget = regen_budget - 1
   where id = p_project_id
     and regen_budget > 0
  returning regen_budget into v_remaining;

  -- No row updated (budget already 0) -> v_remaining stays null.
  return v_remaining;
end;
$$;
