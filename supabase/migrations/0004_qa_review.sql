-- paintgym: Claude QA review on every generation.
-- Each generation now carries:
--   qa_status         where it is in the pipeline
--   qa_issues         array of human-readable issue strings from Claude
--   qa_severity       only set when qa_status in ('minor','major')
--   auto_rewrite_count how many automatic fresh-rewrites preceded this row
--                      (0 = user triggered, 1 = first auto, 2 = second auto)
--   is_auto_rewrite   convenience flag mirroring auto_rewrite_count > 0

alter table public.generations
  add column if not exists qa_status text not null default 'pending'
    check (qa_status in
      ('pending','reviewing','passed','minor','major','overridden','rewriting')),
  add column if not exists qa_issues jsonb not null default '[]'::jsonb,
  add column if not exists qa_severity text
    check (qa_severity is null or qa_severity in ('minor','major')),
  add column if not exists auto_rewrite_count integer not null default 0,
  add column if not exists is_auto_rewrite boolean not null default false;

create index if not exists generations_qa_status_idx
  on public.generations(qa_status);
