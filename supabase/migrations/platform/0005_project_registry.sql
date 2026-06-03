-- Phase 4B — Generic project registry (ai_company schema)

do $$ begin
  create type ai_company.project_registry_status as enum ('active', 'inactive', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists ai_company.project_definitions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  status      ai_company.project_registry_status not null default 'active',
  enabled     boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists project_definitions_touch_updated_at on ai_company.project_definitions;
create trigger project_definitions_touch_updated_at
before update on ai_company.project_definitions
for each row execute function ai_company.touch_updated_at();

create table if not exists ai_company.project_funnel_stages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references ai_company.project_definitions(id) on delete cascade,
  stage_id    text not null,
  label       text not null,
  stage_order int not null,
  mock_count  int not null default 0,
  unique (project_id, stage_id)
);

create index if not exists project_funnel_stages_project
  on ai_company.project_funnel_stages (project_id, stage_order);

create table if not exists ai_company.project_connector_configs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references ai_company.project_definitions(id) on delete cascade unique,
  connector_type  text not null,
  enabled         boolean not null default true,
  config          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists project_connector_configs_touch_updated_at on ai_company.project_connector_configs;
create trigger project_connector_configs_touch_updated_at
before update on ai_company.project_connector_configs
for each row execute function ai_company.touch_updated_at();

alter table ai_company.project_definitions       enable row level security;
alter table ai_company.project_funnel_stages     enable row level security;
alter table ai_company.project_connector_configs enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'project_definitions','project_funnel_stages','project_connector_configs'
  ]) loop
    execute format('drop policy if exists %I on ai_company.%I', t || '_read', t);
    execute format('drop policy if exists %I on ai_company.%I', t || '_write', t);
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

grant all on ai_company.project_definitions to postgres, anon, authenticated, service_role;
grant all on ai_company.project_funnel_stages to postgres, anon, authenticated, service_role;
grant all on ai_company.project_connector_configs to postgres, anon, authenticated, service_role;
