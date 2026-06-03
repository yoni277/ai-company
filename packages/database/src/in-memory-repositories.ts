import { randomUUID } from 'node:crypto';
import type {
  Project,
  ProjectHealth,
  ProjectMetric,
  Risk,
  RiskStatus,
  Opportunity,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import type {
  DataSourceRecord,
  DataSourceRepository,
  ExecutiveReportRepository,
  OpportunityRepository,
  ProjectMetricRepository,
  ProjectRepository,
  Repositories,
  RiskRepository,
} from './repositories.js';

/**
 * Singleton in-memory store. Survives within a single Node process
 * (good for dev and demo, not for prod).
 */
class Store {
  projects: Project[] = [];
  dataSources: DataSourceRecord[] = [];
  metrics: ProjectMetric[] = [];
  risks: Risk[] = [];
  opportunities: Opportunity[] = [];
  reports: ExecutiveReport[] = [];

  private seeded = false;

  ensureSeed() {
    if (this.seeded) return;
    this.seeded = true;
    const now = new Date().toISOString();
    const projects: Array<Pick<Project, 'slug' | 'name' | 'description' | 'status'>> = [
      {
        slug: 'foodtruck-il',
        name: 'FoodTruck-IL',
        description: 'Israeli food truck operations platform.',
        status: 'healthy',
      },
      {
        slug: 'lab-os',
        name: 'Lab-OS',
        description: 'Laboratory operating system.',
        status: 'at_risk',
      },
      {
        slug: 'inventory-engine',
        name: 'Inventory Management Engine',
        description: 'Generic inventory engine across business lines.',
        status: 'healthy',
      },
      {
        slug: 'whatsapp-engine',
        name: 'WhatsApp Platform',
        description: 'Customer messaging and automation over WhatsApp.',
        status: 'healthy',
      },
    ];
    for (const p of projects) {
      this.projects.push({
        id: randomUUID(),
        slug: p.slug,
        name: p.name,
        description: p.description,
        status: p.status,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

const globalKey = Symbol.for('ai-company.in-memory-store');
type GlobalWithStore = typeof globalThis & { [globalKey]?: Store };
function store(): Store {
  const g = globalThis as GlobalWithStore;
  if (!g[globalKey]) g[globalKey] = new Store();
  const s = g[globalKey];
  s.ensureSeed();
  return s;
}

class InMemoryProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    return [...store().projects].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getBySlug(slug: string): Promise<Project | null> {
    return store().projects.find((p) => p.slug === slug) ?? null;
  }
  async upsertBySlug(input: {
    slug: string;
    name: string;
    description: string;
    status: ProjectHealth;
  }): Promise<Project> {
    const s = store();
    const existing = s.projects.find((p) => p.slug === input.slug);
    const now = new Date().toISOString();
    if (existing) {
      existing.name = input.name;
      existing.description = input.description;
      existing.status = input.status;
      existing.updatedAt = now;
      return existing;
    }
    const created: Project = {
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      description: input.description,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    s.projects.push(created);
    return created;
  }
  async setStatus(id: string, status: ProjectHealth): Promise<void> {
    const p = store().projects.find((x) => x.id === id);
    if (p) {
      p.status = status;
      p.updatedAt = new Date().toISOString();
    }
  }
}

class InMemoryDataSourceRepository implements DataSourceRepository {
  async listByProject(projectId: string): Promise<DataSourceRecord[]> {
    return store().dataSources.filter((d) => d.projectId === projectId);
  }
  async upsert(input: Parameters<DataSourceRepository['upsert']>[0]): Promise<DataSourceRecord> {
    const s = store();
    const existing = s.dataSources.find(
      (d) => d.projectId === input.projectId && d.sourceType === input.sourceType,
    );
    if (existing) {
      existing.status = input.status;
      existing.lastSync = input.lastSync;
      existing.lastError = input.lastError;
      return existing;
    }
    const created: DataSourceRecord = { id: randomUUID(), ...input };
    s.dataSources.push(created);
    return created;
  }
}

class InMemoryProjectMetricRepository implements ProjectMetricRepository {
  async listLatestByProject(projectId: string, limitPerName = 1): Promise<ProjectMetric[]> {
    const all = store()
      .metrics.filter((m) => m.projectId === projectId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const grouped = new Map<string, ProjectMetric[]>();
    for (const m of all) {
      const list = grouped.get(m.name) ?? [];
      if (list.length < limitPerName) {
        list.push(m);
        grouped.set(m.name, list);
      }
    }
    return Array.from(grouped.values()).flat();
  }
  async recordMany(metrics: Array<Omit<ProjectMetric, 'id'>>): Promise<ProjectMetric[]> {
    const s = store();
    const created = metrics.map((m) => ({ id: randomUUID(), ...m }));
    s.metrics.push(...created);
    return created;
  }
}

class InMemoryRiskRepository implements RiskRepository {
  async listOpen(): Promise<Risk[]> {
    return store().risks.filter((r) => r.status === 'open');
  }
  async listByProject(projectId: string, status?: RiskStatus): Promise<Risk[]> {
    return store().risks.filter(
      (r) => r.projectId === projectId && (status ? r.status === status : true),
    );
  }
  async createMany(risks: Array<Omit<Risk, 'id' | 'createdAt'>>): Promise<Risk[]> {
    const s = store();
    const now = new Date().toISOString();
    const created = risks.map((r) => ({ id: randomUUID(), createdAt: now, ...r }));
    s.risks.push(...created);
    return created;
  }
  async setStatus(id: string, status: RiskStatus): Promise<void> {
    const r = store().risks.find((x) => x.id === id);
    if (r) r.status = status;
  }
}

class InMemoryOpportunityRepository implements OpportunityRepository {
  async listAll(): Promise<Opportunity[]> {
    return [...store().opportunities];
  }
  async listByProject(projectId: string): Promise<Opportunity[]> {
    return store().opportunities.filter((o) => o.projectId === projectId);
  }
  async createMany(
    opportunities: Array<Omit<Opportunity, 'id' | 'createdAt'>>,
  ): Promise<Opportunity[]> {
    const s = store();
    const now = new Date().toISOString();
    const created = opportunities.map((o) => ({ id: randomUUID(), createdAt: now, ...o }));
    s.opportunities.push(...created);
    return created;
  }
}

class InMemoryExecutiveReportRepository implements ExecutiveReportRepository {
  async list(
    filter: Parameters<ExecutiveReportRepository['list']>[0] = {},
  ): Promise<ExecutiveReport[]> {
    return store()
      .reports.filter(
        (r) =>
          (filter.executiveId ? r.executiveId === filter.executiveId : true) &&
          (filter.reportType ? r.reportType === filter.reportType : true),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 50);
  }
  async getById(id: string): Promise<ExecutiveReport | null> {
    return store().reports.find((r) => r.id === id) ?? null;
  }
  async latest(executiveId: string, reportType: ReportType): Promise<ExecutiveReport | null> {
    const list = await this.list({ executiveId, reportType, limit: 1 });
    return list[0] ?? null;
  }
  async create(input: Omit<ExecutiveReport, 'id' | 'createdAt'>): Promise<ExecutiveReport> {
    const created: ExecutiveReport = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    store().reports.push(created);
    return created;
  }
}

export class InMemoryRepositories implements Repositories {
  readonly projects = new InMemoryProjectRepository();
  readonly dataSources = new InMemoryDataSourceRepository();
  readonly metrics = new InMemoryProjectMetricRepository();
  readonly risks = new InMemoryRiskRepository();
  readonly opportunities = new InMemoryOpportunityRepository();
  readonly reports = new InMemoryExecutiveReportRepository();
}
