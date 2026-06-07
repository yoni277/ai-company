import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';

/**
 * Generic contract every AI executive package implements so that the platform
 * directive fan-out can dispatch to it without knowing its name or its
 * internal call shape.
 *
 * The queue worker only sees this interface. It looks up a responder by
 * `executiveId` (treated as opaque data, sourced from the
 * `directive_responses.executive_id` column) and calls `run`. There is no
 * `switch (executiveId) { case 'cfo': ... }` anywhere in the platform.
 *
 * Adding a new AI executive — for AI-Law-Firm, AI-Real-Estate, etc. — means
 * publishing a new package that registers a responder. No platform code change.
 */
export interface DirectiveResponder {
  /**
   * Stable identifier this responder claims. Mirrors the executive's own id
   * constant (CHIEF_OF_STAFF_ID, CTO_ID, etc.) but the registry never
   * interprets the string — it is a lookup key only.
   */
  readonly executiveId: string;

  /**
   * Produce one executive_reports row whose `source_directive_id` equals
   * `directive.id`. Return the id of that row. Throwing is permitted — the
   * worker will catch and mark the directive_responses row as `error`.
   *
   * `activeDirectives` is the full set of currently-active CEO directives
   * the responder may surface as background context. The responder MUST treat
   * `directive` as the primary topic.
   */
  run(
    repos: Repositories,
    directive: CEODirective,
    activeDirectives: CEODirective[],
  ): Promise<string>;
}

const REGISTRY = new Map<string, DirectiveResponder>();

/**
 * Self-registration entry point for executive packages. Idempotent —
 * re-registering replaces the previous responder for that id. Called at
 * module load by the dashboard's platform.ts (after each executive instance
 * is built) or directly by side-effecting `import`s if a package chooses to
 * bind to its default executive instance at import time.
 */
export function registerDirectiveResponder(responder: DirectiveResponder): void {
  REGISTRY.set(responder.executiveId, responder);
}

/** Lookup used by the queue worker. Returns undefined for unknown ids. */
export function getDirectiveResponder(
  executiveId: string,
): DirectiveResponder | undefined {
  return REGISTRY.get(executiveId);
}

/** Diagnostic — list of registered executive ids in registration order. */
export function listRegisteredResponders(): string[] {
  return Array.from(REGISTRY.keys());
}

/** Test-only — wipe the registry. */
export function __resetDirectiveResponders(): void {
  REGISTRY.clear();
}
