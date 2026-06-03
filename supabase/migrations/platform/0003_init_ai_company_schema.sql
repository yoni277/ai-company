-- Namespaced variant of 0001_init.sql for when the AI-Company platform
-- shares a Supabase project with another app. All objects live in the
-- ai_company schema; the host project's public schema is untouched.
--
-- After applying this migration:
--   Supabase Dashboard → Settings → API → Exposed schemas → add "ai_company"
-- (PostgREST defaults to exposing only "public".)

create schema if not exists ai_company;

-- ---------- enums ----------
do $$ begin
  create type ai_company.project_health as enum ('healthy', 'at_risk', 'critical', 'paused', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.data_source_status as enum ('ok', 'degraded', 'error', 'unknown');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.risk_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.risk_status as enum ('open', 'monitoring', 'mitigated', 'accepted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.opportunity_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.report_type as enum ('daily_briefing', 'weekly_report', 'ad_hoc');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_company.report_link_entity_type as enum ('risk', 'opportunity', 'metric');
exception when duplicate_object then null; end $$;

-- ---------- projects ----------
create table if not exists ai_company.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  status      ai_company.project_health not null default 'healthy',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function ai_company.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on ai_company.projects;
create trigger projects_touch_updated_at
before update on ai_company.projects
for each row execute function ai_company.touch_updated_at();

-- ---------- data_sources ----------
create table if not exists ai_company.data_sources (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references ai_company.projects(id) on delete cascade,
  source_type  text not null,
  status       ai_company.data_source_status not null default 'unknown',
  last_sync    timestamptz,
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, source_type)
);

drop trigger if exists data_sources_touch_updated_at on ai_company.data_sources;
create trigger data_sources_touch_updated_at
before update on ai_company.data_sources
for each row execute function ai_company.touch_updated_at();

-- ---------- project_metrics ----------
create table if not exists ai_company.project_metrics (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references ai_company.projects(id) on delete cascade,
  metric_name  text not null,
  metric_value numeric not null,
  unit         text,
  timestamp    timestamptz not null default now()
);

create index if not exists project_metrics_lookup
  on ai_company.project_metrics (project_id, metric_name, timestamp desc);

-- ---------- risks ----------
create table if not exists ai_company.risks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references ai_company.projects(id) on delete cascade,
  severity    ai_company.risk_severity not null,
  description text not null,
  source      text not null,
  status      ai_company.risk_status not null default 'open',
  created_at  timestamptz not null default now()
);

create index if not exists risks_open on ai_company.risks (project_id, status);

-- ---------- opportunities ----------
create table if not exists ai_company.opportunities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references ai_company.projects(id) on delete cascade,
  priority    ai_company.opportunity_priority not null,
  description text not null,
  source      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists opportunities_by_project on ai_company.opportunities (project_id);

-- ---------- executive_reports ----------
create table if not exists ai_company.executive_reports (
  id           uuid primary key default gen_random_uuid(),
  executive_id text not null,
  report_type  ai_company.report_type not null,
  summary      text not null,
  body         jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists executive_reports_recent
  on ai_company.executive_reports (executive_id, report_type, created_at desc);

-- ---------- report_links ----------
create table if not exists ai_company.report_links (
  report_id    uuid not null references ai_company.executive_reports(id) on delete cascade,
  entity_type  ai_company.report_link_entity_type not null,
  entity_id    uuid not null,
  primary key (report_id, entity_type, entity_id)
);

create index if not exists report_links_by_entity on ai_company.report_links (entity_type, entity_id);

-- ---------- expose schema to PostgREST roles ----------
grant usage on schema ai_company to postgres, anon, authenticated, service_role;
grant all on all tables in schema ai_company to postgres, anon, authenticated, service_role;
grant all on all sequences in schema ai_company to postgres, anon, authenticated, service_role;
grant all on all functions in schema ai_company to postgres, anon, authenticated, service_role;
alter default privileges in schema ai_company
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema ai_company
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema ai_company
  grant all on functions to postgres, anon, authenticated, service_role;

-- ---------- RLS ----------
alter table ai_company.projects           enable row level security;
alter table ai_company.data_sources       enable row level security;
alter table ai_company.project_metrics    enable row level security;
alter table ai_company.risks              enable row level security;
alter table ai_company.opportunities      enable row level security;
alter table ai_company.executive_reports  enable row level security;
alter table ai_company.report_links       enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'projects','data_sources','project_metrics','risks','opportunities','executive_reports','report_links'
  ]) loop
    execute format(
      'drop policy if exists %I on ai_company.%I',
      t || '_read', t
    );
    execute format(
      'drop policy if exists %I on ai_company.%I',
      t || '_write', t
    );
    execute format(
      'create policy %I on ai_company.%I for select using (true)',
      t || '_read', t
    );
    execute format(
      'create policy %I on ai_company.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')',
      t || '_write', t
    );
  end loop;
end$$;
