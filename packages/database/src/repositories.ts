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

export interface DataSourceRecord {
  id: string;
  projectId: string;
  sourceType: string;
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  lastSync: string | null;
  lastError: string | null;
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getBySlug(slug: string): Promise<Project | null>;
  upsertBySlug(input: {
    slug: string;
    name: string;
    description: string;
    status: ProjectHealth;
  }): Promise<Project>;
  setStatus(id: string, status: ProjectHealth): Promise<void>;
}

export interface DataSourceRepository {
  listByProject(projectId: string): Promise<DataSourceRecord[]>;
  upsert(input: {
    projectId: string;
    sourceType: string;
    status: DataSourceRecord['status'];
    lastSync: string | null;
    lastError: string | null;
  }): Promise<DataSourceRecord>;
}

export interface ProjectMetricRepository {
  listLatestByProject(projectId: string, limitPerName?: number): Promise<ProjectMetric[]>;
  recordMany(metrics: Array<Omit<ProjectMetric, 'id'>>): Promise<ProjectMetric[]>;
}

export interface RiskRepository {
  listOpen(): Promise<Risk[]>;
  listByProject(projectId: string, status?: RiskStatus): Promise<Risk[]>;
  createMany(risks: Array<Omit<Risk, 'id' | 'createdAt'>>): Promise<Risk[]>;
  setStatus(id: string, status: RiskStatus): Promise<void>;
}

export interface OpportunityRepository {
  listAll(): Promise<Opportunity[]>;
  listByProject(projectId: string): Promise<Opportunity[]>;
  createMany(opportunities: Array<Omit<Opportunity, 'id' | 'createdAt'>>): Promise<Opportunity[]>;
}

export interface ExecutiveReportRepository {
  list(filter?: { executiveId?: string; reportType?: ReportType; limit?: number }): Promise<
    ExecutiveReport[]
  >;
  getById(id: string): Promise<ExecutiveReport | null>;
  latest(executiveId: string, reportType: ReportType): Promise<ExecutiveReport | null>;
  create(input: Omit<ExecutiveReport, 'id' | 'createdAt'>): Promise<ExecutiveReport>;
}

export interface Repositories {
  projects: ProjectRepository;
  dataSources: DataSourceRepository;
  metrics: ProjectMetricRepository;
  risks: RiskRepository;
  opportunities: OpportunityRepository;
  reports: ExecutiveReportRepository;
}
