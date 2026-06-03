import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';

/**
 * The AI Executive Team's structured output — a meta-report that synthesizes the
 * latest report from every other executive. This is the first inter-executive
 * contract: the team reads other executives' outputs, not the connector data.
 *
 * It surfaces three things no single executive can:
 *   - convergence (multiple executives flag the same project / theme)
 *   - tension (executives disagree — e.g. CFO 'reduce' vs Marketing 'invest')
 *   - executive-level open questions the CEO needs to decide
 */
export interface BoardDigestOutput {
  headline: string;
  companyVerdict: ProjectHealth;

  /** Per-executive snapshot — one row per active executive. */
  executiveSnapshot: Array<{
    executiveId: string;
    displayName: string;
    headline: string;
    /** Empty string when the executive has not produced a report yet. */
    health: ProjectHealth | '';
    topPriority: string;
  }>;

  /** Themes flagged by 2+ executives at once. */
  convergentThemes: Array<{
    theme: string;
    affectedProjects: string[];
    surfacedBy: string[]; // executive ids
    severity: RiskSeverity;
  }>;

  /** Recommendations that conflict across executives. */
  tensions: Array<{
    title: string;
    description: string;
    parties: Array<{ executiveId: string; position: string }>;
    recommendedResolution: string;
  }>;

  /** Top board-level moves, ranked. Synthesized from per-executive priorities. */
  strategicMoves: Array<{
    rank: number;
    title: string;
    rationale: string;
    contributingExecutives: string[];
  }>;

  /** Decisions the synthesis can't make on its own — the CEO has to. */
  ceoOpenQuestions: string[];

  generatedAt: string;
}
