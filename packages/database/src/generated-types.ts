/**
 * Hand-maintained mirror of the Supabase schema.
 *
 * In a later phase, replace this file with the output of
 *   `supabase gen types typescript --project-id <id> > generated-types.ts`
 * The shape here is compatible with the generated form.
 */
type SchemaTables = {
      projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          status: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          status?: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
        };
        Update: Partial<SchemaTables['projects']['Insert']>;
      };
      data_sources: {
        Row: {
          id: string;
          project_id: string;
          source_type: string;
          status: 'ok' | 'degraded' | 'error' | 'unknown';
          last_sync: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source_type: string;
          status?: 'ok' | 'degraded' | 'error' | 'unknown';
          last_sync?: string | null;
          last_error?: string | null;
        };
        Update: Partial<SchemaTables['data_sources']['Insert']>;
      };
      project_metrics: {
        Row: {
          id: string;
          project_id: string;
          metric_name: string;
          metric_value: number;
          unit: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          metric_name: string;
          metric_value: number;
          unit?: string | null;
          timestamp?: string;
        };
        Update: Partial<SchemaTables['project_metrics']['Insert']>;
      };
      risks: {
        Row: {
          id: string;
          project_id: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          source: string;
          status: 'open' | 'monitoring' | 'mitigated' | 'accepted';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          source: string;
          status?: 'open' | 'monitoring' | 'mitigated' | 'accepted';
        };
        Update: Partial<SchemaTables['risks']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          project_id: string;
          priority: 'low' | 'medium' | 'high';
          description: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          priority: 'low' | 'medium' | 'high';
          description: string;
          source: string;
        };
        Update: Partial<SchemaTables['opportunities']['Insert']>;
      };
      executive_reports: {
        Row: {
          id: string;
          executive_id: string;
          report_type: 'daily_briefing' | 'weekly_report' | 'ad_hoc';
          summary: string;
          body: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          executive_id: string;
          report_type: 'daily_briefing' | 'weekly_report' | 'ad_hoc';
          summary: string;
          body: unknown;
        };
        Update: Partial<SchemaTables['executive_reports']['Insert']>;
      };
      report_links: {
        Row: {
          report_id: string;
          entity_type: 'risk' | 'opportunity' | 'metric';
          entity_id: string;
        };
        Insert: SchemaTables['report_links']['Row'];
        Update: Partial<SchemaTables['report_links']['Row']>;
      };
};

type SchemaDefinition = {
  Tables: SchemaTables;
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

export interface Database {
  public: SchemaDefinition;
  ai_company: SchemaDefinition;
}
