-- =====================================================================
-- AI-Company — Single Controlled Runtime Reset (Rule 2)
-- =====================================================================
-- CEO Directive: Full Runtime State Reset & Empty-System Validation (P0)
-- Authored: 2026-06-06
-- Target:   Supabase project wimsglxixekmjsfpnqjb, schema "ai_company"
--
-- Properties:
--   * Repeatable  — DELETE is idempotent; re-running yields the same
--     empty end-state (0 rows in every deleted table).
--   * Auditable   — every affected table is listed explicitly; nothing
--     is wildcard-truncated.
--   * Transactional — wrapped in BEGIN/COMMIT; either the whole reset
--     applies or none of it does.
--   * Scoped to RUNTIME STATE ONLY (Rule 3). Schema, enums, migrations,
--     repository code, CLI tools, doctrine, and the project REGISTRY
--     (project_definitions / project_funnel_stages /
--     project_connector_configs) are NOT touched.
--
-- Deletion order honours child-before-parent (Rule 4) against the live
-- foreign keys in ai_company:
--   task_outcomes        -> tasks
--   evidence_tokens      -> tasks
--   tasks                -> task_proposals, objectives, ceo_directives
--   task_proposals       -> ceo_directives
--   report_links         -> executive_reports
--   directive_responses  -> ceo_directives, executive_reports
--   executive_reports    -> ceo_directives
--   ceo_directives       -> objectives
--   objective_outcomes   -> objectives
--   project_metrics/risks/opportunities/data_sources -> projects
-- =====================================================================

BEGIN;

-- 1. Task graph (deepest children first)
DELETE FROM ai_company.task_outcomes;
DELETE FROM ai_company.evidence_tokens;
DELETE FROM ai_company.tasks;
DELETE FROM ai_company.task_proposals;

-- 2. Reporting / directive graph
DELETE FROM ai_company.report_links;
DELETE FROM ai_company.directive_responses;
DELETE FROM ai_company.executive_reports;
DELETE FROM ai_company.ceo_directives;

-- 3. Objectives graph
DELETE FROM ai_company.objective_outcomes;
DELETE FROM ai_company.objectives;

-- 4. Project-scoped runtime state
DELETE FROM ai_company.project_metrics;
DELETE FROM ai_company.risks;
DELETE FROM ai_company.opportunities;
DELETE FROM ai_company.data_sources;

-- 5. Standalone runtime logs
DELETE FROM ai_company.ceo_decisions;
DELETE FROM ai_company.revenue_transactions;

-- 6. Project portfolio root (last)
DELETE FROM ai_company.projects;

COMMIT;
