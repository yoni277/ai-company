import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import {
  type DirectiveResponder,
  transformProposalsToProposals,
} from '@ai-company/ai-chief-of-staff';
import { CTO_ID, Cto, runCtoBriefing } from './executive';

export function createCtoDirectiveResponder(cto: Cto): DirectiveResponder {
  return {
    executiveId: CTO_ID,
    async run(
      repos: Repositories,
      directive: CEODirective,
      activeDirectives: CEODirective[],
    ): Promise<string> {
      const result = await runCtoBriefing(repos, cto, 'ad_hoc', {
        focusDirective: directive,
        activeDirectives,
      });
      try {
        const outcome = await transformProposalsToProposals(repos, {
          directive,
          sourceExecutiveId: CTO_ID,
          proposals: result.output.proposedTasks,
        });
        if (outcome.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[cto] task fan-out warnings: ${outcome.warnings.join(' | ')}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[cto] task fan-out failed', err);
      }
      return result.report.id;
    },
  };
}
