-- P008 — Outcome Attribution.
--
-- Doctrine (Chief Architect 2026-06-05):
--   1. Outcome ≠ Evidence. SEPARATE table from ai_company.evidence_tokens.
--   2. Outcome must be measurable (objective numbers, not commentary).
--   3. Outcome must be time-bound (observed_at + window_start + window_end).
--   4. Outcome attaches to a task first. Aggregation upward is P009+.
--   5. AI must not generate outcomes — source enum restricts origins to
--      'manual' | 'connector_metric' | 'verified_measurement'.
--   6. No learning engine is built on top yet.
--
--   + Append-only (added at implementation lock):
--      No DELETE path. No PATCH that mutates a recorded outcome.
--      Correcting a number means inserting a new record. The mechanism for
--      "supersede" is P008+, but the schema must not encourage destructive
--      edits — therefore the application layer offers create-only and the
--      DB has no triggers that mutate prior rows.

create type ai_company.outcome_source as enum
  ('manual', 'connector_metric', 'verified_measurement');

create type ai_company.outcome_direction as enum
  ('increase', 'decrease', 'unchanged');

create table if not exists ai_company.task_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  task_id             uuid not null references ai_company.tasks(id) on delete restrict,

  -- WHAT was measured.
  metric_name         text not null,
  metric_unit         text,

  -- THE NUMBERS — all required, all numeric.
  baseline_value      numeric not null,
  observed_value      numeric not null,
  delta               numeric generated always as (observed_value - baseline_value) stored,
  direction           ai_company.outcome_direction not null,

  -- WHEN — strict windowing.
  observed_at         timestamptz not null,
  window_start        timestamptz not null,
  window_end          timestamptz not null,

  -- WHERE the number came from.
  source              ai_company.outcome_source not null,
  source_ref          text,

  -- WHO recorded it. Provenance discipline mirrors P006 / P007.
  recorded_by         text not null,

  -- Optional commentary. The truth claim is the numbers, not the prose.
  notes               text,

  constraint window_ordered check (window_start <= window_end),
  constraint observed_within_window check (
    observed_at >= window_start and observed_at <= window_end
  )
);

create index if not exists outcomes_by_task
  on ai_company.task_outcomes (task_id, observed_at desc);

create index if not exists outcomes_by_metric
  on ai_company.task_outcomes (metric_name, observed_at desc);

-- updated_at is touched only by future supersede flows; create-only at v1.
drop trigger if exists task_outcomes_set_updated_at on ai_company.task_outcomes;
create trigger task_outcomes_set_updated_at
  before update on ai_company.task_outcomes
  for each row execute function ai_company.touch_doos_updated_at();

alter table ai_company.task_outcomes enable row level security;

drop policy if exists task_outcomes_read on ai_company.task_outcomes;
drop policy if exists task_outcomes_write on ai_company.task_outcomes;
create policy task_outcomes_read on ai_company.task_outcomes for select using (true);
create policy task_outcomes_write on ai_company.task_outcomes
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on ai_company.task_outcomes
  to postgres, anon, authenticated, service_role;
