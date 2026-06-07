-- P005 — Directive → Task fan-out
-- Adds the optional executive provenance column that records which AI
-- executive proposed a given task during the directive fan-out. This is
-- audit/observability metadata only — the executive runtime never branches
-- on the column. Kept nullable so manually-created tasks remain valid.
--
-- Doctrine notes:
--   - Capability Abstraction: source_executive_id stores the executive id
--     (chief-of-staff / cto / coo / cfo / vp-marketing / vp-sales / null).
--     This is the deterministic id from the directive responder registry,
--     not a vendor name.
--   - Instance Isolation: no instance-layer reference. New instances inherit
--     the column with no work.

alter table ai_company.tasks
  add column if not exists source_executive_id text null;

create index if not exists tasks_by_source_executive
  on ai_company.tasks (source_executive_id)
  where source_executive_id is not null;
