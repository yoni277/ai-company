import type { CompanyContext } from '@ai-company/shared-types';

/**
 * Prompt fragment that every executive prepends to its LLM input so that
 * active CEO directives and any focusDirective are visible to the model.
 *
 * Returns an empty string when there is nothing to inject — callers can
 * always concatenate without a conditional.
 *
 * The wording is deliberately strong on the focusDirective case because that
 * code path is invoked when the operator has explicitly asked this executive
 * to answer a single, named question.
 */
export function buildDirectiveSection(ctx: CompanyContext): string {
  const lines: string[] = [];

  if (ctx.focusDirective) {
    const d = ctx.focusDirective;
    lines.push('## PRIMARY QUESTION FROM THE CEO');
    lines.push(
      `The CEO has explicitly asked you to address this directive in this report. Treat it as the main topic — your output\'s priorities, summary, and recommended actions must directly respond to it.`,
    );
    lines.push(`- Title: ${d.title}`);
    lines.push(`- Directive: ${d.directive}`);
    lines.push(`- Category: ${d.category} · Priority: ${d.priority}`);
    if (d.targetProjectId) lines.push(`- Target project: ${d.targetProjectId}`);
    if (d.isOverride) lines.push('- Marked as a strategic OVERRIDE.');
    if (d.expiresAt) lines.push(`- Expires: ${d.expiresAt}`);
    lines.push('');
  }

  const others = (ctx.activeDirectives ?? []).filter(
    (d) => d.id !== ctx.focusDirective?.id,
  );
  if (others.length > 0) {
    lines.push('## OTHER ACTIVE CEO DIRECTIVES (for context)');
    for (const d of others) {
      const override = d.isOverride ? ' [OVERRIDE]' : '';
      const target = d.targetProjectId ? ` (${d.targetProjectId})` : '';
      lines.push(`- ${d.title}${override}${target}: ${d.directive}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
