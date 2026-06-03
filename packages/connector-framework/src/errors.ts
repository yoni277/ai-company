export class ConnectorError extends Error {
  constructor(
    public readonly connectorName: string,
    public readonly step: 'getStatus' | 'getMetrics' | 'getRisks' | 'getOpportunities' | 'healthCheck',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${connectorName}:${step}] ${message}`);
    this.name = 'ConnectorError';
  }
}

export class ConnectorTimeoutError extends ConnectorError {
  constructor(connectorName: string, step: ConnectorError['step'], timeoutMs: number) {
    super(connectorName, step, `timed out after ${timeoutMs}ms`);
    this.name = 'ConnectorTimeoutError';
  }
}
