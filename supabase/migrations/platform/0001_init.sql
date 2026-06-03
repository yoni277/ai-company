-- AI-Company — Phase 1 schema.
-- See docs/database-schema.md for rationale.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type project_health as enum ('healthy', 'at_risk', 'critical', 'paused', 'archived');
create type data_source_status as enum ('ok', 'degraded', 'error', 'unknown');
create type risk_severity as enum ('low', 'medium', 'high', 'critical');
create type risk_status as enum ('open', 'monitoring', 'mitigated', 'accepted');
create type opportunity_priority as enum ('low', 'medium', 'high');
create type report_type as enum ('daily_briefing', 'weekly_report', 'ad_hoc');
create type report_link_entity_type as enum ('risk', 'opportunity', 'metric');

-- ---------- projects ----------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  status      project_health not null default 'healthy',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
before update on projects
for each row execute function touch_updated_at();

-- ---------- data_sources ----------
create table data_sources (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  source_type  text not null,
  status       data_source_status not null default 'unknown',
  last_sync    timestamptz,
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, source_type)
);

create trigger data_sources_touch_updated_at
before update on data_sources
for each row execute function touch_updated_at();

-- ---------- project_metrics ----------
create table project_metrics (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  metric_name  text not null,
  metric_value numeric not null,
  unit         text,
  timestamp    timestamptz not null default now()
);

create index project_metrics_lookup
  on project_metrics (project_id, metric_name, timestamp desc);

-- ---------- risks ----------
create table risks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  severity    risk_severity not null,
  description text not null,
  source      text not null,
  status      risk_status not null default 'open',
  created_at  timestamptz not null default now()
);

create index risks_open on risks (project_id, status);

-- ---------- opportunities ----------
create table opportunities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  priority    opportunity_priority not null,
  description text not null,
  source      text not null,
  created_at  timestamptz not null default now()
);

create index opportunities_by_project on opportunities (project_id);

-- ---------- executive_reports ----------
create table executive_reports (
  id           uuid primary key default gen_random_uuid(),
  executive_id text not null,
  report_type  report_type not null,
  summary      text not null,
  body         jsonb not null,
  created_at   timestamptz not null default now()
);

create index executive_reports_recent
  on executive_reports (executive_id, report_type, created_at desc);

-- ---------- report_links ----------
create table report_links (
  report_id    uuid not null references executive_reports(id) on delete cascade,
  entity_type  report_link_entity_type not null,
  entity_id    uuid not null,
  primary key (report_id, entity_type, entity_id)
);

create index report_links_by_entity on report_links (entity_type, entity_id);

-- ---------- RLS ----------
alter table projects           enable row level security;
alter table data_sources       enable row level security;
alter table project_metrics    enable row level security;
alter table risks              enable row level security;
alter table opportunities      enable row level security;
alter table executive_reports  enable row level security;
alter table report_links       enable row level security;

-- Phase 1: single-CEO assumption. Reads are open; writes require service role.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'projects','data_sources','project_metrics','risks','opportunities','executive_reports','report_links'
  ])
  loop
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
    execute format(
      'create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')',
      t || '_write', t
    );
  end loop;
end$$;
