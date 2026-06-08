-- E1 Phase 2 — Seed Automation App into the project registry (instance layer).
-- Pre-product onboarding for Customer #1: one project, the consumer automation
-- marketplace. No live connector — connector_type 'marketplace-prelaunch' has no
-- resolver registered, so the generic portfolio-intelligence / revenue registries
-- fall back to the proven mock path. Funnel mock_count is 0 across every stage
-- (no customers yet). Idempotent: re-running upserts in place.
--
-- Mirrors the instance seed at instances/automation-app/project-registry-seed.ts
-- (funnel stage ids/labels/order + connector_type) and the upsert shape of
-- supabase/migrations/instance/0006_seed_project_registry.sql.

insert into ai_company.project_definitions (slug, name, description, status, enabled, sort_order)
values
  ('automation-app', 'Automation App', 'Consumer automation marketplace — open, choose, pay (IAP), connect, run, result.', 'active', true, 10)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

-- Automation App marketplace funnel (pre-product: mock_count = 0 for every stage)
insert into ai_company.project_funnel_stages (project_id, stage_id, label, stage_order, mock_count)
select p.id, v.stage_id, v.label, v.stage_order, v.mock_count
from ai_company.project_definitions p
cross join (values
  ('opened', 'Opened app', 0, 0),
  ('chose', 'Chose automation', 1, 0),
  ('paid', 'Paid (IAP)', 2, 0),
  ('connected', 'Connected accounts', 3, 0),
  ('ran', 'Ran automation', 4, 0),
  ('result', 'Got result', 5, 0)
) as v(stage_id, label, stage_order, mock_count)
where p.slug = 'automation-app'
on conflict (project_id, stage_id) do update set
  label = excluded.label,
  stage_order = excluded.stage_order,
  mock_count = excluded.mock_count;

-- Connector config: pre-launch marketplace, non-live → generic mock fallback.
insert into ai_company.project_connector_configs (project_id, connector_type, enabled, config)
select p.id, 'marketplace-prelaunch', true, '{"liveCapable": false}'::jsonb
from ai_company.project_definitions p
where p.slug = 'automation-app'
on conflict (project_id) do update set
  connector_type = excluded.connector_type,
  enabled = excluded.enabled,
  config = excluded.config;
