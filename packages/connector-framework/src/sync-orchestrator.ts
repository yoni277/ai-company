import type { DataConnector } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { ConnectorError, ConnectorTimeoutError } from './errors.js';
import type { ConnectorRegistry } from './registry.js';

export interface SyncOptions {
  connectorNames?: string[];
  /** Per-step timeout, ms. */
  timeoutMs?: number;
}

export interface ConnectorSyncResult {
  name: string;
  projectSlug: string;
  status: 'ok' | 'degraded' | 'error';
  durationMs: number;
  metricsRecorded: number;
  risksRecorded: number;
  opportunitiesRecorded: number;
  error?: string;
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
      // Ensure project row exists; without it nothing else can be persisted.
      let project = await this.repos.projects.getBySlug(connector.projectSlug);
      const status = await withTimeout(
        connector.getStatus(),
        timeoutMs,
        connector.name,
        'getStatus',
      );
      project = await this.repos.projects.upsertBySlug({
        slug: connector.projectSlug,
        name: project?.name ?? connector.displayName,
        description: project?.description ?? status.headline,
        status: status.health,
      });

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

      const metrics = await this.repos.metrics.recordMany(
        metricsRaw.map((m) => ({
          projectId: project!.id,
          name: m.name,
          value: m.value,
          ...(m.unit !== undefined ? { unit: m.unit } : {}),
          timestamp: m.timestamp ?? now,
        })),
      );

      const risks = await this.repos.risks.createMany(
        risksRaw.map((r) => ({
          projectId: project!.id,
          severity: r.severity,
          description: r.description,
          source: `connector:${connector.name}`,
          status: 'open' as const,
        })),
      );

      const opportunities = await this.repos.opportunities.createMany(
        oppsRaw.map((o) => ({
          projectId: project!.id,
          priority: o.priority,
          description: o.description,
          source: `connector:${connector.name}`,
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
