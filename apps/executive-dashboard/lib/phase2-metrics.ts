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
import { generateDailyBrief } from '@ai-company/ai-chief-of-staff';
import { loadPortfolioIntelligenceForDashboard } from './portfolio-intelligence';
import { listActiveDirectives, listDecisions } from './ceo-operating-system';
import { loadWorkMasterList } from './executive-os/work-control';
import { derivePendingApprovals } from './pending-approvals-core';
import { partitionRiskProvenance } from './risk-provenance-core';
import type { Repositories } from '@ai-company/database';

export type { Phase2Snapshot, PendingApproval };

export async function loadPhase2Snapshot(repos: Repositories): Promise<Phase2Snapshot> {
  const githubConn = githubConnectorFromEnv();
  const supabaseConn = supabasePlatformConnectorFromEnv();

  const [github, supabase, openRisks, projects, decisions] = await Promise.all([
    githubConn.fetchMetrics(),
    supabaseConn.fetchMetrics(),
    repos.risks.listOpen(),
    repos.projects.list(),
    listDecisions(),
  ]);

  // D6 — provenance boundary. Only connector:*/system:* risks (and executive
  // risks the CEO has explicitly CONFIRMED via a ceo_decisions record) feed the
  // deterministic health score. Executive/unknown risks stay CEO-visible
  // (advisory) but do NOT move the number. No free-text, no schema change.
  const confirmedRiskIds = confirmedRiskIdsFromDecisions(decisions);
  const provenance = partitionRiskProvenance(openRisks, confirmedRiskIds);

  if (provenance.unknownSources.length > 0) {
    // P1-3 spirit: an unrecognized provenance is failed-safe to advisory, never
    // silently scored. Surface it so the source taxonomy can be corrected.
    // eslint-disable-next-line no-console
    console.warn(
      `D6: ${provenance.unknownSources.length} risk(s) with unrecognized source band (advisory, not scored): ${[
        ...new Set(provenance.unknownSources),
      ].join(', ')}`,
    );
  }

  const criticalRisks = provenance.deterministicCriticalCount;
  const health = calculateHealthScore(
    healthScoreInputsFromMetrics({
      githubOpenIssues: github.openIssues,
      criticalRisks,
    }),
  );

  const pendingApprovals = await collectPendingApprovals(repos, projects);

  // topRisks keeps every risk (advisory ones included, flagged) so the CEO sees
  // executive insights even though they did not move the score.
  const topRisks = [...provenance.marked]
    .sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
    .slice(0, 8);

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
  const [snapshot, portfolioLoad, ceoDirectives, ceoDecisions] = await Promise.all([
    loadPhase2Snapshot(repos),
    loadPortfolioIntelligenceForDashboard(),
    listActiveDirectives(),
    listDecisions(),
  ]);
  const topBundle = portfolioLoad.bundles.find(
    (b) => b.projectId === portfolioLoad.portfolio.priorities[0]?.projectId,
  );
  const input: DailyBriefMetricsInput = {
    github: snapshot.github,
    supabase: snapshot.supabase,
    health: snapshot.health,
    pendingApprovalCount: snapshot.pendingApprovals.length,
    // Generic brief input only. Instance-specific acquisition metrics are no
    // longer injected here; an instance that needs them supplies them via an
    // instance-declared brief augmentation.
    funnels: portfolioLoad.funnels,
    decisionSupport: portfolioLoad.decisionSupport,
    portfolio: portfolioLoad.portfolio,
    revenueSnapshots: portfolioLoad.revenueSnapshots,
    ...(portfolioLoad.portfolio.financial
      ? { portfolioFinancial: portfolioLoad.portfolio.financial }
      : {}),
    ceoDirectives,
    ceoDecisions,
    ...(topBundle?.briefDetail !== undefined
      ? { portfolioTopProjectBriefDetail: topBundle.briefDetail }
      : {}),
  };
  return generateDailyBrief(input);
}

/**
 * D8 / P0-1 — pending approvals from STRUCTURED records only. The previous
 * implementation regex-matched LLM-authored risk/opportunity descriptions
 * (/approval|approve|pending review|awaiting/i) to synthesize approvals —
 * non-auditable, and a risk that merely mentioned "approval" was counted. That
 * path is deleted. An approval is now a record with an explicit pending status:
 *   - ceo_decisions   open (decision_status = 'proposed')
 *   - task_proposals  status = 'proposed'
 *   - assigned_work   approval_status = 'proposed'
 * Filtering lives in the pure deriver (pending-approvals-core.ts); this reader
 * only fetches the rows. No free-text parsing. No schema change.
 */
async function collectPendingApprovals(
  repos: Repositories,
  projects: Awaited<ReturnType<Repositories['projects']['list']>>,
): Promise<PendingApproval[]> {
  const [decisions, proposals, proposedWork] = await Promise.all([
    listDecisions(),
    repos.taskProposals.listByStatus('proposed'),
    loadWorkMasterList({ approvalStatus: 'proposed' }),
  ]);

  // Display-only project name resolver (matches by id OR slug). Never gates the
  // count — that is decided purely by the structured status above.
  const nameByKey = new Map<string, string>();
  for (const p of projects) {
    nameByKey.set(p.id, p.name);
    nameByKey.set(p.slug, p.name);
  }

  return derivePendingApprovals({
    decisions: decisions.map((d) => ({
      id: d.id,
      title: d.decisionTitle,
      status: d.decisionStatus,
      projectKey: d.projectId,
    })),
    proposals: proposals.map((p) => ({
      id: p.id,
      title: p.payload.title,
      status: p.status,
    })),
    work: proposedWork.map((w) => ({
      id: w.id,
      title: w.title,
      approvalStatus: w.approvalStatus,
      sourceType: w.sourceType,
      projectKey: w.projectSlug,
    })),
    projectName: (key) => (key ? nameByKey.get(key) : undefined),
  });
}

function sevRank(s: 'low' | 'medium' | 'high' | 'critical') {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

/**
 * D6 confirmation signal — risk ids the CEO has explicitly accepted into
 * deterministic scoring via an existing ceo_decisions record. The link is the
 * decision's source_action_id (the action the decision was made on); an
 * APPROVED decision is the explicit acceptance. Reuses the decision record — no
 * new table, no write-time change, no schema change. Until a CEO confirms a
 * risk this way the set is empty and every executive risk stays advisory.
 */
function confirmedRiskIdsFromDecisions(
  decisions: Awaited<ReturnType<typeof listDecisions>>,
): Set<string> {
  const ids = new Set<string>();
  for (const d of decisions) {
    if (d.decisionStatus === 'approved' && d.sourceActionId) {
      ids.add(d.sourceActionId);
    }
  }
  return ids;
}
