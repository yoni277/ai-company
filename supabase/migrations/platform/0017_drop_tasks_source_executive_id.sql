-- P005A — Architectural cleanup #2: drop the redundant column.
--
-- Approved by Chief Architect 2026-06-04. With migration 0016 in place,
-- source_executive_id is derivable via the proposal layer:
--
--   tasks.proposal_id → task_proposals.source_executive_id
--
-- Doctrine: "Store facts once. Derive relationships." Keeping a denormalized
-- copy on tasks would let the two values diverge silently — exactly the
-- failure mode the verification gate (D031) exists to prevent.
--
-- Legacy tasks (proposal_id null) lose their executive provenance. That is
-- accepted — they were created under the broken architecture and have no
-- proposal row to point at; their nullness is the audit trail.

drop index if exists ai_company.tasks_by_source_executive;

alter table ai_company.tasks
  drop column if exists source_executive_id;
