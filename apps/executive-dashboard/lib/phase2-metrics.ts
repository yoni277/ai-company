import 'server-only';
import { githubConnectorFromEnv } from '@ai-company/connector-github';
import { supabasePlatformConnectorFromEnv } from '@ai-company/connector-supabase';
import {
  calculateHealthScore,
  healthScoreInputsFromMetrics,
} from '@ai-company/health-score';
import type {
  DailyBrief,
  DailyBriefMetricsInput,
  PendingApproval,
  Phase2Snapshot,
} from '@ai-company/shared-types';
import type { Risk } from '@ai-company/shared-types';
import { generateDailyBrief } from '@ai-company/ai-chief-of-staff';
import { loadFoodTruckBusinessMetrics } from './owner-acquisition';
import { loadFunnelSnapshots } from './funnel-intelligence';
import { loadDecisionSupportResults } from './decision-support';
import type { Repositories } from '@ai-company/database';

export type { Phase2Snapshot, PendingApproval };

export async function loadPhase2Snapshot(repos: Repositories): Promise<Phase2Snapshot> {
  const githubConn = githubConnectorFromEnv();
  const supabaseConn = supabasePlatformConnectorFromEnv();

  const [github, supabase, openRisks, projects] = await Promise.all([
    githubConn.fetchMetrics(),
    supabaseConn.fetchMetrics(),
    repos.risks.listOpen(),
    repos.projects.list(),
  ]);

  const criticalRisks = openRisks.filter((r) => r.severity === 'critical').length;
  const health = calculateHealthScore(
    healthScoreInputsFromMetrics({
      githubOpenIssues: github.openIssues,
      criticalRisks,
    }),
  );

  const pendingApprovals = await collectPendingApprovals(repos, openRisks, projects);

  const topRisks = [...openRisks].sort((a, b) => sevRank(a.severity) - sevRank(b.severity)).slice(0, 8);

  return {
    github,
    supabase,
    health,
    topRisks,
    pendingApprovals,
    githubLive: githubConn.live,
    supabaseLive: supabaseConn.live,
  };
}

export async function loadDailyCeoBrief(repos: Repositories): Promise<DailyBrief> {
  const [snapshot, foodTruck, funnels, decisionSupport] = await Promise.all([
    loadPhase2Snapshot(repos),
    loadFoodTruckBusinessMetrics(),
    loadFunnelSnapshots(),
    loadDecisionSupportResults(),
  ]);
  const input: DailyBriefMetricsInput = {
    github: snapshot.github,
    supabase: snapshot.supabase,
    health: snapshot.health,
    pendingApprovalCount: snapshot.pendingApprovals.length,
    foodTruck: foodTruck.metrics,
    funnels,
    decisionSupport,
  };
  return generateDailyBrief(input);
}

async function collectPendingApprovals(
  repos: Repositories,
  openRisks: Risk[],
  projects: Awaited<ReturnType<Repositories['projects']['list']>>,
): Promise<PendingApproval[]> {
  const items: PendingApproval[] = [];
  const approvalPattern = /approval|approve|pending review|awaiting/i;

  for (const r of openRisks) {
    if (approvalPattern.test(r.description)) {
      const project = projects.find((p) => p.id === r.projectId);
      items.push({
        id: r.id,
        label: r.description,
        source: r.source,
        ...(project?.name !== undefined ? { projectName: project.name } : {}),
      });
    }
  }

  const opps = await repos.opportunities.listAll();
  for (const o of opps) {
    if (approvalPattern.test(o.description)) {
      const project = projects.find((p) => p.id === o.projectId);
      items.push({
        id: o.id,
        label: o.description,
        source: o.source,
        ...(project?.name !== undefined ? { projectName: project.name } : {}),
      });
    }
  }

  for (const p of projects) {
    if (p.slug !== 'foodtruck-il') continue;
    const metrics = await repos.metrics.listLatestByProject(p.id, 20);
    const pending = metrics.find((m) => m.name === 'pending_trucks');
    if (pending && pending.value > 0) {
      items.push({
        id: `pending-trucks-${p.id}`,
        label: `${pending.value} truck(s) awaiting approval`,
        source: 'connector:foodtruck-il',
        projectName: p.name,
      });
    }
  }

  return items;
}

function sevRank(s: 'low' | 'medium' | 'high' | 'critical') {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}
