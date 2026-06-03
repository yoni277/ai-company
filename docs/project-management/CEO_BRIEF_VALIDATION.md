# Daily CEO Brief Validation

**Date:** 2026-06-03  
**Endpoint:** `POST /api/chief-of-staff/daily-brief`  
**Implementation:** `packages/ai-chief-of-staff/src/daily-brief.ts`

## Inputs used (actual run)

| Input | Source | Live? |
|-------|--------|-------|
| GitHub metrics | Mock fallback | ❌ |
| Supabase metrics | Live connector (empty/unhealthy) | ⚠️ |
| Health score | Deterministic (96, green) | ⚠️ Mixed inputs |
| Pending approvals | In-memory portfolio | ❌ |

## Sample brief (API response, 2026-06-03)

```json
{
  "companyHealth": "Company health score is 96/100 (green). GitHub shows 4 open issues and 18 commits in the last 7 days on ai-company (mock). Supabase reports 42 recent activity events; database is healthy.",
  "topRisks": [
    "GitHub issue backlog is 4 — within normal range.",
    "No critical health score alert.",
    "Platform database is responding normally."
  ],
  "opportunities": [
    "Strong engineering velocity: 18 commits this week.",
    "2 open PR(s) ready for review.",
    "High platform activity — good signal for portfolio monitoring."
  ],
  "approvalsWaiting": [
    "1 approval(s) need CEO attention today."
  ]
}
```

**Note:** Narrative still references mock Supabase numbers (42 events, healthy) when the live connector returned zeros — the overview page uses `deterministicDailyBrief()` on SSR; the POST path uses the same metric bundle from `loadPhase2Snapshot()`. After live data is wired, regenerate and confirm numbers match API panels.

## CEO questions

| Question | Answered today? | Comment |
|----------|-----------------|---------|
| 1. What is happening? | ⚠️ Partially | Text is coherent but based on mock GitHub + stale/mock Supabase copy |
| 2. What is broken? | ❌ | Claims DB healthy while live probe shows `databaseHealthy: false` |
| 3. What requires attention? | ⚠️ | Generic velocity/PR notes, not real repo activity |
| 4. What requires approval? | ⚠️ | One approval from mock portfolio rules — plausible demo only |

## LLM path

| Provider | Configured | Used for daily brief? |
|----------|------------|------------------------|
| OpenAI | ❌ Empty `OPENAI_API_KEY` | No |
| Anthropic | ✅ Key present | No — `generateDailyBrief()` only calls OpenAI today |

**Regenerate CEO brief (LLM)** button calls POST; with current code, output remains deterministic unless `OPENAI_API_KEY` is set.

## Quality assessment

| Criterion | Score | Notes |
|-----------|-------|-------|
| Grounded in metrics | ❌ Fail | Mismatches live Supabase state |
| Actionable | ⚠️ | Generic bullets |
| CEO-appropriate tone | ✅ | Clear, short |
| No invented numbers | ⚠️ | Does not invent, but inherits wrong mock inputs |

## Improvement recommendations

1. **Unblock live metrics first** (GitHub env, Supabase schema, `AI_COMPANY_DATA_MODE=supabase`).
2. **Align brief input** with the same snapshot shown in dashboard panels (already intended — verify after live data).
3. **Wire Anthropic** into `generateDailyBrief()` for parity with Chief of Staff (optional, not blocking).
4. **Fail loud** when `databaseHealthy: false` — brief should state DB needs attention, not “healthy”.
5. Re-validate with `POST /api/chief-of-staff/daily-brief` and archive a live sample in this doc.

## Validation status

**❌ NOT VALIDATED (production data)** — Brief generates successfully but **does not yet reflect real GitHub/Supabase production state**.
