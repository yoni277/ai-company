import {
  fingerprintOpportunity,
  fingerprintRisk,
  type DataConnector,
} from '@ai-company/shared-types';
import { ProjectNotFoundError, type Repositories } from '@ai-company/database';
import { ConnectorError, ConnectorTimeoutError } from './errors';
import type { ConnectorRegistry } from './registry';

export interface SyncOptions {
  connectorNames?: string[];
  /** Per-step timeout, ms. */
  timeoutMs?: number;
}

/**
 * P006 — `skipped` is the new status the orchestrator returns when a
 * connector references an unregistered project slug. The orchestrator no
 * longer creates project rows (D023 / D038). Operators register projects
 * explicitly via POST /api/projects or the cli:register-project CLI.
 */
export type ConnectorSyncStatus = 'ok' | 'degraded' | 'error' | 'skipped';

export type ConnectorSkipReason = 'project_not_registered';

export interface ConnectorSyncResult {
  name: string;
  projectSlug: string;
  status: ConnectorSyncStatus;
  durationMs: number;
  metricsRecorded: number;
  risksRecorded: number;
  opportunitiesRecorded: number;
  error?: string;
  /** Set when status='skipped'. Diagnostic only — runtime never branches on it. */
  skipReason?: ConnectorSkipReason;
}

export interface SyncRunResult {
  startedAt: string;
  finishedAt: string;
  results: ConnectorSyncResult[];
}

/**
 * Walks the connector registry and persists their output via the repository layer.
 *
 * Failures are contained per-connector; one bad connector never blocks the rest.
 */
export class SyncOrchestrator {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly repos: Repositories,
  ) {}

  async runAll(options: SyncOptions = {}): Promise<SyncRunResult> {
    const startedAt = new Date().toISOString();
    const connectors = this.registry.filter(options.connectorNames);

    const results = await Promise.all(
      connectors.map((c) => this.runOne(c, options.timeoutMs ?? 10_000)),
    );

    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
    };
  }

  private async runOne(
    connector: DataConnector,
    timeoutMs: number,
  ): Promise<ConnectorSyncResult> {
    const startedAt = Date.now();
    const baseResult: ConnectorSyncResult = {
      name: connector.name,
      projectSlug: connector.projectSlug,
      status: 'ok',
      durationMs: 0,
      metricsRecorded: 0,
      risksRecorded: 0,
      opportunitiesRecorded: 0,
    };

    try {
      // P006 — orchestrator MAY refresh existing project rows but MAY NOT
      // create them. If the slug is not registered, skip and return a
      // structured skipReason so the operator sees what to register rather
      // than silently nothing happening.
      const existing = await this.repos.projects.getBySlug(connector.projectSlug);
      if (!existing) {
        return {
          ...baseResult,
          status: 'skipped',
          skipReason: 'project_not_registered',
          durationMs: Date.now() - startedAt,
        };
      }
      const status = await withTimeout(
        connector.getStatus(),
        timeoutMs,
        connector.name,
        'getStatus',
      );
      let project;
      try {
        project = await this.repos.projects.updateBySlug(connector.projectSlug, {
          name: connector.displayName,
          description: status.headline,
          status: status.health,
        });
      } catch (err) {
        // Race: the project was deleted between getBySlug and updateBySlug.
        // Treat as skipped — do NOT silently re-create.
        if (err instanceof ProjectNotFoundError) {
          return {
            ...baseResult,
            status: 'skipped',
            skipReason: 'project_not_registered',
            durationMs: Date.now() - startedAt,
          };
        }
        throw err;
      }

      const [metricsRaw, risksRaw, oppsRaw] = await Promise.all([
        withTimeout(connector.getMetrics(), timeoutMs, connector.name, 'getMetrics'),
        withTimeout(connector.getRisks(), timeoutMs, connector.name, 'getRisks'),
        connector.getOpportunities
          ? withTimeout(
              connector.getOpportunities(),
              timeoutMs,
              connector.name,
              'getOpportunities',
            )
          : Promise.resolve([]),
      ]);

      const now = new Date().toISOString();

      // P006A — every connector write carries provenance ('connector:<name>').
      // Risks + opportunities also carry a fingerprint so re-detection on the
      // next sync bumps generation instead of duplicating.
      const recordedBy = `connector:${connector.name}`;

      const metrics = await this.repos.metrics.recordMany(
        metricsRaw.map((m) => ({
          projectId: project!.id,
          name: m.name,
          value: m.value,
          ...(m.unit !== undefined ? { unit: m.unit } : {}),
          timestamp: m.timestamp ?? now,
          recordedBy,
        })),
      );

      const risks = await this.repos.risks.createMany(
        risksRaw.map((r) => ({
          projectId: project!.id,
          severity: r.severity,
          description: r.description,
          source: `connector:${connector.name}`,
          status: 'open' as const,
          recordedBy,
          fingerprint: fingerprintRisk({
            projectId: project!.id,
            recordedBy,
            severity: r.severity,
            description: r.description,
          }),
          generation: 1,
        })),
      );

      const opportunities = await this.repos.opportunities.createMany(
        oppsRaw.map((o) => ({
          projectId: project!.id,
          priority: o.priority,
          description: o.description,
          source: `connector:${connector.name}`,
          recordedBy,
          fingerprint: fingerprintOpportunity({
            projectId: project!.id,
            recordedBy,
            priority: o.priority,
            description: o.description,
          }),
          generation: 1,
        })),
      );

      await this.repos.dataSources.upsert({
        projectId: project.id,
        sourceType: connector.name,
        status: 'ok',
        lastSync: now,
        lastError: null,
      });

      return {
        ...baseResult,
        durationMs: Date.now() - startedAt,
        metricsRecorded: metrics.length,
        risksRecorded: risks.length,
        opportunitiesRecorded: opportunities.length,
      };
    } catch (err) {
      const message =
        err instanceof ConnectorError ? err.message : err instanceof Error ? err.message : String(err);

      // Best-effort record of failure against an existing project row, if any.
      const project = await this.repos.projects.getBySlug(connector.projectSlug);
      if (project) {
        await this.repos.dataSources.upsert({
          projectId: project.id,
          sourceType: connector.name,
          status: err instanceof ConnectorTimeoutError ? 'degraded' : 'error',
          lastSync: new Date().toISOString(),
          lastError: message,
        });
      }

      return {
        ...baseResult,
        durationMs: Date.now() - startedAt,
        status: err instanceof ConnectorTimeoutError ? 'degraded' : 'error',
        error: message,
      };
    }
  }
}

type ConnectorStep = 'getStatus' | 'getMetrics' | 'getRisks' | 'getOpportunities' | 'healthCheck';

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  connectorName: string,
  step: ConnectorStep,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ConnectorTimeoutError(connectorName, step, ms)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(
          e instanceof ConnectorError
            ? e
            : new ConnectorError(connectorName, step, e instanceof Error ? e.message : String(e), e),
        );
      },
    );
  });
}
