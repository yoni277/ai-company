-- L31 — Direct Instructions (managerial 1:1) (D074, Architect D075).
-- Spec: docs/design/CEO_OPERABILITY_DATA_MODEL.md §3.
--
-- Directive ≠ Direct Instruction: a directive is ORGANIZATIONAL
-- (ai_company.ceo_directives, fan-out across executives); a direct instruction
-- is MANAGERIAL — a 1:1 to a single executive. Separate tables; both feed
-- ai_company.assigned_work. An instruction may spawn a formal work item
-- (linked_assigned_work_id, Architect).
--
-- ADDITIVE ONLY. No ALTER/DROP on existing DOOS tables.

do $$ begin
  create type ai_company.instruction_status as enum
    ('sent', 'acknowledged', 'in_progress', 'responded', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists ai_company.direct_instructions (
  id              uuid primary key default gen_random_uuid(),
  -- Instance scope (#2).
  project_slug    text not null references ai_company.project_definitions(slug),

  from_actor      text not null default 'ceo',
  to_executive_id text not null,   -- single owner (managerial, not org-wide)
  instruction     text not null,
  expected_output text,
  priority        text not null default 'P2',
  status          ai_company.instruction_status not null default 'sent',
  response        text,

  -- Soft link: an instruction may be promoted to a formal work item.
  linked_assigned_work_id uuid,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  responded_at    timestamptz
);

create index if not exists direct_instructions_by_executive
  on ai_company.direct_instructions (project_slug, to_executive_id, status);

create index if not exists direct_instructions_by_created
  on ai_company.direct_instructions (project_slug, created_at desc);

drop trigger if exists direct_instructions_set_updated_at on ai_company.direct_instructions;
create trigger direct_instructions_set_updated_at
  before update on ai_company.direct_instructions
  for each row execute function ai_company.touch_doos_updated_at();

alter table ai_company.direct_instructions enable row level security;
drop policy if exists direct_instructions_read on ai_company.direct_instructions;
drop policy if exists direct_instructions_write on ai_company.direct_instructions;
create policy direct_instructions_read on ai_company.direct_instructions for select using (true);
create policy direct_instructions_write on ai_company.direct_instructions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
grant all on ai_company.direct_instructions
  to postgres, anon, authenticated, service_role;
