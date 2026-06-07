-- P006 — State Integrity (Option A).
--
-- Doctrine: D023 (instance state must never be silently mutated by platform
-- code) + D038 (state integrity is the precondition for outcome attribution).
--
-- Adds provenance to every project row. Going forward:
--   - INSERT requires created_by to be supplied (NOT NULL floor).
--   - The application layer's projects.create method validates that
--     created_by is non-empty and ideally a known actor.
--   - Connectors can no longer create rows (the upsertBySlug primitive is
--     removed in the application layer); they can only update existing rows.
--
-- Pre-P006 rows are stamped 'pre-p006' so the null/non-null distinction is
-- itself audit information: "did this row exist before governance was
-- enforced, or was it created under the new regime?"

alter table ai_company.projects
  add column if not exists created_by text;

update ai_company.projects
  set created_by = 'pre-p006'
  where created_by is null;

alter table ai_company.projects
  alter column created_by set not null;
