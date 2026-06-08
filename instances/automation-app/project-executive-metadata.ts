import type { ProjectExecutiveMetadata } from '@ai-company/shared-types';

/**
 * Instance-layer project metadata consumed by the platform executives
 * (COO vendor health, VP Marketing channel hints, etc.). Keyed by project
 * slug. The platform package never names a vendor or a channel — it asks
 * this map via `registerInstanceProjectMetadata()` in
 * @ai-company/ai-chief-of-staff/context.ts.
 *
 * Missing slugs return `undefined` and executives default to neutral output.
 *
 * Beyond the platform contract (`getInstanceProjectMetadata`), this file also
 * documents the Automation App business model as instance-local constants
 * (CANDIDATE_AUTOMATIONS, CUSTOMER_SEGMENTS, MONETIZATION). These are not yet
 * read by the generic platform; they capture the product thesis for Phase 3
 * evidence work and keep the marketplace definition in the instance layer.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md leaks L2 + L3.
 */

/** A single buyable automation in the marketplace. */
export interface CandidateAutomation {
  slug: string;
  name: string;
  /** What the user hands the automation. */
  inputs: string[];
  /** What the automation hands back. */
  outputs: string[];
  /** One-line jobs-to-be-done framing. */
  jobToBeDone: string;
}

/** Marketplace model: open → choose → pay (IAP) → connect → run → result. */
export const MARKETPLACE_MODEL =
  'Open the app, browse a catalog of one-shot automations, choose one, pay a one-time in-app purchase, connect the accounts it needs, run it, and receive a concrete result.';

/** Five launch-candidate automations, each with explicit inputs/outputs. */
export const CANDIDATE_AUTOMATIONS: CandidateAutomation[] = [
  {
    slug: 'shopping-list-consolidation',
    name: 'Shopping-list consolidation',
    inputs: ['Notes / messages / reminders containing items to buy', 'Optional preferred store'],
    outputs: ['One deduplicated, categorized shopping list grouped by aisle'],
    jobToBeDone: 'Turn scattered "buy this" notes into a single clean list.',
  },
  {
    slug: 'receipt-scan-and-file',
    name: 'Receipt scan & file',
    inputs: ['Photos of paper receipts', 'Target folder or spreadsheet'],
    outputs: ['Extracted vendor/date/total per receipt', 'Filed digital copies + an expense summary'],
    jobToBeDone: 'Photograph receipts once; get them parsed and filed automatically.',
  },
  {
    slug: 'where-did-i-park',
    name: 'Where did I park',
    inputs: ['A saved location pin or photo when leaving the car'],
    outputs: ['A walking route back to the car', 'A reminder before parking expires'],
    jobToBeDone: 'Never lose the car in a big lot or unfamiliar city again.',
  },
  {
    slug: 'contact-de-dup',
    name: 'Contact de-dup',
    inputs: ['Access to the phone/cloud contacts list'],
    outputs: ['A merge plan for duplicate contacts', 'A cleaned, de-duplicated contact set on approval'],
    jobToBeDone: 'Collapse years of duplicate contacts without manual merging.',
  },
  {
    slug: 'downloads-sweeper',
    name: 'Downloads sweeper',
    inputs: ['Access to the Downloads / Files folder'],
    outputs: ['Files sorted into typed folders', 'A report of large/old files to delete'],
    jobToBeDone: 'Reclaim space and order from a chaotic Downloads folder.',
  },
];

/** Who buys these. */
export const CUSTOMER_SEGMENTS = [
  'Busy households running daily errands',
  'Freelancers / sole traders tracking expenses',
  'Phone-first power users with cluttered devices',
];

/** How the marketplace makes money. */
export const MONETIZATION = {
  model: 'in-app-purchase',
  description:
    'Each automation is a one-time in-app purchase; no subscription required pre-launch. Pricing per automation, validated post-launch.',
} as const;

const METADATA_BY_SLUG: Record<string, ProjectExecutiveMetadata> = {
  'automation-app': {
    // Pre-product: no live vendor integrations wired yet.
    vendors: [],
    marketingChannels: ['organic', 'social', 'paid', 'product'],
    salesChannels: ['app-store', 'in-app-purchase'],
    marketContext: `Consumer automation marketplace (pre-launch). ${MARKETPLACE_MODEL} Launch catalog: ${CANDIDATE_AUTOMATIONS.map(
      (a) => a.name,
    ).join(', ')}. Monetization: ${MONETIZATION.description}`,
  },
};

export function getInstanceProjectMetadata(
  projectSlug: string,
): ProjectExecutiveMetadata | undefined {
  return METADATA_BY_SLUG[projectSlug];
}
