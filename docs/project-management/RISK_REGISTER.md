# AI-Company Risk Register

| ID | Risk | Impact | Likelihood | Mitigation | Owner | Status |
|----|------|--------|------------|------------|-------|--------|
| R-001 | GitHub API rate limits during sync | Medium | Medium | Cache responses; backoff; narrow repo scope | Engineering | Open |
| R-002 | Supabase service role key exposure | High | Low | Server-only env; never expose to client | Engineering | Open |
| R-003 | LLM hallucination in CEO brief | High | Medium | Pass only structured metrics; prompt forbids calculation | Chief of Staff | Open |
| R-004 | Mixed mock + live data confuses CEO | Medium | Medium | Label data source on dashboard; `AI_COMPANY_DATA_MODE` docs | PMO | Open |
| R-005 | Scope creep (new executives, governance) | High | Medium | Frozen governance; Phase 2 checklist only | PMO | Monitoring |

## Review cadence

- Weekly: PMO reviews open risks in `WEEKLY_STATUS_REPORT.md`.
- Escalate **High** impact + **High** likelihood items to CEO same day.
