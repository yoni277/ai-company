import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type {
  ResearchCapability,
  ResearchQuery,
  ResearchResult,
  ResearchSource,
} from '@ai-company/shared-types';

/**
 * Phase 2A — yoni-company instance research backend.
 *
 * Uses Anthropic's built-in `web_search_20250305` server-side tool to do the
 * actual fetching. The cognitive layer (VP Marketing's anthropic-llm-client)
 * never names Anthropic; it asks the platform registry for a capability
 * called `research`. The dashboard registers THIS class instance under that
 * name at boot. Swapping to Tavily / Brave / Exa later is one file change.
 *
 * In-memory cache: 24h TTL keyed by `{query}|{maxResults}|{allowedDomains}`.
 * Avoids re-fetching when VP Marketing retries during a credit error.
 * Phase 2B candidate: persist the cache to Supabase if cross-process reuse
 * becomes a friction signal.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  storedAt: number;
  result: ResearchResult;
}

export class AnthropicWebSearchResearchCapability implements ResearchCapability {
  readonly name = 'research';

  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(config: { apiKey: string; model?: string; maxTokens?: number }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async run(query: ResearchQuery): Promise<ResearchResult> {
    const cacheKey = this.cacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
      return { ...cached.result, cached: true, retrievedAt: new Date().toISOString() };
    }

    const maxUses = Math.min(Math.max(query.maxResults ?? 5, 1), 10);

    // Anthropic's web_search_20250305 is a server-managed tool. We ask the
    // model to perform the search by emitting a minimal prompt that names
    // the query and any domain restriction; the SDK handles fetching.
    const userInstruction = [
      `Search the web for: ${query.query}`,
      query.allowedDomains && query.allowedDomains.length > 0
        ? `Prefer results from these domains: ${query.allowedDomains.join(', ')}.`
        : '',
      `Return concise factual snippets from the most relevant ${maxUses} results.`,
      'Do not invent. Cite the URL inline next to each fact.',
    ]
      .filter(Boolean)
      .join('\n');

    let result: ResearchResult;
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: maxUses,
            ...(query.allowedDomains && query.allowedDomains.length > 0
              ? { allowed_domains: query.allowedDomains }
              : {}),
          } as unknown as Anthropic.Tool,
        ],
        messages: [{ role: 'user', content: userInstruction }],
      });

      const sources = extractSources(response.content);
      result = {
        query: query.query,
        sources,
        cached: false,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        query: query.query,
        sources: [],
        cached: false,
        retrievedAt: new Date().toISOString(),
        error: message,
      };
    }

    this.cache.set(cacheKey, { storedAt: Date.now(), result });
    return result;
  }

  private cacheKey(q: ResearchQuery): string {
    return JSON.stringify({
      q: q.query,
      n: q.maxResults ?? 5,
      d: (q.allowedDomains ?? []).slice().sort(),
    });
  }
}

/**
 * Walk the Anthropic response content blocks looking for citation /
 * web-search-tool-result entries and lift them into ResearchSource[].
 *
 * The exact block shape from web_search_20250305 includes
 * `tool_use` + `web_search_tool_result` blocks where each result has
 * url, title, and a snippet/encrypted_content. We pull the visible fields
 * and ignore encrypted_content (the model already used it internally).
 *
 * Plain text blocks contribute synthesized commentary; we capture URL
 * citations attached to text blocks too.
 */
function extractSources(content: Anthropic.ContentBlock[]): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const now = new Date().toISOString();
  for (const block of content) {
    const b = block as unknown as Record<string, unknown>;
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const item of b.content as Array<Record<string, unknown>>) {
        if (typeof item.url !== 'string') continue;
        sources.push({
          url: item.url,
          title: typeof item.title === 'string' ? item.title : null,
          snippet:
            typeof item.snippet === 'string'
              ? item.snippet
              : typeof item.text === 'string'
                ? item.text
                : '',
          fetchedAt: now,
          contentTier: 'E2',
          citation: null,
        });
      }
    }
    // Text blocks with citations attached
    if (b.type === 'text' && Array.isArray(b.citations)) {
      for (const c of b.citations as Array<Record<string, unknown>>) {
        if (typeof c.url !== 'string') continue;
        sources.push({
          url: c.url,
          title: typeof c.title === 'string' ? c.title : null,
          snippet: typeof c.cited_text === 'string' ? c.cited_text : '',
          fetchedAt: now,
          contentTier: 'E2',
          citation: null,
        });
      }
    }
  }
  // Dedupe by URL — same source may surface in both tool-result and citation blocks.
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}
