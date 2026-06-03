import { analyzeFunnel } from '@ai-company/business-funnel-engine';
import { generateDecisionSupport } from '@ai-company/decision-support-engine';
import type {
  FunnelDefinition,
  FunnelSnapshot,
  ProjectIntelligenceBundle,
} from '@ai-company/shared-types';

/** Future projects: add FunnelDefinition + mock/live counts here. */
export const LAB_OS_FUNNEL: FunnelDefinition = {
  projectId: 'lab-os',
  projectName: 'Lab-OS',
  stages: [
    { id: 'lead', label: 'Lead', order: 0 },
    { id: 'demo', label: 'Demo', order: 1 },
    { id: 'pilot', label: 'Pilot', order: 2 },
    { id: 'subscribed', label: 'Subscribed', order: 3 },
    { id: 'active', label: 'Active', order: 4 },
  ],
};

export const INVENTORY_FUNNEL: FunnelDefinition = {
  projectId: 'inventory-engine',
  projectName: 'Inventory Engine',
  stages: [
    { id: 'lead', label: 'Lead', order: 0 },
    { id: 'trial', label: 'Trial', order: 1 },
    { id: 'active', label: 'Active', order: 2 },
  ],
};

export const BURGERSTOP_FUNNEL: FunnelDefinition = {
  projectId: 'burgerstop',
  projectName: 'BurgerStop',
  stages: [
    { id: 'lead', label: 'Lead', order: 0 },
    { id: 'meeting', label: 'Meeting', order: 1 },
    { id: 'proposal', label: 'Proposal', order: 2 },
    { id: 'signed', label: 'Signed', order: 3 },
    { id: 'operating', label: 'Operating', order: 4 },
  ],
};

function bundleFromFunnel(funnel: FunnelSnapshot, live: boolean): ProjectIntelligenceBundle {
  const decision = generateDecisionSupport(funnel);
  const bn = funnel.health.mainBottleneck;
  const largestDropOff = [...funnel.health.dropOffs].sort(
    (a, b) => b.lostCount - a.lostCount,
  )[0];
  return {
    projectId: funnel.projectId,
    projectName: funnel.projectName,
    live,
    funnelStatus: funnel.health.status,
    bottleneckLabel: bn ? `${bn.fromLabel} → ${bn.toLabel}` : null,
    bottleneckRate: bn?.rate ?? null,
    largestDropOffCount: largestDropOff?.lostCount ?? 0,
    decisionActions: decision.actions,
  };
}

/** Placeholder counts until Lab-OS connector ships. */
export function labOsPlaceholderBundle(): ProjectIntelligenceBundle {
  const funnel = analyzeFunnel(LAB_OS_FUNNEL, {
    lead: 18,
    demo: 12,
    pilot: 8,
    subscribed: 6,
    active: 5,
  });
  return bundleFromFunnel(funnel, false);
}

export function inventoryEnginePlaceholderBundle(): ProjectIntelligenceBundle {
  const funnel = analyzeFunnel(INVENTORY_FUNNEL, {
    lead: 9,
    trial: 6,
    active: 4,
  });
  return bundleFromFunnel(funnel, false);
}

export function burgerStopPlaceholderBundle(): ProjectIntelligenceBundle {
  const funnel = analyzeFunnel(BURGERSTOP_FUNNEL, {
    lead: 6,
    meeting: 5,
    proposal: 4,
    signed: 3,
    operating: 3,
  });
  return bundleFromFunnel(funnel, false);
}
