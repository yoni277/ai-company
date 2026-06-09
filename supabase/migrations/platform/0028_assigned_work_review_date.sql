-- EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2 / §7, AC2.
--
-- assigned_work.review_date — "deadline at activation, not creation," and
-- honours "no AI may fabricate deadlines" (AC4). A work item has a "date
-- present" when EITHER due_date OR review_date is set. Proposed work MAY be
-- dateless; dateless proposed work is the derived state "Needs CEO Completion"
-- (computed: approval_status='proposed' AND due_date IS NULL AND review_date
-- IS NULL — no new enum). The approval path rejects activation (→approved)
-- while both are null. A review_date is a CEO-set "check back on this" marker,
-- distinct from a hard due_date.
--
-- ADDITIVE ONLY. Nullable column.

alter table ai_company.assigned_work
  add column if not exists review_date date;
