/**
 * Research capability — Phase 2A Operational Validation Blocker Exception
 *
 * Lets an executive call a generic `research(query)` capability whose
 * implementation is supplied by the instance layer. The cognitive layer
 * never references a specific backend (no Anthropic.web_search,
 * Tavily.fetch, etc.). The capability is generic; the instance binds
 * the backend.
 *
 * Doctrine traceability:
 *   - Capability Abstraction: executives call `research`, never a vendor.
 *   - Platform Separation Axiom: backend selection lives in instances/.
 *   - Evidence Hierarchy: each fetched source carries `contentTier: 'E2'`.
 *   - Exception First: failures are recorded inline, not silently dropped.
 */

export interface ResearchQuery {
  /** What the executive is asking. Free-text. */
  query: string;
  /** Cap on results returned to the model. Default = 5. */
  maxResults?: number;
  /**
   * Optional domain restriction. If set, the backend SHOULD prefer these
   * hosts. Backends may treat this as a filter or a strong hint.
   */
  allowedDomains?: string[];
}

export interface ResearchSource {
  url: string;
  title: string | null;
  /** Verbatim snippet from the source that informs the executive's claim. */
  snippet: string;
  fetchedAt: string;
  /** Always E2: the source is an artifact. Claims about it are E0. */
  contentTier: 'E2';
  /** Optional human-readable citation tag (e.g. "[1]"). */
  citation: string | null;
}

export interface ResearchResult {
  /** Echo of the query so the caller can correlate concurrent calls. */
  query: string;
  sources: ResearchSource[];
  /** True if the result came from the backend's cache (no fresh fetch). */
  cached: boolean;
  /** When the result was returned to the executive. */
  retrievedAt: string;
  /** Set when the call failed; sources may still be partial. */
  error?: string;
}

/**
 * Generic contract every instance research backend implements. The
 * dashboard registers exactly one of these at platform boot via the
 * registry in @ai-company/ai-chief-of-staff.
 */
export interface ResearchCapability {
  /** Stable id for the backend (e.g. "anthropic-web-search", "tavily"). */
  readonly name: string;
  run(query: ResearchQuery): Promise<ResearchResult>;
}
