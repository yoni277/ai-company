# GitHub Connector Validation

**Date:** 2026-06-03  
**Package:** `@ai-company/connector-github`  
**Validator:** Phase 2 validation sprint

## Environment

| Variable | Status |
|----------|--------|
| `GITHUB_TOKEN` | ❌ Not set in `.env.local` |
| `GITHUB_REPOSITORY` | ❌ Not set in `.env.local` |

Without both variables, the connector correctly falls back to **mock** metrics.

## Validation checklist

| Check | Status | Evidence |
|-------|--------|----------|
| Repository reachable | ⏸️ Blocked | Requires `GITHUB_TOKEN` + `GITHUB_REPOSITORY` |
| Open issues count returned | ✅ Mock | `openIssues: 4` |
| Open PR count returned | ✅ Mock | `openPullRequests: 2` |
| Commits last 7 days returned | ✅ Mock | `commitsLast7Days: 18` |
| Error handling tested | ⏸️ Blocked | Live error path not exercised without token |

## API sample (dashboard, 2026-06-03)

```json
GET /api/metrics/github
{
  "metrics": {
    "openIssues": 4,
    "openPullRequests": 2,
    "commitsLast7Days": 18,
    "repositoryName": "ai-company (mock)"
  },
  "live": false
}
```

## Repository tested

**None (live).** Configure a production repo, for example:

```bash
GITHUB_REPOSITORY=<org>/ai-company
GITHUB_TOKEN=<fine-grained or classic PAT with repo read>
```

Recommended scopes: `repo` (private) or `public_repo` (public), read-only.

## Metrics returned (mock run)

| Field | Value |
|-------|-------|
| `repositoryName` | `ai-company (mock)` |
| `openIssues` | 4 |
| `openPullRequests` | 2 |
| `commitsLast7Days` | 18 |

## Screenshots / output

_Live GitHub validation pending credentials. After adding env vars:_

1. Re-run `npx tsx scripts/validate-phase2-connectors.mjs`
2. Confirm `github.live: true` and `repositoryName` matches real repo
3. Capture dashboard badge **GitHub live**

## Validation status

**❌ NOT VALIDATED (live)** — Mock fallback works; live GitHub API not tested.

### Unblock steps

1. Add `GITHUB_TOKEN` and `GITHUB_REPOSITORY` to `apps/executive-dashboard/.env.local` (see dashboard env note).
2. Restart dev server.
3. Re-run checklist; update this doc with live metrics and set status to ✅.
