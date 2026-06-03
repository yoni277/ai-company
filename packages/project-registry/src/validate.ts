import type {
  ProjectRegistryValidationIssue,
  ProjectRegistryValidationResult,
  RegisteredProject,
} from '@ai-company/shared-types';

/** Deterministic registry validation. No AI. No LLM. */
export function validateProjectRegistry(projects: RegisteredProject[]): ProjectRegistryValidationResult {
  const issues: ProjectRegistryValidationIssue[] = [];
  const slugs = new Set<string>();

  for (const p of projects) {
    const slug = p.definition.slug;
    if (slugs.has(slug)) {
      issues.push({
        code: 'DUPLICATE_SLUG',
        message: `Duplicate project slug: ${slug}`,
        projectSlug: slug,
      });
    }
    slugs.add(slug);

    if (!p.definition.enabled) continue;

    if (p.funnel.stages.length === 0) {
      issues.push({
        code: 'NO_FUNNEL_STAGES',
        message: `Project ${slug} has no funnel stages`,
        projectSlug: slug,
      });
    }

    const orders = p.funnel.stages.map((s) => s.order);
    if (new Set(orders).size !== orders.length) {
      issues.push({
        code: 'DUPLICATE_STAGE_ORDER',
        message: `Project ${slug} has duplicate stage order values`,
        projectSlug: slug,
      });
    }

    if (!p.connector.connectorType) {
      issues.push({
        code: 'MISSING_CONNECTOR',
        message: `Project ${slug} has no connector type`,
        projectSlug: slug,
      });
    }

    if (p.connector.connectorType === 'mock-funnel') {
      for (const stage of p.funnel.stages) {
        if ((p.funnel.mockStageCounts[stage.id] ?? 0) < 0) {
          issues.push({
            code: 'INVALID_MOCK_COUNT',
            message: `Project ${slug} stage ${stage.id} has negative mock count`,
            projectSlug: slug,
          });
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
