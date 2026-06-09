import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import {
  type DirectiveResponder,
  transformProposalsToProposals,
} from '@ai-company/ai-chief-of-staff';
import { VP_SALES_ID, VpSales, runVpSalesBriefing } from './executive';

export function createVpSalesDirectiveResponder(vp: VpSales): DirectiveResponder {
  return {
    executiveId: VP_SALES_ID,
    async run(
      repos: Repositories,
      directive: CEODirective,
      activeDirectives: CEODirective[],
    ): Promise<string> {
      const result = await runVpSalesBriefing(repos, vp, 'ad_hoc', {
        focusDirective: directive,
        activeDirectives,
      });
      try {
        const outcome = await transformProposalsToProposals(repos, {
          directive,
          sourceExecutiveId: VP_SALES_ID,
          proposals: result.output.proposedTasks,
          synthesizeFallback: true,
        });
        // EPIC-004A — surface the zero/skip case: never a silent "done".
        if (outcome.kind !== 'persisted') {
          // eslint-disable-next-line no-console
          console.warn(`[vp-sales] directive ${directive.id} produced no spine work (${outcome.kind})`);
        }
        if (outcome.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[vp-sales] task fan-out warnings: ${outcome.warnings.join(' | ')}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[vp-sales] task fan-out failed', err);
      }
      return result.report.id;
    },
  };
}
