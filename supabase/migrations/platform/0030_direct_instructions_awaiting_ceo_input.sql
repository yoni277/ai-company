-- EPIC-004A — Work Model Convergence (D079). Spec §6 (L34 pulled in), AC9/AC12.
--
-- Awaiting-CEO-Input — the instruction clarification loop is now part of
-- accountability, not a separate feature. When an executive asks a clarifying
-- question on an instruction, that becomes a QUERYABLE state that feeds the CEO
-- Attention Queue (AC12). Without it the chain CEO→instruction→exec-question→???
-- silently breaks.
--
--   awaiting_ceo_input — the executive is blocked pending a CEO answer.
--   ceo_response       — the CEO's reply (clears the flag → executive re-run).
--
-- The flag is surfaced onto the instruction's assigned_work by the classifier
-- (no duplicate column on the spine — single source of truth on the instruction).
--
-- ADDITIVE ONLY. Defaulted boolean + nullable text.

alter table ai_company.direct_instructions
  add column if not exists awaiting_ceo_input boolean not null default false;

alter table ai_company.direct_instructions
  add column if not exists ceo_response text;

create index if not exists direct_instructions_awaiting_ceo_input
  on ai_company.direct_instructions (project_slug, awaiting_ceo_input)
  where awaiting_ceo_input;
