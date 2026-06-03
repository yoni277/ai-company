# Supabase Connector Validation

**Date:** 2026-06-03  
**Package:** `@ai-company/connector-supabase`  
**Validator:** Phase 2 validation sprint

## Environment

| Variable | Value (redacted) |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wimsglxixekmjsfpnqjb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set (not printed) |
| `SUPABASE_SCHEMA` | `ai_company` |
| `AI_COMPANY_DATA_MODE` | `mock` (platform repos still in-memory) |

## Validation checklist

| Check | Status | Evidence |
|-------|--------|----------|
| Database reachable | ⚠️ Partial | HTTP client connects to project host |
| User count returned | ⚠️ Live call, zero | `userCount: 0` (projects count) |
| Activity count returned | ⚠️ Live call, zero | `recentActivityCount: 0` |
| Transaction count returned | ⚠️ Live call, zero | `transactionCount: 0` |
| Health check passed | ❌ | `databaseHealthy: false` |
| Error handling tested | ⚠️ | Invalid key still returned zeros (no hard fail) |

## Root cause (live metrics empty)

PostgREST probe (`scripts/probe-supabase.mjs`):

```json
{
  "ai_company": {
    "pingError": "Invalid schema: ai_company",
    "tables": { "projects": { "error": "" } }
  }
}
```

The `ai_company` schema exists in migrations but is **not exposed** in Supabase API settings. Until it is added under **Settings → API → Exposed schemas**, the connector cannot read platform tables.

## API sample (dashboard with app `.env.local`, 2026-06-03)

```json
GET /api/metrics/supabase
{
  "metrics": {
    "userCount": 0,
    "recentActivityCount": 0,
    "databaseHealthy": false,
    "transactionCount": 0
  },
  "live": true
}
```

Badge shows **Supabase live** (credentials detected) but metrics reflect failed schema access.

## Metrics returned

| Field | Mock (no env) | Live attempt |
|-------|---------------|--------------|
| `userCount` | 4 | 0 |
| `recentActivityCount` | 42 | 0 |
| `databaseHealthy` | true | false |
| `transactionCount` | 28 | 0 |

## Validation status

**⚠️ PARTIAL** — Connector wiring and auth work; **production data not readable** until `ai_company` is exposed and seeded.

### Unblock steps

1. Supabase Dashboard → **Settings → API → Exposed schemas** → add `ai_company`.
2. Apply migrations `0003_init_ai_company_schema.sql` and `0004_seed_ai_company_schema.sql` if not applied.
3. Set `AI_COMPANY_DATA_MODE=supabase` for portfolio repos.
4. Copy `.env.local` to `apps/executive-dashboard/.env.local` (Next.js loads env from app dir).
5. Re-run probe and API; expect `databaseHealthy: true` and non-zero counts after seed.
