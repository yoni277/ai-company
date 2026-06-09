/**
 * P005 — Shared schema fragment for the optional `proposedTasks` field every
 * AI executive's structured output may emit. Single source of truth so all
 * six executives describe the field with identical wording — the platform's
 * generic transformer reads the field the same way regardless of role.
 *
 * Intentionally NOT exported as a TypeScript interface (it lives on each
 * executive's output type) — this string is only for LLM prompt schemas.
 */
export const proposedTasksSchemaText = `
  // P005 / EPIC-004A — Directive → Task fan-out. When this report is responding
  // to a CEO directive (a focusDirective is present), this field is REQUIRED:
  // emit 1-3 concrete tasks (the platform reads ONLY this structured field,
  // never prose). When NOT responding to a directive, omit it. If a directive
  // truly needs no new build work, still return exactly ONE task describing the
  // review/confirmation step so the directive is tracked on the work spine.
  //
  // Each capabilityRequired is a deterministic capability slug (e.g.
  // 'send_message', 'publish_post', 'analyze_funnel', 'review_design',
  // 'audit_pipeline'). Never a vendor name. The instance layer maps the
  // slug to a concrete connector at execution time.
  proposedTasks?: Array<{
    title: string;                   // <= 80 chars, imperative voice
    description?: string;            // 1-3 sentences explaining what to do
    capabilityRequired: string;      // deterministic capability slug
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;              // non-negative integer
  }>;
`.trim();
