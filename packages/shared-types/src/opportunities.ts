export type OpportunityPriority = 'low' | 'medium' | 'high';

export interface Opportunity {
  id: string;
  projectId: string;
  priority: OpportunityPriority;
  description: string;
  source: string;
  createdAt: string;
}

export interface OpportunityCandidate {
  priority: OpportunityPriority;
  description: string;
}
