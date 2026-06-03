# Supabase Connector Validation

**Date:** 2026-06-03  
**Package:** `@ai-company/connector-supabase`  
**Status:** **PASS**

## Endpoint tested

`GET /api/metrics/supabase` (executive-dashboard, local)

## Results (live production data)

| Field | Value |
|-------|-------|
| `live` | `true` |
| `databaseHealthy` | `true` |
| `userCount` | `4` |
| `recentActivityCount` | `0` |
| `transactionCount` | `0` |

## API sample (2026-06-03)

```json
{
  "metrics": {
    "userCount": 4,
    "recentActivityCount": 0,
    "databaseHealthy": true,
    "transactionCount": 0
  },
  "live": true
}
```

## Error checks

| Check | Result |
|-------|--------|
| PGRST106 (`Invalid schema: ai_company`) | **None** — `ai_company` schema exposed in Supabase API |
| HTTP status | **200** |

## Environment

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Configured |
| `SUPABASE_SCHEMA` | `ai_company` |

## Notes

- `userCount` reflects **projects** row count in `ai_company.projects` (4 seeded projects).
- Zero `recentActivityCount` / `transactionCount` expected until connector syncs write metrics and reports in the last 7 days.

## Validation status

**PASS** — Live Supabase connector reads production schema successfully.
