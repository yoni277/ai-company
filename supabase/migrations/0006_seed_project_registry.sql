-- Phase 4B — Seed project registry (portfolio companies + funnel + connectors)

insert into ai_company.project_definitions (slug, name, description, status, enabled, sort_order)
values
  ('foodtruck-il', 'FoodTruck-IL', 'Israeli food truck operations platform.', 'active', true, 10),
  ('lab-os', 'Lab-OS', 'Laboratory operating system.', 'active', true, 20),
  ('inventory-engine', 'Inventory Engine', 'Generic inventory engine across business lines.', 'active', true, 30),
  ('burgerstop', 'BurgerStop', 'BurgerStop franchise operations.', 'active', true, 40)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

-- FoodTruck-IL funnel
insert into ai_company.project_funnel_stages (project_id, stage_id, label, stage_order, mock_count)
select p.id, v.stage_id, v.label, v.stage_order, v.mock_count
from ai_company.project_definitions p
cross join (values
  ('registered', 'Registered', 0, 12),
  ('approved', 'Approved', 1, 11),
  ('active', 'Active', 2, 5)
) as v(stage_id, label, stage_order, mock_count)
where p.slug = 'foodtruck-il'
on conflict (project_id, stage_id) do update set
  label = excluded.label,
  stage_order = excluded.stage_order,
  mock_count = excluded.mock_count;

-- Lab-OS funnel
insert into ai_company.project_funnel_stages (project_id, stage_id, label, stage_order, mock_count)
select p.id, v.stage_id, v.label, v.stage_order, v.mock_count
from ai_company.project_definitions p
cross join (values
  ('lead', 'Lead', 0, 18),
  ('demo', 'Demo', 1, 12),
  ('pilot', 'Pilot', 2, 8),
  ('subscribed', 'Subscribed', 3, 6),
  ('active', 'Active', 4, 5)
) as v(stage_id, label, stage_order, mock_count)
where p.slug = 'lab-os'
on conflict (project_id, stage_id) do update set
  label = excluded.label,
  stage_order = excluded.stage_order,
  mock_count = excluded.mock_count;

-- Inventory Engine funnel
insert into ai_company.project_funnel_stages (project_id, stage_id, label, stage_order, mock_count)
select p.id, v.stage_id, v.label, v.stage_order, v.mock_count
from ai_company.project_definitions p
cross join (values
  ('lead', 'Lead', 0, 9),
  ('trial', 'Trial', 1, 6),
  ('active', 'Active', 2, 4)
) as v(stage_id, label, stage_order, mock_count)
where p.slug = 'inventory-engine'
on conflict (project_id, stage_id) do update set
  label = excluded.label,
  stage_order = excluded.stage_order,
  mock_count = excluded.mock_count;

-- BurgerStop funnel
insert into ai_company.project_funnel_stages (project_id, stage_id, label, stage_order, mock_count)
select p.id, v.stage_id, v.label, v.stage_order, v.mock_count
from ai_company.project_definitions p
cross join (values
  ('lead', 'Lead', 0, 6),
  ('meeting', 'Meeting', 1, 5),
  ('proposal', 'Proposal', 2, 4),
  ('signed', 'Signed', 3, 3),
  ('operating', 'Operating', 4, 3)
) as v(stage_id, label, stage_order, mock_count)
where p.slug = 'burgerstop'
on conflict (project_id, stage_id) do update set
  label = excluded.label,
  stage_order = excluded.stage_order,
  mock_count = excluded.mock_count;

-- Connector configs
insert into ai_company.project_connector_configs (project_id, connector_type, enabled, config)
select p.id, 'foodtruck-business', true, '{"adapter":"foodtruck"}'::jsonb
from ai_company.project_definitions p where p.slug = 'foodtruck-il'
on conflict (project_id) do update set
  connector_type = excluded.connector_type,
  enabled = excluded.enabled,
  config = excluded.config;

insert into ai_company.project_connector_configs (project_id, connector_type, enabled, config)
select p.id, 'mock-funnel', true, '{}'::jsonb
from ai_company.project_definitions p
where p.slug in ('lab-os', 'inventory-engine', 'burgerstop')
on conflict (project_id) do update set
  connector_type = excluded.connector_type,
  enabled = excluded.enabled,
  config = excluded.config;
