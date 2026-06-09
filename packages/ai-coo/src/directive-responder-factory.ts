import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import {
  type DirectiveResponder,
  transformProposalsToProposals,
} from '@ai-company/ai-chief-of-staff';
import { COO_ID, Coo, runCooBriefing } from './executive';

export function createCooDirectiveResponder(coo: Coo): DirectiveResponder {
  return {
    executiveId: COO_ID,
    async run(
      repos: Repositories,
      directive: CEODirective,
      activeDirectives: CEODirective[],
    ): Promise<string> {
      const result = await runCooBriefing(repos, coo, 'ad_hoc', {
        focusDirective: directive,
        activeDirectives,
      });
      try {
        const outcome = await transformProposalsToProposals(repos, {
          directive,
          sourceExecutiveId: COO_ID,
          proposals: result.output.proposedTasks,
          synthesizeFallback: true,
        });
        // EPIC-004A — surface the zero/skip case: never a silent "done".
        if (outcome.kind !== 'persisted') {
          // eslint-disable-next-line no-console
          console.warn(`[coo] directive ${directive.id} produced no spine work (${outcome.kind})`);
        }
        if (outcome.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[coo] task fan-out warnings: ${outcome.warnings.join(' | ')}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[coo] task fan-out failed', err);
      }
      return result.report.id;
    },
  };
}
