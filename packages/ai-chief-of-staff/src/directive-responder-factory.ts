import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import type { DirectiveResponder } from './directive-responder';
import { CHIEF_OF_STAFF_ID, ChiefOfStaff, runBriefing } from './executive';
import { transformProposalsToProposals } from './task-generation';

/**
 * Bind a ChiefOfStaff instance to the platform DirectiveResponder contract.
 * Called by the dashboard's platform module after `buildDefaultChiefOfStaff()`.
 * The responder runs an ad-hoc briefing focused on the directive and returns
 * the resulting executive_reports row id.
 */
export function createChiefOfStaffDirectiveResponder(
  chief: ChiefOfStaff,
): DirectiveResponder {
  return {
    executiveId: CHIEF_OF_STAFF_ID,
    async run(
      repos: Repositories,
      directive: CEODirective,
      activeDirectives: CEODirective[],
    ): Promise<string> {
      const result = await runBriefing(repos, chief, 'ad_hoc', {
        focusDirective: directive,
        activeDirectives,
      });

      // P005A — Directive → TaskProposal. CEO promotes via /api/proposals/[id]/promote.
      try {
        const outcome = await transformProposalsToProposals(repos, {
          directive,
          sourceExecutiveId: CHIEF_OF_STAFF_ID,
          proposals: result.output.proposedTasks,
        });
        if (outcome.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[chief-of-staff] proposal fan-out warnings: ${outcome.warnings.join(' | ')}`,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[chief-of-staff] proposal fan-out failed', err);
      }

      return result.report.id;
    },
  };
}
