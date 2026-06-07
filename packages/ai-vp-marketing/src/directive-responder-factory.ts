import type { CEODirective } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import {
  type DirectiveResponder,
  transformProposalsToProposals,
} from '@ai-company/ai-chief-of-staff';
import { VP_MARKETING_ID, VpMarketing, runVpMarketingBriefing } from './executive';

export function createVpMarketingDirectiveResponder(
  vp: VpMarketing,
): DirectiveResponder {
  return {
    executiveId: VP_MARKETING_ID,
    async run(
      repos: Repositories,
      directive: CEODirective,
      activeDirectives: CEODirective[],
    ): Promise<string> {
      const result = await runVpMarketingBriefing(repos, vp, 'ad_hoc', {
        focusDirective: directive,
        activeDirectives,
      });

      // P005 — Directive → Task fan-out. The transformer is a no-op when
      // proposedTasks is absent/empty or the directive lacks an objectiveId.
      // We deliberately swallow transformer errors so the report id is
      // still returned: task creation is observability-grade, not the
      // contract of the responder. The transformer's own warnings are
      // logged for diagnostic purposes.
      try {
        const outcome = await transformProposalsToProposals(repos, {
          directive,
          sourceExecutiveId: VP_MARKETING_ID,
          proposals: result.output.proposedTasks,
        });
        if (outcome.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[vp-marketing] task fan-out warnings: ${outcome.warnings.join(' | ')}`,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[vp-marketing] task fan-out failed', err);
      }

      return result.report.id;
    },
  };
}
