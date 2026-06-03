import type { DataConnector } from '@ai-company/shared-types';

/**
 * Holds the set of active connectors for a process. Project-agnostic;
 * the registry never imports a specific connector.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, DataConnector>();

  register(connector: DataConnector): void {
    if (this.connectors.has(connector.name)) {
      throw new Error(`Connector "${connector.name}" already registered`);
    }
    this.connectors.set(connector.name, connector);
  }

  registerMany(connectors: DataConnector[]): void {
    for (const c of connectors) this.register(c);
  }

  list(): DataConnector[] {
    return [...this.connectors.values()];
  }

  filter(names: string[] | undefined): DataConnector[] {
    if (!names || names.length === 0) return this.list();
    const set = new Set(names);
    return this.list().filter((c) => set.has(c.name));
  }

  get(name: string): DataConnector | undefined {
    return this.connectors.get(name);
  }

  size(): number {
    return this.connectors.size;
  }
}
