/**
 * D061 / P056.2 — Executive OS UI design-system primitives (Wave 1A).
 * Built bottom-up on the P056.1 tokens; a11y + RTL baked into every leaf.
 * Contract: docs/design/d061-ui-redesign/05-data-mapping-confirmed.md
 */
export { StatusBadge, DataTag, healthStateFromFunnel } from './StatusBadge';
export type { HealthState, DataProvenance } from './StatusBadge';
export { ActionButton } from './ActionButton';
export type { ButtonVariant } from './ActionButton';
export { ActivityFeed } from './ActivityFeed';
export type { ActivityItem } from './ActivityFeed';
export { SearchBar } from './SearchBar';
export { Surface } from './Surface';
export { DecisionCard } from './DecisionCard';
export type { DecisionCardProps } from './DecisionCard';
export { RecommendationCard } from './RecommendationCard';
export type { RecommendationCardProps } from './RecommendationCard';
export { RiskCard } from './RiskCard';
export type { RiskCardProps } from './RiskCard';
export { ProjectCard } from './ProjectCard';
export type { ProjectCardProps } from './ProjectCard';
export { BusinessCard } from './BusinessCard';
export type { BusinessCardProps, BusinessFunnelStageView } from './BusinessCard';
export { AIChiefOfStaffPanel } from './AIChiefOfStaffPanel';
export type { BriefingSignal, BriefingMetric } from './AIChiefOfStaffPanel';
