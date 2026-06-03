export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'monitoring' | 'mitigated' | 'accepted';

export interface Risk {
  id: string;
  projectId: string;
  severity: RiskSeverity;
  description: string;
  source: string;
  status: RiskStatus;
  createdAt: string;
}

export interface RiskCandidate {
  severity: RiskSeverity;
  description: string;
}
