-- EPIC-004A — Work Model Convergence (D079). Spec §3/§7, AC6/AC11.
--
-- tasks.assigned_work_id — make every `task` an execution CHILD of the work
-- spine (1 work → N tasks). Soft link (nullable until backfilled); a real FK so
-- the No-Orphan Rule (AC11) is enforceable: every task answers "why does this
-- exist?" by pointing at its originating assigned_work.
--
-- ADDITIVE ONLY. Nullable add + index; no rewrite of existing rows here
-- (Phase 3 backfill populates + then the value becomes required by policy).

alter table ai_company.tasks
  add column if not exists assigned_work_id uuid
  references ai_company.assigned_work(id) on delete set null;

create index if not exists tasks_by_assigned_work
  on ai_company.tasks (assigned_work_id)
  where assigned_work_id is not null;
