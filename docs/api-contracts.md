# API Contracts

This is the canonical reference for what crosses package boundaries.

## TypeScript domain types

All exported from `@ai-company/shared-types`.

```ts
export type ProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'monitoring' | 'mitigated' | 'accepted';
export type OpportunityPriority = 'low' | 'medium' | 'high';
export type ReportType = 'daily_briefing' | 'weekly_report' | 'ad_hoc';

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectHealth;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetric {
  id: string;
  projectId: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface Risk {
  id: string;
  projectId: string;
  severity: RiskSeverity;
  description: string;
  source: string;
  status: RiskStatus;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  projectId: string;
  priority: OpportunityPriority;
  description: string;
  source: string;
  createdAt: string;
}

export interface ExecutiveReport {
  id: string;
  executiveId: string;
  reportType: ReportType;
  summary: string;
  body: ChiefOfStaffOutput | Record<string, unknown>;
  createdAt: string;
}
```

## Connector contract

```ts
export interface DataConnector {
  readonly name: string;
  readonly projectSlug: string;
  readonly displayName: string;
  getStatus(): Promise<ProjectStatusSnapshot>;
  getMetrics(): Promise<ProjectMetric[]>;
  getRisks(): Promise<RiskCandidate[]>;
  getOpportunities?(): Promise<OpportunityCandidate[]>;
  healthCheck?(): Promise<ConnectorHealth>;
}

export interface ProjectStatusSnapshot {
  health: ProjectHealth;
  headline: string;
  detail?: string;
  asOf: string;
}

export interface RiskCandidate {
  severity: RiskSeverity;
  description: string;
}

export interface OpportunityCandidate {
  priority: OpportunityPriority;
  description: string;
}

export interface ConnectorHealth {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
}
```

## AI Chief of Staff output

```ts
export interface ChiefOfStaffOutput {
  headline: string;            // one-sentence executive summary
  companyHealth: ProjectHealth;
  perProject: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    keyMetrics: Array<{ name: string; value: number; unit?: string }>;
  }>;
  topRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    description: string;
    recommendedAction: string;
  }>;
  topOpportunities: Array<{
    projectSlug: string;
    priority: OpportunityPriority;
    description: string;
    recommendedAction: string;
  }>;
  ceoPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  generatedAt: string;
}
```

## HTTP endpoints (Executive Dashboard)

| Method | Path | Body | Returns | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/api/projects` | — | `Project[]` | List monitored projects |
| `GET` | `/api/projects/:slug` | — | `Project & { metrics, risks, opportunities }` | Single project detail |
| `GET` | `/api/reports?type=daily_briefing` | — | `ExecutiveReport[]` | List reports of a type |
| `GET` | `/api/reports/:id` | — | `ExecutiveReport` | One report |
| `POST` | `/api/chief-of-staff/briefing` | `{ reportType: ReportType }` | `ExecutiveReport` | Generate a new briefing now |
| `POST` | `/api/connectors/sync` | `{ connectors?: string[] }` | `{ results: Array<{ name: string; status: 'ok'\|'degraded'\|'error'; durationMs: number }> }` | Trigger sync |
| `GET` | `/api/connectors` | — | `Array<{ name; projectSlug; status; lastSync }>` | Connector roster |

All responses are JSON; errors follow `{ error: { code: string; message: string } }` with appropriate HTTP status.

## Executive registry contract (forward-looking)

```ts
export interface Executive<TOutput = unknown> {
  readonly id: string;
  readonly displayName: string;
  readonly reportTypes: ReportType[];
  generateReport(ctx: CompanyContext, reportType: ReportType): Promise<TOutput>;
}
```

Phase 1 registers `chief-of-staff`. Phase 2+ will register `cto`, `cfo`, `coo`, `vp-marketing`, `vp-sales` against the same interface.
