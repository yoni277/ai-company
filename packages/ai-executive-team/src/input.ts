import type {
  CompanyContext,
  ExecutiveReport,
  ProjectHealth,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';

/**
 * Slim per-executive view sent into the synthesis prompt. We send headlines, top priorities,
 * and the project-level health calls — not the full report bodies. Two reasons:
 *   1. Keeps the prompt focused on what's load-bearing for synthesis.
 *   2. Keeps the prompt < a few KB regardless of how detailed individual reports are.
 *
 * Field names mirror the shape downstream executives expose so the synthesis
 * prompt can speak in terms each individual executive recognizes.
 */
export interface ExecutiveBriefSummary {
  executiveId: string;
  displayName: string;
  reportId: string | null;
  generatedAt: string | null;
  headline: string | null;
  health: ProjectHealth | null;
  topPriorities: Array<{ rank: number; title: string; rationale: string }>;
  /** Flat list of (projectSlug, severity, note) tuples extracted from whatever risk-shaped field the report carries. */
  flaggedProjects: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    note: string;
  }>;
  /** Free-form actions / allocations / campaigns this executive recommended. */
  recommendations: Array<{
    projectSlug: string;
    action: string;
    detail: string;
  }>;
}

export interface ExecutiveTeamInput {
  generatedAt: string;
  context: CompanyContext;
  briefs: ExecutiveBriefSummary[];
}

/** Definition of an executive the team should poll. */
export interface ExecutiveDef {
  id: string;
  displayName: string;
}

/**
 * Pulls the latest daily briefing for each known executive and normalizes it into
 * the slim summary the synthesis prompt understands. Project / executive-specific
 * field names get mapped to the shared shape here so the prompt is uniform.
 */
export async function buildExecutiveTeamInput(
  repos: Repositories,
  context: CompanyContext,
  executives: ExecutiveDef[],
): Promise<ExecutiveTeamInput> {
  const briefs = await Promise.all(
    executives.map(async (e) => {
      const report = await repos.reports.latest(e.id, 'daily_briefing');
      return summarizeReport(e, report);
    }),
  );
  return {
    generatedAt: new Date().toISOString(),
    context,
    briefs,
  };
}

/** Map any of the executive output shapes we ship today into the unified summary. */
function summarizeReport(
  e: ExecutiveDef,
  report: ExecutiveReport | null,
): ExecutiveBriefSummary {
  if (!report) {
    return {
      executiveId: e.id,
      displayName: e.displayName,
      reportId: null,
      generatedAt: null,
      headline: null,
      health: null,
      topPriorities: [],
      flaggedProjects: [],
      recommendations: [],
    };
  }

  const body = report.body as Record<string, unknown>;

  // Pull the health field — each executive names it slightly differently.
  const health =
    (body.companyHealth as ProjectHealth | undefined) ??
    (body.platformHealth as ProjectHealth | undefined) ??
    (body.marketingHealth as ProjectHealth | undefined) ??
    (body.financialHealth as ProjectHealth | undefined) ??
    (body.operationsHealth as ProjectHealth | undefined) ??
    (body.salesHealth as ProjectHealth | undefined) ??
    null;

  // Top priorities live under different keys but the same shape.
  const priorityKeys = [
    'ceoPriorities',
    'engineeringPriorities',
    'marketingPriorities',
    'financialPriorities',
    'operationalPriorities',
    'salesPriorities',
  ];
  let topPriorities: ExecutiveBriefSummary['topPriorities'] = [];
  for (const k of priorityKeys) {
    const arr = body[k];
    if (Array.isArray(arr)) {
      topPriorities = arr.slice(0, 3).map((p) => ({
        rank: typeof p.rank === 'number' ? p.rank : 0,
        title: String(p.title ?? ''),
        rationale: String(p.rationale ?? ''),
      }));
      break;
    }
  }

  // Risk-shaped fields vary by executive.
  const riskKeys = [
    'topRisks',
    'topTechnicalRisks',
    'growthRisks',
    'financialRisks',
    'bottlenecks',
    'salesRisks',
  ];
  const flaggedProjects: ExecutiveBriefSummary['flaggedProjects'] = [];
  for (const k of riskKeys) {
    const arr = body[k];
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      if (typeof r !== 'object' || r === null) continue;
      const projectSlug = (r as { projectSlug?: string }).projectSlug;
      const severity = (r as { severity?: string }).severity;
      const description =
        (r as { description?: string; title?: string }).description ??
        (r as { title?: string }).title;
      if (
        typeof projectSlug === 'string' &&
        (severity === 'low' || severity === 'high' || severity === 'medium' || severity === 'critical') &&
        typeof description === 'string'
      ) {
        flaggedProjects.push({ projectSlug, severity, note: description });
      }
    }
  }

  // Recommendation-shaped fields.
  const recommendations: ExecutiveBriefSummary['recommendations'] = [];
  const tryPush = (slug: unknown, action: unknown, detail: unknown) => {
    if (typeof slug !== 'string') return;
    recommendations.push({
      projectSlug: slug,
      action: typeof action === 'string' ? action : 'recommend',
      detail: typeof detail === 'string' ? detail : '',
    });
  };
  if (Array.isArray(body.topOpportunities)) {
    for (const o of body.topOpportunities)
      tryPush((o as Record<string, unknown>).projectSlug, (o as Record<string, unknown>).priority, (o as Record<string, unknown>).description);
  }
  if (Array.isArray(body.campaignIdeas)) {
    for (const c of body.campaignIdeas)
      tryPush((c as Record<string, unknown>).projectSlug, (c as Record<string, unknown>).channel, (c as Record<string, unknown>).description);
  }
  if (Array.isArray(body.capitalAllocations)) {
    for (const a of body.capitalAllocations)
      tryPush((a as Record<string, unknown>).projectSlug, (a as Record<string, unknown>).action, (a as Record<string, unknown>).rationale);
  }
  if (Array.isArray(body.deals)) {
    for (const d of body.deals)
      tryPush((d as Record<string, unknown>).projectSlug, (d as Record<string, unknown>).status, (d as Record<string, unknown>).title);
  }
  if (Array.isArray(body.techDebtItems)) {
    for (const t of body.techDebtItems)
      tryPush((t as Record<string, unknown>).projectSlug, 'tech_debt', (t as Record<string, unknown>).description);
  }

  return {
    executiveId: e.id,
    displayName: e.displayName,
    reportId: report.id,
    generatedAt: report.createdAt,
    headline: typeof body.headline === 'string' ? body.headline : report.summary,
    health,
    topPriorities,
    flaggedProjects: flaggedProjects.slice(0, 8),
    recommendations: recommendations.slice(0, 12),
  };
}
