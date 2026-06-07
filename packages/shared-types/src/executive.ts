import type { Project, ProjectHealth } from './projects';
import type { ProjectMetric } from './metrics';
import type { Risk } from './risks';
import type { Opportunity } from './opportunities';
import type { ReportType } from './reports';
import type { MarketingChannel } from './marketing';
import type { CEODirective } from './ceo-operating-system';

/**
 * Project-level metadata that executives consume but the platform itself
 * cannot generate (it would have to know about a specific company to do so).
 * Populated by the instance layer via a registered provider — see
 * `registerInstanceProjectMetadata` in @ai-company/ai-chief-of-staff.
 *
 * All fields are optional. Missing or empty fields mean the executive falls
 * back to neutral generic language; the platform never infers vendor or
 * channel hints from a project slug or name.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md leaks L2 + L3.
 */
export interface ProjectExecutiveMetadata {
  /** Vendor or integration partners associated with the project. */
  vendors?: Array<{
    name: string;
    /** Optional regex source string — matches metric names that signal this vendor's health. */
    metricHint?: string;
  }>;
  /** Marketing channels the project relies on, ordered by preference. */
  marketingChannels?: MarketingChannel[];
  /** Sales channels the project relies on, ordered by preference. */
  salesChannels?: string[];
  /** Free-form market or geographic context (e.g. "Israeli SMB", "US enterprise"). */
  marketContext?: string;
}

/**
 * Cross-project, normalized view that every executive consumes as input.
 *
 * Build only via packages/ai-chief-of-staff/context.ts so the LLM input
 * surface stays uniform across executive roles.
 */
export interface CompanyContext {
  generatedAt: string;
  projects: Array<{
    project: Project;
    latestMetrics: ProjectMetric[];
    openRisks: Risk[];
    openOpportunities: Opportunity[];
    freshnessHours: number | null;
    /**
     * Instance-supplied metadata (vendors, marketing/sales channels, market
     * context). Optional — undefined when the instance layer has not
     * registered a provider for this project. Executives must default to
     * neutral output when missing.
     */
    metadata?: ProjectExecutiveMetadata;
  }>;
  rollup: {
    companyHealth: ProjectHealth;
    openRiskCount: number;
    openOpportunityCount: number;
  };
  /**
   * The full set of currently-active CEO directives. Every executive sees
   * these and is expected to weigh them when forming priorities. Empty array
   * if none. Distinct from `focusDirective`, which singles out the one
   * directive that triggered this run (if any).
   */
  activeDirectives?: CEODirective[];
  /**
   * Present when this context was built specifically to respond to a single
   * CEO directive (directive fan-out). The executive should treat it as the
   * primary question to answer in its output. Undefined for normal daily /
   * weekly briefings.
   */
  focusDirective?: CEODirective;
}

export interface Executive<TOutput = unknown> {
  readonly id: string;
  readonly displayName: string;
  readonly reportTypes: ReportType[];
  generateReport(ctx: CompanyContext, reportType: ReportType): Promise<TOutput>;
}
