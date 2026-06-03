-- Phase 5C.1 — CEO Operating System (directives + decisions, ai_company schema)

create table if not exists ai_company.ceo_directives (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  title             text not null,
  directive         text not null,
  category          text not null,
  priority          text not null,
  active            boolean not null default true,
  expires_at        timestamptz null,
  is_override       boolean not null default false,
  target_project_id text null
);

create index if not exists ceo_directives_active
  on ai_company.ceo_directives (active, created_at desc);

create table if not exists ai_company.ceo_decisions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  source_action_id      text null,
  project_id            text null,
  decision_title        text not null,
  decision_description  text null,
  decision_status       text not null default 'proposed'
    check (decision_status in (
      'proposed', 'approved', 'rejected', 'deferred',
      'in_progress', 'completed', 'cancelled'
    )),
  owner                 text null,
  due_date              date null,
  priority              text not null default 'P2',
  notes                 text null
);

create index if not exists ceo_decisions_status
  on ai_company.ceo_decisions (decision_status, created_at desc);

create index if not exists ceo_decisions_source_action
  on ai_company.ceo_decisions (source_action_id)
  where source_action_id is not null;

alter table ai_company.ceo_directives enable row level security;
alter table ai_company.ceo_decisions enable row level security;

drop policy if exists ceo_directives_read on ai_company.ceo_directives;
drop policy if exists ceo_directives_write on ai_company.ceo_directives;
create policy ceo_directives_read on ai_company.ceo_directives for select using (true);
create policy ceo_directives_write on ai_company.ceo_directives
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists ceo_decisions_read on ai_company.ceo_decisions;
drop policy if exists ceo_decisions_write on ai_company.ceo_decisions;
create policy ceo_decisions_read on ai_company.ceo_decisions for select using (true);
create policy ceo_decisions_write on ai_company.ceo_decisions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on ai_company.ceo_directives to postgres, anon, authenticated, service_role;
grant all on ai_company.ceo_decisions to postgres, anon, authenticated, service_role;
