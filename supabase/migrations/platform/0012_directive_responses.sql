-- Directive fan-out queue. One row per (directive, expected responding executive).
-- The status column drives the worker: 'pending' rows are picked up by the
-- /api/ceo/directives/[id]/run-pending endpoint and moved through
-- 'running' → 'done' (with executive_report_id set) or 'error' (with error_message).
--
-- Insert side: POST and content-change PATCH on ceo_directives write rows here.
-- Drain side: the run-pending endpoint reads/updates them inside the request thread,
-- which is the durable replacement for after() — which was being terminated by the
-- Next dev runtime before the second LLM call could complete.

create table if not exists ai_company.directive_responses (
  id                   uuid primary key default gen_random_uuid(),
  directive_id         uuid not null references ai_company.ceo_directives(id) on delete cascade,
  executive_id         text not null,
  status               text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'error')),
  executive_report_id  uuid null references ai_company.executive_reports(id) on delete set null,
  error_message        text null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (directive_id, executive_id)
);

create index if not exists directive_responses_pending
  on ai_company.directive_responses (directive_id, status)
  where status in ('pending', 'running');

create or replace function ai_company.touch_directive_responses_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists directive_responses_set_updated_at on ai_company.directive_responses;
create trigger directive_responses_set_updated_at
  before update on ai_company.directive_responses
  for each row execute function ai_company.touch_directive_responses_updated_at();

alter table ai_company.directive_responses enable row level security;

drop policy if exists directive_responses_read on ai_company.directive_responses;
drop policy if exists directive_responses_write on ai_company.directive_responses;
create policy directive_responses_read on ai_company.directive_responses for select using (true);
create policy directive_responses_write on ai_company.directive_responses
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on ai_company.directive_responses to postgres, anon, authenticated, service_role;
