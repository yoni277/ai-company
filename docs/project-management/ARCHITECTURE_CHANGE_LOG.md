# Architecture Change Log

| Date | Change | Packages / paths | Breaking? | Approved by |
|------|--------|------------------|-----------|-------------|
| 2026-06-03 | Add PMO docs under `docs/project-management/` | docs | No | PMO |
| 2026-06-03 | Phase 2 plan: `docs/implementation/PHASE_2_REAL_DATA_INTEGRATION.md` | docs | No | Engineering |
| 2026-06-03 | Platform connectors: `packages/connectors/github`, `packages/connectors/supabase` | packages/connectors | No | Engineering |
| 2026-06-03 | Deterministic health score: `packages/services/health-score` | packages/services | No | Engineering |
| 2026-06-03 | Dashboard production metrics panel | apps/executive-dashboard | No | Engineering |
| 2026-06-03 | Daily CEO brief generator (metrics in, narrative out) | packages/ai-chief-of-staff | No | Chief of Staff |

## Rules

- No changes to frozen governance specifications.
- No new AI executive roles without explicit CEO approval (out of Phase 2 scope).
- Record every cross-package interface change here.
