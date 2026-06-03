import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RegisteredProject } from '@ai-company/shared-types';

type DefRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  enabled: boolean;
  sort_order: number;
};
type StageRow = {
  project_id: string;
  stage_id: string;
  label: string;
  stage_order: number;
  mock_count: number;
};
type ConnectorRow = {
  project_id: string;
  connector_type: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
};

export interface SupabaseRegistryConfig {
  url: string;
  serviceRoleKey: string;
  schema?: string;
}

export async function loadRegistryFromSupabase(
  config: SupabaseRegistryConfig,
): Promise<RegisteredProject[]> {
  const schema = config.schema ?? 'ai_company';
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema },
  }) as SupabaseClient;

  const { data: defs, error: defErr } = await client
    .from('project_definitions')
    .select('id, slug, name, description, status, enabled, sort_order')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (defErr) throw new Error(`project-registry: ${defErr.message}`);
  if (!defs?.length) return [];

  const ids = (defs as DefRow[]).map((d) => d.id);

  const [{ data: stages, error: stageErr }, { data: connectors, error: connErr }] =
    await Promise.all([
      client
        .from('project_funnel_stages')
        .select('project_id, stage_id, label, stage_order, mock_count')
        .in('project_id', ids)
        .order('stage_order', { ascending: true }),
      client
        .from('project_connector_configs')
        .select('project_id, connector_type, enabled, config')
        .in('project_id', ids),
    ]);

  if (stageErr) throw new Error(`project-registry stages: ${stageErr.message}`);
  if (connErr) throw new Error(`project-registry connectors: ${connErr.message}`);

  const stagesByProject = groupBy((stages ?? []) as StageRow[], (s) => s.project_id);
  const connectorByProject = new Map(
    ((connectors ?? []) as ConnectorRow[]).map((c) => [c.project_id, c]),
  );

  return (defs as DefRow[]).map((d) => {
    const projectStages = stagesByProject.get(d.id) ?? [];
    const mockStageCounts: Record<string, number> = {};
    for (const s of projectStages) mockStageCounts[s.stage_id] = s.mock_count;
    const conn = connectorByProject.get(d.id);
    const connectorType = conn?.connector_type ?? 'mock-funnel';
    return {
      definition: {
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        status: d.status,
        enabled: d.enabled,
        sortOrder: d.sort_order,
      },
      funnel: {
        projectId: d.id,
        projectSlug: d.slug,
        projectName: d.name,
        stages: projectStages.map((s) => ({
          id: s.stage_id,
          label: s.label,
          order: s.stage_order,
        })),
        mockStageCounts,
      },
      connector: {
        projectId: d.id,
        projectSlug: d.slug,
        connectorType,
        enabled: conn?.enabled ?? true,
        liveCapable: connectorType === 'foodtruck-business' && hasFoodTruckCredentials(),
        config: (conn?.config as Record<string, unknown>) ?? {},
      },
    };
  });
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

function hasFoodTruckCredentials(): boolean {
  const url =
    process.env.FOODTRUCK_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return Boolean(url && key);
}
