-- L29/L30/L31 — CEO Operability data model (D074 + Architect refinements D075).
-- Spec: docs/design/CEO_OPERABILITY_DATA_MODEL.md §1.
--
-- assigned_work — the convergence spine (LOCKED HARD). Every input mode
-- (directive, meeting, instruction) emits work of this ONE shape; tasks and
-- decisions link back to it; the Executive Workspace reads it.
--
-- Architect refinements applied:
--   #1 renamed from `actions` → `assigned_work` (avoid collision with
--      UI/audit/automation/connector "actions").
--   #2 project_slug on every work entity (instance scope / cloneability).
--   #3 approval_status SPLIT from execution_status — a meeting can propose work
--      the CEO has not yet approved; only approved/not_required work is
--      executable. Conflating them would pretend every created item is runnable.
--
-- ADDITIVE ONLY. No ALTER/DROP on existing DOOS tables.

do $$ begin
  create type ai_company.assigned_work_source as enum ('directive', 'meeting', 'instruction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_company.assigned_work_approval_status as enum
    ('proposed', 'approved', 'rejected', 'not_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_company.assigned_work_execution_status as enum
    ('open', 'in_progress', 'blocked', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists ai_company.assigned_work (
  id                 uuid primary key default gen_random_uuid(),
  -- Instance scope (#2): every work item belongs to exactly one registered business.
  project_slug       text not null references ai_company.project_definitions(slug),

  -- WHERE the work came from. source_id is a soft link to the originating row
  -- (ceo_directives | meetings | direct_instructions) — intentionally NOT a FK
  -- so the spine does not couple to three parents' lifecycles.
  source_type        ai_company.assigned_work_source not null,
  source_id          uuid not null,

  owner_executive_id text not null,
  title              text not null,
  detail             text,

  -- Two independent status axes (#3).
  approval_status    ai_company.assigned_work_approval_status  not null default 'proposed',
  execution_status   ai_company.assigned_work_execution_status not null default 'open',

  priority           text not null default 'P2',
  due_date           date,

  -- Soft links into the DOOS spine, set when work is promoted / approved.
  linked_task_id     uuid,   -- → ai_company.tasks
  linked_decision_id uuid,   -- → ai_company.ceo_decisions (the approval record)

  created_by         text not null,   -- 'ceo' | executive_id | 'chief-of-staff'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists assigned_work_by_owner
  on ai_company.assigned_work (project_slug, owner_executive_id, execution_status);

create index if not exists assigned_work_by_source
  on ai_company.assigned_work (source_type, source_id);

create index if not exists assigned_work_by_approval
  on ai_company.assigned_work (project_slug, approval_status);

drop trigger if exists assigned_work_set_updated_at on ai_company.assigned_work;
create trigger assigned_work_set_updated_at
  before update on ai_company.assigned_work
  for each row execute function ai_company.touch_doos_updated_at();

alter table ai_company.assigned_work enable row level security;

drop policy if exists assigned_work_read on ai_company.assigned_work;
drop policy if exists assigned_work_write on ai_company.assigned_work;
create policy assigned_work_read on ai_company.assigned_work for select using (true);
create policy assigned_work_write on ai_company.assigned_work
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on ai_company.assigned_work
  to postgres, anon, authenticated, service_role;
