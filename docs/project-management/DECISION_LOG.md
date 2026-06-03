# AI-Company Decision Log

| ID | Date | Decision | Rationale | Owner | Status |
|----|------|----------|-----------|-------|--------|
| D-001 | 2026-06-03 | Phase 2 focuses on real GitHub + Supabase data before advanced AI | CEO must see live signals, not mock portfolio data | CEO | Accepted |
| D-002 | 2026-06-03 | Health score is deterministic code only (no LLM) | Metrics must be auditable and reproducible | Engineering | Accepted |
| D-003 | 2026-06-03 | GitHub/Supabase connectors live under `packages/connectors/` | Separates platform observability from project `DataConnector` sync | Engineering | Accepted |
| D-004 | 2026-06-03 | Daily CEO brief explains pre-computed metrics; does not calculate them | Prevents AI from inventing numbers | Chief of Staff | Accepted |
| D-005 | 2026-06-03 | Governance docs remain frozen at Draft v1.0 | No scope creep during execution | PMO | Accepted |

## How to use

1. Propose a decision in a PR or weekly status.
2. Assign the next `D-###` ID.
3. Record outcome in **Status**: Proposed → Accepted | Rejected | Superseded.
