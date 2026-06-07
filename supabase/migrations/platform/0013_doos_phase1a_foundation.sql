-- Phase 1A — DOOS Foundation
-- Four tables + floor trigger so a task cannot reach status='completed'
-- without at least one evidence_token attached. Richer validation
-- (tier / kind / count) is enforced at the application layer by the
-- @ai-company/doos-core validator. This migration is the floor.

create type ai_company.objective_status as enum
  ('draft','active','at_risk','blocked','completed','archived');
create type ai_company.outcome_status as enum
  ('pending','in_progress','achieved','failed');
create type ai_company.task_status as enum
  ('pending','in_progress','blocked','awaiting_evidence','completed','cancelled');
create type ai_company.evidence_tier as enum
  ('E0','E1','E2','E3','E4');
create type ai_company.outcome_measurement_source as enum
  ('manual','sql_engine','financial_engine','custom_engine');

create table if not exists ai_company.objectives (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  title                   text not null,
  description             text,
  owner_id                text,
  status                  ai_company.objective_status not null default 'draft',
  target_outcome_summary  text
);

create table if not exists ai_company.objective_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  objective_id        uuid not null references ai_company.objectives(id) on delete cascade,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  name                text not null,
  metric_unit         text,
  baseline_value      numeric,
  target_value        numeric,
  current_value       numeric,
  measurement_source  ai_company.outcome_measurement_source not null default 'manual',
  status              ai_company.outcome_status not null default 'pending',
  last_measured_at    timestamptz
);

create table if not exists ai_company.tasks (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  objective_id        uuid not null references ai_company.objectives(id) on delete restrict,
  directive_id        uuid references ai_company.ceo_directives(id) on delete set null,
  title               text not null,
  description         text,
  capability_required text not null,
  owner_id            text,
  status              ai_company.task_status not null default 'pending',
  evidence_required   jsonb not null default
    '{"minTier":"E2","requiredKinds":[],"minCount":1}'::jsonb,
  due_at              timestamptz,
  completed_at        timestamptz,
  completed_by        text
);

create table if not exists ai_company.evidence_tokens (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references ai_company.tasks(id) on delete cascade,
  created_at        timestamptz not null default now(),
  created_by        text,
  tier              ai_company.evidence_tier not null,
  kind              text not null,
  payload           jsonb not null default '{}'::jsonb,
  signed_by         text,
  override_reason   text,
  approved_by       text,
  verified_at       timestamptz,
  validator_version text
);

-- Floor: a task row cannot transition to status='completed' without an
-- existing evidence_token row referencing it. This is the doctrine-level
-- guarantee that survives bypassed application code. The app-layer
-- validator enforces the richer requirements (min tier, kinds, count).
create or replace function ai_company.assert_task_has_evidence_on_complete()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    if not exists (select 1 from ai_company.evidence_tokens where task_id = new.id) then
      raise exception 'task % cannot be completed without at least one evidence_token', new.id;
    end if;
    new.completed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists tasks_evidence_on_complete on ai_company.tasks;
create trigger tasks_evidence_on_complete
  before insert or update on ai_company.tasks
  for each row execute function ai_company.assert_task_has_evidence_on_complete();

create or replace function ai_company.touch_doos_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists objectives_set_updated_at on ai_company.objectives;
create trigger objectives_set_updated_at         before update on ai_company.objectives         for each row execute function ai_company.touch_doos_updated_at();
drop trigger if exists objective_outcomes_set_updated_at on ai_company.objective_outcomes;
create trigger objective_outcomes_set_updated_at before update on ai_company.objective_outcomes for each row execute function ai_company.touch_doos_updated_at();
drop trigger if exists tasks_set_updated_at on ai_company.tasks;
create trigger tasks_set_updated_at              before update on ai_company.tasks              for each row execute function ai_company.touch_doos_updated_at();

create index if not exists objectives_status        on ai_company.objectives (status, created_at desc);
create index if not exists outcomes_by_objective    on ai_company.objective_outcomes (objective_id);
create index if not exists tasks_by_objective       on ai_company.tasks (objective_id, status, created_at desc);
create index if not exists tasks_by_directive       on ai_company.tasks (directive_id) where directive_id is not null;
create index if not exists tasks_by_owner           on ai_company.tasks (owner_id, status) where owner_id is not null;
create index if not exists evidence_by_task         on ai_company.evidence_tokens (task_id, created_at desc);

alter table ai_company.objectives         enable row level security;
alter table ai_company.objective_outcomes enable row level security;
alter table ai_company.tasks              enable row level security;
alter table ai_company.evidence_tokens    enable row level security;

drop policy if exists objectives_read         on ai_company.objectives;
drop policy if exists objectives_write        on ai_company.objectives;
drop policy if exists outcomes_read           on ai_company.objective_outcomes;
drop policy if exists outcomes_write          on ai_company.objective_outcomes;
drop policy if exists tasks_read              on ai_company.tasks;
drop policy if exists tasks_write             on ai_company.tasks;
drop policy if exists evidence_tokens_read    on ai_company.evidence_tokens;
drop policy if exists evidence_tokens_write   on ai_company.evidence_tokens;

create policy objectives_read         on ai_company.objectives         for select using (true);
create policy objectives_write        on ai_company.objectives         for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy outcomes_read           on ai_company.objective_outcomes for select using (true);
create policy outcomes_write          on ai_company.objective_outcomes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy tasks_read              on ai_company.tasks              for select using (true);
create policy tasks_write             on ai_company.tasks              for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy evidence_tokens_read    on ai_company.evidence_tokens    for select using (true);
create policy evidence_tokens_write   on ai_company.evidence_tokens    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on ai_company.objectives, ai_company.objective_outcomes, ai_company.tasks, ai_company.evidence_tokens
  to postgres, anon, authenticated, service_role;
