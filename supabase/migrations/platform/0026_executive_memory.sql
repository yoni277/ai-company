-- L31 — Executive Memory (scoped per executive PER BUSINESS) (D074, Architect D075).
-- Spec: docs/design/CEO_OPERABILITY_DATA_MODEL.md §4.
--
-- Persistent narrative an executive holds about ONE business. PK
-- (executive_id, project_slug) (#4) keeps memory per-business — VP-Marketing for
-- Automation App holds different strategy/assumptions than for FoodTruck-IL; no
-- cross-business pollution. ONLY the persistent narrative is stored; DERIVED
-- projections (open risks, past decisions, recent outputs) are read live from
-- existing tables filtered by (exec, project_slug) — never duplicated here.
--
-- ADDITIVE ONLY. No ALTER/DROP on existing DOOS tables.

create table if not exists ai_company.executive_memory (
  executive_id      text not null,
  project_slug      text not null references ai_company.project_definitions(slug),
  current_strategy  text,
  -- [{assumption, since, source_ref}]
  known_assumptions jsonb not null default '[]',
  updated_at        timestamptz not null default now(),
  updated_by        text,
  -- (#4) per-business memory.
  primary key (executive_id, project_slug)
);

create index if not exists executive_memory_by_project
  on ai_company.executive_memory (project_slug);

drop trigger if exists executive_memory_set_updated_at on ai_company.executive_memory;
create trigger executive_memory_set_updated_at
  before update on ai_company.executive_memory
  for each row execute function ai_company.touch_doos_updated_at();

alter table ai_company.executive_memory enable row level security;
drop policy if exists executive_memory_read on ai_company.executive_memory;
drop policy if exists executive_memory_write on ai_company.executive_memory;
create policy executive_memory_read on ai_company.executive_memory for select using (true);
create policy executive_memory_write on ai_company.executive_memory
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
grant all on ai_company.executive_memory
  to postgres, anon, authenticated, service_role;
