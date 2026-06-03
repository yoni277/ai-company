import type {
  BoardDigestOutput,
  ProjectHealth,
  RiskSeverity,
} from '@ai-company/shared-types';
import type { ExecutiveTeamInput } from './input';
import type { ExecutiveTeamLlmClient } from './llm-client';

const SEV_RANK: Record<RiskSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Deterministic Executive Team stand-in. Does genuine synthesis on the briefs:
 *   - convergence by project (how many executives flagged each project)
 *   - tensions by detecting CFO 'reduce' vs Marketing/Sales/CTO 'high-priority' on the same project
 *   - strategic moves built from the most cross-attributed priorities
 */
export class FakeExecutiveTeamLlmClient implements ExecutiveTeamLlmClient {
  async generate(input: ExecutiveTeamInput): Promise<BoardDigestOutput> {
    const briefs = input.briefs;
    const projectHealths = input.context.projects.map((p) => p.project.status);
    const companyVerdict: ProjectHealth = projectHealths.includes('critical')
      ? 'critical'
      : projectHealths.includes('at_risk')
        ? 'at_risk'
        : 'healthy';

    const executiveSnapshot = briefs.map((b) => ({
      executiveId: b.executiveId,
      displayName: b.displayName,
      headline: b.headline ?? '',
      health: (b.health ?? '') as ProjectHealth | '',
      topPriority: b.topPriorities[0]?.title ?? '',
    }));

    // Convergence: count which projects each executive flagged.
    type Bucket = {
      projectSlug: string;
      surfacedBy: Set<string>;
      severity: RiskSeverity;
      sampleNotes: string[];
    };
    const buckets = new Map<string, Bucket>();
    for (const b of briefs) {
      const flagged = new Map<string, RiskSeverity>();
      for (const f of b.flaggedProjects) {
        const prev = flagged.get(f.projectSlug);
        if (!prev || SEV_RANK[f.severity] > SEV_RANK[prev]) flagged.set(f.projectSlug, f.severity);
      }
      for (const [slug, severity] of flagged) {
        const bucket = buckets.get(slug) ?? {
          projectSlug: slug,
          surfacedBy: new Set<string>(),
          severity,
          sampleNotes: [] as string[],
        };
        bucket.surfacedBy.add(b.executiveId);
        if (SEV_RANK[severity] > SEV_RANK[bucket.severity]) bucket.severity = severity;
        const note = b.flaggedProjects.find((f) => f.projectSlug === slug)?.note;
        if (note && bucket.sampleNotes.length < 2) bucket.sampleNotes.push(note);
        buckets.set(slug, bucket);
      }
    }

    const convergentThemes: BoardDigestOutput['convergentThemes'] = Array.from(buckets.values())
      .filter((b) => b.surfacedBy.size >= 2)
      .sort(
        (a, b) =>
          b.surfacedBy.size - a.surfacedBy.size || SEV_RANK[b.severity] - SEV_RANK[a.severity],
      )
      .slice(0, 5)
      .map((b) => ({
        theme: b.sampleNotes[0] ?? `${b.projectSlug}: cross-functional concern`,
        affectedProjects: [b.projectSlug],
        surfacedBy: Array.from(b.surfacedBy),
        severity: b.severity,
      }));

    // Tensions: CFO 'reduce' vs another executive recommending high on the same project.
    const tensions: BoardDigestOutput['tensions'] = [];
    const cfoBrief = briefs.find((b) => b.executiveId === 'cfo');
    if (cfoBrief) {
      const cfoReductions = cfoBrief.recommendations
        .filter((r) => r.action === 'reduce')
        .map((r) => r.projectSlug);
      for (const slug of cfoReductions) {
        const others = briefs.filter(
          (b) =>
            b.executiveId !== 'cfo' &&
            b.recommendations.some(
              (r) =>
                r.projectSlug === slug &&
                (r.action === 'high' || r.action === 'invest' || r.action === 'open'),
            ),
        );
        if (others.length > 0) {
          tensions.push({
            title: `Capital trade-off on ${slug}`,
            description: `CFO recommends reducing spend while ${others
              .map((o) => o.displayName)
              .join(', ')} recommend(s) increasing investment.`,
            parties: [
              { executiveId: 'cfo', position: 'reduce' },
              ...others.map((o) => ({
                executiveId: o.executiveId,
                position: o.recommendations.find((r) => r.projectSlug === slug)?.action ?? 'invest',
              })),
            ],
            recommendedResolution:
              'Time-box a 2-week experiment to validate the higher-investment thesis before reducing run-rate.',
          });
        }
      }
    }

    // Strategic moves: priorities that appear similarly across multiple executives.
    type MoveCandidate = {
      title: string;
      contributors: Set<string>;
      rationale: string;
    };
    const moveCandidates: MoveCandidate[] = [];
    for (const b of briefs) {
      for (const p of b.topPriorities) {
        const projectMentioned = input.context.projects
          .map((proj) => proj.project.slug)
          .find((slug) => p.title.includes(slug));
        const key = projectMentioned ? `proj:${projectMentioned}` : `title:${p.title.slice(0, 32)}`;
        const existing = moveCandidates.find((c) => c.title === key);
        if (existing) {
          existing.contributors.add(b.executiveId);
        } else {
          moveCandidates.push({
            title: key,
            contributors: new Set([b.executiveId]),
            rationale: p.rationale,
          });
        }
      }
    }
    const strategicMoves: BoardDigestOutput['strategicMoves'] = moveCandidates
      .sort((a, b) => b.contributors.size - a.contributors.size)
      .slice(0, 5)
      .map((c, i) => ({
        rank: i + 1,
        title: c.title.startsWith('proj:')
          ? `Cross-functional push on ${c.title.slice(5)}`
          : c.title.slice(6),
        rationale:
          c.contributors.size > 1
            ? `Supported by ${c.contributors.size} executives. ${c.rationale}`
            : c.rationale,
        contributingExecutives: Array.from(c.contributors),
      }));

    // Open questions: derive from tensions + missing executives.
    const ceoOpenQuestions: string[] = [];
    if (tensions.length > 0) {
      ceoOpenQuestions.push(
        `Resolve capital tension on ${tensions[0]!.title.replace(/^Capital trade-off on /, '')}: invest or reduce?`,
      );
    }
    const missingExecs = briefs.filter((b) => !b.headline).map((b) => b.displayName);
    if (missingExecs.length > 0) {
      ceoOpenQuestions.push(
        `Stale or missing reports for: ${missingExecs.join(', ')}. Trigger a sync or accept the gap?`,
      );
    }
    const criticalProjects = input.context.projects.filter((p) => p.project.status === 'critical');
    if (criticalProjects.length > 0) {
      ceoOpenQuestions.push(
        `Project(s) currently CRITICAL: ${criticalProjects.map((p) => p.project.slug).join(', ')}. Authorize an exec-on-point?`,
      );
    }

    const presentBriefs = briefs.filter((b) => !!b.headline).length;
    const headline =
      companyVerdict === 'critical'
        ? `Board read: company status CRITICAL. ${presentBriefs}/${briefs.length} executives reporting, ${convergentThemes.length} convergent theme(s), ${tensions.length} tension(s).`
        : companyVerdict === 'at_risk'
          ? `Board read: company at risk. ${presentBriefs}/${briefs.length} executives reporting, ${convergentThemes.length} convergent theme(s), ${tensions.length} tension(s).`
          : `Board read: company healthy. ${presentBriefs}/${briefs.length} executives reporting, ${convergentThemes.length} convergent theme(s), ${tensions.length} tension(s).`;

    return {
      headline,
      companyVerdict,
      executiveSnapshot,
      convergentThemes,
      tensions,
      strategicMoves,
      ceoOpenQuestions,
      generatedAt: new Date().toISOString(),
    };
  }
}
