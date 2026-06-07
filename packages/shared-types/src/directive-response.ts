import type { ExecutiveId } from './ceo-operating-system';

/** Lifecycle of a (directive, executive) fan-out row. */
export type DirectiveResponseStatus = 'pending' | 'running' | 'done' | 'error';

/**
 * One queued response from a single AI executive to a single CEO directive.
 * The pair (directiveId, executiveId) is unique — re-running the same fan-out
 * mutates the row in place rather than appending.
 *
 * `executiveReportId` is null until status transitions to 'done'. `errorMessage`
 * is null until status transitions to 'error'. Both can outlive a transient
 * 'running' state — the worker is expected to clear them when it succeeds on
 * a retry.
 */
export interface DirectiveResponseRecord {
  id: string;
  directiveId: string;
  /**
   * Plain string, not the ExecutiveId union — the queue worker should treat
   * this as opaque data and dispatch through DirectiveResponderRegistry rather
   * than a switch over known executive ids. New executive packages can register
   * additional ids without the platform queue learning their names.
   */
  executiveId: string;
  status: DirectiveResponseStatus;
  executiveReportId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueDirectiveResponseInput {
  directiveId: string;
  executiveId: ExecutiveId | string;
}

/** Patch applied by the worker as it transitions a row through its lifecycle. */
export interface UpdateDirectiveResponseInput {
  status?: DirectiveResponseStatus;
  executiveReportId?: string | null;
  errorMessage?: string | null;
}
