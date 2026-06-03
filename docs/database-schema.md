# Database Schema

The schema lives in `supabase/migrations/`. It is intentionally narrow — Phase 1 needs only seven tables.

## Entities

### `projects`
The unit of monitoring. Every other table fans out from here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `slug` | text | unique; used by connectors to bind |
| `name` | text | display name |
| `description` | text | one-liner |
| `status` | text enum (`healthy`/`at_risk`/`critical`/`paused`/`archived`) | derived; updated by orchestrator |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | trigger-maintained |

### `data_sources`
One row per connector binding. Tracks last sync and status — the audit trail for the connector framework.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `project_id` | uuid | fk → projects |
| `source_type` | text | matches `DataConnector.name` |
| `status` | text enum (`ok`/`degraded`/`error`/`unknown`) | |
| `last_sync` | timestamptz | nullable |
| `last_error` | text | nullable |

### `project_metrics`
Append-only time series. Phase 1 keeps it simple — one numeric value per metric name per timestamp.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `project_id` | uuid | fk |
| `metric_name` | text | e.g. `monthly_revenue`, `active_users` |
| `metric_value` | numeric | |
| `unit` | text | optional |
| `timestamp` | timestamptz | |

Indexed on `(project_id, metric_name, timestamp DESC)`.

### `risks`
Open risks. Can be created by a connector (auto-detected) or by an AI executive's report.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `project_id` | uuid | fk |
| `severity` | text enum (`low`/`medium`/`high`/`critical`) | |
| `description` | text | |
| `source` | text | `connector:<name>` or `executive:<id>` |
| `status` | text enum (`open`/`monitoring`/`mitigated`/`accepted`) | |
| `created_at` | timestamptz | |

### `opportunities`
Same shape as risks but for upside.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `project_id` | uuid | fk |
| `priority` | text enum (`low`/`medium`/`high`) | |
| `description` | text | |
| `source` | text | |
| `created_at` | timestamptz | |

### `executive_reports`
One row per generated briefing/report. JSONB body keeps the structured executive output queryable but flexible across future executive types.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | pk |
| `executive_id` | text | `chief-of-staff` today; `cto`, `cfo`, … later |
| `report_type` | text enum (`daily_briefing`/`weekly_report`/`ad_hoc`) | |
| `summary` | text | human-readable headline |
| `body` | jsonb | full typed payload (`ChiefOfStaffOutput`, etc.) |
| `created_at` | timestamptz | |

### `report_links`
Joins reports to the risks / opportunities they cite, so the dashboard can trace a recommendation back to its grounding.

| Column | Type | Notes |
| --- | --- | --- |
| `report_id` | uuid | fk |
| `entity_type` | text enum (`risk`/`opportunity`/`metric`) | |
| `entity_id` | uuid | fk to whichever table |
| pk | (report_id, entity_type, entity_id) | |

## Why these choices

- **JSONB on `executive_reports.body`** — each future executive defines its own report contract. We get strong typing in TypeScript without versioning SQL columns every time a new executive lands.
- **`source` columns on risks/opportunities** — lets the dashboard show provenance ("flagged by AI CoS" vs "raised by FoodTruck connector").
- **`report_links` table** rather than embedded ids in JSONB — keeps queries like "show me all reports that cited this risk" trivial.
- **No soft delete in Phase 1** — `status` columns cover the lifecycle; we'll add `archived_at` if/when audit pressure demands it.

## Indexes

- `projects.slug` unique
- `data_sources(project_id, source_type)` unique
- `project_metrics(project_id, metric_name, timestamp DESC)`
- `risks(project_id, status)`
- `opportunities(project_id)`
- `executive_reports(executive_id, report_type, created_at DESC)`

## RLS

Phase 1 keeps RLS permissive (single CEO assumed). The migration enables RLS on every table with `auth.role() = 'service_role'` policies for writes and `true` for reads. Tightening to per-user policies is a Phase 2 task tied to actual auth.
