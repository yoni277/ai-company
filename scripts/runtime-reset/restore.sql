-- =====================================================================
-- AI-Company — Restore from 2026-06-06 pre-reset snapshot
-- =====================================================================
-- Re-populates ai_company runtime tables from the verified backup schema
-- ai_company_backup_20260606. Run inside a transaction. Restore in
-- PARENT-before-child order (the inverse of the reset deletion order) so
-- foreign keys resolve.
--
-- Only use if the empty-system validation must be rolled back. Assumes the
-- target runtime tables are empty (post-reset state).
-- =====================================================================

BEGIN;

-- Parents first
INSERT INTO ai_company.projects            SELECT * FROM ai_company_backup_20260606.projects;
INSERT INTO ai_company.objectives          SELECT * FROM ai_company_backup_20260606.objectives;
INSERT INTO ai_company.ceo_directives      SELECT * FROM ai_company_backup_20260606.ceo_directives;

-- Project-scoped
INSERT INTO ai_company.data_sources        SELECT * FROM ai_company_backup_20260606.data_sources;
INSERT INTO ai_company.project_metrics     SELECT * FROM ai_company_backup_20260606.project_metrics;
INSERT INTO ai_company.risks               SELECT * FROM ai_company_backup_20260606.risks;
INSERT INTO ai_company.opportunities       SELECT * FROM ai_company_backup_20260606.opportunities;

-- Directive / reporting graph
INSERT INTO ai_company.executive_reports   SELECT * FROM ai_company_backup_20260606.executive_reports;
INSERT INTO ai_company.directive_responses SELECT * FROM ai_company_backup_20260606.directive_responses;
INSERT INTO ai_company.report_links        SELECT * FROM ai_company_backup_20260606.report_links;

-- Objective / task graph
INSERT INTO ai_company.objective_outcomes  SELECT * FROM ai_company_backup_20260606.objective_outcomes;
INSERT INTO ai_company.task_proposals      SELECT * FROM ai_company_backup_20260606.task_proposals;
INSERT INTO ai_company.tasks               SELECT * FROM ai_company_backup_20260606.tasks;
INSERT INTO ai_company.evidence_tokens     SELECT * FROM ai_company_backup_20260606.evidence_tokens;
INSERT INTO ai_company.task_outcomes       SELECT * FROM ai_company_backup_20260606.task_outcomes;

-- Standalone logs
INSERT INTO ai_company.ceo_decisions       SELECT * FROM ai_company_backup_20260606.ceo_decisions;
INSERT INTO ai_company.revenue_transactions SELECT * FROM ai_company_backup_20260606.revenue_transactions;

COMMIT;
