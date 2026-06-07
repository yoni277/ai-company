-- P005A — Architectural cleanup #1: proposal layer.
--
-- Approved by Chief Architect 2026-06-04. Replaces the direct task-creation
-- path shipped in P005 with the governance-correct chain:
--
--   Directive → ExecutiveReport → TaskProposal → CEO Decision → Task
--
-- Tasks are only created when the CEO promotes a proposal. Re-running a
-- directive that produces an identical proposal does NOT create duplicate
-- rows — the unique index on (directive_id, fingerprint) is the DB floor,
-- backed by an upsert that bumps `generation` instead.
--
-- proposal_type carries the cognitive intent (action / research / decision /
-- escalation) so downstream engines (Evidence, Outcome) can reason about
-- different task shapes without scanning free text.

create type ai_company.proposal_status as enum
  ('proposed', 'approved', 'rejected', 'superseded');

create type ai_company.proposal_type as enum
  ('action', 'research', 'decision', 'escalation');

create table if not exists ai_company.task_proposals (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  directive_id          uuid not null references ai_company.ceo_directives(id) on delete cascade,
  source_executive_id   text not null,
  proposal_type         ai_company.proposal_type not null default 'action',
  fingerprint           text not null,
  payload               jsonb not null default '{}'::jsonb,
  status                ai_company.proposal_status not null default 'proposed',
  generation            integer not null default 1,
  decided_at            timestamptz,
  decided_by            text
);

-- DB floor for dedup. The application upsert relies on this unique index to
-- "ON CONFLICT (directive_id, fingerprint) DO UPDATE SET generation = + 1".
create unique index if not exists task_proposals_fingerprint
  on ai_company.task_proposals (directive_id, fingerprint);

create index if not exists task_proposals_by_status
  on ai_company.task_proposals (status, created_at desc);

create index if not exists task_proposals_by_directive
  on ai_company.task_proposals (directive_id, created_at desc);

create index if not exists task_proposals_by_executive
  on ai_company.task_proposals (source_executive_id, created_at desc);

-- Reuse the existing touch_doos_updated_at function from migration 0013.
drop trigger if exists task_proposals_set_updated_at on ai_company.task_proposals;
create trigger task_proposals_set_updated_at
  before update on ai_company.task_proposals
  for each row execute function ai_company.touch_doos_updated_at();

-- Link tasks back to the proposal that produced them. Nullable — legacy tasks
-- (created before P005A) keep proposal_id = null. Chief Architect: never
-- rewrite history; the null itself is audit information.
alter table ai_company.tasks
  add column if not exists proposal_id uuid references ai_company.task_proposals(id) on delete set null;

create index if not exists tasks_by_proposal
  on ai_company.tasks (proposal_id) where proposal_id is not null;

-- RLS + grants follow the pattern from 0013.
alter table ai_company.task_proposals enable row level security;

drop policy if exists task_proposals_read  on ai_company.task_proposals;
drop policy if exists task_proposals_write on ai_company.task_proposals;
create policy task_proposals_read  on ai_company.task_proposals for select using (true);
create policy task_proposals_write on ai_company.task_proposals
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on ai_company.task_proposals
  to postgres, anon, authenticated, service_role;
